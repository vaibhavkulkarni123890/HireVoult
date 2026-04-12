const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  type: { type: String, enum: ['candidate', 'company'], required: true },
  
  // Session reference (candidate feedback)
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'CandidateSession' },
  
  // Company reference (company feedback)
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },

  // Shared ratings (1-5 stars)
  overallRating: { type: Number, min: 1, max: 5, required: true },
  
  // Candidate-specific ratings
  questionQualityRating: { type: Number, min: 1, max: 5 },
  platformRating: { type: Number, min: 1, max: 5 },
  
  // Company-specific ratings
  assessmentQualityRating: { type: Number, min: 1, max: 5 },
  logicScoreUsefulnessRating: { type: Number, min: 1, max: 5 },
  wouldRecommend: Boolean,
  companyName: String,         // Optional — for testimonial display

  // Comment — requires moderation before appearing on landing page
  comment: { type: String, maxlength: 300 },
  isApproved: { type: Boolean, default: false },
  isRejected: { type: Boolean, default: false },
  
  // Candidate feedback is always anonymous
  isAnonymous: { type: Boolean, default: true },
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Feedback', feedbackSchema);
