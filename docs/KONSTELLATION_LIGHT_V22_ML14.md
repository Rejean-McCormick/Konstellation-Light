# Konstellation Light V2.2 — première étape d’harmonisation (14 langues)

- Interface : 14 langues; 114 clés dans le dictionnaire, dont les expressions compatibles reprises de `src/lib/i18n.mjs` et `src/lib/i18n-finish.mjs` de Konstellation complet (snapshot du 27 novembre 2026). Les phrases propres à Light sont des traductions éditoriales provisoires; pas de certification diK. Les deux sources restent indépendantes au runtime : le dictionnaire Light est autonome, pas de dépendance externe.
- Les principales vues visibles (barre latérale, en-tête, Découvrir, résumé, titres des panneaux, inspecteur et sélection de langue) sont étendues. Les panneaux avancés, textes dynamiques secondaires, messages d’erreur, textes des graphes et bannière bêta comportent encore du français. Ce n’est pas une localisation intégrale de toutes les vues.
- Titres : 11 domaines réels du catalogue ont un titre éditorial dans les 14 langues (accounting, architecture, biology, chemistry, physics, astronomy, history, medicine, education, ai, geology). Les autres gardent le titre source hors français; la table française existante est conservée. Le dictionnaire contient aussi mathematics, non présent dans le catalogue actuel. Les titres ne sont pas des libellés KQ/KP.
- Connaissances : mode automatique suivant la langue UI si un pack révisé exact existe; choix explicite d’une autre langue ou des mots d’origine préservé via URL. Aucun pack sémantique ajouté. Recherche sélective (UI + anglais + choix explicites), repli sur les textes originaux si aucun pack de recherche sélectionné n’est disponible; option explicite pour désactiver ce repli.
- Conservation des identités, graphes, révisions et empreintes; les documents source ne sont pas traduits. Pas de données privées ni de promotion de candidats. Les règles de vérification des sidecars, C4 et la confirmation PUBLIER_126 sont inchangées. Le workflow bêta exécute les tests multilingues avant construction.
- Nouveau nom du cache Service Worker, pour éviter une ancienne interface hors ligne.

## Tests

`node --test tests/ml-six-languages.test.mjs tests/ml-v22-ui.test.mjs tests/multilingual-read.test.mjs tests/ml-selective-search.test.mjs tests/public-beta-126.test.mjs`

20/20 sous Linux/Node 22, dont tests de compilation avec un SVG synthétique **uniquement dans la copie de test**, jamais fourni ni installé. Le snapshot ne contient pas le logo original : le logo du dépôt Windows est requis. 126 empreintes des packs publics du snapshot vérifiées. Chromium bloqué par la politique de l'environnement; tests navigateur réels et Windows restent à confirmer. Le site n'a pas été publié. Le test navigateur optionnel `python tests/ml-selective-browser.py --chromium CHEMIN` nécessite Playwright.

## Aperçu et publication

L’installateur contrôle les empreintes du snapshot, sauvegarde les fichiers remplacés, teste, puis construit un nouvel aperçu local hors dépôt depuis kristal-public (sans écraser les aperçus précédents). Le script existant `scripts/serve-light.mjs` sert le nouveau répertoire. Aucun git add/commit/push automatique. Après contrôle visuel et revue du diff, publier via le workflow existant « Konstellation Light - 126 publics - beta explicite » sur la branche voulue avec `confirmation=PUBLIER_126`. Le workflow épingle la source GitHub publique et reconstruit le site, sans traductions candidates. Le workflow C4 de démonstration reste distinct.


## 2.2.1 — recette du 28 novembre UTC
Les champs de synthèse observés (compteurs, troncature, vérification) utilisent désormais des messages paramétrés dans les 14 langues. Les textes sources et certaines vues secondaires restent distincts et partiellement non traduits. Aucun pack sémantique ajouté.
