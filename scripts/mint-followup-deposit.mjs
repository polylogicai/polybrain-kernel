#!/usr/bin/env node
// scripts/mint-followup-deposit.mjs
// Mints the RCC-n30 executed-result follow-up deposit on a fresh Zenodo
// concept DOI, citing 10.5281/zenodo.19571656 as the preregistration of
// record.
//
// Prerequisites:
//   1. The experiment has run to completion — canon/rcc-n30-2026-04-14.jsonl
//      contains an analysis_result row.
//   2. followup/paper.md has been built by the caller (values filled in
//      from the analysis_result) and compiled to followup/paper.pdf via
//      pandoc + xelatex + preamble.tex.
//   3. The paper PDF has been OTS-anchored.
//   4. ZENODO_TOKEN is set in ~/polybrain/.env.
//
// This script creates a NEW Zenodo concept DOI — it does NOT post a new
// version of 10.5281/zenodo.19571656 (that would break the preregistration
// immutability invariant). The fresh concept cites the original as
// preregistration of record via related_identifiers.

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const FOLLOWUP_DIR = join(ROOT, "followup");

// Read env
const envPath = join(process.env.HOME, "polybrain", ".env");
const envTxt = readFileSync(envPath, "utf-8");
const TOKEN = envTxt.match(/^ZENODO_TOKEN=(.+)$/m)?.[1]?.replace(/^["']|["']$/g, "").trim();
if (!TOKEN) {
  console.error("missing ZENODO_TOKEN in ~/polybrain/.env");
  process.exit(1);
}
const ZENODO = "https://zenodo.org/api";

async function api(method, path, body) {
  const url = path.startsWith("http") ? path : `${ZENODO}${path}?access_token=${TOKEN}`;
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    console.error(`FAILED ${method} ${path}: HTTP ${res.status}`);
    console.error(typeof data === "string" ? data : JSON.stringify(data, null, 2));
    process.exit(1);
  }
  return data;
}

async function uploadFile(bucketUrl, filename, absPath) {
  const bytes = readFileSync(absPath);
  const url = `${bucketUrl}/${encodeURIComponent(filename)}?access_token=${TOKEN}`;
  const res = await fetch(url, {
    method: "PUT",
    body: bytes,
    headers: { "Content-Type": "application/octet-stream" },
  });
  if (!res.ok) {
    console.error(`upload failed for ${filename}: HTTP ${res.status}\n${await res.text()}`);
    process.exit(1);
  }
  console.log(`  ✓ ${filename}  (${(bytes.length/1024).toFixed(1)} KB)`);
}

const metadata = {
  metadata: {
    title: "Executed Result for the Reviewer-Correlation Ceiling n=30 Preregistered Protocol",
    upload_type: "publication",
    publication_type: "workingpaper",
    description: `
<p>This is the executed-result follow-up deposit for the preregistered matched-paper protocol described in §12 and Appendix C of Salvo (2026), <a href="https://doi.org/10.5281/zenodo.19571656"><em>Engine, Rules, and Canon</em></a>. The preregistration committed cryptographically to this protocol at the moment the original paper was deposited; the <code>polybrain-kernel</code> reference implementation executed it as a native act of its own being, writing the result verbatim to an append-only canon chained by SHA-256 and Bitcoin-anchored via OpenTimestamps.</p>

<p>The preregistration forbids selective reporting, so the statistical tuple in §4 and the adjudication in §5 of this document are reported verbatim from the <code>analysis_result</code> row of the canon regardless of whether they support or falsify the preregistered hypothesis.</p>

<p><strong>Preregistration of record</strong>: <a href="https://doi.org/10.5281/zenodo.19571656">10.5281/zenodo.19571656</a>.<br/>
<strong>Frozen kernel</strong>: <a href="https://github.com/polylogicai/polybrain-kernel/tree/v1.0.0-experiment">polylogicai/polybrain-kernel</a> at tag <code>v1.0.0-experiment</code>.<br/>
<strong>License</strong>: CC BY 4.0.</p>
`.trim(),
    creators: [
      {
        name: "Salvo, Andrew",
        affiliation: "Smeal College of Business, Penn State University",
      },
    ],
    keywords: [
      "Reviewer-Correlation Ceiling",
      "preregistration",
      "matched-paper protocol",
      "NeurIPS 2024",
      "Cohen kappa",
      "paired t-test",
      "polybrain",
      "engine rules canon",
      "user-owned AI",
      "Bitcoin OpenTimestamps",
    ],
    version: "1",
    language: "eng",
    license: "cc-by-4.0",
    access_right: "open",
    related_identifiers: [
      {
        identifier: "10.5281/zenodo.19571656",
        relation: "isContinuedBy",
        resource_type: "publication",
      },
      {
        identifier: "https://github.com/polylogicai/polybrain-kernel",
        relation: "isSupplementedBy",
        resource_type: "software",
      },
    ],
    publication_date: new Date().toISOString().slice(0, 10),
  },
};

const FILES = [
  { filename: "polybrain-protocol-followup.pdf", path: join(FOLLOWUP_DIR, "paper.pdf") },
];

(async () => {
  console.log("── RCC-n30 follow-up · fresh Zenodo concept DOI ──\n");

  console.log("1. Creating deposition...");
  const dep = await api("POST", "/deposit/depositions", {});
  console.log(`   ✓ deposition id: ${dep.id}`);

  console.log("\n2. Uploading PDF...");
  for (const f of FILES) {
    await uploadFile(dep.links.bucket, f.filename, f.path);
  }

  console.log("\n3. Setting metadata...");
  await api("PUT", `/deposit/depositions/${dep.id}`, metadata);
  console.log("   ✓ metadata attached");

  console.log("\n4. Publishing (irreversible)...");
  const pub = await api("POST", `/deposit/depositions/${dep.id}/actions/publish`);
  console.log("   ✓ published");

  const doi = pub.doi;
  const conceptdoi = pub.conceptdoi;
  const recordId = pub.record_id;

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  RCC-n30 FOLLOWUP · v1 · LIVE");
  console.log("══════════════════════════════════════════════════════════\n");
  console.log(`  Version DOI:  ${doi}`);
  console.log(`  Concept DOI:  ${conceptdoi}`);
  console.log(`  Record ID:    ${recordId}`);
  console.log(`  HTML:         https://zenodo.org/records/${recordId}`);
  console.log(`  doi.org:      https://doi.org/${doi}`);
  console.log(`  concept:      https://doi.org/${conceptdoi}`);
  console.log("");

  writeFileSync(
    join(FOLLOWUP_DIR, "zenodo-result.json"),
    JSON.stringify(
      {
        ts: new Date().toISOString(),
        doi,
        conceptdoi,
        record_id: recordId,
        deposition_id: dep.id,
        files: FILES.map((f) => f.filename),
        cites: "10.5281/zenodo.19571656",
      },
      null,
      2,
    ),
  );
  console.log(`  Saved to: ${join(FOLLOWUP_DIR, "zenodo-result.json")}`);
})().catch((err) => {
  console.error("\n✗ FAILED:", err?.message || err);
  process.exit(1);
});
