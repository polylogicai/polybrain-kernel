# ots/ — OpenTimestamps receipts

Bitcoin-anchored receipts for load-bearing events in the RCC-n30 experiment.

## Files

| File | What it proves |
|---|---|
| `preregistration-H2.jsonl` | The preregistration row as written to the canon at the start of the experiment (row 0 of `canon/rcc-n30-2026-04-14.jsonl`, also written here as a standalone artifact for easy hashing) |
| `preregistration-H2.jsonl.ots` | The OpenTimestamps receipt proving the SHA-256 of `preregistration-H2.jsonl` was submitted to the Bitcoin blockchain at a specific time, via the public calendar servers at `a.pool.opentimestamps.org`, `b.pool.opentimestamps.org`, `a.pool.eternitywall.com`, and `ots.btc.catallaxy.com` |

## Verification

```bash
# Install the CLI if needed
brew install opentimestamps-client
#  or
pip install opentimestamps-client

# Verify the receipt against the staged file
ots verify preregistration-H2.jsonl.ots
```

If the Bitcoin confirmation has settled (~1 hour after stamping), this returns the Bitcoin block height and timestamp that anchor the proof. If it has not yet settled, it reports "pending upgrade" — run `ots upgrade preregistration-H2.jsonl.ots` once every few hours until it settles.

## Subsequent anchors

The follow-up Zenodo deposit's paper PDF will be stamped the same way at the moment of its deposit. Its receipt will ship as `polybrain-protocol-followup.pdf.ots` in the follow-up's release bundle (not in this repo).
