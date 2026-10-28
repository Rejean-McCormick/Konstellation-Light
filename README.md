> **Windows / Ekole:** see [Canonical paths and Kristal restoration, v0.4](README_CHEMINS_EKOLE_KONSTELLATION_v0.4.md).

> **New in v0.3: explore Ekole without a terminal.** Extract the update into Konstellation-Light, then double-click `Explorer-Ekole-Autochtones.pyw` to locate the Kristal, prepare its graph, and open it automatically. Guide: [README_LANCEUR_EKOLE_AUTOMATIQUE.md](README_LANCEUR_EKOLE_AUTOMATIQUE.md).

# Konstellation Light

**Standalone Windows-oriented toolkit and static website for browsing v10 collection read surfaces with byte-integrity checks.** Actual publication authorization is **not** inferred by Light. This project is separate from the full Konstellation server. It uses a v10 collection reader, a navigation compiler and a lightweight static interface; it does not alter Kristal semantic state.

## Targeted alignment with full Konstellation — 0.5.2 (October 26, 2026)

This revision brings **only the French-language display aids and keyword search** from the full reader into Light's local semantic previews. It adds no private reader, authorization powers, or Framework v11 decoding. The pinned C4 demo remains unchanged; newly built local sites include `semantic-display.mjs` and are **not publishable** under the current C4 gate. See the [compatibility report](docs/ALIGNEMENT_KONSTELLATION_2026-10-26.md) for the gap matrix and test results.

## Installation

Reference folder: `C:\mycode\Konstellation\Konstellation-Light`. Extract project files directly into this directory, so `Konstellation-Light.pyw`, `light/`, `server/`, `scripts/` and `tools/` are visible at its root.

1. Install Python **3.10+** with `tkinter` for the Windows GUI.
2. Double-click `Konstellation-Light.pyw`. Shortcut entry points include `Construire-Light.pyw`, `Previsualiser-Light.pyw`, `Deployer-Light.pyw` and `GitBook-Light.pyw`.
3. Use **Preview** to view the bundled public demonstration locally at `http://127.0.0.1:4177/`, without Node.js.
4. To compile an actual v10 collection, install Node.js (**22+ tested locally**) and select a collection directory containing `kristals/index.json`.

The `.pyw` files are Python GUIs, not compiled `.exe` files. They do not automatically execute remote Git operations or ask for GitHub tokens.

## C4 publishing boundary — v0.5 preview

**Current behavior:** `light/site` contains an explicitly pinned **synthetic demonstration**. The manual GitHub Pages workflow now runs `node scripts/c4-publication-gate.mjs --site light/site` before upload. **Any real v10 collection is blocked from Pages**, even if its transport hashes verify; C1 qualification, C2 authorization, and C3 immutable-release proofs are not yet ratified and verified in C4. The pinned input workflow remains preview-only; neither `repository_dispatch` nor a Git commit nor `--public YES` grants permission to publish. See [C4 status and gates](docs/C4_PUBLICATION_INTAKE.md).

Run locally to inspect the static site without deploying:

```bash
node scripts/c4-publication-gate.mjs --site light/site
node --test tests/*.test.mjs
python -m unittest discover -s tests
```

The Windows **Preview** tab now includes a C4 check. `Deployer-Light.pyw` may stage **only the exact pinned demo** in a Git checkout; ZIP export of other verified previews requires explicit review and does not prove public authorization.

## Version 0.5.1 update — Discovery 3.3 / Arketype 1.4

This update aligns **local site builds** with the three optional Kristal Authoring Kit 3.3 manifests: `kristal.discovery.json`, `derived/reader-inventory.json`, and `derived/reader-profile.json`. Arketype classification is *declarative* and never constitutes authorization.

- In the **“Construire” (Build)** tab, explicitly check “Inclure le résumé Discovery / Arketype” (Include Discovery / Arketype summary) only when classification information and measured volumes may be disclosed. Default: **disabled**.
- From the CLI: `node scripts/build-light.mjs --collection PATH --out previews/site --public YES --revision test --discovery YES`.
- All three manifests must be **referenced and validated by the v10 synchronization surface**. A Discovery file outside this surface is never imported. A partial or inconsistent set causes a requested projection to fail. Without these metadata, the legacy reader works normally.
- Only a summary of allowed fields (ARK/PRF, organization, profile, and referenced class/volume) enters the static bundle. No artifact paths, detailed inventory, or parser instruction list is exported in the summary. Bytes are verified, but advice freshness and classification are **not independently verified**.
- The **v10 reader** used by the build now lives in `shared/kristal-v10.mjs`, instead of `server/integrations/kristal-v10.mjs`. This does not yet consolidate the copies owned by the two Konstellation repositories.
- If extracting the ZIP over an existing repository, open **`Nettoyer_Mise_A_Jour.pyw`** at its root. It displays recognized legacy files, removes only versions matching their original fingerprints, asks for confirmation, and backs up their bytes beside the repository before removal. It does not scan private Kristals.

**Publication:** the pinned synthetic site at `light/site` is retained **unchanged**; the C4 gate still authorizes only that demo. Rebuilding `light/site` with a real collection, even a validated one or with `--discovery YES`, **blocks** Pages. For local tests, use `--out previews/site` or another preview directory. See the [migration guide](docs/ALIGNEMENT_DISCOVERY_3_3.md).

## Three deployment paths

### Export a static ZIP

In `Deployer-Light.pyw`, choose the ZIP export. The result contains static site resources such as `index.html`, `app.js`, `style.css`, `sw.js`, `data/` and `.nojekyll`.

### Copy into an existing GitHub Pages checkout

For the current C4 gate, only the exact pinned **synthetic demo** can be copied. Choose an existing local Git checkout containing `.git`. The tool copies the site to `docs/konstellation-light/` and keeps previous files in a hidden **sibling backup directory outside the Git checkout**. You must still review, commit and push changes yourself, and configure GitHub Pages to serve the selected branch from `/docs`. The embedded site is then available under `/konstellation-light/` on that Pages host. Never copy a private Kristal into a public Pages target.

Alternatively, the manual `.github/workflows/konstellation-light-pages.yml` workflow deploys `light/site/` from a dedicated repository; see the [deployment guide](docs/DEPLOIEMENT.md).

### Embed in GitBook

After publishing the site over HTTPS, `GitBook-Light.pyw` can generate `exports/GitBook-Embed.md`. Use the GitBook Embed block with a `?embed=1` URL only when the hosting site's security policy permits embedding; provide a full-screen link as a fallback.

## Build and verify

The GUI requires explicit confirmation of **public exposure intent** for builds. That checkbox is not a proof of C1/C2/C3 authority, and the resulting build is a **review-only preview** until qualified.

```powershell
cd C:\mycode\Konstellation\Konstellation-Light
node scripts\build-light.mjs --collection "C:\path\to\public-collection" --out light\site --public YES --revision v1
node --test tests\light.test.mjs tests\kristal-v10.test.mjs
python -m unittest discover -s tests -p "test_windows_tools.py"
```

`--append YES` retains prior verified output versions for comparison; by default the build replaces older generated bundles.

## Security and limitations

- Exported navigation is **derived**, not a new semantic authority, publication record or activation event. **Konstellation (full)** owns navigation across all accessible local/private Kristals; Light is limited to a public static subset.
- Files, manifests, paths, the collection index and declared SHA-256 digests are checked before build; this is not independent proof of semantic correctness.
- A public site may expose every included data file. Explicit data-owner authorization must precede export.
- The static navigator does not implement every server-side Konstellation Lens.
- Offline/PWA caches can continue showing previous site revisions.
- The local preview server is not a production server.
- GUI, Git checkout copy and GitBook flows were not qualified on a physical Windows machine in the supplied snapshot; automation was exercised under Linux.

## Repository map

`light/` contains the static app and demo site; `tools/` provides Windows GUI operations; `scripts/` builds collections and supports local preview; `server/` reads v10 manifests; `tests/` covers regressions; `docs/` contains architecture and deployment guides.

## Ekole evolution: knowledge graph

Read **[README_KONSTELLATION_LIGHT_EKOLE_NEXT.md](README_KONSTELLATION_LIGHT_EKOLE_NEXT.md)** for the 3–25 bubble slider, recentering, candidate local graphs, and the optional installation into Ekole Student. Public v10 navigation remains separate from v9 previews.
