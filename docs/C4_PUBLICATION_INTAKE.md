# C4 — Pinned public GitHub intake and publication gate

Status: **0.5.0-c4-demo-gate-preview — preparation / preview only; no real collection authorized on Pages.**

## 1. Boundaries and responsibilities

- C3 (`kristal-public`) owns public publication and its qualification/authorization receipt.
- C4 (Konstellation Light) **consumes** a published v10 GitHub surface, verifies its bytes and generates derived navigation. It **does not decide** whether a Kristal may be published, whether its semantics are valid, or whether it is activated.
- Local SHA-256 verification and a complete Git commit SHA prove **neither independent qualification, license, authorization, nor immutable release status**.
- `konstellation.light-source-pin/1.0` (local file `LIGHT_SOURCE_PIN.json`) is **only a non-normative technical transfer receipt**. It specifies `qualification_verified=false` and `publication_verified=false`.

## 2. What works now: import an *already public* state for isolated preview

Run only against a revision already approved upstream for public exposure. The repository must be exactly `Rejean-McCormick/kristal-public` (the C4 allowlist is intentionally limited).

```bash
node scripts/import-pinned-collection.mjs \
  --repository Rejean-McCormick/kristal-public \
  --commit <40_CHARACTER_GIT_SHA> \
  --expected-index-digest sha256:<64_HEX_INDEX_DIGEST> \
  --out /tmp/public-collection

node scripts/build-light.mjs \
  --collection /tmp/public-collection \
  --out /tmp/light-preview \
  --public YES \
  --revision <40_CHARACTER_GIT_SHA> \
  --repository https://github.com/Rejean-McCormick/kristal-public \
  --commit <40_CHARACTER_GIT_SHA>
```

Replace placeholders with the exact commit/index values that are **already public**. Failure is closed and does not create the destination directory. Scripts do not execute code from the downloaded repository, automatically fetch other repositories or accept collection symlinks. Import `--out` must be a **nonexistent directory** whose parent already exists.

The Light build enforces byte-by-byte integrity of the v10 surface, creates immutable `pack-<SHA-256>.json` bundles and refuses a different payload for the same `(slug, revision)` pair. Output is assembled before replacement so earlier failures cannot replace the old site.

## 2a. C4 gate actually enforced on the site

`config/c4-demo-pin.json` records **the catalog, bundle and six static-file fingerprints of the synthetic demo** (not publication authority). `scripts/c4-publication-gate.mjs` checks file inventory, absence of symlinks, each bundle's format/digest and the exact baseline. It emits a `konstellation.light-c4-preflight/1.0` diagnostic:

- `ALLOW_DEMO_ONLY` (exit code 0): **pinned demo only**; `qualification`, `authorization`, and `publication` remain `NOT_VERIFIED`.
- `BLOCK_REAL_COLLECTION` (exit code 3): site is byte-consistent but not the demo; Pages deployment prohibited despite `--public YES`, `repository_dispatch`, `git SHA`, or `index_digest`.
- `BLOCK` (exit code 2): invalid format, file inventory or fingerprints; even preview must be refused.

The Pages gate runs the script **after** tests and **before** `upload-pages-artifact`. Pinned intake runs the same script and requires exit code 3: its bytes may be previewed but cannot be mistaken for qualified publication. The Python GUI independently validates the demo before preparing a Git checkout. **Repository maintainers can change the demo baseline**, so branch protection and PR review are needed: this mechanism mainly prevents accidental substitution; it does not prove issuer legitimacy.

```bash
node scripts/c4-publication-gate.mjs --site light/site
node --test tests/c4-gate.test.mjs tests/pinned-intake.test.mjs
```

**The production C1 → C2 → C3 → C4 sequence remains BLOCKED** because jointly adopted receipt formats and trust roots are missing. Manually deploying the demo **does not certify** its content as Kristal state.

## 3. Provided GitHub workflows

- `.github/workflows/konstellation-light-intake.yml`: `workflow_dispatch` or `repository_dispatch` of type `kristal-qualified-release-v1`; fetches **only at a full commit** from the fixed repository, checks index and bytes, prepares a static site and **uploads a seven-day preview artifact**. It has neither `pages:write` nor `id-token:write` nor a `deploy-pages` step.
- `.github/workflows/konstellation-light-pages.yml`: manual deployment of the **existing demo** remains possible. A nonempty `collection_directory` explicitly fails until C3 qualification is integrated.

**Authenticated receipt of `repository_dispatch` does not prove the identity of the qualification issuer**: anyone authorized to send the event can choose its contents. It cannot grant deployment rights.

## 4. Proposed coordination contract with C3 (not accepted)

Before automated deployment, C3 must send an event **after an actually verified release**, with references to **authorized** evidence:

| Required field / evidence | Expected C4 verification |
|---|---|
| Source repository pinned to `Rejean-McCormick/kristal-public` | Repository identity confirmed by the platform, not only the payload |
| 40-character Git SHA and release tag | Tag resolves to the **exact SHA**, not mutable `main` or branch |
| `kristals/index.json` and `index_digest` | Framework schema digest and entries verified |
| Per-Kristal v10 sync manifest | Roles, hashes, sizes, paths, state, and surface consistent |
| **Independent** qualification receipt | Verifiable attestation tied to the same commit/manifest/logical commitment |
| Active initial authorization and public scope | C2 receipt checked against published version, including exclusions |
| Immutable C3 publication/release | Existence, status and immutability proof verified by a trusted source |
| Idempotent post-publication event | Replays must not generate divergent new results |

**Until receipt formats and trust roots are jointly accepted by C1/C2/C3/C4, the Pages pipeline remains closed to real collections.** This document does not invent a normative `publication_receipt/1.0` schema.

## 5. Version history / catalog

- `--append YES` retains existing revisions only if their old packs still have matching sizes and SHA-256.
- The same `(slug, revision)` cannot silently be replaced.
- Without a timestamp/sequence **supplied by C3**, revisions are sorted lexically. The interface **cannot guarantee** the last item is chronologically most recent. Direct links `?k=<slug>&r=<revision>&lens=trace` remain deterministic.
- The published site contains no secrets; GitHub Actions archives/artifacts may be accessible depending on repository configuration.
- Canonical files, sources of truth, v9 commitments and Kompiler are not changed.

## 6. Tests

```bash
node --test tests/kristal-v10.test.mjs tests/light.test.mjs tests/pinned-intake.test.mjs
python -m unittest discover -s tests -p 'test_windows_tools.py' -v
```

Remote GitHub tests, native Windows behavior, C3 attestation and the hosted web interface were **not** validated by these local tests.
