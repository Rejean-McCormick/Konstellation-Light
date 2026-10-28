> **Standalone Windows edition note:** paths in the original text refer to the full Konstellation repository. In this distribution, `scripts/`, `server/`, and `light/` are integrated at the root of `Konstellation-Light`; the `.pyw` GUI tools and `tools/` handle deployment. See `README.md` and `docs/DEPLOIEMENT.md`.

# Konstellation Light — Architecture v0.1, build-time reader

> **Status:** executable technical v10 navigation prototype, NOT a replacement for Konstellation 1.0 RC. Neither a new standard nor an authority validator.

## 1. Purpose

A Kristal v10 collection distributed on GitHub can be browsed without a Konstellation server, GitHub token or runtime API request. The model is **precompute verified, interact browser, publish immutable**:

```text
Kristal v9 semantic state ──────────────────────────────────┐
  (commitments, artifacts, provenance)                       │
                                                          separation
Kristal v10 GitHub read surface                              │
  kristals/index.json + .kristal/sync-manifest.json            │
     |                                                        │
     v                                                        │
Konstellation's existing inspectGithubKristal                  │
  byte SHA-256 / size / declared schema / consistency checks  │
     |                                                        │
     v                                                        │
Light Exporter (build only; rejects tampering)                │
  derived topology bundle, version label, source pin          │
     |                                                        │
     v                                                        │
GitHub Actions (manual public deployment)                     │
     |                                                        │
     v                                                        │
GitHub Pages (public static files)                             │
     |                                                        │
     +----> Portal ── shareable URL / lenses / provenance      │
     +----> Embed ─── GitBook webframe (host permitting)       │
     +----> Pocket ── opt-in PWA offline copy                  │
                                                              │
No writeback / no inference of canonicality <─────────────────┘
```

## 2. Actual implemented scope

- A deterministic Node standard-library exporter, operating on a **complete local copy** of the v10 surface; no implicit GitHub downloads.
- Reuses `inspectGithubKristal`, `toNavigationPack`, `listGithubKristals` (v10 draft.3); artifacts and files become **navigation entities**, not truths.
- `catalog.json` and an immutable JSON bundle named by SHA-256. The browser re-verifies each downloaded bundle's bytes. Two-version comparison if the catalog contains at least two.
- Browser application without a framework or CDN: Constellation (bounded graph), Directory (pagination), Traceability (declared items), and Versions (structural diff) views. Local search, Focus, shareable URL, and non-normative selection export.
- `?embed=1` compact display for GitBook **if the host domain permits** iframe embedding.
- Opt-in offline button using a Service Worker for public surfaces already fetched. Cache freshness and persistence are not guaranteed.
- GitHub links to files **only when the build command receives the repository and a pinned commit SHA**; prefilled GitHub Issue reports submitted only by the user.

## 3. Non-goals and safeguards

- No live GitHub request per page, GitHub authentication, repository changes, PR acceptance or semantic publication.
- Adapter checks verify agreement between files and byte integrity. They **do not independently recompute the v9 State Commitment**, verify signatures, publication or activation.
- No automatic projection of polymorphic domain artifacts: only the **operational** `has_member/lists_file` graph is exposed; full-engine Lenses still require normalization of their genuine `ResultSet`s.
- Bundle SHA-256 values do not prove the origin of a compromised GitHub Pages deployment; they primarily detect transport inconsistencies relative to the served catalog.
- Avoid confidential data: Pages output and PWA caches are public/local. A private repository does not guarantee confidentiality of files that are published.
- Offline Service Workers may serve old copies; no guarantee of freshness.

## 4. Budgets and optimization

Build time: one verification pass per Kristal, one bundle per revision, deterministic ordering and no injected timestamps. Runtime: load catalog and only the active revision; graph limited to 27 displayed nodes, paginated lists, other bundles loaded only for comparison. Source budgets: `maxFiles=4096`, `maxBytes=128 MiB`, `maxMembers=6000`; browser maximum `8 MiB` per bundle. Thresholds may become configurable after qualification.

**Delivery target:** scripts and compressed styles under ~20 KiB excluding data (remeasure after modifications); no npm dependency at runtime. A future edition may use focus-based graph fragments without changing the catalog API.

## 5. Light data protocol

`konstellation.light-navigation/1.0` is a **derived internal format**, local to Konstellation and independent of the Framework's normative schemas. `semantic_authority=false`, `view_kind=derived-hosting-navigation`, `declared_commitment`, `verification` and `source` make this boundary explicit. `konstellation.light-selection/1.0` describes a navigation selection for a possible future Kompiler bridge; it is NOT a Context Pack.

## 6. Deployment

In the Konstellation repository (Node >=24.15 for release tests):

```powershell
node scripts/build-light.mjs --collection "C:\mycode\Kristal\github-collection" --out light/site --public YES --revision stable-2026-10
node scripts/serve-light.mjs light/site
```

Open `http://127.0.0.1:4177/`. The URL also works under the GitHub Pages `/repo/` subpath because all assets use relative paths.

Optional GitHub pinning:

```bash
node scripts/build-light.mjs --collection ./public-collection --out light/site --public YES \
  --revision abc123 \
  --repository https://github.com/OWNER/REPOSITORY \
  --commit 0123456789abcdef0123456789abcdef01234567
```

Add `--append YES` to add a new revision to the same Light collection, preserving previously verified bundles. Without `--append`, the catalog reflects only the new build and deletes obsolete bundles.

GitHub publishing: enable **Settings → Pages → Source: GitHub Actions**, then manually run `Konstellation Light — opt-in public Pages`. It does not trigger on every push. The `collection_directory` input may point to a path local to the checkout; if left empty, only the demo is published without secrets. Collections hosted elsewhere must be synchronized using authorized tools before the build; the workflow does not fetch private repositories.

GitBook: add a link to `https://OWNER.github.io/REPOSITORY/?k=SLUG&lens=constellation`, or an embed/webframe block for that URL with `&embed=1` if GitBook and Pages policies allow. Never blindly disable framing protections on the full Konstellation server: Light is a separate site.

## 7. Opportunities for future development

1. Reuse true `NavigationPlan` and `Projection DTO` objects from the 1.0 semantic Lenses through server-side precompilation and an explicitly versioned distribution surface.
2. Build neighborhood shards plus an inverted index to avoid a single massive pack for huge collections.
3. GitBook ContentKit: native Lens/focus selection block with a full-screen deep link, only after proving framing/CSP compatibility.
4. Have Kompiler produce Context Packs from `light-selection` in an authorized service without granting write access to the canon.
5. GitHub Issues/PR collaboration: open a reviewable suggestion path, without automatic promotion to authority.

Deployment itself and private GitHub/GitBook flows were not tested here. Provided tests cover build and integrity, not full browser or GitBook-permission qualification.

## 8. C4 v0.5 extension — publication governance

Konstellation Light remains a **public static consumer** of approved releases, not the registry for 126 local workspaces or the private browser of full Konstellation. The active C4 gate accepts only the **pinned synthetic demo**, and does not treat SHA-256 as C1 qualification, C2 authorization or C3 publication proof. The real publishing procedure remains blocked until producers and consumers jointly adopt a verifiable receipt format and a trusted issuer. `config/c4-demo-pin.json` is a byte-review aid (defense against mistakes), **not** a cryptographic authority signature. The browser explicitly discloses these boundaries and shows technical revisions, not “published versions.”

## 9. Discovery 3.3 / Arketype 1.4 alignment (Light 0.5.1)

The v10 reader moved to `shared/kristal-v10.mjs` to provide a reusable internal import point; **this does not yet provide cross-repository sharing** with full Konstellation.

The optional `shared/discovery.mjs` projection reads only documents **already included and verified within the v10 surface**. It passes allowlisted fields to the browser (`konstellation.light-discovery-projection/1.0`), where they are shown as *declarative* in the inspector. Arketype classification does not imply a working specialized index, freshness, or authorization. Parsing settings remain reader-specific and are never executed from manifests.

The pinned C4 demo is not regenerated. Sites built from real collections remain forbidden on GitHub Pages under current C4 policies. Details: [ALIGNEMENT_DISCOVERY_3_3.md](ALIGNEMENT_DISCOVERY_3_3.md).
