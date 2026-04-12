/**
 * Pricing Engine — Seniority-based per-assessment pricing
 * Prices are locked at role/batch creation time — NEVER recalculated
 *
 * Tiers:
 *   Junior  (0-2 yrs):  ₹399  / $5
 *   Mid     (3-5 yrs):  ₹699  / $9
 *   Senior  (6-8 yrs):  ₹1,199/ $15
 *   Lead    (8+ yrs):   ₹1,999/ $25
 */

const PRICING_TIERS = {
  junior: { minYears: 0, maxYears: 2, inr: 499, usd: 6, label: 'Junior' },
  mid:    { minYears: 3, maxYears: 5, inr: 499, usd: 6, label: 'Mid Level' },
  senior: { minYears: 6, maxYears: 8, inr: 499, usd: 6, label: 'Senior' },
  lead:   { minYears: 9, maxYears: 99, inr: 499, usd: 6, label: 'Lead/Principal' }
};

/**
 * Determine seniority level from experience years
 */
function getSeniorityLevel(experienceYears) {
  const yrs = Number(experienceYears) || 0;
  if (yrs >= 8) return 'lead';
  if (yrs >= 6) return 'senior';
  if (yrs >= 3) return 'mid';
  return 'junior';
}

/**
 * Get pricing for a given seniority level
 */
function getPricingForLevel(level) {
  return PRICING_TIERS[level] || PRICING_TIERS.mid;
}

/**
 * Calculate full pricing for a role at creation time.
 * Returns INR + USD prices + seniority info.
 * Pass candidateCount to get batch total.
 */
function calculatePricing(experienceYears, candidateCount = 1) {
  const level = getSeniorityLevel(experienceYears);
  const pricing = getPricingForLevel(level);
  const count = Math.max(1, Number(candidateCount));

  return {
    seniorityLevel: level,
    seniorityLabel: pricing.label,
    pricePerAssessment: pricing.inr,
    pricePerAssessmentUSD: pricing.usd,
    candidateCount: count,
    totalINR: pricing.inr * count,
    totalUSD: pricing.usd * count
  };
}

module.exports = { calculatePricing, getSeniorityLevel, getPricingForLevel, PRICING_TIERS };


