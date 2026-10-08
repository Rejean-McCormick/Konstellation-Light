> **Note édition autonome Windows :** les chemins du texte original sont relatifs au dépôt Konstellation complet. Dans cette distribution, `scripts/`, `server/` et `light/` sont intégrés à la racine de `Konstellation-Light`; les outils graphiques `.pyw` et `tools/` assurent le déploiement. Voir `README.md` et `docs/DEPLOIEMENT.md`.

# Konstellation Light — Architecture v0.1, build-time reader

> **Statut :** prototype exécutable de navigation technique v10, NON remplacement du moteur Konstellation 1.0 RC. Pas un nouveau standard ni un validateur d'autorité.

## 1. Raison d'être

Une collection Kristal v10 diffusée via GitHub peut être visitée sans serveur Konstellation, sans jeton GitHub et sans appel API au runtime. Le modèle est **precompute verified, interact browser, publish immutable** :

```text
Kristal v9 semantic state ──────────────────────────────────┐
  (commitments, artifacts, provenance)                       │
                                                          séparation
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

## 2. Scope réellement implémenté

- Un exporteur déterministe Node standard library, depuis une **copie locale complète** de la surface v10 ; pas de téléchargements GitHub implicites.
- Réemploi de `inspectGithubKristal`, `toNavigationPack`, `listGithubKristals` (v10 draft.3) ; artefacts et fichiers deviennent des **entités de navigation**, pas des vérités.
- `catalog.json` et un bundle JSON immuable nommé par SHA-256. Le navigateur re-vérifie les octets de chaque bundle téléchargé. Comparaison de deux versions si le catalogue en contient au moins deux.
- Application navigateur sans framework ni CDN : vue Constellation (graphe borné), Répertoire (pagination), Traçabilité (éléments déclarés), Versions (diff de structures). Recherche locale, Focus, URL partageable, export de sélection non-normative.
- Mode `?embed=1` pour une représentation compacte, GitBook **si le domaine hôte autorise** l'iframe.
- Bouton hors ligne opt-in basé sur Service Worker pour surfaces publiques déjà récupérées. Il ne garantit pas l'actualité ni la persistance du cache.
- Liens GitHub vers les fichiers **seulement lorsque la commande de build reçoit le dépôt et un SHA de commit épinglé** ; signalements GitHub Issues préremplis, soumis par l'utilisateur uniquement.

## 3. Non-objectifs et garde-fous

- Pas de requêtes live GitHub par page, d'authentification GitHub, de modification de dépôt, d'acceptation de PR ou de publication sémantique.
- Les contrôles de l'adaptateur valident l'accord des fichiers et l'intégrité des octets. Ils **ne recalculent pas indépendamment le State Commitment** v9, ne vérifient pas les signatures, la publication ou l'activation.
- Aucune projection automatique des artefacts métier polymorphes : seul le **graphe opérationnel** `has_member/lists_file` est exposé ; les Lens du moteur complet nécessitent encore la normalisation de leurs véritables `ResultSet`.
- Les SHA-256 de bundles n'établissent pas l'origine d'un déploiement GitHub Pages compromis : ils détectent surtout des incohérences de transfert par rapport au catalogue servi.
- Éviter les données confidentielles : les sorties Pages et les caches PWA sont publics / locaux. La présence dans un repo privé n'assure pas la confidentialité des fichiers publiés.
- Le Service Worker peut servir une copie ancienne lorsqu'on est hors ligne ; aucune prétention de fraîcheur.

## 4. Budget et optimisation

Build-time : un passage de vérification par Kristal, un bundle par révision, ordonnancement déterministe, aucun timestamp injecté. Runtime : charge le catalogue puis uniquement la révision active ; graph limité à 27 nœuds affichés, liste paginée, autres bundles seulement lors de la comparaison. Les budgets de sources sont `maxFiles=4096`, `maxBytes=128 MiB`, `maxMembers=6000`; navigateur `8 MiB` par bundle. Les seuils pourront devenir configurables après qualification.

**Cible de livraison :** script et styles compressés sous ~20 KiB hors données (mesurer après modifications) ; pas de dépendance npm au runtime. Une future édition pourra adopter des fragments de graphe par focus sans changer l'API du catalogue.

## 5. Protocole de données Light

`konstellation.light-navigation/1.0` est **un format interne dérivé**, local à Konstellation, indépendant des schémas normatifs du Framework. `semantic_authority=false`, `view_kind=derived-hosting-navigation`, `declared_commitment`, `verification` et `source` rendent cette frontière explicite. `konstellation.light-selection/1.0` décrit une sélection de navigation pour un éventuel futur pont Kompiler ; ce n'est PAS un Context Pack.

## 6. Déploiement

Dans le dépôt Konstellation (Node >=24.15 pour les tests de release) :

```powershell
node scripts/build-light.mjs --collection "C:\\mycode\\Kristal\\github-collection" --out light/site --public YES --revision stable-2026-10
node scripts/serve-light.mjs light/site
```

Ouvrir `http://127.0.0.1:4177/` ; l'URL fonctionne aussi en sous-chemin GitHub Pages `/repo/` car toutes les ressources sont relatives.

Option épinglage GitHub :

```bash
node scripts/build-light.mjs --collection ./public-collection --out light/site --public YES \
  --revision abc123 \
  --repository https://github.com/OWNER/REPOSITORY \
  --commit 0123456789abcdef0123456789abcdef01234567
```

Ajouter `--append YES` pour intégrer une autre révision à la même collection Light en conservant les bundles vérifiés existants. Sans `--append`, le catalogue reflète seulement la nouvelle construction et supprime les anciens bundles obsolètes.

Publication GitHub : activer **Settings → Pages → Source: GitHub Actions**, puis exécuter manuellement `Konstellation Light — opt-in public Pages`. Le workflow ne se déclenche pas à chaque push. L'input `collection_directory` peut viser un chemin local au checkout ; vide, il publie la seule démo sans secrets. Les collections hébergées ailleurs doivent être synchronisées par des outils autorisés avant la construction ; le workflow n'aspire pas des dépôts privés.

GitBook : ajouter un lien vers `https://OWNER.github.io/REPOSITORY/?k=SLUG&lens=constellation`, ou un bloc d'intégration/webframe vers la même URL avec `&embed=1` si les politiques GitBook et Pages le permettent. Ne jamais désactiver aveuglément les protections de framing du serveur Konstellation complet : Light est un site distinct.

## 7. Opportunités d'évolution

1. Réutiliser réellement les `NavigationPlan` et `Projection DTO` des Lens sémantiques 1.0 par précompilation côté serveur, avec une surface de distribution explicitement versionnée.
2. Construire des shards par neighborhood + index inverse, pour éviter un gros pack monolithique sur les immenses collections.
3. GitBook ContentKit : bloc natif de sélection Lens et focus, avec deep-link plein écran. Ajouter seulement après une preuve de compatibilité de framing et de CSP.
4. Faire produire par Kompiler des Context Packs à partir d'une `light-selection`, côté service autorisé, sans lui donner de droits d'écriture dans le canon.
5. Collaboration GitHub Issues/PR : ouvrir un flux de suggestion révisable, sans promotion automatique d'autorité.

Le déploiement lui-même et les flux privés GitHub/GitBook n'ont pas été testés ici. Les tests livrés couvrent le build et l'intégrité, pas une qualification complète des navigateurs ou des permissions GitBook.
