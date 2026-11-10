# Vérification du pack cumulatif visuel

## Données réelles utilisées

- Site Konstellation Light fourni, 126 bundles, chacun lié à son catalogue avec `sha256` et `surface_digest`.
- 10 ZIP `A_DEPOSER_ICI_DEFINITIONS_EXISTANTES_...zip`, contenant au total 2 354 candidats.
- Audit précédent signalant 407 candidats à revoir en priorité, sans approbation scientifique.
- Aucun texte inventé, aucune traduction nouvelle, aucune révision usurpée.

## Tests

- 7 tests Python : site réel 126/126, 2 354 candidats dont 407 prioritaires, quarantaine d'un graphe corrompu en conservant les 125 autres, deuxième installation avec sauvegarde, rejet d'une assertion qui ne correspond pas au graphe, compatibilité avec l'ancien et le nouveau lecteur multilingue, mode de secours si `app.js` change.
- 4 tests Node : validation des 10 fichiers candidats contre leurs assertions réelles, rejet d'un mauvais `surface_digest`, d'une fausse référence et d'un statut `reviewed` falsifié.
- Syntaxe JavaScript des lecteurs Light et du nouveau catalogue autonome vérifiée avec `node --check`.
- Vérification HTTP locale de `definitions.html` : HTTP 200 (rendu Chromium non concluant dans le conteneur).
- Test du navigateur automatisé **non conclu** dans ce conteneur : la politique réseau du navigateur bloque même l'URL `127.0.0.1`. Le premier affichage sur Windows reste à confirmer.

## Protections

- Le site d'origine et les cinq dépôts ne sont jamais modifiés.
- Quarantaine = retrait d'une **copie** du catalogue de navigation, jamais suppression d'un Kristal.
- Les 407 alertes n'ont aucun pouvoir de bloquer la consultation.
- L'aperçu local conserve la séparation entre contenu candidat et contenu revu; aucune qualification C1/C2/C3/C4 ni déploiement.
- Un rapport ZIP est généré automatiquement pour un contrôle ultérieur.

## Limites

- Seulement 10 Kristals fournissent des définitions candidates dans ces ZIP. Les 116 autres sont toujours explorables, sans définition nouvelle créée par ce pack.
- Il n'exécute pas diK / SemantiK / Spek pour construire les `CommunicationRequest` manquantes; le branchement antérieur est préservé dans les dépôts mais la génération linguistique complète reste à développer.
- Il n'infère pas le français de la seule apparence des textes; locale conservée `und`.

## Correctif du 9 novembre : `Bloc inspection Light non reconnu`

- Identification de la variation de l’inspecteur après l’installation du contrat multilingue.
- Le raccordement n’exige plus une égalité exacte de la ligne `const description=...` et reste compatible avec les deux versions présentes dans les snapshots.
- Fallback non destructeur vers `definitions.html`, catalogue autonome avec navigation par Kristal et notion, empreintes de graphe et de définitions vérifiées côté navigateur.
- Le lancement ouvre le catalogue en premier; la carte Light reste disponible sans remplacer le site existant.
- Test de compatibilité sur le vrai fichier `app.js` multilingue et test d’un `app.js` volontairement non reconnu.
