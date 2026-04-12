const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const companySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  country: { type: String, required: true },
  website: String,
  logo: String,
  freeAssessmentsUsed: { type: Number, default: 0 },
  freeBatchUsed: { type: Boolean, default: false },   // First batch free flag
  plan: { type: String, enum: ['free', 'paid'], default: 'free' },
  preferredCurrency: { type: String, enum: ['INR', 'USD'], default: 'INR' },
  createdAt: { type: Date, default: Date.now }
});

companySchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

companySchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('Company', companySchema);
