const mongoose = require('mongoose');

const proctoringEventSchema = new mongoose.Schema({
  type: { type: String, enum: ['tab_switch', 'fullscreen_exit', 'screen_share_detected', 'camera_snapshot', 'copy_attempt', 'right_click', 'devtools', 'device_change'] },
  timestamp: { type: Date, default: Date.now },
  details: String,
  snapshot: String // base64 snapshot URL
});

const answerSchema = new mongoose.Schema({
  questionIndex: Number,
  questionType: { type: String, enum: ['mcq', 'coding', 'theory'] },
  // MCQ
  selectedOption: Number,
  // Coding
  code: String,
  language: String,
  testCasesResults: [{
    passed: Boolean,
    input: mongoose.Schema.Types.Mixed,
    expected: mongoose.Schema.Types.Mixed,
    actual: mongoose.Schema.Types.Mixed,
    isVisible: { type: Boolean, default: true },
    isHidden: { type: Boolean, default: false },
    error: String
  }],
  // Theory
  theoryAnswer: String,
  // Timing
  startedAt: Date,
  submittedAt: Date,
  timeSpent: Number, // seconds
});

const candidateSessionSchema = new mongoose.Schema({
  link: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentLink', required: true },
  assessment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true },
  jobRole: { type: mongoose.Schema.Types.ObjectId, ref: 'JobRole', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  // Candidate identity
  candidateName: { type: String, required: true },
  candidateEmail: { type: String, required: true, lowercase: true },
  identityPhoto: { type: String }, // Base64 snapshot taken at start
  // Questions for this session (from pool for between-days mode)
  sessionQuestions: [mongoose.Schema.Types.Mixed],
  // State
  status: {
    type: String,
    enum: ['pending', 'active', 'submitted', 'terminated', 'graded'],
    default: 'pending'
  },
  currentSection: { type: Number, default: 1 },
  sectionStatus: {
    type: Map,
    of: String,
    default: { 1: 'not_started', 2: 'not_started', 3: 'not_started' }
  },
  currentQuestionIndex: { type: Number, default: 0 },
  terminationReason: String,
  startedAt: Date,
  submittedAt: Date,
  // Answers
  answers: [answerSchema],
  // Logic Verification (Section 3)
  logicVerificationQuestions: [{
      problemNumber: Number,
      problemTitle: String,
      timeLimit: { type: Number, default: 120 },
      questions: [{
          type: { type: String, enum: ['follow_up', 'trap'] },
          question: String,
          answer: String,
          score: Number
      }]
  }],
  // Proctoring
  proctoringEvents: [proctoringEventSchema],
  warningCount: { type: Number, default: 0 },
  // Scores (computed after grading)
  scores: {
    mcq: Number,
    coding: Number,
    theory: Number,
    logicDepth: Number, // Logic depth score (Section 3)
    total: Number,
    maxTotal: Number,
    percentage: Number,
    plagiarismFlag: { type: Boolean, default: false },
    plagiarismScore: Number, // 0-100, higher means more similar to others
    aiEvaluation: String, // Gemini's narrative evaluation
    recommendation: { type: String, enum: ['strong_hire', 'hire', 'maybe', 'no_hire'] },
    evaluations: [mongoose.Schema.Types.Mixed] // Store individual question results
  },
  gradedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CandidateSession', candidateSessionSchema);
