const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const PlatformSettings = require('../models/PlatformSettings');
const auth = require('../middleware/auth');

// ── Recalculate aggregate ratings ────────────────────────────────────────────
async function recalculateAggregate() {
  const companyFeedback = await Feedback.find({ type: 'company' });
  const candidateFeedback = await Feedback.find({ type: 'candidate' });

  const companyAvg = companyFeedback.length > 0
    ? companyFeedback.reduce((sum, f) => sum + f.overallRating, 0) / companyFeedback.length
    : 0;
  const candidateAvg = candidateFeedback.length > 0
    ? candidateFeedback.reduce((sum, f) => sum + f.overallRating, 0) / candidateFeedback.length
    : 0;

  // Weighted: 60% company, 40% candidate
  const aggregate = companyFeedback.length > 0 || candidateFeedback.length > 0
    ? (companyAvg * 0.6) + (candidateAvg * 0.4)
    : 0;

  const roundedAggregate = Math.round(aggregate * 10) / 10;

  await PlatformSettings.findOneAndUpdate(
    { key: 'main' },
    {
      aggregateRating: roundedAggregate,
      totalReviews: companyFeedback.length + candidateFeedback.length,
      companyReviews: companyFeedback.length,
      candidateReviews: candidateFeedback.length,
      companyAvgRating: Math.round(companyAvg * 10) / 10,
      candidateAvgRating: Math.round(candidateAvg * 10) / 10,
      lastUpdated: new Date()
    },
    { upsert: true, new: true }
  );
}
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/feedback/candidate — submit candidate feedback (always anonymous)
router.post('/candidate', async (req, res) => {
  try {
    const { sessionId, overallRating, questionQualityRating, platformRating, comment } = req.body;
    if (!overallRating || overallRating < 1 || overallRating > 5) {
      return res.status(400).json({ error: 'Overall rating (1-5) is required' });
    }

    const feedback = await Feedback.create({
      type: 'candidate',
      sessionId: sessionId || undefined,
      overallRating: Number(overallRating),
      questionQualityRating: questionQualityRating ? Number(questionQualityRating) : undefined,
      platformRating: platformRating ? Number(platformRating) : undefined,
      comment: comment ? comment.substring(0, 300) : undefined,
      isAnonymous: true,
      isApproved: false  // Comments need moderation before showing on landing page
    });

    // Star ratings count immediately — recalculate aggregate
    await recalculateAggregate();

    res.status(201).json({ message: 'Thank you for your feedback!', id: feedback._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/feedback/company — submit company feedback (authenticated)
router.post('/company', auth, async (req, res) => {
  try {
    const {
      overallRating, assessmentQualityRating, logicScoreUsefulnessRating,
      wouldRecommend, comment, companyName
    } = req.body;

    if (!overallRating || overallRating < 1 || overallRating > 5) {
      return res.status(400).json({ error: 'Overall rating (1-5) is required' });
    }

    const feedback = await Feedback.create({
      type: 'company',
      companyId: req.company._id,
      overallRating: Number(overallRating),
      assessmentQualityRating: assessmentQualityRating ? Number(assessmentQualityRating) : undefined,
      logicScoreUsefulnessRating: logicScoreUsefulnessRating ? Number(logicScoreUsefulnessRating) : undefined,
      wouldRecommend: typeof wouldRecommend === 'boolean' ? wouldRecommend : wouldRecommend === 'true',
      comment: comment ? comment.substring(0, 300) : undefined,
      companyName: companyName || req.company.name,
      isApproved: false
    });

    await recalculateAggregate();

    res.status(201).json({ message: 'Thank you for your feedback!', id: feedback._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/feedback/aggregate — public aggregate ratings
router.get('/aggregate', async (req, res) => {
  try {
    const settings = await PlatformSettings.findOne({ key: 'main' });
    if (!settings || settings.totalReviews < 3) {
      return res.json({ hasEnoughReviews: false, totalReviews: settings?.totalReviews || 0 });
    }

    // Fetch approved text testimonials
    const testimonials = await Feedback.find({ isApproved: true, comment: { $exists: true, $ne: '' } })
      .sort('-createdAt')
      .limit(4)
      .select('type comment companyName overallRating isAnonymous createdAt');

    res.json({
      hasEnoughReviews: true,
      aggregateRating: settings.aggregateRating,
      totalReviews: settings.totalReviews,
      companyReviews: settings.companyReviews,
      candidateReviews: settings.candidateReviews,
      companyAvgRating: settings.companyAvgRating,
      candidateAvgRating: settings.candidateAvgRating,
      testimonials: testimonials.map(t => ({
        type: t.type,
        comment: t.comment,
        displayName: t.type === 'company'
          ? (t.companyName && !t.isAnonymous ? t.companyName : 'Verified Company')
          : 'Verified Candidate',
        rating: t.overallRating,
        createdAt: t.createdAt
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin routes (protected by ADMIN_PASSWORD) ────────────────────────────────
function adminAuth(req, res, next) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const provided = req.headers['x-admin-password'];
  if (!adminPassword || provided !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// GET /api/feedback/admin/pending
router.get('/admin/pending', adminAuth, async (req, res) => {
  try {
    const pending = await Feedback.find({ isApproved: false, isRejected: false, comment: { $exists: true, $ne: '' } })
      .sort('-createdAt')
      .limit(50);
    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/feedback/admin/:id/approve
router.patch('/admin/:id/approve', adminAuth, async (req, res) => {
  try {
    await Feedback.findByIdAndUpdate(req.params.id, { isApproved: true, isRejected: false });
    res.json({ message: 'Approved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/feedback/admin/:id/reject
router.patch('/admin/:id/reject', adminAuth, async (req, res) => {
  try {
    await Feedback.findByIdAndUpdate(req.params.id, { isRejected: true, isApproved: false });
    res.json({ message: 'Rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
