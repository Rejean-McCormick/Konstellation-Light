## 0.5.2-semantic-presentation-preview — 2026-10-26

- Controlled alignment of the **display layer** with full Konstellation (October 17): known Wikidata properties, cautious documentary terminology and local word-based search in candidate semantic previews.
- Inspector retains source label and raw predicate; no identity or assertion mutation.
- JS asset declared in local builds, JS/Python site validators, C4 rejection preserved on new builds, Service Worker and Ekole tool updated.
- **C4 fundamentally unchanged:** pinned public demo is intact; new previews are not authorized for publication. Negative C4 regression tests strengthened.
- Private catalogs, KNAV engine and v11 are explicitly deferred: see `docs/ALIGNEMENT_KONSTELLATION_2026-10-26.md`.
- Local candidate, not qualified on Windows/E2E and **not** a deployable 100× Wikipedia solution.

## 0.5.1-discovery-arketype-preview — 2026-10-13

- Added an explicit opt-in projection of the three Authoring Kit 3.3 manifests (`--discovery YES`) with SHA-256 validation, identity checks and restricted allowed fields.
- Added Arketype / reader-profile display in the inspector, only when metadata was projected.
- Moved the internal v10 reader into `shared/kristal-v10.mjs`; imports and tests updated.
- Added the graphical Windows cleanup tool `Nettoyer_Mise_A_Jour.pyw` with external backups, pinned fingerprints and explicit confirmation.
- The C4 demo site and pin are unchanged; no real Kristal publication is authorized.

## 0.5.0-c4-demo-gate-preview — Kristal v10 C4 boundaries (2026-10-12)

- New `scripts/c4-publication-gate.mjs`: verifies every bundle and the exact pinned **synthetic demo** before manual GitHub Pages deployment; any other collection returns `BLOCK_REAL_COLLECTION`, even if all hashes match. Pin is a repository review guard, not an authorization signature.
- GitHub Pages workflow performs the C4 preflight immediately before site upload. Pinned intake continues to create **review-only artifacts**, and now checks `BLOCK_REAL_COLLECTION` explicitly.
- Windows GUI now provides a **C4 status** check; checkout staging refuses any non-demo site, while ZIP export remains an explicitly confirmed review operation.
- Browser displays the distinction between SHA-256 byte integrity and publication/qualification; the revision label no longer claims `published` status, and the dark UI uses the `#1E6864` accent.
- The existing v10 adapter, Ekole local previews, append-only revision integrity, and Source Pin transport checks remain in place. No C1/C2/C3 receipt verifier has been added; real publication stays blocked.
- Added JS/Python regression tests, source-pinning documentation, regenerated site, and file manifest. **No live deployment or private collection exposure.**

## v0.4 — Path diagnostics and non-destructive restoration

- Ekole root is recognized even when the Indigenous Peoples v4 Kristal is missing.
- Ekole tab shows source status, canonical path and nested-extraction cases.
- Selective restoration button from an Ekole ZIP; refuses to replace an existing directory.
- Recommended paths and projection roles documented in `README_CHEMINS_EKOLE_KONSTELLATION_v0.4.md`.
- Local builds, bubble navigation and the v10/v9 contract are unchanged.

## v0.3 — One-click Ekole Indigenous Peoples launcher

- Added `Explorer-Ekole-Autochtones.pyw` (automatic build/open) and `Previsualiser-Ekole.pyw` (opens tab).
- Integrated “Ekole · Graph” tab into `Previsualiser-Light.pyw`: Ekole repository discovery, conversion/build without visible Node commands, free local port, fingerprint cache, and logging.
- Optional Ekole Student integration subject to human confirmation; refuses to overwrite existing directories. No official v10 publication.
- Tests cover build, new source versions, caching, HTTP, export limits and file preservation.

# Konstellation Light Standalone — 0.1.0-standalone.1

- Standalone distribution targeted at `C:\mycode\Konstellation\Konstellation-Light`.
- Reuses sources and bundles from the previously qualified Light prototype (v10 reader and derived navigation builds).
- Added five Windows `.pyw` entry points, a Python standard-library GUI without pip dependencies.
- Local preview using a Python loopback HTTP server; Node.js is not required to view the site.
- Static ZIP export with SHA-256 check before shipment.
- Prepares GitHub Pages in an existing Git clone at `docs/konstellation-light`; previous edition backed up outside the Git repository; no automatic git push.
- Generates GitBook instructions with `embed=1` URL.
- Supports public v10 collection builds with Node.js, optional retention of revisions and full-commit GitHub pinning.
- Includes manual Pages workflow, docs and tests.

**Limitations:** does not transform the full server's semantic Lenses. No remote deployment or native Windows/GitBook testing was performed.

## 0.2.0-ekole-next.1 — Konstellation Light × Ekole

- 3–25 bubble slider, default eight, genuine neighbors and recentering navigation.
- Back/Home history and optional return to Ekole.
- Candidate semantic preview isolated from publishable v10 collections.
- Optional standalone v4 encyclopedia Kristal adapter; exports no answer keys.
- SHA-256-verifiable static graphs accessible offline through a local server.
- 30 JS and seven Python tests at implementation time.
