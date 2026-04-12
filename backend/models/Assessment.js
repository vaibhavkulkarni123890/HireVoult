const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  type: { type: String, enum: ['mcq', 'coding', 'theory'], required: true },
  // Common
  question: { type: String, required: true },  // For coding: the full description
  title: String,                                // Coding: short title like "Two Sum"
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  points: { type: Number, default: 10 },
  timeLimit: { type: Number, default: 180 },   // seconds
  reasoning: String,                            // Why this Q was chosen — shown to company only
  // MCQ fields
  options: [String],
  correctOption: Number,
  // Coding fields
  constraints: [String],                        // e.g. ["2 <= n <= 10^4", ...]
  examples: [{
    input: String,
    output: String,
    explanation: String
  }],
  starterCode: { type: Map, of: String },       // { javascript: '...', python: '...' }
  testCases: [{
    input: mongoose.Schema.Types.Mixed,
    expectedOutput: mongoose.Schema.Types.Mixed,
    isVisible: { type: Boolean, default: true },
    isHidden: { type: Boolean, default: false }  // false = visible to candidate, true = hidden
  }],
  // Theory / grading
  rubric: String
});

const assessmentSchema = new mongoose.Schema({
  jobRole: { type: mongoose.Schema.Types.ObjectId, ref: 'JobRole', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  questions: [questionSchema],
  // Between-days pool: 10x questions for random selection
  questionPool: [questionSchema],
  approvedAt: Date,
  pricing: {
    basePrice: Number,
    finalPrice: Number,
    currency: String,
    country: String,
    seniorityLevel: String,
    seniorityLabel: String,
    candidateCount: Number,
    totalCostINR: Number,
    totalCostUSD: Number,
    isFree: Boolean,
    breakdown: mongoose.Schema.Types.Mixed
  },
  paidAt: Date,
  isFree: { type: Boolean, default: false },
  generatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Assessment', assessmentSchema);
