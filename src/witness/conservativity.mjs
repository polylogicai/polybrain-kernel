// src/witness/conservativity.mjs
// Conservativity primitive. (Salvo 2026, §7 witness primitive #1)
//
// Ported from the private polylogicai/polybrain reference implementation at
// ~/polybrain/src/witness/conservativity.mjs (SHA-256 at port time:
// d1c74a7342...). Converted from readFileSync/existsSync to async fs/promises
// and wrapped to return the { verdict, detail } shape the composer expects.
//
// Deterministic recall-based witness with numeric tolerance matching.
// Pure function. No LLM. The recall-over-Jaccard choice is deliberate:
// a small claim against a large substrate always has tiny Jaccard even
// when every claim token appears in the substrate, so the correct
// discipline is "does the substrate support every meaningful token in
// the claim" → recall = |claim ∩ substrate| / |claim|.
//
// PASS iff recall ≥ min_overlap AND every numeric in claim is within
// tolerance of a numeric in substrate.
// FAIL iff recall below threshold OR any numeric is unmatchable.
// PENDING iff no substrate available.

import { readFile, access } from "node:fs/promises";

const RECALL_MIN_DEFAULT = 0.6;
const NUMERIC_TOLERANCE_DEFAULT = 0.02;

const STOPWORDS = new Set([
  "the", "a", "an", "of", "in", "on", "at", "to", "for", "with",
  "by", "is", "are", "was", "were", "be", "been", "being", "and", "or",
  "but", "if", "then", "this", "that", "these", "those", "it", "as", "from",
  "into", "over", "under", "than", "so", "such", "not", "no", "yes", "also",
  "can", "will", "would", "could", "should", "may", "might", "do", "does",
  "did", "has", "have", "had",
]);

function tokenize(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9.\- ]+/g, " ")
    .split(/\s+/)
    .filter((t) => t && t.length > 2 && !STOPWORDS.has(t));
}

function extractNumerics(s) {
  const re =
    /-?\d{1,3}(?:,\d{3})+(?:\.\d+)?|-?\d+\.?\d*(?:[eE][-+]?\d+)?|-?\.\d+/g;
  const out = [];
  for (const m of (s || "").matchAll(re)) {
    const raw = m[0].replace(/,/g, "");
    const n = Number(raw);
    if (!Number.isNaN(n)) out.push(n);
  }
  return out;
}

function recallAinB(claimTokens, substrateTokens) {
  const claimSet = new Set(claimTokens);
  if (claimSet.size === 0) return 0;
  const substrateSet = new Set(substrateTokens);
  let present = 0;
  for (const t of claimSet) if (substrateSet.has(t)) present++;
  return present / claimSet.size;
}

function numericMatched(claimNums, substrateNums, tolerance) {
  if (claimNums.length === 0) return true;
  for (const c of claimNums) {
    let matched = false;
    for (const s of substrateNums) {
      if (Number.isInteger(c) && Number.isInteger(s) && c === s) {
        matched = true;
        break;
      }
      const denom = Math.max(Math.abs(c), 1e-9);
      if (Math.abs(c - s) / denom <= tolerance) {
        matched = true;
        break;
      }
    }
    if (!matched) return false;
  }
  return true;
}

export async function conservativity(claim, rules = {}) {
  const text = claim?.text ?? "";
  const substratePath = claim?.substratePath ?? "";
  const substrateTextInline = claim?.substrateText ?? "";

  const recallMin =
    rules?.witness?.conservativity?.min_overlap ?? RECALL_MIN_DEFAULT;
  const tolerance =
    rules?.witness?.conservativity?.numeric_tolerance ??
    NUMERIC_TOLERANCE_DEFAULT;

  // Substrate can be inline text or a file path.
  let substrate = substrateTextInline;
  if (!substrate && substratePath) {
    try {
      await access(substratePath);
      substrate = await readFile(substratePath, "utf-8");
    } catch {
      return { verdict: "PENDING", detail: "substrate path unreachable" };
    }
  }

  if (!substrate || !substrate.trim()) {
    return { verdict: "PENDING", detail: "empty substrate" };
  }

  const claimTokens = tokenize(text);
  if (claimTokens.length === 0) {
    return { verdict: "PENDING", detail: "no meaningful tokens in claim" };
  }

  const substrateTokens = tokenize(substrate);
  const recall = recallAinB(claimTokens, substrateTokens);
  const claimNums = extractNumerics(text);
  const substrateNums = extractNumerics(substrate);
  const numsOk = numericMatched(claimNums, substrateNums, tolerance);

  if (recall >= recallMin && numsOk) {
    return {
      verdict: "PASS",
      detail: `recall ${recall.toFixed(2)} ≥ ${recallMin}, numerics matched`,
    };
  }

  const reason =
    recall < recallMin
      ? `recall ${recall.toFixed(2)} < ${recallMin}`
      : "numeric mismatch";
  return { verdict: "FAIL", detail: reason };
}
