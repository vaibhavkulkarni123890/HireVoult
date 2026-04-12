const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const CandidateSession = require('../models/CandidateSession');
const Assessment = require('../models/Assessment');
const { gradeSession } = require('../agents/gradingAgent');

// POST /api/grade/:sessionId — trigger grading for a session
router.post('/:sessionId', auth, async (req, res) => {
  try {
    const session = await CandidateSession.findOne({ _id: req.params.sessionId, company: req.company._id });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status !== 'submitted') return res.status(400).json({ error: 'Session must be submitted before grading' });

    const assessment = await Assessment.findById(session.assessment);

    // Get all other sessions for plagiarism comparison
    const otherSessions = await CandidateSession.find({
      assessment: session.assessment,
      _id: { $ne: session._id },
      status: { $in: ['submitted', 'graded'] }
    });

    const scores = await gradeSession(session, assessment, otherSessions);

    session.scores = scores;
    session.status = 'graded';
    session.gradedAt = new Date();
    await session.save();

    res.json({ scores, session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/grade/bulk/:roleId — grade all submitted sessions for a role
router.post('/bulk/:roleId', auth, async (req, res) => {
  try {
    const sessions = await CandidateSession.find({ jobRole: req.params.roleId, company: req.company._id, status: 'submitted' });
    if (sessions.length === 0) return res.json({ message: 'No pending sessions to grade', count: 0 });

    const assessment = await Assessment.findOne({ jobRole: req.params.roleId });
    const allSessions = await CandidateSession.find({ jobRole: req.params.roleId, status: { $in: ['submitted', 'graded'] } });

    const results = [];
    for (const session of sessions) {
      const scores = await gradeSession(session, assessment, allSessions);
      session.scores = scores;
      session.status = 'graded';
      session.gradedAt = new Date();
      await session.save();
      results.push({ sessionId: session._id, candidateEmail: session.candidateEmail, scores });
    }

    res.json({ message: `Graded ${results.length} sessions`, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/grade/results/:roleId — get all results for a role
router.get('/results/:roleId', auth, async (req, res) => {
  try {
    const sessions = await CandidateSession.find({ jobRole: req.params.roleId, company: req.company._id })
      .select('-sessionQuestions -answers')
      .sort('-scores.percentage');
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/grade/result/:sessionId — full detailed result
router.get('/result/:sessionId', auth, async (req, res) => {
  try {
    const session = await CandidateSession.findOne({ _id: req.params.sessionId, company: req.company._id }).populate('jobRole', 'title');
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Handle session abandonment (Dynamic Timeout: Total Duration + 1 min margin)
    if (session.status === 'active') {
        const startedAt = new Date(session.startedAt);
        
        // 1. Static questions (Section 1 & 2)
        const staticQuestions = session.sessionQuestions || [];
        const staticTime = staticQuestions.reduce((acc, q) => acc + (q.timeLimit || 180), 0);
        
        // 2. Dynamic questions (Section 3) - Add time for any generated logic verification
        const dynamicTime = (session.logicVerificationQuestions || []).reduce((acc, prob) => {
            // Each problem has follow-up questions
            const probTime = (prob.questions || []).length * (prob.timeLimit || 120);
            return acc + probTime;
        }, 0);

        const totalDurationSeconds = staticTime + dynamicTime;
        const bufferSeconds = 60; // 1 minute margin
        
        const now = new Date();
        const deadline = new Date(startedAt.getTime() + (totalDurationSeconds + bufferSeconds) * 1000);

        if (now > deadline) {
            session.status = 'terminated';
            session.terminationReason = 'Assessment terminated: User left the assessment / No submission recorded within the expected timeframe';
            await session.save();
        }
    }

    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
