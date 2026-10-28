# Deploy Konstellation Light

## C4 publication gate (v0.5)

**Only the pinned synthetic demo may be prepared for GitHub Pages at present.** The GUI, Pages workflow and Node gate reject all real collections in this flow until C1/C2/C3 evidence is adopted and validated. When building a personal collection, use a **local preview** or review export; do not publish its bytes to a public repository.

Check demo eligibility: `node scripts/c4-publication-gate.mjs --site light/site`. Status `BLOCK_REAL_COLLECTION` means technical integrity passed but no public authorization has been established.

## Preparation

Use the `Konstellation-Light.pyw` GUI. The `light/site` directory initially contains a **public demonstration**; it does not automatically reflect your actual Kristals. For other data, select a synchronized v10 collection and explicitly confirm your intent to expose it publicly.

## Easiest method: GitHub clone + Pages `/docs`

1. Clone an authorized GitHub repository onto your PC (or use an existing clone).
2. Open `Deployer-Light.pyw`, select the clone root (containing `.git`), and choose **“Préparer GitHub Pages dans ce dépôt” (Prepare GitHub Pages in this repository)**.
3. The tool places files under `docs/konstellation-light`; no Git command is run automatically.
4. Review the added files and manually run `git add`, `git commit`, and `git push`.
5. On GitHub, under **Settings → Pages**, choose **Deploy from a branch**, the relevant branch, and `/docs`.
6. Typical URL: `https://OWNER.github.io/REPO/konstellation-light/` (or a custom domain, depending on configuration).

If `docs/` already hosts a site, the new app goes into a subdirectory without replacing the home page. If an earlier Light edition is present, the tool backs it up **outside the repository**, in `.<repository-name>-Konstellation-Light-backups/` under the clone's parent directory. Do not add backups to Git.

## Alternative: dedicated repository + GitHub Actions

The included `.github/workflows/konstellation-light-pages.yml` uses `workflow_dispatch`, not automatic pushes, to prevent unintended publication. In the GitHub repository:

1. Copy the **standalone project** into the root of a repository intended for Pages (or adapt workflow paths).
2. Set **Settings → Pages → Source: GitHub Actions**.
3. In **Actions**, manually run `Konstellation Light — opt-in public Pages`.
4. Without a specified collection, the workflow publishes only the prebuilt demo; a real collection is **blocked**, even if versioned in the repository, until C3 evidence is received and verified.
5. Monitor CI checks and the `github-pages` environment protection.

Warning: a private repository does not automatically make its Pages site private. Do not put sensitive surfaces there. GitHub versions and commits do not create semantic authority.

## Any static host

Use `Deployer-Light.pyw` → **“Exporter un ZIP du site” (Export site as ZIP)**, then upload the ZIP's contents (rather than the ZIP itself, unless the host extracts it) to the host's public directory. Serve over HTTPS for the Service Worker.

## GitBook

Use `GitBook-Light.pyw`, enter the full site URL, and obtain `exports/GitBook-Embed.md`. Prefer GitBook's Embed/Webframe block. Iframe embedding depends on the site's security headers, GitBook, and the target domain; a full-screen link must remain available.

## Post-publication checks

- Load the catalog and a bundle in the browser; confirm normal loading does not require a GitHub API.
- Check shared links with `lens`, `k`, `revision`, and `focus` as available.
- Test a `?embed=1` URL.
- Test a mobile screen and embedding CSP policies before sharing the GitBook link.
- Do not confuse SHA-256 transport integrity with signature or authority validation.
