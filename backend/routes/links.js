const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const auth = require('../middleware/auth');
const AssessmentLink = require('../models/AssessmentLink');
const Assessment = require('../models/Assessment');
const JobRole = require('../models/JobRole');

// ── Helper: IST-aware scheduling check ────────────────────────────────────────
function checkScheduleState(link) {
  const now = new Date();

  // No scheduling set — immediately available
  if (!link.scheduleStartDate && !link.scheduleEndDate) {
    return { state: 'open' };
  }

  const start = link.scheduleStartDate ? new Date(link.scheduleStartDate) : null;
  const end = link.scheduleEndDate ? new Date(link.scheduleEndDate) : null;

  if (start && now < start) {
    return { state: 'not_open', opensAt: start };
  }
  if (end && now > end) {
    return { state: 'closed', closedAt: end };
  }

  // Within date range — check daily time window if set
  if (link.dailyWindowStart && link.dailyWindowEnd) {
    // Get current time in IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const hhmm = `${String(istNow.getUTCHours()).padStart(2,'0')}:${String(istNow.getUTCMinutes()).padStart(2,'0')}`;

    if (hhmm < link.dailyWindowStart) {
      // Before today's window
      const [wh, wm] = link.dailyWindowStart.split(':').map(Number);
      const windowOpenIST = new Date(istNow);
      windowOpenIST.setUTCHours(wh, wm, 0, 0);
      const nextWindowAt = new Date(windowOpenIST.getTime() - istOffset);
      return { state: 'outside_daily_window', nextWindowAt, dailyWindowStart: link.dailyWindowStart, dailyWindowEnd: link.dailyWindowEnd };
    }
    if (hhmm >= link.dailyWindowEnd) {
      // After today's window — opens again tomorrow
      const [wh, wm] = link.dailyWindowStart.split(':').map(Number);
      const tomorrowIST = new Date(istNow);
      tomorrowIST.setUTCDate(tomorrowIST.getUTCDate() + 1);
      tomorrowIST.setUTCHours(wh, wm, 0, 0);
      const nextWindowAt = new Date(tomorrowIST.getTime() - istOffset);
      return { state: 'outside_daily_window', nextWindowAt, dailyWindowStart: link.dailyWindowStart, dailyWindowEnd: link.dailyWindowEnd };
    }
  }

  return { state: 'open' };
}
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/links/generate — DEPRECATED: Use /bulk-generate for all links (enforces dynamic)
router.post('/generate', auth, async (req, res) => {
  res.status(410).json({ error: 'This endpoint is deprecated. Use /bulk-generate instead.' });
});

// GET /api/links/:roleId — list all links for a role with URLs
router.get('/:roleId', auth, async (req, res) => {
  try {
    const links = await AssessmentLink.find({ jobRole: req.params.roleId, company: req.company._id }).sort('-createdAt');
    const baseUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
    const enriched = links.map(l => {
      const url = `${baseUrl}/assess/${l.token}`;
      if (url.includes('undefined')) {
        console.error(`[INVALID URL] Link ${l._id} has undefined token`);
      }
      return { ...l.toObject(), url };
    });
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/links/:id/toggle — enable/disable a link
router.patch('/:id/toggle', auth, async (req, res) => {
  try {
    const link = await AssessmentLink.findOne({ _id: req.params.id, company: req.company._id });
    if (!link) return res.status(404).json({ error: 'Link not found' });
    link.isActive = !link.isActive;
    await link.save();
    res.json({ link });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/links/validate/:token — public, full IST-aware scheduling validation
router.get('/validate/:token', async (req, res) => {
  try {
    const link = await AssessmentLink
      .findOne({ token: req.params.token })
      .populate('jobRole', 'title jd experienceYears skills questionConfig seniorityLevel')
      .populate('company', 'name logo');

    if (!link) return res.status(404).json({ error: 'Invalid assessment link' });
    if (!link.isActive) return res.status(403).json({ error: 'This assessment link has been deactivated' });
    if (link.usageCount >= link.maxUsage) {
      return res.status(403).json({ error: 'This assessment link has reached its maximum usage' });
    }

    // Full scheduling check
    const scheduleState = checkScheduleState(link);

    // Calculate total time from questions
    const assessment = await Assessment.findById(link.assessment);
    const totalTimeSeconds = assessment?.questions?.reduce((sum, q) => sum + (q.timeLimit || 0), 0) || 0;
    const totalTimeMinutes = Math.ceil(totalTimeSeconds / 60);

    res.json({
      valid: scheduleState.state === 'open',
      scheduleState: scheduleState.state,
      opensAt: scheduleState.opensAt,
      closedAt: scheduleState.closedAt,
      nextWindowAt: scheduleState.nextWindowAt,
      dailyWindowStart: scheduleState.dailyWindowStart,
      dailyWindowEnd: scheduleState.dailyWindowEnd,
      linkType: link.linkType,
      candidateName: link.candidateName,
      candidateEmail: link.candidateEmail,
      jobRole: link.jobRole,
      company: link.company,
      pricePerAssessment: link.pricePerAssessment,
      isFree: link.isFree,
      totalTimeMinutes: totalTimeMinutes || 60
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/links/bulk-generate — generate multiple dynamic links
router.post('/bulk-generate', auth, async (req, res) => {
  try {
    const { roleId, candidates, scheduleStartDate, scheduleEndDate, dailyWindowStart, dailyWindowEnd } = req.body;

    const assessment = await Assessment.findOne({ jobRole: roleId, company: req.company._id, paidAt: { $exists: true } });
    if (!assessment) return res.status(400).json({ error: 'Assessment must be activated first' });

    const role = await JobRole.findById(roleId);
    if (!role) return res.status(404).json({ error: 'Role not found' });

    // Use default scheduling from JobRole if not explicitly provided
    const start = scheduleStartDate ? new Date(scheduleStartDate) : role.scheduleStartDate;
    const end = scheduleEndDate ? new Date(scheduleEndDate) : role.scheduleEndDate;

    const candidateLimit = role.candidateLimit || 1;
    const existingLinks = await AssessmentLink.find({ assessment: assessment._id });
    
    // Calculate total potential usage: Sum of maxUsage of all existing links
    const currentTotalMaxUsage = existingLinks.reduce((sum, l) => sum + (l.maxUsage || 0), 0);
    const requestedUsage = candidates.length; // Bulk links are always dynamic (maxUsage: 1)

    if (assessment.isFree && (currentTotalMaxUsage + requestedUsage) > 10) {
      return res.status(403).json({ 
        error: `Free tier is capped at 10 candidates. Current total limit assigned: ${currentTotalMaxUsage}. Requested for bulk: ${requestedUsage}.` 
      });
    }
    if ((currentTotalMaxUsage + requestedUsage) > candidateLimit) {
      return res.status(403).json({ 
        error: `Batch limit is ${candidateLimit}. Current total limit assigned: ${currentTotalMaxUsage}. Requested for bulk: ${requestedUsage}.` 
      });
    }

    const baseUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');

    const newLinksData = candidates.map(c => {
      const token = crypto.randomUUID();
      console.log(`[Bulk Link] Token: ${token} | Candidate: ${c.email}`);
      return {
        token,
        jobRole: roleId,
        assessment: assessment._id,
        company: req.company._id,
        linkType: 'dynamic',
        candidateName: c.name,
        candidateEmail: c.email,
        scheduleStartDate: start,
        scheduleEndDate: end,
        dailyWindowStart: dailyWindowStart || undefined,
        dailyWindowEnd: dailyWindowEnd || undefined,
        maxUsage: 1,
        pricePerAssessment: role.pricePerAssessment || 0,
        pricePerAssessmentUSD: role.pricePerAssessmentUSD || 0,
        isFree: assessment.isFree
      };
    });

    const inserted = await AssessmentLink.insertMany(newLinksData);
    await JobRole.findByIdAndUpdate(roleId, { status: 'active' });

    const responseLinks = inserted.map(link => ({
      ...link.toObject(),
      url: `${baseUrl}/assess/${link.token}`
    }));

    res.status(201).json({ links: responseLinks });
  } catch (err) {
    console.error('[Bulk Link Error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
