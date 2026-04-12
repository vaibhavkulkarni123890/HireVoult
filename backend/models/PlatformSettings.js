const mongoose = require('mongoose');

// Singleton document storing aggregate platform ratings for fast retrieval
const platformSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },
  aggregateRating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  companyReviews: { type: Number, default: 0 },
  candidateReviews: { type: Number, default: 0 },
  companyAvgRating: { type: Number, default: 0 },
  candidateAvgRating: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
