# Konstellation-Light — lecteur en mots et langues vérifiées

**Base vérifiée :** `Rejean-McCormick/Konstellation-Light` `8aa3b80696c0c588ada4a2bb69193c7f12f61bf0`.

Ce correctif ne traite que la **présentation du lecteur public**.

## Périmètre du correctif

- Supprime de la vue courante les identifiants `KQ…`, `Q…`, `KP…`, empreintes SHA-256, URN, chemins de fichiers, formulaires de provenance et export JSON.
- Affiche les vrais libellés déjà disponibles; lorsqu'un nom est absent, emploie un **libellé neutre** (« Notion sans intitulé », « Notion non traduite ») sans inférer ni fabriquer de connaissances.
- Convertit la navigation de fichiers en libellés de catégories lisibles (« Document de la collection 4 », « Présentation du projet » lorsqu'un nom de fichier est connu). Les données et liens du pack restent identiques.
- Garde la recherche et l'orientation dans la carte, les vrais liens et les satellites du graphe.
- Rétablit le contraste du sélecteur avec une flèche native et augmente la hauteur utile de la carte sur mobile.
- Affiche le sélecteur de langue même en l'absence de traductions. Seules les **localisations révisées** réellement présentes dans les descripteurs du catalogue peuvent être choisies. Les langues indisponibles ne sont pas inventées.
- Lorsqu'une langue révisée est choisie mais qu'une notion n'a pas de traduction, affiche une indication « Notion non traduite » plutôt que de mélanger silencieusement des mots de source dans cette langue.

## Limite fonctionnelle actuelle

Le catalogue public des 126 Kristals ne contient **aucune localisation attachée** au jour du correctif. Il est donc impossible de garantir des noms et descriptions dans les 14 langues souhaitées sans fournir des textes linguistiques validés via `--localizations`. Le présent correctif **ne traduit pas les concepts** et ne prétend pas le faire. L'interface de navigation demeure française; les noms sources peuvent être dans une autre langue tant que les contenus ne sont pas révisés.

## Portée et garde-fous

Les packs, le catalogue, les empreintes, les preuves C1–C4, les règles d'intégrité, les scripts de publication et le workflow bêta ne sont pas modifiés. Les identifiants restent présents dans les fichiers source et dans les URL de navigation ou de signalement pour l'intégrité et la traçabilité; ils ne s'affichent pas dans les titres, les cartes ou les fiches du lecteur.

La version hors ligne change de clé pour éviter de servir l'ancien JS depuis le cache.

## Installer localement (Windows)

```powershell
$light = 'C:\mycode\Konstellation\Konstellation-Light'
py -3.12 .\INSTALLER_LIGHT_LECTURE_EN_MOTS.py --target $light --check
py -3.12 .\INSTALLER_LIGHT_LECTURE_EN_MOTS.py --target $light --install
```

L'installateur refuse les versions source inconnues, les chemins symlinks/junctions, sauve la base et vérifie les tests avant validation. Aucune opération Git ou réseau n'est effectuée.

Après revue des changements locaux, seuls les fichiers de cet overlay peuvent être committés. La publication reste manuelle et doit passer par le workflow bêta existant avec décision explicite du propriétaire.
