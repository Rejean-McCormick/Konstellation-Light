# Konstellation-Light — bêta publique volontaire de 126 surfaces déjà publiques

**Statut : parcours de mise en ligne explicitement choisi par le propriétaire, non publication qualifiée C1–C4.**

Cette voie manuelle est **distincte** du workflow `konstellation-light-pages.yml` (démo C4 épinglée) et du candidat technique `konstellation-light-126-candidat-pages.yml`.
Elle charge uniquement les 126 surfaces déjà accessibles dans `Rejean-McCormick/kristal-public` ; aucun chemin privé, aucune collection locale et aucune traduction non revue. Le commit source est épinglé, les tailles et empreintes sont vérifiées, le catalogue doit contenir exactement 126 entrées, et un bandeau visible annonce la nature non qualifiée de cette bêta.

## Démarrage

1. Appliquer les quatre nouveaux fichiers sur `C:\mycode\Konstellation\Konstellation-Light` grâce à `INSTALLER_KONSTELLATION_LIGHT_BETA_126.py` (simulation, puis `--install`).
2. Exécuter `node --test tests/public-beta-126.test.mjs` dans le dépôt.
3. Vérifier les modifications Git. Ajouter **uniquement** les quatre fichiers de cette bêta, commiter, puis pousser `main`, si le propriétaire confirme le push.
4. Dans GitHub, `Actions > Konstellation Light - 126 publics - beta explicite > Run workflow`. Saisir exactement `PUBLIER_126`.
5. Vérifier le déploiement Pages et ouvrir `https://rejean-mccormick.github.io/Konstellation-Light/`. Si la construction refuse une source ou un fichier, consulter le journal GitHub Actions plutôt que contourner le contrôle.

## Garde-fous maintenus

- La publication de données **privées** reste interdite par conception : l'importeur ne permet que le dépôt public indiqué, à un commit vérifié.
- Le contrôle C4 historique reste **BLOCK_REAL_COLLECTION** : il n'est ni modifié ni présenté comme approuvant cette bêta.
- Les états de qualification / autorisation C1–C4 ne sont **pas inventés**. Ce chemin publie à titre de lecture publique exploratoire, sur décision explicite du propriétaire, et n'est pas le processus normatif de publication finale.
- Les sources canoniques, les identifiants, les moteurs et les données Kristal ne sont pas modifiés.
- Le nouveau workflow n'est jamais déclenché automatiquement; l'installateur ne publie pas.

## Retour arrière

À partir de GitHub Actions, exécuter le workflow de la démonstration épinglée **seulement si son contrôle C4 permet de reconstruire exactement la démo**. Sinon, corriger la référence démo à partir de la version approuvée. L'historique Pages peut conserver des artefacts; la révocation complète d'une exposition publique doit être traitée séparément.

## Limites actuelles

Les 14 langues ne sont pas promises; la navigation des 126 Kristals n'est pas une revue sémantique; les contrôles de qualification et Publisher n'ont pas émis d'autorisation indépendante. Une construction peut encore échouer sur GitHub Actions : aucun succès de déploiement n'est présumé avant le statut de l'exécution distante.
