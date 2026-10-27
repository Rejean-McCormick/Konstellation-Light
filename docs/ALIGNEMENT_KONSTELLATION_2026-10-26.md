# Konstellation → Konstellation Light : alignement contrôlé (26 octobre 2026)

## Décision

Conserver **deux produits complémentaires**. Konstellation complet = lecteur local/partagé contrôlé avec politiques d'accès, explorateurs et moteurs de projection. Light = visualisation autonome de *représentations dérivées, explicitement sélectionnées*, utile pour les aperçus locaux et, seulement après qualification indépendante, de futures publications statiques. Le but **n'est pas** de porter aveuglément toute la logique serveur dans un navigateur statique.

Les cinq snapshots d'origine ont été examinés localement : `znapshot_Konstellation_10261813.zip`, `znapshot_Konstellation-Light_10261813.zip`, `znapshot_Kristal-Integration-Pack_10261812.zip`, `znapshot_Kristal-Manager_10261812.zip`, `Kristal-GitHub-Bootstrap(1).zip`. Aucun appel distant ni modification GitHub n'a été effectué.

## Delta constaté dans les snapshots

| Fonctionnalité | Konstellation complet | Light avant | Traitement dans 0.5.2 |
|---|---|---|---|
| Présentation sémantique française du 17/10 (`P138`, `P50`, relations explicitement connues) | `src/lib/semantic-display.mjs` | Absente | **Portée**, affichage des arêtes de prévisualisation candidate seulement ; prédicat brut conservé dans l'inspecteur |
| Recherche par mots entiers, sans `aquin` → `Joaquín` | Astrolabe et libellés avec désambiguïsation | Recherche par sous-chaînes | **Portée** aux curations candidates uniquement ; ne fusionne aucun identifiant |
| Libellé technique/valeur brute et provenance | Inspecteur avancé | Inspector minimal | **Partiellement porté** : identifiant de navigation + libellé source et prédicat brut visibles |
| Navigation adaptive KNAV, Lens et registres de renderers 1.0 | Serveur + projections & renderers | Quatre vues légères seulement | **Non porté** ; une traduction contractuelle de projections publiques serait nécessaire |
| Lecteur local v10, catalogue privé et sélection neutre | Expérimental, depuis le 16/10 | Lecteur de *surface synchronisée* v10 et prévisualisation locale Ekole | **Non porté** : ne pas exposer d'emplacements locaux ou de catalogues privés dans un site public |
| Export Manager + politiques d'accès | My Kristals, opt-in / local | Aucun navigateur de fleet privé | **Non porté** ; Manager ne délivre aucune autorisation à Light |
| Discovery 3.3 / Arketype | Optionnel, lecture consultative | Présent dans Light 0.5.1, opt-in | **Préservé**, classification non autoritaire |
| Framework v11 / diK / dictionnaires | Pack d'intégration v11 séparé, alpha.1 et checkout Framework épinglé | Aucun décodeur v11 | **Non porté** : exige une nouvelle projection, un format/version propres et qualification distincte |
| C2/C4 publication | Garde-fous indépendants | C4 démo synthétique uniquement | **Préservé** et testé : une collection réelle reste BLOQUÉE |

## Correctif fonctionnel livré

1. `light/src/semantic-display.mjs` reprend **comme affichage non canonique** les fonctions de présentation françaises de Konstellation du 17 octobre, plus une fonction de recherche locale bornée.
2. `light/src/app.js` applique ces libellés dans les graphes, la liste, les fiches et l'inspecteur **uniquement** pour `derived-semantic-preview`, pas aux données v10 d'hébergement. La structure `nodes` / `edges`, les SHA-256, le `surface_digest`, la sélection et les IDs de source ne changent pas.
3. Les scripts de build de prévisualisation et de collection incluent désormais le module autonome, et le service worker du code source le précharge dans un nouveau cache `v5`.
4. Les vérificateurs JS/Python reconnaissent l'asset explicitement autorisé pour les **prévisualisations locales**, mais le C4 JavaScript ne l'accepte **jamais** comme contenu de la démo épinglée. Un build contenant cet asset est classé `BLOCK_REAL_COLLECTION`. L'intégrité annoncée est celle des bundles JSON et ne garantit pas une signature ou une qualification de tout JavaScript arbitraire.
5. L'outil Ekole tient compte de cet asset dans son empreinte de cache et ses tests de reproduction.
6. `light/site/` et `config/c4-demo-pin.json` n'ont **pas** été changés. La démo publique existante est donc volontairement inchangée : les nouveaux libellés seront visibles seulement dans des prévisualisations reconstruites par les scripts locaux.

### Frontière de sécurité non négociable

`--public YES` est une **déclaration d'intention d'export**, jamais une validation C1/C2/C3 ni une autorisation de publier une collection réelle. Le flux GitHub Pages autorise la démo exacte et rien d'autre. La vérification de transport SHA-256 n'établit pas une preuve de vérité sémantique. Aucune synchronisation GitHub distante n'a été faite.

## Évidence et limites

Tests locaux : Node.js 22.16.0 / Python 3.13.5 sous Linux.

- Snapshot original Light : **47/47** tests JavaScript, **21/21** Python ; C4 `ALLOW_DEMO_ONLY`.
- Light aligné : **51/51** tests JavaScript, **21/21** Python ; C4 `ALLOW_DEMO_ONLY` sur la démo d'origine ; vérification explicite de `BLOCK_REAL_COLLECTION` avec l'asset ajouté.
- Tests référentiels de présentation de Konstellation complet : **5/5**.
- Contrôle syntaxique Node sur l'interface et le nouveau module : réussi.

Non exécutés ou non qualifiés : interface navigateur E2E Light, Windows GUI sur machine physique, installateur Windows, dépendances/build Astro/Svelte du Konstellation complet, Framework v11 externe (non fourni), environnement de production, C1/C2/C3 et performances au niveau de Wikipédia. La navigation statique actuelle est bornée (catalogue 1 000 entrées, bundles de 8 Mio max, graphe de 12 000 nœuds maximum, garde C4 <=1 006 fichiers) : **elle ne convient pas directement à 100× le contenu et 20× le trafic de Wikipédia**.

## Prochaines étapes proposées

**A. Contrat de projection commun, sans fusion des runtimes.** Faire émettre à Konstellation complet une projection documentaire bornée, stable, en lecture seule et explicitement qualifiée. Light doit pouvoir l'inspecter sans reconstruire les décisions de Reader Policy.

**B. Chaîne C1/C2/C3 → C4 distincte.** À convenir avant toute publication de contenu réel : preuves de qualification, autorisations d'ayant droit, release immuable, traitement des retraits et révocations. Les empreintes de transport ne sont pas des certificats de publication.

**C. Framework v11 multilingue.** À partir du Pack v11 alpha.1, concevoir une nouvelle projection tenant compte des statuts `direct`/`fallback`/`missing`, des KQ/KP et de la provenance des couches lexicales. Ne pas faire croire à une traduction validée en cas de repli. Ne pas modifier le lecteur historique Light v10.

**D. Light à très grande échelle.** Nouveau moteur de routage et d'indexation par fragments, stockage objet/CDN indépendants, métadonnées paginées, génération incrémentale, budget vérifié de coût/capacité. Dépôts GitHub réservés au code, contrats, CI de taille limitée et gouvernance; **jamais** à des milliards de pages ou au trafic des lecteurs.

**E. Qualification complète.** Validation Windows (GUI, lanceurs), E2E navigateur, comparaison visuelle des prédicats reconnus et inconnus, simulation d'absence de sources, tests de cache/invalidation, revue sécurité et tests d'échelle avant un tag stable.

## Mode d'application

Cette archive est un **candidat de travail**. Faire une sauvegarde de Konstellation Light, examiner les différences des sources, ne pas écraser un checkout avec des modifications personnelles non fusionnées, tester `node --test tests/*.test.mjs`, `python -m unittest discover -s tests -p 'test_*.py'`, `node scripts/c4-publication-gate.mjs --site light/site`. Ne pas remplacer `light/site` par une collection réelle ni pousser un déploiement public.
