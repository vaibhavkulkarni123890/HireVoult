/**
 * Plagiarism Detector
 * Uses token fingerprinting and Levenshtein distance to compare candidate answers
 */

/**
 * Compute Levenshtein distance between two strings
 */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Similarity ratio (0-1) based on Levenshtein
 */
function similarity(a, b) {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return (maxLen - levenshtein(a, b)) / maxLen;
}

/**
 * Normalize code for comparison (strip comments, whitespace, variable names)
 */
function normalizeCode(code) {
  if (!code) return '';
  return code
    .replace(/\/\/.*$/gm, '') // remove single line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // remove multi-line comments
    .replace(/#.*$/gm, '') // remove python comments
    .replace(/\s+/g, ' ') // collapse whitespace
    .replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, 'VAR') // normalize identifiers
    .trim()
    .toLowerCase();
}

/**
 * Check a session's answers against other sessions for the same role
 * Returns plagiarism score 0-100 (higher = more suspicious)
 * @param {Object} session - CandidateSession
 * @param {Object[]} otherSessions - Other sessions for same assessment
 */
function detectPlagiarism(session, otherSessions) {
  if (!otherSessions || otherSessions.length === 0) return { score: 0, flags: [] };

  const flags = [];
  let maxSimilarity = 0;

  for (const other of otherSessions) {
    if (other._id.toString() === session._id.toString()) continue;

    for (const ans of session.answers || []) {
      const otherAns = (other.answers || []).find(a => a.questionIndex === ans.questionIndex);
      if (!otherAns) continue;

      let sim = 0;
      if (ans.questionType === 'coding' && ans.code && otherAns.code) {
        sim = similarity(normalizeCode(ans.code), normalizeCode(otherAns.code));
      } else if (ans.questionType === 'theory' && ans.theoryAnswer && otherAns.theoryAnswer) {
        sim = similarity(ans.theoryAnswer.toLowerCase(), otherAns.theoryAnswer.toLowerCase());
      }

      if (sim > 0.85) {
        flags.push({
          questionIndex: ans.questionIndex,
          matchedCandidate: other.candidateEmail,
          similarityPercent: Math.round(sim * 100)
        });
        maxSimilarity = Math.max(maxSimilarity, sim);
      }
    }
  }

  return {
    score: Math.round(maxSimilarity * 100),
    flags,
    flagged: maxSimilarity > 0.85
  };
}

module.exports = { detectPlagiarism, similarity };
