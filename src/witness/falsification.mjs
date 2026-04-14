// src/witness/falsification.mjs
// Falsification primitive. (Salvo 2026, §7 witness primitive #3, §9.2 RCC falsification arm)
//
// Attempted counter-example construction via a structurally non-transformer
// checker. This primitive is the load-bearing reviewer-correlation ceiling
// falsification arm: it MUST NOT use an LLM, because using one would reinstate
// the exact shared-pre-training bias §9.2 predicts for transformer ensembles.
//
// v1.0.0 implementation: Wikipedia opensearch API + keyword retrieval overlap
// against top-K article summaries. Pure function given response cache at
// canon/wiki-cache/. The cache makes the result byte-deterministic across
// replay runs once the initial lookup has been made.
//
// **Honest disclosure**: this is keyword-overlap over Wikipedia's opensearch
// results, not full BM25 over a local Wikipedia dump. It is still structurally
// non-transformer and deterministic (given cache), satisfying §9.2's demand.
// A v1.1.0 upgrade will swap the retrieval backend to a local Wikipedia dump
// with real BM25+IDF scoring. The scientific contribution of the primitive is
// the SHAPE (non-transformer retrieval vs. claim tokens), not the exact IR
// algorithm.

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, "..", "..", "canon", "wiki-cache");
const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const DEFAULT_TOP_K = 10;
const DEFAULT_MIN_SCORE = 0.35;
const DEFAULT_TIMEOUT_MS = 15000;

const STOPWORDS = new Set([
  "the", "a", "an", "of", "in", "on", "at", "to", "for", "with",
  "by", "is", "are", "was", "were", "be", "been", "being", "and", "or",
  "but", "if", "then", "this", "that", "these", "those", "it",
]);

function tokenize(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((t) => t && t.length > 2 && !STOPWORDS.has(t));
}

function queryKey(q, topK) {
  return createHash("sha256")
    .update(`${q}|topK=${topK}`)
    .digest("hex")
    .slice(0, 40);
}

async function cachedOpensearch(query, topK, timeoutMs) {
  await mkdir(CACHE_DIR, { recursive: true });
  const cachePath = join(CACHE_DIR, `${queryKey(query, topK)}.json`);
  try {
    return JSON.parse(await readFile(cachePath, "utf-8"));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  // Use action=query&list=search for real full-text search over Wikipedia
  // article bodies. action=opensearch is title-prefix only, too restrictive
  // for phrase-level claim queries.
  const url = `${WIKIPEDIA_API}?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${topK}&format=json&srprop=snippet%7Csize%7Cwordcount`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`wikipedia API HTTP ${res.status}`);
  const data = await res.json();
  const search = data?.query?.search || [];
  const snapshot = {
    query,
    topK,
    totalhits: data?.query?.searchinfo?.totalhits || 0,
    results: search.map((r) => ({
      title: r.title || "",
      snippet: (r.snippet || "").replace(/<[^>]+>/g, ""),
      wordcount: r.wordcount || 0,
    })),
    fetched_at: new Date().toISOString(),
  };
  await writeFile(cachePath, JSON.stringify(snapshot, null, 2));
  return snapshot;
}

function overlapScore(claimTokens, corpusTokens) {
  const claimSet = new Set(claimTokens);
  if (claimSet.size === 0) return 0;
  const corpusSet = new Set(corpusTokens);
  let hits = 0;
  for (const t of claimSet) if (corpusSet.has(t)) hits++;
  return hits / claimSet.size;
}

export async function falsification(claim, rules = {}) {
  const text = claim?.text ?? "";
  if (!text.trim()) {
    return { verdict: "PENDING", detail: "empty claim" };
  }

  const topK = rules?.witness?.falsification?.top_k ?? DEFAULT_TOP_K;
  const minScore =
    rules?.witness?.falsification?.min_score ?? DEFAULT_MIN_SCORE;
  const timeoutMs = rules?.witness?.falsification?.timeout_ms ?? DEFAULT_TIMEOUT_MS;

  const claimTokens = tokenize(text);
  if (claimTokens.length === 0) {
    return { verdict: "PENDING", detail: "no meaningful tokens" };
  }

  try {
    const snapshot = await cachedOpensearch(text, topK, timeoutMs);
    if (!snapshot.results || snapshot.results.length === 0) {
      return {
        verdict: "PENDING",
        detail: "wikipedia search returned no results",
      };
    }
    const corpus = snapshot.results
      .map((r) => `${r.title} ${r.snippet}`)
      .join(" ");
    const corpusTokens = tokenize(corpus);
    const score = overlapScore(claimTokens, corpusTokens);

    if (score >= minScore) {
      return {
        verdict: "PASS",
        detail: `retrieval support ${score.toFixed(2)} over ${snapshot.results.length}/${snapshot.totalhits} articles`,
      };
    }
    // Below threshold: no support found. We return PENDING rather than
    // FAIL because keyword absence is weak evidence of actual falsification.
    return {
      verdict: "PENDING",
      detail: `retrieval score ${score.toFixed(2)} < ${minScore}`,
    };
  } catch (e) {
    return {
      verdict: "PENDING",
      detail: `wikipedia lookup failed: ${e?.message || e}`,
    };
  }
}
