> **Windows / Ekole :** voir [Chemins canoniques et restauration du Kristal v4](README_CHEMINS_EKOLE_KONSTELLATION_v0.4.md).

> **Nouveau v0.3 : exploration Ekole sans terminal.** Extrais la mise à jour dans Konstellation-Light, puis double-clique sur `Explorer-Ekole-Autochtones.pyw` pour détecter le Kristal, préparer le graphe et l’ouvrir automatiquement. Guide : [README_LANCEUR_EKOLE_AUTOMATIQUE.md](README_LANCEUR_EKOLE_AUTOMATIQUE.md).

# Konstellation Light

**Standalone Windows-oriented toolkit and static website for browsing v10 collection read surfaces with byte-integrity checks.** Actual publication authorization is **not** inferred by Light. This project is separate from the full Konstellation server. It uses a v10 collection reader, a navigation compiler and a lightweight static interface; it does not alter Kristal semantic state.

## Alignement ciblé avec Konstellation complet — 0.5.2 (26 octobre 2026)

Cette révision transfère **uniquement les aides de présentation française et la recherche par mots** du lecteur complet vers les prévisualisations sémantiques locales de Light. Aucun lecteur privé, pouvoir d'autorisation ou décodage Framework v11 n'a été ajouté. La démo C4 épinglée reste identique; les sites locaux nouvellement construits incluent `semantic-display.mjs` et sont **non publiables** via le garde C4 actuel. Voir [le rapport de compatibilité](docs/ALIGNEMENT_KONSTELLATION_2026-10-26.md) pour la matrice des écarts et les tests.

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


## Mise à jour 0.5.1 — Discovery 3.3 / Arketype 1.4

Cette mise à jour aligne la **construction de sites locaux** sur les trois manifestes
facultatifs du Kristal Authoring Kit 3.3 : `kristal.discovery.json`,
`derived/reader-inventory.json` et `derived/reader-profile.json`.
La classification Arketype est *déclarative* et n'est jamais une autorisation.

- Dans l'onglet **Construire**, cocher explicitement « Inclure le résumé Discovery / Arketype » si le contenu de classification et les volumes mesurés peuvent être divulgués. Par défaut : **désactivé**.
- En CLI : `node scripts/build-light.mjs --collection CHEMIN --out previews/site --public YES --revision essai --discovery YES`.
- Les trois manifestes doivent être **référencés et validés par la surface de synchronisation v10** ; un fichier Discovery placé hors de cette surface n'est jamais aspiré. En cas d'ensemble partiel ou incohérent, la projection demandée échoue. Sans métadonnées, le lecteur historique fonctionne normalement.
- Seul un résumé de champs autorisés (ARK/PRF, organisation, profil et classe/volume référencés) entre dans le bundle statique. Aucun chemin d'artefact, inventaire détaillé ou liste d'instructions parseur n'est exporté dans le résumé. Les octets sont vérifiés, mais la fraîcheur des conseils et la classification ne sont **pas vérifiées indépendamment**.
- Le **lecteur v10** utilisé par la compilation se trouve maintenant dans `shared/kristal-v10.mjs`, et non plus dans `server/integrations/kristal-v10.mjs`. Ceci ne centralise pas encore les copies détenues par les deux dépôts Konstellation.
- Si tu extrais le ZIP dans un dépôt existant, ouvre **`Nettoyer_Mise_A_Jour.pyw`** à la racine. Il montre les anciens fichiers reconnus, ne retire que des versions correspondant à leurs empreintes d'origine, demande confirmation et sauvegarde leurs octets à côté du dépôt avant de les retirer. Il ne parcourt pas les Kristals privés.

**Publication :** le site synthétique épinglé `light/site` est conservé **sans modification** ; le garde C4 n'autorise toujours que ce jeu de démonstration. Reconstruire `light/site` avec une vraie collection, même validée ou même avec `--discovery YES`, **bloque** les Pages. Pour les essais locaux, utilise `--out previews/site` ou un répertoire de prévisualisation. Voir [le guide de migration](docs/ALIGNEMENT_DISCOVERY_3_3.md).

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

## Évolution Ekole : graphe de connaissances

Lire **[README_KONSTELLATION_LIGHT_EKOLE_NEXT.md](README_KONSTELLATION_LIGHT_EKOLE_NEXT.md)** pour le curseur 3–25 bulles, le recentrage, les graphes locaux candidats et l’installateur optionnel vers Ekole Élève. La navigation v10 publique reste distincte des prévisualisations v9.
