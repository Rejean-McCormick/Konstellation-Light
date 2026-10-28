# Konstellation → Konstellation Light: controlled alignment (October 26, 2026)

## Decision

Keep **two complementary products**. Full Konstellation is a controlled local/shared reader with access policies, explorers and projection engines. Light independently visualizes *explicitly selected derived representations*, for local previews and, only following independent qualification, future static publications. The goal is **not** to blindly port all server logic into a static browser.

Five original snapshots were examined locally: `znapshot_Konstellation_10261813.zip`, `znapshot_Konstellation-Light_10261813.zip`, `znapshot_Kristal-Integration-Pack_10261812.zip`, `znapshot_Kristal-Manager_10261812.zip`, `Kristal-GitHub-Bootstrap(1).zip`. No remote requests or GitHub modifications were made.

## Gaps observed in snapshots

| Feature | Full Konstellation | Light before | Treatment in 0.5.2 |
|---|---|---|---|
| French semantic presentation from October 17 (`P138`, `P50`, explicitly known relationships) | `src/lib/semantic-display.mjs` | Missing | **Ported**, display of candidate preview edges only; raw predicate retained in inspector |
| Whole-word search, without `aquin` → `Joaquín` | Astrolabe and labels with disambiguation | Substring search | **Ported** only for candidate curations; no identifier merging |
| Technical label/raw value and provenance | Advanced inspector | Minimal inspector | **Partially ported:** navigation ID, source label and raw predicate visible |
| Adaptive KNAV navigation, Lens, and renderer registries 1.0 | Server, projections and renderers | Only four lightweight views | **Not ported**; would require a public projection contract translation |
| Local v10 reader, private catalog and neutral selection | Experimental since October 16 | Synchronized v10 surface reader and local Ekole preview | **Not ported**; never expose local paths or private catalogs in public sites |
| Manager export and access policies | My Kristals, opt-in/local | No private fleet browser | **Not ported**; Manager grants no authorization to Light |
| Discovery 3.3 / Arketype | Optional, advisory read | Present in Light 0.5.1, opt-in | **Preserved**; classification is not authoritative |
| Framework v11 / diK / dictionaries | Separate v11 Integration Pack, alpha.1, pinned Framework checkout | No v11 decoder | **Not ported**; requires a distinct new projection, format/version, and qualification |
| C2/C4 publication | Independent safeguards | C4 synthetic demo only | **Preserved and tested**; a real collection remains BLOCKED |

## Delivered functional fix

1. `light/src/semantic-display.mjs` reproduces the October 17 French presentation functions from Konstellation **for non-canonical display**, plus a bounded local search function.
2. `light/src/app.js` applies these labels in graphs, lists, cards and the inspector **only** for `derived-semantic-preview`, not v10 hosted data. The `nodes` / `edges` structure, SHA-256 values, `surface_digest`, selection and source IDs remain unchanged.
3. Preview and collection build scripts now include the standalone module, and the source service worker precaches it in a new `v5` cache.
4. JS/Python validators recognize the explicitly allowed asset for **local previews**, but the JavaScript C4 gate **never** accepts it in the pinned demo. A build with this asset is classified `BLOCK_REAL_COLLECTION`. The declared integrity relates to JSON bundles and does not ensure a signature or qualification for arbitrary JavaScript.
5. The Ekole tool includes this asset in its cache fingerprint and reproducibility tests.
6. `light/site/` and `config/c4-demo-pin.json` were **not** changed. The existing public demo is intentionally unchanged: new labels appear only in previews rebuilt by local scripts.

### Non-negotiable security boundary

`--public YES` is a **declaration of export intent**, never C1/C2/C3 qualification or permission to publish a real collection. The GitHub Pages flow authorizes the exact demo and nothing else. SHA-256 transport verification is not proof of semantic truth. No remote GitHub synchronization occurred.

## Evidence and limitations

Local tests: Node.js 22.16.0 / Python 3.13.5 on Linux.

- Original Light snapshot: **47/47** JavaScript tests, **21/21** Python; C4 `ALLOW_DEMO_ONLY`.
- Aligned Light: **51/51** JavaScript tests, **21/21** Python; C4 `ALLOW_DEMO_ONLY` on the original demo; explicit `BLOCK_REAL_COLLECTION` verification with the added asset.
- Full Konstellation semantic-presentation reference tests: **5/5**.
- Node syntax check on UI and new module: passed.

Not run or not qualified: Light browser E2E UI, Windows GUI on a physical machine, Windows installer, full Konstellation Astro/Svelte dependencies/build, external Framework v11 (not supplied), production environment, C1/C2/C3, and Wikipedia-scale performance. Current static navigation has bounds (catalog of 1,000 entries, maximum 8 MiB bundles, graph of at most 12,000 nodes, C4 guard ≤ 1,006 files): **it is not directly suitable for 100× Wikipedia's content and 20× its traffic**.

## Proposed next steps

**A. Shared projection contract, without runtime merger.** Have full Konstellation emit a bounded, stable, read-only, explicitly qualified document projection. Light should inspect it without reconstructing Reader Policy decisions.

**B. Separate C1/C2/C3 → C4 pipeline.** Agree before any publication of real content: qualification evidence, rights-holder authorization, immutable releases, handling of withdrawal and revocation. Transport fingerprints are not publication certificates.

**C. Multilingual Framework v11.** Using Pack v11 alpha.1, design a new projection that reflects `direct`/`fallback`/`missing` states, KQ/KP identities, and lexical-layer provenance. Do not present fallback as validated translation. Do not modify the legacy Light v10 reader.

**D. Light at very large scale.** New fragment-based indexing and routing, independent object storage/CDN, paginated metadata, incremental generation, and verified cost/capacity budgets. Use GitHub repositories for code, contracts, size-limited CI and governance; **never** billions of pages or user traffic.

**E. Full qualification.** Validate Windows GUI/launchers, browser E2E, visual comparison of recognized/unknown predicates, missing-source simulations, cache/invalidation tests, security review and scale testing before a stable tag.

## Applying the candidate

This archive is a **working candidate**. Back up Konstellation Light, review source diffs, do not overwrite a checkout containing unmerged personal changes, then run `node --test tests/*.test.mjs`, `python -m unittest discover -s tests -p 'test_*.py'`, and `node scripts/c4-publication-gate.mjs --site light/site`. Never replace `light/site` with a real collection or push a public deployment.
