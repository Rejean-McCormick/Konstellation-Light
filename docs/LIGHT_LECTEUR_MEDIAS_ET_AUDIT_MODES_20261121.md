# Konstellation-Light — lecteur sans codes, ressources séparées, audit multimodes

## Périmètre

Correctif de présentation appliqué au-dessus de `LIGHT_LECTURE_SIGNIFIANTE_126_20261120`.
Ni le catalogue des 126 Kristals, ni les graphes canoniques, ni les politiques C1–C4,
ni le workflow de bêta publique ne sont modifiés.

## Modifications du lecteur

- Les identifiants de prédicat (`uses_primary_witness`, `grounded_in_source_witness`,
  `coordinate:...`, `type: string`, codes Wikidata non libellés) ne sont plus affichés
  comme des mots. Les significations inconnues deviennent **Lien déclaré**.
- Les valeurs nommées comme des fichiers médias `.jpg/.svg/.wav/.mp4/.pdf`
  sont exclues de l'index des notions et des graphes lecteurs. Dans l'index,
  un inventaire distinct compte les références de ressources par famille.
  Aucun titre, fichier réellement téléchargeable ou fait sémantique n'est supposé.
- L'en-tête mobile présente domaine et langue plus haut dans un format compact,
  avec des boutons moins hauts. Les informations sur la qualité des données restent visibles.
- Le cache hors ligne change d'identifiant pour récupérer les nouveaux fichiers.

## Modifications du kit Playwright

- Parcours de la vue par défaut **sans forcer `lens=constellation`**.
- Détection explicite des vues : graphe, index, inventaire documentaire,
  synthèse, vérification, message, erreur.
- Analyse du texte effectivement rendu dans `#visual`, y compris fiches,
  inventaires et relations; recherche des codes `snake_case`, des champs machine
  et des noms de médias.
- Captures de la zone de lecture même lorsqu'elle n'est pas un SVG.
- Journaux JavaScript/HTTP/réseau et rapport d'analyse inchangés.

## Limites et vérification

- Un libellé ou une traduction révisée absent de la source ne peut être inventé.
- La détection de codes est heuristique : les résultats signalés demandent
  examen humain avant toute modification des sources.
- Les tests Node sont utiles mais **ne remplacent pas** les captures Windows.
- Le kit doit générer un ZIP même en présence de défauts ; les résultats du
  nouveau navigateur sont à examiner avant tout nouveau déploiement GitHub Pages.

## Réconciliation locale 2026-11-21

Cette version fusionnée conserve la navigation des connexions nommées, les listes accessibles, les contrôles interactifs Playwright et les titres documentaires du poste. Le nom du cache local est passé à v15. Les quatre fichiers absents sont ajoutés sans changer les 126 packs de données.
