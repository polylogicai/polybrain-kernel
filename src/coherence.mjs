// src/coherence.mjs
// The coherence web. (Salvo 2026 §9.1)
//
// A graph G = (V, E) where V is the set of canon rows and E ⊆ V × V × {reinforces, contradicts}
// is a typed relation, computed empirically by token-overlap similarity gated by
// negation-polarity mismatch. On each new claim, edges are constructed against the
// existing canon; a claim whose incident edges contain ANY `contradicts` edge has
// its verdict forced to CHALLENGED regardless of the witness stack's output.
//
// This is a lightweight empirical surrogate for classical AGM-style belief revision.
// Pure function. No LLM. Deterministic given the canon.

const STOPWORDS = new Set([
  "the", "a", "an", "of", "in", "on", "at", "to", "for", "with",
  "by", "is", "are", "was", "were", "be", "been", "being", "and", "or",
  "but", "if", "then", "this", "that", "these", "those", "it", "as", "from",
  "into", "over", "under", "than", "so", "such", "also", "can",
  "will", "would", "could", "should", "may", "might", "do", "does",
  "did", "has", "have", "had",
  "i", "you", "we", "they", "he", "she", "my", "your", "our", "their",
  "his", "her", "its",
]);

const NEGATION_TOKENS = new Set([
  "not", "no", "never", "none", "without", "neither", "nor", "cannot",
  "wasnt", "isnt", "arent", "doesnt", "dont", "didnt", "wont", "wouldnt",
  "shouldnt", "couldnt", "hasnt", "havent", "hadnt", "false", "untrue",
]);

function tokenize(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9' -]+/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/'/g, ""))
    .filter((t) => t && t.length > 2 && !STOPWORDS.has(t));
}

function hasNegation(s) {
  const toks = (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/);
  for (const t of toks) if (NEGATION_TOKENS.has(t)) return true;
  return false;
}

function jaccard(aTokens, bTokens) {
  const A = new Set(aTokens);
  const B = new Set(bTokens);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

// Finds all canon rows that the incoming claim reinforces or contradicts.
//   reinforces: similarity >= 0.5 AND same negation polarity
//   contradicts: similarity >= 0.35 AND opposite negation polarity
export function findRelationships(claimText, canonRows) {
  const claimTokens = tokenize(claimText);
  const claimNeg = hasNegation(claimText);
  const reinforces = [];
  const contradicts = [];
  for (const row of canonRows) {
    const rowText = row.payload?.text || row.payload?.claim_text || "";
    if (!rowText) continue;
    const rowTokens = tokenize(rowText);
    const score = jaccard(claimTokens, rowTokens);
    if (score < 0.35) continue;
    const rowNeg = hasNegation(rowText);
    const polarityMismatch = claimNeg !== rowNeg;
    if (score >= 0.5 && !polarityMismatch) {
      reinforces.push({
        row_index: row.row_index,
        row_hash: row.row_hash,
        score,
        text: rowText,
      });
    } else if (score >= 0.35 && polarityMismatch) {
      contradicts.push({
        row_index: row.row_index,
        row_hash: row.row_hash,
        score,
        text: rowText,
      });
    }
  }
  return { reinforces, contradicts };
}

// Coherence gate for a witness-stack verdict.
// If the coherence web finds any `contradicts` edge, return CHALLENGED.
// Otherwise return the original verdict unchanged.
export function applyCoherenceGate(verdict, relationships) {
  if (relationships?.contradicts?.length > 0) return "CHALLENGED";
  return verdict;
}

// Convenience: given a claim text and the canon, return the modified verdict
// and the relationship details. Pure function over canon rows.
export function coherenceCheck(claimText, canonRows, baseVerdict) {
  const relationships = findRelationships(claimText, canonRows);
  const verdict = applyCoherenceGate(baseVerdict, relationships);
  return { verdict, relationships };
}
