# Konstellation Light 0.5.2 — complete repository (batch 1)

This archive contains **the full repository**, not a patch to apply. After backing up your data and stopping the tools, extract the **contents** of the archive into the Konstellation Light code directory. Do not replace private data collections or the Kristal canonical content. The `FILETREE.txt` and `SHA256SUMS.txt` files describe the files included in this candidate.

Version 0.5.2 comes from the semantic-display fix reviewed against the 0.5.1 snapshot. The detailed `PATCH_MANIFEST.json` is in **the separate patch archive** `Konstellation-Light-0.5.2-correctif-revision.zip`, not in this complete repository.

## Pre-deployment checks

```sh
node --test tests/*.test.mjs
python -m unittest discover -s tests -p 'test_*.py'
node scripts/c4-publication-gate.mjs --site light/site
```

**Publication:** C4 authorizes only the pinned synthetic demo. Real data remains blocked without C1/C2/C3. GUI confirmation, `--public YES`, a transport hash, GitHub commit, or passing test does not authorize publication.

This archive has not been qualified on your Windows machine or for publishing real Kristals. No directory under `D:` needs to be migrated for this installation.
