#!/usr/bin/env node
/**
 * analyze-daemon.mjs
 *
 * Post-daemon analysis script for the Kernel Scientists workflow.
 * Reads canon/default.jsonl and state/progress.json, calls Groq
 * (moonshotai/kimi-k2-instruct) for anomaly detection, and emits
 * structured output with FINDING: prefixes for anything worth a
 * GitHub issue.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CANON_PATH = resolve(ROOT, 'canon/default.jsonl');
const PROGRESS_PATH = resolve(ROOT, 'state/progress.json');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = 'moonshotai/kimi-k2-instruct';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ---------------------------------------------------------------------------
// 1. Read canon
// ---------------------------------------------------------------------------

function readCanon() {
  if (!existsSync(CANON_PATH)) {
    return { rows: [], error: 'canon/default.jsonl not found' };
  }
  const raw = readFileSync(CANON_PATH, 'utf-8').trim();
  if (!raw) return { rows: [], error: 'canon/default.jsonl is empty' };

  const lines = raw.split('\n');
  const rows = [];
  const parseErrors = [];

  for (let i = 0; i < lines.length; i++) {
    try {
      rows.push(JSON.parse(lines[i]));
    } catch {
      parseErrors.push(i);
    }
  }

  return { rows, parseErrors };
}

function analyzeCanon(rows, parseErrors) {
  const total = rows.length;
  const byType = {};
  const verdicts = {};
  const emptyPayloads = [];
  const brokenChains = [];

  for (const row of rows) {
    // Count by type
    const t = row.type || 'unknown';
    byType[t] = (byType[t] || 0) + 1;

    // Count verdicts
    const v = row.payload?.verdict || 'none';
    verdicts[v] = (verdicts[v] || 0) + 1;

    // Detect empty payloads
    if (!row.payload || Object.keys(row.payload).length === 0) {
      emptyPayloads.push(row.row_index);
    }

    // Detect broken hash chains
    if (row.row_index > 0 && !row.prev_hash) {
      brokenChains.push(row.row_index);
    }
  }

  // Check for duplicate consecutive hashes (repeated rows)
  const duplicateHashes = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].row_hash === rows[i - 1].row_hash) {
      duplicateHashes.push(i);
    }
  }

  // Latest 10 rows for Groq context
  const latest = rows.slice(-10);

  return {
    total,
    byType,
    verdicts,
    emptyPayloads,
    brokenChains,
    duplicateHashes,
    parseErrors,
    latest,
  };
}

// ---------------------------------------------------------------------------
// 2. Read progress
// ---------------------------------------------------------------------------

function readProgress() {
  if (!existsSync(PROGRESS_PATH)) {
    return { error: 'state/progress.json not found' };
  }
  try {
    return JSON.parse(readFileSync(PROGRESS_PATH, 'utf-8'));
  } catch {
    return { error: 'state/progress.json failed to parse' };
  }
}

// ---------------------------------------------------------------------------
// 3. Call Groq
// ---------------------------------------------------------------------------

async function callGroq(canonAnalysis, progress) {
  if (!GROQ_API_KEY) {
    return 'Groq analysis skipped: no GROQ_API_KEY';
  }

  const prompt = `You are a research scientist auditing the Polybrain kernel daemon output.

DATA:
- Canon total rows: ${canonAnalysis.total}
- Rows by type: ${JSON.stringify(canonAnalysis.byType)}
- Verdicts breakdown: ${JSON.stringify(canonAnalysis.verdicts)}
- Parse errors at line indices: ${JSON.stringify(canonAnalysis.parseErrors)}
- Empty payloads at row indices: ${JSON.stringify(canonAnalysis.emptyPayloads)}
- Broken hash chains at row indices: ${JSON.stringify(canonAnalysis.brokenChains)}
- Duplicate consecutive hashes at indices: ${JSON.stringify(canonAnalysis.duplicateHashes)}
- Latest 10 rows: ${JSON.stringify(canonAnalysis.latest, null, 2)}

PROGRESS STATE:
${JSON.stringify(progress, null, 2)}

INSTRUCTIONS:
Analyze this daemon output. For each issue you find, output a line starting with exactly "FINDING:" followed by a severity tag [CRITICAL], [WARNING], or [INFO], then the description. Be specific.

Check for:
1. Were there any errors? (parse errors, missing files, broken chains)
2. How many new rows were added vs what is expected?
3. What is the NetTrust trend? (look at verdict distribution)
4. Anomalies: empty rows, broken hash chains, repeated patterns, stale timestamps
5. Is the progress state consistent with the canon state?

If everything looks healthy, output exactly one line: "FINDING: [INFO] All checks passed, no anomalies detected."

Output ONLY finding lines. No preamble, no explanation, no markdown.`;

  const body = {
    model: GROQ_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 1024,
  };

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      return `Groq API error: ${res.status} ${text}`;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || 'No response from Groq';
  } catch (err) {
    return `Groq fetch failed: ${err.message}`;
  }
}

// ---------------------------------------------------------------------------
// 4. Local anomaly detection (no LLM needed)
// ---------------------------------------------------------------------------

function localFindings(canonAnalysis, progress) {
  const findings = [];

  if (canonAnalysis.total === 0) {
    findings.push('FINDING: [CRITICAL] Canon is empty. Daemon may not be writing rows.');
  }

  if (canonAnalysis.parseErrors.length > 0) {
    findings.push(
      `FINDING: [CRITICAL] ${canonAnalysis.parseErrors.length} unparseable line(s) in canon at indices: ${canonAnalysis.parseErrors.join(', ')}`
    );
  }

  if (canonAnalysis.brokenChains.length > 0) {
    findings.push(
      `FINDING: [WARNING] Broken hash chain at row indices: ${canonAnalysis.brokenChains.join(', ')}. prev_hash is null for non-genesis rows.`
    );
  }

  if (canonAnalysis.emptyPayloads.length > 0) {
    findings.push(
      `FINDING: [WARNING] Empty payloads at row indices: ${canonAnalysis.emptyPayloads.join(', ')}`
    );
  }

  if (canonAnalysis.duplicateHashes.length > 0) {
    findings.push(
      `FINDING: [WARNING] Duplicate consecutive row_hash at indices: ${canonAnalysis.duplicateHashes.join(', ')}. Possible repeated writes.`
    );
  }

  if (progress.error) {
    findings.push(`FINDING: [WARNING] Progress state: ${progress.error}`);
  }

  return findings;
}

// ---------------------------------------------------------------------------
// 5. Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`=== Kernel Scientists Analysis ===`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('');

  // Read and analyze canon
  const { rows, parseErrors, error: canonError } = readCanon();
  if (canonError) {
    console.log(`FINDING: [CRITICAL] ${canonError}`);
    process.exit(0);
  }

  const canonAnalysis = analyzeCanon(rows, parseErrors || []);

  console.log(`Canon rows: ${canonAnalysis.total}`);
  console.log(`Types: ${JSON.stringify(canonAnalysis.byType)}`);
  console.log(`Verdicts: ${JSON.stringify(canonAnalysis.verdicts)}`);
  console.log('');

  // Read progress
  const progress = readProgress();
  if (!progress.error) {
    console.log(`Stage: ${progress.stage || 'unknown'}`);
    console.log(`Complete: ${progress.complete ?? 'unknown'}`);
    console.log(`Label: ${progress.label || 'none'}`);
  }
  console.log('');

  // Local deterministic checks
  const local = localFindings(canonAnalysis, progress);
  if (local.length > 0) {
    console.log('--- Local Checks ---');
    for (const f of local) console.log(f);
    console.log('');
  }

  // Groq analysis
  console.log('--- Groq Analysis ---');
  const groqResult = await callGroq(canonAnalysis, progress);
  console.log(groqResult);
  console.log('');

  console.log('=== Analysis Complete ===');
}

main().catch((err) => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
