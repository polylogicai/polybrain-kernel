# paper/

The Zenodo release bundle for *Engine, Rules, and Canon* (Salvo 2026).

- `polybrain-paper.pdf` — the paper (136 KB, 22 pages, ~10,300 words)
- `polybrain-paper.pdf.ots` — OpenTimestamps receipt anchoring the paper hash to the Bitcoin blockchain
- `SHA256SUMS` — SHA-256 hashes of every file in the release
- `DOI.md` — concept DOI and v1 DOI

## Verification

```bash
sha256sum -c SHA256SUMS
```

## Citation

- **Concept DOI** (always resolves to the latest version): [`10.5281/zenodo.19571656`](https://doi.org/10.5281/zenodo.19571656)
- **v1 DOI**: [`10.5281/zenodo.19571657`](https://doi.org/10.5281/zenodo.19571657)
- **Landing page**: https://zenodo.org/records/19571657
- **Source repository of the paper itself**: https://github.com/polylogicai/polybrain-paper
- **License**: CC BY 4.0

## OpenTimestamps verification

```bash
# Install the ots CLI
pip install opentimestamps-client

# Verify the paper PDF against its ots receipt
ots verify polybrain-paper.pdf.ots
```

A successful verification proves the paper's SHA-256 existed at or before the Bitcoin block timestamp the receipt points to. This is the paper's priority anchor.
