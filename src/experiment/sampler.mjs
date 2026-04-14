// src/experiment/sampler.mjs
// Deterministic NeurIPS 2024 sampler with stratified 10/10/10.
// (Salvo 2026 §12.3 sampling frame, Appendix C.3)
//
// Selection is determined by SHA256(commit_hash || "sample-papers").
// Sampling-frame hash (C.3) = SHA256 of the fetched snapshot.
// The snapshot is cached at canon/neurips-cache/neurips-2024-listing.json.
//
// If the listing is unreachable, the run aborts rather than silently
// substituting — preregistration integrity requires the committed frame.

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { seededRng, deriveSampleSeed } from "./seed.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, "..", "..", "canon", "neurips-cache");
const VENUE_ID = "NeurIPS.cc/2024/Conference";

export function sampleFrameHash(snapshot) {
  const canonical = JSON.stringify({
    venue: snapshot.venue,
    count: snapshot.papers.length,
    paper_ids: snapshot.papers.map((p) => p.id).sort(),
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export async function fetchNeurips2024Listing() {
  await mkdir(CACHE_DIR, { recursive: true });
  const cachePath = join(CACHE_DIR, "neurips-2024-listing.json");
  try {
    await access(cachePath);
    return JSON.parse(await readFile(cachePath, "utf-8"));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  const all_papers = [];
  const base = `https://api2.openreview.net/notes?content.venueid=${encodeURIComponent(VENUE_ID)}&limit=1000`;
  let offset = 0;
  while (true) {
    const res = await fetch(`${base}&offset=${offset}`, {
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`openreview HTTP ${res.status}`);
    const json = await res.json();
    const notes = json?.notes || [];
    if (notes.length === 0) break;
    for (const n of notes) {
      all_papers.push({
        id: n.id || n.forum,
        title:
          (typeof n.content?.title === "object"
            ? n.content.title.value
            : n.content?.title) || "",
        abstract:
          (typeof n.content?.abstract === "object"
            ? n.content.abstract.value
            : n.content?.abstract) || "",
        keywords:
          (typeof n.content?.keywords === "object"
            ? n.content.keywords.value
            : n.content?.keywords) || [],
        venue: VENUE_ID,
      });
    }
    offset += notes.length;
    if (notes.length < 1000) break;
  }
  const snapshot = {
    venue: VENUE_ID,
    fetched_at: new Date().toISOString(),
    papers: all_papers,
  };
  await writeFile(cachePath, JSON.stringify(snapshot, null, 2));
  return snapshot;
}

function classifyStratum(paper) {
  const blob = (
    paper.title +
    " " +
    (Array.isArray(paper.keywords) ? paper.keywords.join(" ") : "") +
    " " +
    (paper.abstract || "").slice(0, 500)
  ).toLowerCase();
  if (
    /information theory|pac learning|statistical learning theory|generalization bound|shannon|sample complexity|concentration inequality/.test(
      blob,
    )
  ) {
    return "strata_3"; // stat.ML, cs.IT — theoretical
  }
  if (
    /natural language|machine translation|speech|image|vision|visual|text generation|dialogue|question answering|nlp|computer vision/.test(
      blob,
    )
  ) {
    return "strata_2"; // cs.CL, cs.CV — applied
  }
  return "strata_1"; // cs.LG, cs.AI — generalist ML
}

export async function sampleStratified(snapshot, commitHash, perStratum = 10) {
  const seed = deriveSampleSeed(commitHash);
  const rng = seededRng(seed);
  const stratified = { strata_1: [], strata_2: [], strata_3: [] };
  for (const p of snapshot.papers) {
    if (!p.abstract || p.abstract.length < 200) continue;
    stratified[classifyStratum(p)].push(p);
  }
  const sample = [];
  for (const key of ["strata_1", "strata_2", "strata_3"]) {
    const pool = stratified[key];
    if (pool.length < perStratum) {
      throw new Error(
        `stratum ${key} has only ${pool.length} papers, need ${perStratum}`,
      );
    }
    const shuffled = pool.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    sample.push(...shuffled.slice(0, perStratum));
  }
  return sample;
}
