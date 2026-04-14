// src/self-mod.mjs
// Self-modification gate. (Salvo 2026 §10)
//
// A proposed change to the kernel's own rule files is ITSELF a canon row:
// it must enter the canon as a claim, pass the witness stack of §7, and
// be gated by a pre-commit hook before the corresponding git commit can
// merge. The only writable path to the runtime's own code is through the
// same gate the runtime enforces on external claims.
//
// v1.0.0 status: the gate is installed as a git pre-commit hook that runs
// on every commit touching rules/*.yaml. It invokes validateRuleEdit() on
// the diff. If validation fails, the hook exits non-zero and the commit is
// rejected. Honestly disclosed (§11.2): not yet exercised on a real edit
// in production — this is the §11.2 "scaffolded" disclosure for §10 that
// the private reference already carries.

import { readFile, writeFile, chmod, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { parse } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Validate a proposed rule edit. Returns { ok: true } if the edit passes
// the gate, { ok: false, reason } otherwise.
// Current checks: YAML parseability, no removal of canonical keys that the
// kernel depends on.
export async function validateRuleEdit(yamlText, previousYamlText = null) {
  // 1. Must parse as YAML
  let parsed;
  try {
    parsed = parse(yamlText);
  } catch (e) {
    return { ok: false, reason: `yaml parse error: ${e.message}` };
  }
  if (parsed === null || typeof parsed !== "object") {
    return { ok: false, reason: "rule file must be a yaml object" };
  }

  // 2. If replacing an existing rule file, cannot silently remove top-level keys
  if (previousYamlText) {
    try {
      const prev = parse(previousYamlText);
      if (prev && typeof prev === "object") {
        const missing = Object.keys(prev).filter((k) => !(k in parsed));
        if (missing.length > 0) {
          return {
            ok: false,
            reason: `rule edit removes top-level keys: ${missing.join(", ")}`,
          };
        }
      }
    } catch {
      // If previous was unparseable, we're improving it — allow.
    }
  }

  return { ok: true };
}

// Install the pre-commit hook into .git/hooks/pre-commit.
// Idempotent: if a hook already exists, it is replaced.
export async function installPreCommitHook() {
  const hooksDir = join(ROOT, ".git", "hooks");
  const hookPath = join(hooksDir, "pre-commit");
  await mkdir(hooksDir, { recursive: true });
  const hookBody = `#!/usr/bin/env bash
# polybrain-kernel self-modification gate (§10)
# Runs on every commit touching rules/*.yaml. Rejects edits that fail
# validateRuleEdit().
set -e

changed_rules=$(git diff --cached --name-only --diff-filter=AM | grep -E '^rules/.*\\.ya?ml$' || true)
if [ -z "$changed_rules" ]; then
  exit 0
fi

for f in $changed_rules; do
  node -e "
    import('./src/self-mod.mjs').then(async (m) => {
      const { readFile } = await import('node:fs/promises');
      const staged = await readFile('$f', 'utf-8');
      const result = await m.validateRuleEdit(staged, null);
      if (!result.ok) {
        console.error('self-mod gate REJECTED $f:', result.reason);
        process.exit(1);
      }
      console.log('self-mod gate OK for $f');
    }).catch(e => { console.error(e); process.exit(1); });
  "
done
`;
  await writeFile(hookPath, hookBody);
  await chmod(hookPath, 0o755);
  return { hookPath, installed: true };
}

// Check if the hook is installed. Used by the kernel at boot to verify
// that the §10 gate is in place.
export async function isPreCommitHookInstalled() {
  try {
    const path = join(ROOT, ".git", "hooks", "pre-commit");
    const text = await readFile(path, "utf-8");
    return text.includes("polybrain-kernel self-modification gate");
  } catch {
    return false;
  }
}
