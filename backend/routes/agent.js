const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const JobRole = require('../models/JobRole');
const Assessment = require('../models/Assessment');
const Company = require('../models/Company');
const { generateQuestions } = require('../agents/questionGenerator');
const { calculatePricing, getSeniorityLevel, getPricingForLevel } = require('../agents/pricingEngine');

async function checkAIRateLimit(companyId) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const hourlyCount = await JobRole.countDocuments({
    company: companyId,
    createdAt: { $gte: oneHourAgo }
  });
  if (hourlyCount >= 5) {
    return { allowed: false, message: 'AI generation limit reached. You can create up to 5 roles per hour. Please wait before generating more questions.' };
  }

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dailyCount = await JobRole.countDocuments({
    company: companyId,
    createdAt: { $gte: twentyFourHoursAgo }
  });
  if (dailyCount >= 10) {
    return { allowed: false, message: 'Daily AI generation limit reached. You can create up to 10 roles every 24 hours.' };
  }

  return { allowed: true };
}

// POST /api/agent/create-role — generate questions once, store pricing, save role + assessment
router.post('/create-role', auth, async (req, res) => {
  try {
    const { title, jd, about, salary, experienceYears, skills, questionConfig, candidateLimit, scheduleStartDate, scheduleEndDate } = req.body;
    if (!title || !jd || !about) return res.status(400).json({ error: 'Title, JD, and About Context are required' });

    const rateCheck = await checkAIRateLimit(req.company._id);
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: rateCheck.message });
    }

    const freshCompany = await Company.findById(req.company._id);
    const freeLimit = parseInt(process.env.FREE_ASSESSMENTS_PER_COMPANY) || 1;
    const canUseFree = !freshCompany.freeBatchUsed && (freshCompany.freeAssessmentsUsed || 0) < freeLimit;
    const isFree = canUseFree;
    // Strictly cap the candidate batch limit to 10 if it's the complimentary free tier
    const limit = isFree ? Math.min(10, Math.max(1, Number(candidateLimit) || 10)) : Math.max(1, Number(candidateLimit) || 10);

    // ── Pricing: Calculate base SENIORITY pricing tier ─────────────────
    const seniorityLevel = getSeniorityLevel(experienceYears);
    const pricingTier = getPricingForLevel(seniorityLevel);
    // ──────────────────────────────────────────────────────────────────

    // Create role in memory (don't save to DB yet — wait for AI success)
    const role = new JobRole({
      company: req.company._id,
      title, jd, about, salary,
      experienceYears: Number(experienceYears) || 0,
      skills: Array.isArray(skills) ? skills : (skills || '').split(',').map(s => s.trim()).filter(Boolean),
      questionConfig: questionConfig || {},
      candidateLimit: limit,
      seniorityLevel,
      pricePerAssessment: pricingTier.inr, // Will update below
      pricePerAssessmentUSD: pricingTier.usd,
      isFreeAssessment: isFree,
      status: 'questions_ready',
      scheduleStartDate: scheduleStartDate ? new Date(scheduleStartDate) : undefined,
      scheduleEndDate: scheduleEndDate ? new Date(scheduleEndDate) : undefined
    });

    // Generate questions ONCE — same for all candidates in this batch
    console.log(`[QuestionGenerator] Generating questions for role: ${title} (${seniorityLevel})`);
    const questions = await generateQuestions(role);
    console.log(`[QuestionGenerator] Generated ${questions.length} questions: MCQs=${questions.filter(q=>q.type==='mcq').length}, Coding=${questions.filter(q=>q.type==='coding').length}`);
    console.log(`[QuestionGenerator] Questions preview:`, questions.map(q => ({ type: q.type, title: q.title || q.question?.substring(0, 50) })));

    // Mark free batch as used immediately after successful question generation
    if (isFree) {
      await Company.findByIdAndUpdate(req.company._id, {
        freeBatchUsed: true,
        $inc: { freeAssessmentsUsed: 1 }
      });
    }

    // Update role with fixed seniority price
    role.pricePerAssessment = pricingTier.inr;
    role.pricePerAssessmentUSD = pricingTier.usd;

    // Save role to DB
    await role.save();

    const totalBatchCostINR = pricingTier.inr * limit;
    const totalBatchCostUSD = pricingTier.usd * limit;

    // ─── Pre-validate: ensure every question.question is a plain string before DB write ───
    const validatedQuestions = questions.map(q => {
      if (typeof q.question !== 'string') {
        q.question = typeof q.question === 'object' && q.question !== null
          ? JSON.stringify(q.question, null, 2)
          : String(q.question || '');
      }
      return q;
    });

    // Create assessment with locked pricing
    const assessment = await Assessment.create({
      jobRole: role._id,
      company: req.company._id,
      questions: validatedQuestions,
      questionPool: [],   // No pool — same questions for all candidates in batch
      pricing: {
        basePrice: pricingTier.inr, // the static base
        finalPrice: isFree ? 0 : pricingTier.inr,
        currency: req.company.preferredCurrency || 'INR',
        country: req.company.country,
        seniorityLevel,
        seniorityLabel: pricingTier.label,
        candidateCount: limit,
        totalCostINR: totalBatchCostINR,
        totalCostUSD: totalBatchCostUSD,
        isFree,
        breakdown: {
          pricePerAssessmentINR: pricingTier.inr,
          pricePerAssessmentUSD: pricingTier.usd,
          candidateCount: limit,
          description: isFree
            ? `Free tier — First batch (up to 10 candidates) is complimentary`
            : `${pricingTier.label} Seniority Tier — ₹${pricingTier.inr}/assessment × ${limit} candidates = ₹${totalBatchCostINR}`
        }
      },
      isFree
    });

    res.status(201).json({
      role,
      assessment,
      questions,
      pricing: assessment.pricing,
      pricingDisplay: {
        seniorityLevel,
        seniorityLabel: pricingTier.label,
        pricePerAssessmentINR: pricingTier.inr,
        pricePerAssessmentUSD: pricingTier.usd,
        candidateCount: limit,
        totalINR: totalBatchCostINR,
        totalUSD: totalBatchCostUSD,
        isFree,
        amountDueINR: isFree ? 0 : totalBatchCostINR,
        amountDueUSD: isFree ? 0 : totalBatchCostUSD,
        freeTierNote: isFree ? 'First batch is completely free (up to 10 candidates)' : null
      }
    });
  } catch (err) {
    console.error('Role creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agent/approve — approve questions
router.post('/approve', auth, async (req, res) => {
  try {
    const { assessmentId, editedQuestions } = req.body;
    const assessment = await Assessment.findOne({ _id: assessmentId, company: req.company._id });
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    if (editedQuestions) assessment.questions = editedQuestions;
    assessment.approvedAt = new Date();
    await assessment.save();

    await JobRole.findByIdAndUpdate(assessment.jobRole, { status: 'approved' });

    res.json({ message: 'Assessment approved', assessment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agent/pay — activate assessment (paid only, free is handled at creation)
router.post('/pay', auth, async (req, res) => {
  try {
    const { assessmentId, currency } = req.body;
    const assessment = await Assessment.findOne({ _id: assessmentId, company: req.company._id });
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });
    if (!assessment.approvedAt) return res.status(400).json({ error: 'Assessment must be approved first' });

    if (assessment.isFree) {
      return res.status(400).json({ error: 'Free assessments do not require payment. Use the activate endpoint.' });
    }

    if (currency) {
      assessment.pricing.currency = currency;
      assessment.markModified('pricing');
    }

    assessment.paidAt = new Date();
    await assessment.save();

    await JobRole.findByIdAndUpdate(assessment.jobRole, {
      status: 'paid',
      isFreeAssessment: false
    });

    res.json({ message: 'Payment confirmed', assessment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agent/activate-free — activate a free assessment after approval
router.post('/activate-free', auth, async (req, res) => {
  try {
    const { assessmentId } = req.body;
    const assessment = await Assessment.findOne({ _id: assessmentId, company: req.company._id });
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });
    if (!assessment.approvedAt) return res.status(400).json({ error: 'Assessment must be approved first' });
    if (!assessment.isFree) return res.status(400).json({ error: 'This is not a free assessment' });

    assessment.paidAt = new Date();
    await assessment.save();

    await JobRole.findByIdAndUpdate(assessment.jobRole, {
      status: 'paid',
      isFreeAssessment: true
    });

    // Fix for backward compatibility: if company freeAssessmentsUsed is 0, update it
    const freshCompany = await Company.findById(req.company._id);
    if (!freshCompany.freeAssessmentsUsed || freshCompany.freeAssessmentsUsed === 0) {
      await Company.findByIdAndUpdate(req.company._id, {
        freeBatchUsed: true,
        $inc: { freeAssessmentsUsed: 1 }
      });
    }

    res.json({ message: 'Free assessment activated', assessment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agent/assessment/:roleId — get assessment for a role
router.get('/assessment/:roleId', auth, async (req, res) => {
  try {
    const assessment = await Assessment.findOne({ jobRole: req.params.roleId, company: req.company._id });
    if (!assessment) return res.status(404).json({ error: 'No assessment found' });
    res.json(assessment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
