const fetch = require('node-fetch');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { detectPlagiarism } = require('./plagiarismDetector');
const CandidateSession = require('../models/CandidateSession');
const Assessment = require('../models/Assessment');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function getProviderPriority() {
  const order = process.env.AI_PROVIDER_ORDER || 'openrouter,claude';
  const allowed = new Set(['openrouter','claude']);
  return order.split(',').map(p => p.trim().toLowerCase()).filter(p => allowed.has(p));
}

async function callOpenRouter(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OpenRouter API key not configured');
  const modelName = process.env.OPENROUTER_MODEL_NAME || 'google/gemini-2.0-flash-001';
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://hirevault.ai',
      'X-Title': 'HireVault Grading'
    },
    body: JSON.stringify({
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1500
    })
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${err}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callClaude(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Anthropic API key not configured');
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL_NAME || 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }
  const data = await response.json();
  return data.content?.[0]?.text || '';
}

async function callAIWithFallback(prompt, fallbackProviders = null) {
  const providers = fallbackProviders || getProviderPriority();

  for (const provider of providers) {
    try {
      let content;

      if (provider === 'openrouter') {
        content = await callOpenRouter(prompt);
      } else if (provider === 'claude') {
        content = await callClaude(prompt);
      }

      if (content) {
        return content;
      }
    } catch (err) {
      console.warn(`[GradingAgent] ${provider} failed: ${err.message}`);
      continue;
    }
  }

  throw new Error('All AI providers failed for grading');
}

function gradeMCQ(question, answer) {
  if (answer?.selectedOption === undefined || answer?.selectedOption === null)
    return { score: 0, max: question.points, feedback: 'Not answered' };
  const correct = answer.selectedOption === question.correctOption;
  return { score: correct ? question.points : 0, max: question.points, feedback: correct ? 'Correct' : `Incorrect. Correct answer: Option ${question.correctOption + 1}` };
}

function gradeCoding(question, answer) {
  if (!answer?.code) return { score: 0, max: question.points, feedback: 'No code submitted', testResults: [] };

  const { VM } = require('vm2');
  const testResults = [];
  let passedCount = 0;

  for (const tc of (question.testCases || [])) {
    try {
      const vm = new VM({ timeout: 3000, sandbox: {} });
      const script = `
        ${answer.code}
        (function() {
          try {
            const input = ${JSON.stringify(tc.input)};
            const result = typeof solution !== 'undefined' ? String(solution(input)) : 'NO_FUNCTION';
            result;
          } catch(e) { 'ERROR: ' + e.message; }
        })();
      `;
      const actual = String(vm.run(script));
      const passed = actual.trim() === String(tc.expectedOutput).trim();
      if (passed) passedCount++;
      testResults.push({ input: tc.input, expected: tc.expectedOutput, actual, passed, error: null });
    } catch (err) {
      testResults.push({ input: tc.input, expected: tc.expectedOutput, actual: null, passed: false, error: err.message });
    }
  }

  const totalTests = question.testCases?.length || 1;
  const score = Math.round((passedCount / totalTests) * question.points);
  return { score, max: question.points, feedback: `${passedCount}/${totalTests} test cases passed`, testResults };
}

async function gradeTheory(question, answer) {
  // Only check if answer is empty/blank - rely on AI truthfulness evaluation
  if (!answer?.theoryAnswer || !answer.theoryAnswer.trim())
    return { score: 0, max: question.points, feedback: 'No answer provided', aiEvaluation: '' };

  const prompt = `You are a technical interviewer grading a theory/conceptual question.

Question: ${question.question}
Grading Rubric: ${question.rubric || 'Evaluate accuracy, depth, and clarity'}
Max Points: ${question.points}

Candidate's Answer:
${answer.theoryAnswer}

Grade this answer on a scale of 0 to ${question.points}. Be fair but strict.

Return ONLY this JSON structure:
{
  "score": <number>,
  "feedback": "one sentence summary",
  "aiEvaluation": "2-3 sentences detailed assessment"
}`;

  try {
    const content = await callAIWithFallback(prompt);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON format from AI');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      score: Math.min(Math.max(Math.round(parsed.score), 0), question.points),
      max: question.points,
      feedback: parsed.feedback,
      aiEvaluation: parsed.aiEvaluation
    };
  } catch (err) {
    console.error('[GradingAgent] Theory grading failed:', err);
    return { score: 0, max: question.points, feedback: 'Grading failed', aiEvaluation: 'Unable to evaluate' };
  }
}

async function gradeLogicVerification(session) {
  if (!session.logicVerificationQuestions?.length) {
    return { logic_depth_score: 0, reasoning: 'No logic verification data' };
  }

  const gradingData = (session.logicVerificationQuestions || []).map(prob => {
    const codingAnswer = (Array.isArray(session.answers) ? session.answers : []).find(a => a.questionIndex === prob.problemNumber - 1);
    const hasCode = codingAnswer?.code && codingAnswer.code.trim().length > 0;
    return {
      problem_title: prob.problemTitle,
      problem_number: prob.problemNumber,
      candidate_code: hasCode ? codingAnswer.code : '[NO CODE SUBMITTED]',
      has_code: hasCode,
      questions_and_answers: (prob.questions || []).map(q => ({
        type: q.type,
        question: q.question,
        answer: q.answer || '[NO RESPONSE]'
      }))
    };
  });

  const prompt = `
You are grading a candidate's logic verification answers for a coding assessment.

IMPORTANT GRADING RULES:
- For each problem where candidate has NO code: assign 0 for all follow-ups automatically.
- For each problem where candidate has NO RESPONSE to a follow-up: assign 0 for that question.
- Trap questions: 0 if no response or candidate AGREEs with the false premise.
- Never award partial credit for blank/no-response answers.

INPUT DATA:
${JSON.stringify(gradingData, null, 2)}

For each problem evaluate:
1. Follow-up answers: Did they demonstrate genuine understanding? Score 0-15 each
   - If has_code is false OR answer is '[NO RESPONSE]': score = 0
   - Partial answer: 0-7 points only
   - Good answer: 8-15 points
2. Trap question: Did they CORRECTLY identify the false statement?
   - Correctly identified the trap (showed it was wrong): +25 points
   - No response or AGREEed with the false premise: 0 points
   - Partially caught it: 0-10 points only

Return ONLY this JSON:
{
  "logic_depth_score": <0-100>,
  "trap_caught": <true/false>,
  "reasoning": "<1-2 sentence summary>",
  "per_problem_scores": [
    {
      "problem_number": 1,
      "score": <0-50>,
      "max_score": 50,
      "has_code": <true/false>,
      "no_response_count": <number of unanswered questions>
    }
  ]
}
`;

  try {
    const content = await callAIWithFallback(prompt);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON format from AI');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('[GradingAgent] Logic grading failed:', err);
    return {
      logic_depth_score: 0,
      trap_caught: false,
      reasoning: 'Logic grading failed - all providers unavailable',
      per_problem_scores: []
    };
  }
}

async function gradeSession(sessionOrId, assessmentInput, otherSessions) {
  try {
    let session = sessionOrId;
    let assessment = assessmentInput;

    if (typeof sessionOrId === 'string') {
        session = await CandidateSession.findById(sessionOrId);
        if (!session) throw new Error('Session not found by ID');
        if (!assessment) {
            assessment = await Assessment.findById(session.assessment);
        }
    }

    if (!session) {
      throw new Error('Session not found');
    }

    const questions = session.sessionQuestions || (assessment && assessment.questions) || [];

    if (questions.length === 0) {
      return {
        percentage: 0,
        total: 0,
        maxTotal: 0,
        logicDepth: 0,
        logicAiReasoning: 'Questions data missing',
        error: 'Questions data missing',
        recommendation: 'no_hire'
      };
    }
    if (!session.answers) {
      session.answers = [];
    }

    if (!Array.isArray(questions)) {
      throw new Error('Questions array is invalid');
    }

    const scoreBreakdown = { mcq: 0, coding: 0, theory: 0, mcqMax: 0, codingMax: 0, theoryMax: 0 };
    const evaluations = [];
    let combinedAiEvaluation = '';

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const ans = (Array.isArray(session.answers) ? session.answers : []).find(a => a.questionIndex === i);

      if (q.type === 'mcq') {
        const result = gradeMCQ(q, ans);
        scoreBreakdown.mcq += result.score;
        scoreBreakdown.mcqMax += result.max;
        evaluations.push({ index: i, type: 'mcq', ...result });
      } else if (q.type === 'coding') {
        const result = gradeCoding(q, ans);
        scoreBreakdown.coding += result.score;
        scoreBreakdown.codingMax += result.max;
        evaluations.push({ index: i, type: 'coding', ...result });
      } else if (q.type === 'theory') {
        const result = await gradeTheory(q, ans);
        scoreBreakdown.theory += result.score;
        scoreBreakdown.theoryMax += result.max;
        evaluations.push({ index: i, type: 'theory', ...result });
        if (result.aiEvaluation) combinedAiEvaluation += `\n${q.question}: ${result.aiEvaluation}`;
      }
    }

    const logicResult = await gradeLogicVerification(session);
    let logicDepthScore = logicResult.logic_depth_score || 0;

    const hasS3 = Array.isArray(session.logicVerificationQuestions) && session.logicVerificationQuestions.length > 0;
    const hasAnyS3Answer = hasS3 && session.logicVerificationQuestions.some(prob =>
      Array.isArray(prob.questions) && prob.questions.some(q => (q.answer || '').trim().length > 0)
    );

    const techScore = scoreBreakdown.mcq + scoreBreakdown.coding;
    const techMax = scoreBreakdown.mcqMax + scoreBreakdown.codingMax;
    const theoryScore = scoreBreakdown.theory;
    const theoryMax = scoreBreakdown.theoryMax;

    const techPercentage = techMax > 0 ? Math.round((techScore / techMax) * 100) : 0;
    const theoryPercentage = theoryMax > 0 ? Math.round((theoryScore / theoryMax) * 100) : 0;

    // Only count logic depth if S3 exists AND at least one answer is non-blank
    const logicMax = hasAnyS3Answer ? 100 : 0;
    if (!hasAnyS3Answer) logicDepthScore = 0;

    const total = techScore + theoryScore + logicDepthScore;
    const maxTotal = techMax + theoryMax + logicMax;
    const overallPercentage = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;

    let recommendation = 'no_decision';
    if (techScore === 0 && !hasAnyS3Answer) recommendation = 'no_hire';
    else if (overallPercentage >= 80) recommendation = 'strong_hire';
    else if (overallPercentage >= 65) recommendation = 'hire';
    else if (overallPercentage >= 45) recommendation = 'maybe';
    else recommendation = 'no_hire';

    const plagiarismResult = detectPlagiarism(session, otherSessions || []);

    const totalQuestions = questions.length;
    const answeredQuestions = evaluations.filter(e => {
      if (e.type === 'mcq') return e.answer?.selectedOption !== undefined;
      if (e.type === 'coding') return e.answer?.code && e.answer.code.trim().length > 0;
      if (e.type === 'theory') return e.answer?.theoryAnswer && e.answer.theoryAnswer.trim().length > 0;
      return false;
    }).length;
    const hasAllBlankAnswers = answeredQuestions === 0;

    return {
      percentage: overallPercentage,
      techPercentage,
      theoryPercentage,
      total,
      maxTotal,
      scoreBreakdown,
      logicDepth: logicDepthScore,
      logicAiReasoning: logicResult.reasoning || '',
      trapCaught: logicResult.trap_caught || false,
      plagiarismScore: plagiarismResult.score,
      plagiarismFlagged: plagiarismResult.flagged,
      evaluations,
      aiEvaluationSummary: combinedAiEvaluation.trim(),
      recommendation,
      validity: {
        totalQuestions,
        answeredQuestions,
        unansweredCount: totalQuestions - answeredQuestions,
        isAllBlank: hasAllBlankAnswers,
        hasAnyS3Answer
      }
    };
  } catch (err) {
    console.error('[GradingAgent] Session grading error:', err);
    return {
      percentage: 0,
      total: 0,
      maxTotal: 0,
      logicDepth: 0,
      logicAiReasoning: 'Grading error',
      error: err.message,
      recommendation: 'no_hire'
    };
  }
}

module.exports = { gradeSession, gradeMCQ, gradeCoding, gradeTheory, gradeLogicVerification };

function formatInput(input) {
  if (typeof input === 'string') return input;
  if (typeof input === 'object') {
    return JSON.stringify(input, null, 2); // Pretty-print with 2-space indentation
  }
  return String(input);
}