const mongoose = require('mongoose');

const jobRoleSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  title: { type: String, required: true },
  jd: { type: String, required: true },
  about: { type: String, required: true }, // Company/Role context for AI generator
  salary: {
    min: Number,
    max: Number,
    currency: { type: String, default: 'USD' }
  },
  experienceYears: { type: Number, default: 0 },
  skills: [String],
  questionConfig: {
    mcq: { 
      count: { type: Number, default: 2 },
      difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'auto'], default: 'medium' }
    },
    coding: { 
      count: { type: Number, default: 2 },
      difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'auto'], default: 'medium' },
      questions: [{
        difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'auto'] }
      }]
    },
    theory: { 
      count: { type: Number, default: 2 },
      difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'auto'], default: 'medium' }
    },
    languages: { type: [String], default: ['javascript', 'python'] }
  },
  status: {
    type: String,
    enum: ['draft', 'questions_pending', 'questions_ready', 'approved', 'paid', 'active', 'closed'],
    default: 'draft'
  },
  isFreeAssessment: { type: Boolean, default: false },
  candidateLimit: { type: Number, default: 50 },
  seniorityLevel: { type: String, enum: ['junior', 'mid', 'senior', 'lead'], default: 'mid' },
  pricePerAssessment: { type: Number, default: 699 },    // INR — locked at creation
  pricePerAssessmentUSD: { type: Number, default: 9 },   // USD — locked at creation
  scheduleStartDate: Date,          // Default Window open datetime for links
  scheduleEndDate: Date,            // Default Window close datetime for links
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('JobRole', jobRoleSchema);
