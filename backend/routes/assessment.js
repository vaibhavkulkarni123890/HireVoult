const express = require('express');
const router = express.Router();
const AssessmentLink = require('../models/AssessmentLink');
const Assessment = require('../models/Assessment');
const CandidateSession = require('../models/CandidateSession');
const { generateLogicVerification } = require('../agents/logicVerificationAgent');
const { runJS, runPython } = require('../agents/codeRunner');
const { gradeSession } = require('../agents/gradingAgent');

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Helper: check schedule state ─────────────────────────────────────────────
function checkScheduleState(link) {
  if (!link.scheduleStartDate && !link.scheduleEndDate) return 'open';
  const now = new Date();
  if (link.scheduleStartDate && now < new Date(link.scheduleStartDate)) return 'not_open';
  if (link.scheduleEndDate && now > new Date(link.scheduleEndDate)) return 'closed';
  if (link.dailyWindowStart && link.dailyWindowEnd) {
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const hhmm = `${String(istNow.getUTCHours()).padStart(2,'0')}:${String(istNow.getUTCMinutes()).padStart(2,'0')}`;
    if (hhmm < link.dailyWindowStart || hhmm >= link.dailyWindowEnd) return 'outside_daily_window';
  }
  return 'open';
}
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/assessment/start
router.post('/start', async (req, res) => {
  try {
    const { token, candidateName, candidateEmail, identityPhoto } = req.body;
    if (!token || !candidateName || !candidateEmail)
      return res.status(400).json({ error: 'Token, name and email are required' });

    const link = await AssessmentLink.findOne({ token });
    if (!link || !link.isActive) return res.status(404).json({ error: 'Invalid or inactive link' });
    if (link.usageCount >= link.maxUsage) return res.status(403).json({ error: 'This assessment link has reached its limit' });

    // Schedule enforcement
    const scheduleState = checkScheduleState(link);
    if (scheduleState !== 'open') {
      return res.status(403).json({ error: `Assessment not available: ${scheduleState}`, scheduleState });
    }

    // Dynamic link email check
    if (link.linkType === 'dynamic' && link.candidateEmail) {
      if (link.candidateEmail.toLowerCase() !== candidateEmail.toLowerCase())
        return res.status(403).json({ error: 'This link is not authorized for your email address' });
    }

    const assessment = await Assessment.findById(link.assessment);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    // UPDATE 3: All candidates in same batch get IDENTICAL questions — no shuffle, no pool
    const sessionQuestions = JSON.parse(JSON.stringify(assessment.questions));

    if (sessionQuestions.length === 0) {
      return res.status(500).json({ error: 'No questions found for this assessment' });
    }

    const session = await CandidateSession.create({
      link: link._id.toString(),
      assessment: assessment._id.toString(),
      jobRole: link.jobRole.toString(),
      company: link.company.toString(),
      candidateName: String(candidateName),
      candidateEmail: String(candidateEmail).toLowerCase(),
      identityPhoto: identityPhoto ? String(identityPhoto) : undefined,
      sessionQuestions,
      status: 'active',
      currentSection: 1,
      startedAt: new Date()
    });

    link.usageCount += 1;
    await link.save();

    // Return questions to candidate — NEVER send hidden test cases, never send reasoning
    const safeQuestions = sessionQuestions.map((q, i) => {
      let starterCode = undefined;
      if (q.type === 'coding' && q.starterCode) {
        if (q.starterCode instanceof Map) {
          starterCode = Object.fromEntries(q.starterCode);
        } else if (typeof q.starterCode === 'object') {
          starterCode = { ...q.starterCode };
        }
      }
      if (q.type === 'coding') {
        // Try to extract function name from question object
        let functionName = 'solution';
        if (q.functionName && typeof q.functionName === 'string') {
          functionName = q.functionName.trim();
        } else if (q.title && typeof q.title === 'string') {
          // Try to infer from title if possible (optional, fallback)
          const match = q.title.match(/([a-zA-Z_][a-zA-Z0-9_]*)/);
          if (match) functionName = match[1];
        }
        const jsDefault = `function ${functionName}(input) {\n}\n`;
        const pyDefault = `def ${functionName}(input):\n    pass\n`;
        if (!starterCode || Object.keys(starterCode).length === 0) {
          starterCode = { javascript: jsDefault, python: pyDefault };
        } else {
          if (!starterCode.javascript) starterCode.javascript = jsDefault;
          if (!starterCode.python) starterCode.python = pyDefault;
        }
      }
      return {
        index: i,
        type: q.type,
        title: q.title,
        question: q.question,
        constraints: q.type === 'coding' ? q.constraints : undefined,
        examples: q.type === 'coding' ? q.examples : undefined,
        options: q.type === 'mcq' ? q.options : undefined,
        starterCode,
        testCases: q.type === 'coding'
          ? (q.testCases || []).filter(tc => !tc.isHidden).map(tc => ({ input: tc.input, expectedOutput: tc.expectedOutput }))
          : undefined,
        visibleTestCaseCount: q.type === 'coding' ? (q.testCases || []).filter(tc => !tc.isHidden).length : undefined,
        hiddenTestCaseCount: q.type === 'coding' ? (q.testCases || []).filter(tc => tc.isHidden).length : undefined,
        timeLimit: q.timeLimit || 180,
        points: q.points,
        difficulty: q.difficulty
      };
    });

    res.status(201).json({ sessionId: session._id, questions: safeQuestions, startedAt: session.startedAt });
  } catch (err) {
    console.error('[Assessment Start Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/assessment/:sessionId/run — run visible test cases only
router.post('/:sessionId/run', async (req, res) => {
  try {
    const { questionIndex, code, language } = req.body;
    const session = await CandidateSession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const question = session.sessionQuestions[questionIndex];
    if (!question || question.type !== 'coding') return res.status(400).json({ error: 'Invalid coding question' });

    // Only visible test cases for Run
    const visibleTestCases = (question.testCases || []).filter(tc => !tc.isHidden);

    let results = [];
    if (language === 'javascript' || language === 'nodejs') {
      results = await runJS(code, visibleTestCases);
    } else if (language === 'python') {
      results = await runPython(code, visibleTestCases);
    } else {
      return res.status(400).json({ error: 'Unsupported language' });
    }

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/assessment/:sessionId/generate-s3 — trigger Section 3 logic verification
router.post('/:sessionId/generate-s3', async (req, res) => {
  try {
    const session = await CandidateSession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
     console.log('[S3-DEBUG] Session ID:', req.params.sessionId);
    console.log('[S3-DEBUG] All answers stored:', JSON.stringify(session.answers, null, 2));
    console.log('[S3-DEBUG] Questions in session:', session.sessionQuestions?.length);

    // Get ALL coding questions from sessionQuestions, with their answers (or empty if not answered)
    const codingIndices = session.sessionQuestions
      .map((q, i) => ({ q, i }))
      .filter(({ q }) => q.type === 'coding')
      .map(({ q, i }) => i);

    const codingAnswers = codingIndices.map(idx => {
      const answer = session.answers.find(a => a.questionIndex === idx);
      const q = session.sessionQuestions[idx];
      return {
        questionIndex: idx,
        questionTitle: q?.title || q?.question?.substring(0, 50),
        questionText: q?.question,
        code: answer?.code || '',
        rubric: q?.rubric
      };
    });

    console.log('[S3-DEBUG] Coding questions found:', codingAnswers.length);
    console.log('[S3-DEBUG] Coding answers detail:', JSON.stringify(codingAnswers, null, 2));
    console.log(`[generate-s3] Sending ${codingAnswers.length} coding questions (with or without answers) to logic verification`);

    const JobRole = require('../models/JobRole');
    const role = await JobRole.findById(session.jobRole);
    const questions = await generateLogicVerification(codingAnswers, { 
      seniority: role.seniorityLevel, 
      title: role.title, 
      skills: role.skills, 
      jd: role.jd 
    });

    session.logicVerificationQuestions = questions.map(q => ({
      problemNumber: q.problem_number,
      problemTitle: q.problem_title,
      timeLimit: q.time_per_question_seconds || 120,
      questions: q.questions.map(sq => ({ type: sq.type, question: sq.question, answer: '' }))
    }));

    session.currentSection = 3;
    await session.save();

    res.json({ questions: session.logicVerificationQuestions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/assessment/:sessionId/answer — save individual answer
router.post('/:sessionId/answer', async (req, res) => {
  try {
    const {
      questionIndex, questionType, selectedOption, code, language,
      theoryAnswer, startedAt, timeSpent, section, s3QuestionIndex, s3SubQuestionIndex
    } = req.body;

    const session = await CandidateSession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status !== 'active') return res.status(400).json({ error: `Session is ${session.status}` });

    if (section === 3) {
      const prob = session.logicVerificationQuestions[s3QuestionIndex];
      if (prob && prob.questions[s3SubQuestionIndex]) {
        prob.questions[s3SubQuestionIndex].answer = theoryAnswer;
        session.markModified('logicVerificationQuestions');
      }
    } else {
      session.answers = session.answers.filter(a => a.questionIndex !== questionIndex);
      const answer = {
        questionIndex, questionType,
        startedAt: startedAt ? new Date(startedAt) : undefined,
        submittedAt: new Date(),
        timeSpent
      };
      if (questionType === 'mcq') answer.selectedOption = selectedOption;
      if (questionType === 'coding') {
        answer.code = code != null ? String(code) : '';
        answer.language = language || 'javascript';
      }
      if (questionType === 'theory') answer.theoryAnswer = theoryAnswer;
      session.answers.push(answer);
    }

    await session.save();
    res.json({ saved: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/assessment/:sessionId/proctoring — log proctoring events
router.post('/:sessionId/proctoring', async (req, res) => {
  try {
    const { type, details, snapshot } = req.body;
    const session = await CandidateSession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status === 'terminated' || session.status === 'submitted') return res.json({ acknowledged: true });

    // Allow extra event types from front-end
    const allowedTypes = ['tab_switch', 'fullscreen_exit', 'screen_share_detected', 'camera_snapshot',
      'copy_attempt', 'right_click', 'devtools', 'device_change', 'fullscreen_exit_timeout', 'face_missing', 'candidate_abandoned'];
    if (allowedTypes.includes(type)) {
      session.proctoringEvents.push({ type, details, snapshot, timestamp: new Date() });
    }

    const terminatingNow = ['tab_switch', 'screen_share_detected', 'fullscreen_exit_timeout', 'candidate_abandoned'];
    if (terminatingNow.includes(type)) {
      session.warningCount += 1;
      if (type === 'screen_share_detected' || type === 'fullscreen_exit_timeout' || type === 'candidate_abandoned' || session.warningCount >= 2) {
        session.status = 'terminated';
        session.terminationReason = type === 'fullscreen_exit_timeout'
          ? 'Terminated: User failed to return to assessment environment (User left the assessment)'
          : type === 'candidate_abandoned'
            ? 'Terminated: User left the assessment intentionally'
            : type === 'tab_switch'
                ? 'Terminated: System detected unauthorized tab switching (User left the assessment)'
                : `Terminated by User: Proctoring violation #${session.warningCount}`;
      }
    } else if (type === 'fullscreen_exit') {
      session.warningCount += 1;
    } else if (type === 'face_missing') {
      session.warningCount += 1;
      if (session.warningCount >= 10) {
        session.status = 'terminated';
        session.terminationReason = 'Terminated: Camera blocked or user left the seat';
      }
    }

    await session.save();
    res.json({ acknowledged: true, status: session.status, warningCount: session.warningCount, terminationReason: session.terminationReason });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/assessment/:sessionId/submit — final submit: run hidden test cases immediately, then trigger AI grading
router.post('/:sessionId/submit', async (req, res) => {
  try {
    const session = await CandidateSession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status === 'submitted') return res.status(409).json({ error: 'Already submitted' });
    if (session.status === 'terminated') return res.json({ message: 'Session was terminated', status: 'terminated' });

    session.status = 'submitted';
    session.submittedAt = new Date();
    await session.save();

    // ── Step 1: Run hidden test cases immediately (synchronous, deterministic) ──
    runHiddenTestCases(session).catch(err => console.error('[Hidden TC Error]:', err));

    res.json({ message: 'Assessment submitted. Grading in progress.', submittedAt: session.submittedAt, status: 'submitted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Background job: run hidden test cases + trigger AI grading
async function runHiddenTestCases(session) {
  try {
    const codingAnswers = session.answers.filter(a => a.questionType === 'coding');

    for (const ans of codingAnswers) {
      const question = session.sessionQuestions[ans.questionIndex];
      if (!question || question.type !== 'coding') continue;

      const hiddenTestCases = (question.testCases || []).filter(tc => tc.isHidden);
      if (hiddenTestCases.length === 0) continue;

      let hiddenResults = [];
      try {
        const lang = ans.language || 'javascript';
        if (lang === 'javascript' || lang === 'nodejs') {
          hiddenResults = await runJS(ans.code, hiddenTestCases);
        } else if (lang === 'python') {
          hiddenResults = await runPython(ans.code, hiddenTestCases);
        }
      } catch (execErr) {
        console.error(`[Hidden TC Exec Error] Q${ans.questionIndex}:`, execErr.message);
        // Fallback: use visible test results only — don't crash grading
        hiddenResults = [];
      }

      // Store hidden test results alongside the answer
      const allTestCases = question.testCases || [];
      const visibleResults = ans.testCasesResults || [];

      // Combine visible + hidden results for scoring
      const totalTests = allTestCases.length;
      const visiblePassed = visibleResults.filter(r => r.passed).length;
      const hiddenPassed = hiddenResults.filter(r => r.passed).length;
      const totalPassed = visiblePassed + hiddenPassed;
      const codingScore = totalTests > 0 ? Math.round((totalPassed / totalTests) * question.points) : 0;

      // Update the answer in session
      const ansIdx = session.answers.findIndex(a => a.questionIndex === ans.questionIndex);
      if (ansIdx !== -1) {
        session.answers[ansIdx].testCasesResults = [
          ...visibleResults,
          ...hiddenResults.map(r => ({ ...r, isHidden: true }))
        ];
        session.markModified('answers');
      }
    }

    await session.save();

    // ── Step 2: Trigger AI grading pipeline ──────────────────────────────────
    try {
      const { gradeSession } = require('../agents/gradingAgent');
      const finalScores = await gradeSession(session._id.toString());
      
      // PERSIST THE GRADING RESULT
      const updatedSession = await CandidateSession.findById(session._id);
      if (updatedSession) {
          updatedSession.scores = finalScores;
          updatedSession.status = 'graded';
          updatedSession.gradedAt = new Date();
          await updatedSession.save();
          console.log(`[AI Grading Success] Session ${session._id} is now graded.`);
      }
    } catch (gradingErr) {
      console.error('[AI Grading Error]:', gradingErr.message);
    }
    // ─────────────────────────────────────────────────────────────────────────

  } catch (err) {
    console.error('[runHiddenTestCases Fatal]:', err.message);
  }
}

// GET /api/assessment/:sessionId/status — get session status for polling
router.get('/:sessionId/status', async (req, res) => {
  try {
    const session = await CandidateSession.findById(req.params.sessionId)
      .select('status warningCount terminationReason scores gradedAt');
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

