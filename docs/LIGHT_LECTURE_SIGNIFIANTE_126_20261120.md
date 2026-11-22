# Konstellation-Light — lecture signifiante des 126 Kristals

**État :** overlay de présentation, non publié, construit à partir de « Lecture en mots ».

## Ce que le lecteur voit désormais

- Les Kristals possédant surtout des notions sans nom s'ouvrent sur **l'index des mots disponibles**, plutôt que sur une carte d'identifiants anonymes.
- Les notions sans nom sont **décomptées et regroupées** ; leur exploration individuelle est réservée aux options avancées, avec des désignations ordinales neutres, sans identité inventée.
- Les Kristals dont le contenu est surtout un inventaire de fichiers s'ouvrent sur un **classement documentaire** : guides, documentation, données/états, tests, autres documents. Ce classement est déduit des **chemins et noms de fichiers** uniquement ; il ne suppose aucun contenu sémantique.
- Les graphes restent accessibles lorsque de vrais liens existent. Sur écran étroit, une liste de relations lisibles remplace la constellation illisible ; les liens sans nom sont comptés, pas répétés.
- Les compteurs distinguent notions nommées, notions sans intitulé et liens déclarés. Les liens déclarés ne sont pas des faits validés.
- Le sélecteur de langue propose uniquement les sidecars révisés présents dans le catalogue ; à défaut, la source est affichée et l'interface reste française. Une relation sans traduction est signalée comme telle, jamais traduite automatiquement.

## Ce que cet overlay ne fait pas

Aucune modification des **126 packs JSON**, du catalogue, des identifiants et des arêtes canoniques, de la qualification C1–C4, du workflow de bêta publique, du dépôt kristal-public ou de SPEK/diK/SemantiK. Aucune traduction ajoutée. Aucune publication déclenchée.

## Vérifications

Les tests ciblés `light-reader-meaningful-126.test.mjs`, `light-reader-words-126.test.mjs`, `light-public-graph-theme-126.test.mjs`, `public-facing-ui.test.mjs`, `graph-navigation.test.mjs`, `multilingual-read.test.mjs`, `public-beta-126.test.mjs` doivent tous passer après installation. Les tests couvrent les 126 packs existants et la conservation de leurs contenus.

**Limite importante :** le rendu visuel final sur navigateur Windows doit être audité par Playwright. Un résultat « sans erreur de console » ne garantit pas la lisibilité ergonomique. La couverture complète des 14 langues requiert encore de vrais sidecars révisés.

## Essai et retour arrière

L'installateur sauvegarde toutes les versions antérieures qu'il remplace sous `%LOCALAPPDATA%/Konstellation-Light/overlays/LECTURE_SIGNIFIANTE_126/`. Réinstallation idempotente ; conflit de SHA refusé ; restauration possible avec `--rollback CHEMIN_DU_DOSSIER_DE_SAUVEGARDE` si les fichiers n'ont pas été modifiés depuis l'installation.

Après installation, exécuter l'audit local Playwright `LANCER-AUDIT-MOTS.cmd` avant tout commit ou déploiement. Publier uniquement après inspection des captures et des journaux.
