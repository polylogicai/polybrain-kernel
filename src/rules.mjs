// src/rules.mjs
// YAML rules loader. Reads ./rules/*.yaml and merges into a single object
// keyed by filename (without extension).
//
// Rules are the L1 policy layer (§3.1) — declarative, inspectable, user-owned,
// hand-edited. Every rule edit is subject to the §10 self-modification gate
// before it is applied.

import { readdir, readFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { parse } from "yaml";

export async function loadRules(dir) {
  const files = await readdir(dir);
  const yaml_files = files.filter(
    (f) => f.endsWith(".yaml") || f.endsWith(".yml"),
  );
  const rules = {};
  for (const f of yaml_files) {
    const content = await readFile(join(dir, f), "utf-8");
    const key = basename(f).replace(/\.ya?ml$/, "");
    rules[key] = parse(content);
  }
  return rules;
}
