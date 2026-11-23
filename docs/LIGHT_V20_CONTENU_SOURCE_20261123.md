# Konstellation-Light V20 — Découverte fondée sur le contenu public

## But

La V19.1 montre correctement les connexions, mais de nombreux Kristals restent difficiles à comprendre : des centaines de liens vers des notions anonymes et des fiches de documents génériques. V20 complète le lecteur par **une projection documentaire lisible** construite uniquement à partir des fichiers Markdown présents dans la surface publique v10 vérifiée.

## Construction

- Le build continue de vérifier la collection, ses manifestes, ses fichiers et ses empreintes.
- Le module `shared/public-reading.mjs` extrait en mode **build-time** jusqu'à 48 fichiers Markdown publics éligibles par Kristal (`README.md`, `docs/*.md`, `AI_START_HERE.md`, quelques fichiers AI de contexte), avec budgets stricts de lecture. Les paragraphes, rubriques et listes sont repris sans inventer de contenu.
- Le pack `konstellation.light-navigation/1.0` garde exactement ses nœuds, liens et identifiants, et reçoit un champ `reading` au format `konstellation.light-reading/1.0`. `semantic_assertions_created = 0`.
- Les extraits documentaires restent des **textes de source**, pas des relations canoniques, des traductions certifiées ni une interprétation éditoriale indépendante.
- Les liens pointent vers le fichier au **commit GitHub épinglé**, lorsqu'une source épinglée est présente. Aucune requête par page vers GitHub n'est nécessaire au lecteur.
- Les contenus sont insérés dans le DOM avec `textContent`; aucune balise de contenu public n'est exécutée.

## Expérience visiteur

- Une vue **Découvrir le Kristal** apparaît pour les Kristals qui disposent d'extraits sources. Elle est privilégiée au départ pour les collections documentaires et pour les graphes qui n'ont pas de connexions lisibles suffisantes.
- La présentation du domaine, les repères explicitement cités dans le README, les documents avec titres et extraits, leurs rubriques et leur provenance passent au premier plan.
- La constellation reste accessible à tout moment et conserve le sens exact des connexions, sans création d'assertion. Les notions anonymes demeurent accessibles en exploration avancée.
- Les cartes documentaires, l'inventaire et l'inspecteur utilisent désormais les titres déclarés dans les Markdown lorsqu'ils existent. La recherche utilise également ces extraits.
- Les URLs de signalement de problème sont produites à partir de la sélection courante, sans réutiliser un ancien `location.href`.

## Validation et limites

- Un test d'export vérifie le contrôle d'intégrité, l'extraction littérale et l'inclusion des styles. Les tests de non-publication C4 restent en vigueur.
- Le paquet intègre `AUDIT_V20.py` et un auditeur Playwright qui importent, dans une copie temporaire, le commit public épinglé `538b4d559f6c7cdd022283f5a21ef728b332c52a` et vérifient 126 Kristals sur bureau et mobile.
- Les tests de navigateur sur une page HTTP locale doivent être exécutés sur Windows : cet environnement bloque les ouvertures Chromium locales. L'audit sur Windows doit précéder tout nouveau Git Sync et `Run workflow`.
- Les documents sources n'ont pas tous des introductions ou des titres riches. Dans ces cas, Light les signale sans prétendre qu'une information absente a été vérifiée.
- Aucune donnée des 126 Kristals n'est modifiée par l'installateur; la publication GitHub Pages reste un choix explicite séparé.
