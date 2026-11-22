# Konstellation-Light 126 — présentation sûre et audit interactif V16

## Portée

Correctif local sur les scripts de lecture, le cache hors ligne, les tests Node et
le kit d’audit Playwright. Aucun pack `light/site/data/pack-*.json`, identifiant,
relation canonique, référence de provenance, langue ou assertion n’est modifié.

- Les libellés de notions contenant une clé interne (`crop_organism`,
  `material_control`, etc.) sont regroupés comme « notion sans intitulé » et
  distingués par un numéro pendant l’exploration avancée. Aucun nom n’est inventé.
- Les descriptions internes suivant le gabarit « Valeur littérale déclarée;
  type : string. » ne sont pas affichées comme définitions.
- Lorsque aucune notion nommée n’est connectée, le bouton d’exploration peut
  choisir une notion anonyme réellement connectée (et la numéroter).
- Les 51 registres initiaux sont reconnus par l’audit : clic sur « Explorer les
  relations existantes », vérification du graphe et des liens, navigation clavier
  ou souris, contrôle des codes visibles, capture après ouverture et retour.
- Le cache local est renommé en V16 afin d’éviter de réutiliser une ancienne
  couche de présentation après un déploiement ultérieur.

## Sécurité et limites

L’installateur `--check` est en lecture seule. `--install` exige les empreintes
exactes des fichiers installés par l’overlay réconcilié 126, crée une sauvegarde
hors des projets, remplace les fichiers de manière atomique et tente une
restauration en cas d'échec. Il ne lance ni Git, ni Playwright, ni déploiement.
Une édition locale différente bloque le correctif ; ne jamais forcer.

Les tests Node vérifient les présentations issues des 126 packs inclus dans
l’instantané de référence. La validation visuelle complète reste à refaire
sur le Windows réel à l’aide de `LANCER-AUDIT-MOTS.cmd` après installation et
reconstruction de la prévisualisation locale. Les avertissements relatifs à
l’absence de traductions révisées restent hors du périmètre : aucune traduction
fictive n'est ajoutée.

## Retour arrière

Utiliser `--restore-check --backup-dir <dossier_de_sauvegarde>` avant
`--restore --backup-dir <dossier_de_sauvegarde>`. La restauration refuse de
remplacer des fichiers qui ont changé depuis ce correctif.
