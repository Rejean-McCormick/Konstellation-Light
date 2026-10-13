# Konstellation Light — C4 alignment implementation report

**Date:** 2026-10-12  |  **Edition:** `0.5.0-c4-demo-gate-preview`  |  **Scope:** the `Konstellation-Light` repository only.

## Change boundary

Light is a **static, derived, public-view companion** of Konstellation. It does not replace full Konstellation's fleet and concept navigation, Kristal Manager's local instance registry, C1 independent qualification, C2 authorization or C3 immutable publication. The 126 local workspaces and Arketype are **not** imported into Light. No canonical Kristal state or remote repository was modified.

## Implemented and verified in the supplied snapshot

| Component | Work performed | Qualification |
|---|---|---|
| `scripts/c4-publication-gate.mjs`, `config/c4-demo-pin.json` | Strict site file/pack SHA-256 and path checks, locked exact **synthetic demo** payload, machine-readable exit codes (0 demo / 3 byte-valid other collection / 2 invalid) | Local tests PASS; pin is **not** an authority signature |
| `.github/workflows/konstellation-light-pages.yml` | Manual Pages workflow runs demo-only gate before artifact upload; non-empty collection path already fails | Static workflow tested; **not** run on GitHub |
| `.github/workflows/konstellation-light-intake.yml` | Preview-only pinned collection intake now asserts **BLOCK_REAL_COLLECTION** for a real collection without treating it as a release; no `pages:write` permissions or deploy action | Static tests PASS; remote GitHub not exercised |
| `tools/light_core.py`, `tools/light_gui.py` | Independent Python demo-pin enforcement before checkout staging; explicit review warning on ZIP export; one-click C4 readiness in Preview tab | Unit tests PASS, Tk smoke under virtual Linux display |
| `light/src/`, `light/site/` | Fixed visible disclosure that technical SHA != C1/C2/C3; revisions no longer labeled "published"; #1E6864 accent | HTML/CSS/JS copied byte-identically from sources; full browser E2E not performed |
| `tests/` | New negative tests: unlisted files, altered bytes, valid-but-real collection, symlinks, changed static resources, Pages workflow, checkout refusal | Unit tests PASS |
| `README.md`, `CHANGELOG.md`, `docs/` | Updated actual user procedures, C4 gates and operational limits | Documented and cross-linked |

## Executed checks

- `node --test tests/*.test.mjs` — **36/36 PASS** with Node 22.16.0.
- `python -m unittest discover -s tests -q` — **16/16 PASS** with Python 3.13.5.
- `node scripts/c4-publication-gate.mjs --site light/site` — `integrity=PASS`, `github_pages_gate=ALLOW_DEMO_ONLY`, authority statuses all `NOT_VERIFIED`.
- Tkinter launcher (`tools.light_gui.Console`) opened under virtual Linux X server; C4 check correctly identified pinned demo. Not a native Windows qualification.
- Python and Node file manifests checked while packaging.

## Deliberately blocked / NOT verified

- **No real GitHub collection may be deployed to Pages** merely by compiling the site, selecting `--public YES`, supplying Git SHA/index digests, receiving `repository_dispatch`, or running the static C4 check.
- Real release publication depends on **adopted, independently verifiable C1 qualification, C2 authorization, C3 immutable release proof and trust roots** that this snapshot does not contain. Do not fabricate these receipts or replace the block with a checkbox.
- GitHub Actions execution, real Pages hosting, GitBook embedding, browser compatibility, and native Windows deployment are **NOT TESTED**.
- This editor does not qualify the semantics of polymorphic v9 domain artifacts; hosted-node graphs remain **technical topology**. Ekole local curated previews remain **local candidates**, not C4 public release.
- The original `SMARTDUMP_INDEX.txt` and `SNAPSHOT_INDEX.txt` describe the **input snapshot** and are retained as historical evidence; the new `SHA256SUMS.txt` and `FILETREE.txt` describe this output.

## Future inter-repo follow-up (not implemented here)

1. Confirm C1/C2/C3 receipt schema, trust anchors, revision-binding rules and revocation handling with their **owners**.
2. Implement and test a separate proof-verification gate, then allow explicit real release promotion only after security review and GitHub branch/environment protections.
3. Add browser E2E and Windows GUI validation on the actual installed environment; test GitHub Pages under a disposable staging repository, with approved synthetic assets only.
4. Keep full Konstellation as the My Kristals navigator and Manager as the authorized local inventory owner.

**Rollback:** retain the previous Light snapshot; this release is file-level only. For deployed Light Pages, changing the site does not revoke previously publicly accessible files or offline caches.
