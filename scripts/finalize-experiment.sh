#!/usr/bin/env bash
# scripts/finalize-experiment.sh
#
# Runs the post-experiment pipeline in order:
#   1. build-followup.mjs  — fills paper-template.md from the canon
#   2. pandoc+xelatex       — compiles followup/paper.md to followup/paper.pdf
#   3. sha256sum            — writes followup/SHA256SUMS
#   4. ots stamp            — Bitcoin-anchors the PDF
#   5. git add + commit + push — commits the follow-up artifacts
#   6. prints next-step instructions (mint + public flip)
#
# Does NOT mint the Zenodo deposit automatically (irreversible — Andy
# reviews followup/paper.pdf first). Does NOT flip the repo to public
# automatically (irreversible — Andy reviews after mint).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== polybrain-kernel · finalize-experiment.sh ==="
echo "repo root: $REPO_ROOT"
echo ""

# Sanity: confirm the analysis_result row exists
if ! grep -q '"type":"analysis_result"' canon/rcc-n30-2026-04-14.jsonl; then
  echo "ERROR: analysis_result row not found in canon/rcc-n30-2026-04-14.jsonl"
  echo "       The experiment has not yet completed. Let it run to the end."
  exit 1
fi

# Step 1: build paper.md from template + canon
echo "[1/5] building followup/paper.md from template..."
node scripts/build-followup.mjs
echo ""

# Step 2: pandoc + xelatex → paper.pdf
echo "[2/5] compiling paper.pdf via pandoc + xelatex..."
pandoc followup/paper.md \
  -o followup/paper.pdf \
  --pdf-engine=xelatex \
  -H followup/preamble.tex \
  --variable mainfont="STIX Two Text" \
  2>&1 | head -20 || echo "(pandoc may have emitted warnings — check followup/paper.pdf exists)"

if [ ! -f followup/paper.pdf ]; then
  echo "ERROR: followup/paper.pdf was not created"
  exit 1
fi
echo "  ✓ $(ls -la followup/paper.pdf | awk '{print $5}') bytes"
echo ""

# Step 3: SHA256SUMS
echo "[3/5] writing followup/SHA256SUMS..."
cd followup
shasum -a 256 paper.md paper.pdf preamble.tex > SHA256SUMS
cat SHA256SUMS
cd "$REPO_ROOT"
echo ""

# Step 4: OTS stamp
echo "[4/5] OTS-stamping followup/paper.pdf..."
ots stamp followup/paper.pdf
if [ -f followup/paper.pdf.ots ]; then
  echo "  ✓ receipt at followup/paper.pdf.ots ($(ls -la followup/paper.pdf.ots | awk '{print $5}') bytes)"
fi
echo ""

# Step 5: commit the follow-up artifacts
echo "[5/5] committing follow-up artifacts..."
git add followup/
git commit -m "followup: build paper + PDF + OTS anchor post-experiment

Generated from the v1.0.0-experiment tag's canon/rcc-n30-2026-04-14.jsonl
analysis_result row via scripts/build-followup.mjs. PDF built with
pandoc + xelatex using followup/preamble.tex. OTS-stamped to Bitcoin
via the public calendar servers.

Next:
  - Review followup/paper.pdf
  - Mint the deposit: node scripts/mint-followup-deposit.mjs
  - Flip the repo: gh repo edit polylogicai/polybrain-kernel --visibility public --accept-visibility-change-consequences
  - Post the launch: edit followup/launch-post-template.md

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>" || echo "(nothing new to commit)"
git push 2>&1 | tail -3
echo ""

echo "════════════════════════════════════════════════════════════"
echo "  FINALIZE COMPLETE"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Review the built PDF:"
echo "  open followup/paper.pdf"
echo ""
echo "When ready, MINT the fresh Zenodo concept DOI (irreversible):"
echo "  node scripts/mint-followup-deposit.mjs"
echo ""
echo "After the mint completes, FLIP the repo to public (irreversible):"
echo "  gh repo edit polylogicai/polybrain-kernel --visibility public --accept-visibility-change-consequences"
echo ""
echo "Then post the launch:"
echo "  - X thread from followup/launch-post-template.md (short)"
echo "  - Hacker News from followup/launch-post-template.md (medium)"
echo "  - Blog post from followup/launch-post-template.md (long)"
