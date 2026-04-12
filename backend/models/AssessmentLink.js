const mongoose = require('mongoose');
const crypto = require('crypto');

const assessmentLinkSchema = new mongoose.Schema({
  token: { 
    type: String, 
    unique: true,
    default: () => crypto.randomUUID()
  },
  jobRole: { type: mongoose.Schema.Types.ObjectId, ref: 'JobRole', required: true },
  assessment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  linkType: { type: String, enum: ['static', 'dynamic'], default: 'static' },
  // Dynamic link: pre-filled candidate info
  candidateName: String,
  candidateEmail: String,
  // Full scheduling system (all dates in UTC, displayed in IST)
  scheduleStartDate: Date,          // Window open datetime
  scheduleEndDate: Date,            // Window close datetime
  dailyWindowStart: String,         // e.g. "10:00" — IST time, applies every day in range
  dailyWindowEnd: String,           // e.g. "13:00" — IST time
  timezone: { type: String, default: 'Asia/Kolkata' },
  // Legacy - keep for backward compat
  scheduleType: { type: String, enum: ['immediate', 'scheduled', 'between_days'], default: 'immediate' },
  // Pricing — locked at creation time, never recalculated
  pricePerAssessment: { type: Number, default: 0 },     // INR
  pricePerAssessmentUSD: { type: Number, default: 0 },  // USD
  totalBatchCost: { type: Number, default: 0 },          // INR total for this batch
  isFree: { type: Boolean, default: false },
  // Status
  isActive: { type: Boolean, default: true },
  usageCount: { type: Number, default: 0 },
  maxUsage: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now }
});

// Pre-save validator: ensure token is never null/undefined
assessmentLinkSchema.pre('save', function(next) {
  if (!this.token) {
    this.token = crypto.randomUUID();
  }
  next();
});

module.exports = mongoose.model('AssessmentLink', assessmentLinkSchema);
