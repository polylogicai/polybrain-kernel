// src/experiment/sampler.mjs
// Deterministic NeurIPS 2024 sampler with stratified 10/10/10.
// (Salvo 2026 §12.3 sampling frame, Appendix C.3)
//
// Source: papers.nips.cc/paper_files/paper/2024 (the NeurIPS Foundation's
// official accepted-paper listing). Each paper has:
//   - a hash-based id derived from the URL
//   - a title from the listing
//   - an abstract fetched from hash/XXXX-Abstract-Conference.html on demand
//
// Sampling:
//   1. Fetch the listing (cached once at canon/neurips-cache/listing.json)
//   2. Classify each paper by title into one of three strata
//   3. Seeded shuffle within each stratum, take first `perStratum`
//   4. For the 30 sampled papers, fetch abstracts (cached per-paper)
//
// Sampling-frame hash (C.3) = SHA256 of the listing snapshot's
// {venue, count, sorted paper_ids}.
//
// The listing is cached after first fetch. The abstracts are cached per
// paper hash. Replay determinism is preserved by the cache.

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { seededRng, deriveSampleSeed } from "./seed.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, "..", "..", "canon", "neurips-cache");
const VENUE = "NeurIPS 2024";
const LISTING_URL = "https://papers.nips.cc/paper_files/paper/2024";
const ABSTRACT_URL_PREFIX = "https://papers.nips.cc";

function stripHtml(s) {
  return (s || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

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
  const cachePath = join(CACHE_DIR, "listing.json");
  try {
    await access(cachePath);
    return JSON.parse(await readFile(cachePath, "utf-8"));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  const res = await fetch(LISTING_URL, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`papers.nips.cc HTTP ${res.status}`);
  const html = await res.text();

  // Parse each paper entry from the listing HTML
  // <a title="paper title" href="/paper_files/paper/2024/hash/HASH-Abstract-Conference.html">TITLE</a>
  const paperRegex =
    /<a title="paper title" href="(\/paper_files\/paper\/2024\/hash\/([a-f0-9]+)-Abstract-Conference\.html)">([\s\S]*?)<\/a>/g;
  const seen = new Set();
  const all_papers = [];
  let match;
  while ((match = paperRegex.exec(html)) !== null) {
    const id = match[2];
    if (seen.has(id)) continue;
    seen.add(id);
    all_papers.push({
      id,
      title: stripHtml(match[3]),
      url: ABSTRACT_URL_PREFIX + match[1],
      abstract: "",
      venue: VENUE,
    });
  }

  if (all_papers.length < 30) {
    throw new Error(
      `papers.nips.cc listing parsed only ${all_papers.length} papers; expected thousands`,
    );
  }

  const snapshot = {
    venue: VENUE,
    fetched_at: new Date().toISOString(),
    papers: all_papers,
  };
  await writeFile(cachePath, JSON.stringify(snapshot, null, 2));
  return snapshot;
}

async function fetchAbstract(paper) {
  const cachePath = join(CACHE_DIR, `abstract-${paper.id}.json`);
  try {
    await access(cachePath);
    return JSON.parse(await readFile(cachePath, "utf-8"));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  const res = await fetch(paper.url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`fetch ${paper.url} HTTP ${res.status}`);
  const html = await res.text();
  // Match paper-abstract wrapper; inner <p> is nested inside the outer
  // class="paper-abstract" <p>, so we take everything up to </section>.
  const m = html.match(
    /<p class="paper-abstract">([\s\S]*?)<\/p>\s*<\/section>/,
  );
  const abstract = m ? stripHtml(m[1]) : "";
  const data = {
    id: paper.id,
    abstract,
    fetched_at: new Date().toISOString(),
  };
  await writeFile(cachePath, JSON.stringify(data, null, 2));
  return data;
}

function classifyStratum(paper) {
  const t = (paper.title || "").toLowerCase();
  // Strata 3 — theoretical (stat.ML, cs.IT)
  if (
    /information theor|pac learning|statistical learning|generalization bound|shannon|sample complexity|concentration inequality|minimax|rate of convergence|regret bound|gradient descent convergence|optimal transport|martingale|bandit|spectral method/.test(
      t,
    )
  ) {
    return "strata_3";
  }
  // Strata 2 — applied (cs.CL, cs.CV)
  if (
    /natural language|machine translation|speech|\bimage|vision|visual|text generation|dialogue|question answer|computer vision|detection|segmentation|recognition|caption|transformer|llm|large language|retrieval|document|video|3d reconstruction|nerf|diffusion model/.test(
      t,
    )
  ) {
    return "strata_2";
  }
  // Strata 1 — generalist ML (cs.LG, cs.AI)
  return "strata_1";
}

export async function sampleStratified(snapshot, commitHash, perStratum = 10) {
  const seed = deriveSampleSeed(commitHash);
  const rng = seededRng(seed);
  const stratified = { strata_1: [], strata_2: [], strata_3: [] };
  for (const p of snapshot.papers) {
    if (!p.title || p.title.length < 5) continue;
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

  // Fetch abstracts for the 30 sampled papers. Cached per-paper, so
  // replay runs incur zero additional HTTP cost.
  for (const p of sample) {
    if (!p.abstract || p.abstract.length < 100) {
      const data = await fetchAbstract(p);
      p.abstract = data.abstract || "";
    }
  }

  return sample;
}
