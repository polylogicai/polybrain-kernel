#!/usr/bin/env node
// src/kernel.mjs
// The continuously iterating kernel.
// (Salvo 2026, §6)
//
// Long-running process. Priority-ordered work-item queue. Gas pedal dial
// `g` loaded from rules/kernel.yaml (constant in v1.0.0, auto-tuned in
// later versions per §13.3 future work). Natural state is permanent
// operation, not request-response. The kernel fires on work-item arrival
// and on wall-clock ticks.
//
// This is the minimum §6 species-complete skeleton. Operators are
// registered from outside (channels, experiment, witness stack). The
// kernel itself is domain-agnostic.

import { loadRules } from "./rules.mjs";
import { openCanon } from "./canon.mjs";
import { createEngine } from "./engine.mjs";
import { computeNetTrust } from "./nettrust.mjs";
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const RULES_DIR = join(ROOT, "rules");
const CANON_PATH = join(ROOT, "canon", "default.jsonl");
const PROGRESS_PATH = join(ROOT, "state", "progress.json");

// The priority-ordered work-item queue.
// Items: { operator, priority, payload, enqueued_at }
const queue = [];
const operators = Object.create(null);

// Public queue API for registered scripts to enqueue work.
export function enqueue(item) {
  queue.push(item);
  queue.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

// Public operator registration API.
export function registerOperator(name, fn) {
  operators[name] = fn;
}

// The single exported runtime, used by tests and scripts.
export async function createKernel() {
  const rules = await loadRules(RULES_DIR);
  const canon = await openCanon(CANON_PATH);
  const chainCheck = canon.verifyChain();
  if (!chainCheck.ok) {
    throw new Error(
      `canon chain broken at row ${chainCheck.broken_at}: ${chainCheck.reason}`,
    );
  }
  const engine = createEngine(rules, operators);
  const g = rules.kernel?.gas_pedal ?? 0.5;
  const tick_ms = rules.kernel?.tick_ms ?? 100;
  return { rules, canon, engine, g, tick_ms };
}

async function writeProgress(stage, complete, label) {
  const payload = {
    complete,
    stage,
    label: label || "",
    updated_at: new Date().toISOString(),
  };
  await writeFile(PROGRESS_PATH, JSON.stringify(payload, null, 2) + "\n");
}

async function tick({ engine, canon, g }) {
  try {
    if (queue.length === 0) return;
    if (Math.random() > g) return;
    const item = queue.shift();
    const { result, delta } = await engine.apply(item, canon);
    for (const row of delta || []) {
      await canon.append(row.type || "event", row.payload || row);
    }
    if (result?.progress) {
      await writeProgress(
        result.progress.stage,
        result.progress.complete,
        result.progress.label,
      );
    }
  } catch (e) {
    console.error("kernel tick error:", e);
    await canon.append("error", {
      message: String(e?.message || e),
      stack: String(e?.stack || ""),
    });
  }
}

async function main() {
  console.log("polybrain-kernel booting...");
  const runtime = await createKernel();
  const nt = computeNetTrust(runtime.canon.all());
  console.log(
    `canon: ${runtime.canon.length()} rows, chain verified, NetTrust N = ${nt.N}`,
  );
  console.log(`gas pedal g = ${runtime.g}, tick = ${runtime.tick_ms}ms`);
  console.log(`operators registered: ${Object.keys(operators).length}`);
  console.log("polybrain-kernel iterating. Ctrl+C to stop.");

  // Main loop: recursive setTimeout for precise cadence.
  async function loop() {
    await tick(runtime);
    setTimeout(loop, runtime.tick_ms);
  }
  loop();
}

// Run only when invoked directly, not when imported for testing.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error("kernel fatal:", e);
    process.exit(1);
  });
}
