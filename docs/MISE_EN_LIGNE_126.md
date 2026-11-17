# Mise en ligne Konstellation Light — 126 Kristals

## État réel (17 novembre 2026)

La collection `kristal-public` est déjà accessible publiquement, et l'audit
technique GitHub Actions des 126 surfaces + navigation Chromium a réussi.
Le site **de 126 Kristals** n'est **pas** pour autant publié sur GitHub Pages.
Le déploiement Pages existant `.github/workflows/konstellation-light-pages.yml`
reste réservé à la démonstration synthétique approuvée par son pin C4.

## Ce que cette intégration ajoute

`.github/workflows/konstellation-light-126-candidat-pages.yml` produit,
**après une campagne de navigation réussie** (ou sur demande manuelle) :

1. le commit exact actuellement public de `kristal-public` et l'empreinte
   `index_digest` inscrite dans son index;
2. les 126 surfaces téléchargées à cette révision, vérifiées octet par octet;
3. un site statique `light-web-preview` construit par les scripts existants;
4. un test fonctionnel dans Chromium;
5. `DOSSIER_CANDIDAT_PAGES_126.json` et `SITE_SHA256SUMS.txt`, contenant
   la révision, les contrôles, toutes les tailles et empreintes du site;
6. l'ensemble du site et des preuves **dans un artefact GitHub Actions**,
   conservé sept jours.

Ce site est un **candidat technique prêt pour évaluation**, pas une
publication autorisée. Le workflow n'a pas `pages:write`, n'exécute aucune
release, n'écrit dans aucun dépôt, ne publie pas sur Pages et n'accepte aucun
reçu fabriqué.

## Installation sans branche supplémentaire

Depuis `C:\mycode`, extraire le ZIP sans déplacer le dépôt existant, puis
lancer `C:\mycode\Kristal\ACTIVER_CANDIDAT_PAGES.cmd`. Le lanceur :

- exige un dépôt `C:\mycode\Konstellation\Konstellation-Light` déjà sur `main`;
- exige l'égalité de `HEAD` et `origin/main` et un index Git non préparé;
- exécute six tests ciblés du dossier candidat;
- affiche les quatre fichiers qui seront ajoutés;
- **sur confirmation explicite**, commite uniquement ces quatre fichiers,
  puis pousse vers `origin/main`, sans branche ni `--force`.

Si Git refuse le push, aucune autre méthode n'est essayée. **Aucun changement
n'est apporté au système HTTP local** ni aux 126 Kristals.

## Obtenir le site candidat

Dans GitHub, ouvrir :

https://github.com/Rejean-McCormick/Konstellation-Light/actions/workflows/konstellation-light-126-candidat-pages.yml

Choisir `Run workflow` sur `main`. À la fin, télécharger l'artefact
`kristal-126-candidat-https-<run_id>` depuis l'exécution. Le dossier
`light-web-preview/` est le site statique qui pourrait devenir le site Pages
**après** les validations indépendantes. Le rapport indique expressément
`c4_pages_gate: BLOCK_REAL_COLLECTION` et `github_pages_deployed: false`.

L'automatisation quotidienne de navigation déjà en place demeure inchangée.
Une campagne réussie déclenche aussi le travail de préparation du candidat.

## Ce qui manque avant une vraie URL HTTPS

1. **C1 — qualification indépendante réelle**, signée par une autorité
   habilitée pour le contenu/périmètre exact, pas une clé d'essai.
2. **C2 — approbation de diffusion publique** par une autre autorité, sur
   les mêmes octets, avec portée et révocations vérifiables.
3. **C3 — publication immuable et attestation vérifiée**, avec provenance
   et digest de la release. Le commit Git SHA seul ne prouve pas cela.
4. **C4 — raccordement explicite des preuves** au déploiement Pages, revue
   du maintien de la démo épinglée, politique de confiance indépendante et
   décision documentée du responsable de publication.
5. **GitHub — protéger le workflow et `main`**, et sélectionner `Settings →
   Pages → Build and deployment → Source: GitHub Actions` au moment autorisé.
   Un workflow Pages réel doit ensuite être créé/testé, puis la véritable
   URL HTTPS doit être vérifiée par un navigateur distant.

Les scripts existants du dépôt `kristal-public`, notamment
`tools/c123_offline.py`, peuvent vérifier *localement* les reçus par Kristal,
mais **retournent `public_exposure_authorized: false` même lorsque les
signatures correspondent**. Ce résultat ne doit pas être transformé en
permission Pages. Les racines de confiance, la fraîcheur des révocations
et l'autorité de chaque signataire doivent venir d'un système externe approuvé.

Ne jamais transmettre de clés privées, secrets GitHub ou jetons dans la
conversation ni les commiter dans le dépôt public.

## Critères de fin

- Un workflow de publication autorisée (distinct du workflow candidat) valide
  authentiquement C1/C2/C3/C4 pour la même révision et la même portée.
- Le déploiement GitHub Pages aboutit avec preuve de provenance et contrôle
  d'intégrité du site effectivement publié.
- La vraie URL HTTPS renvoie le catalogue de 126 Kristals et les parcours
  Chromium réussissent sur l'URL **publique**, pas uniquement localhost.
- Les révisions autorisées, procédures de révocation et surveillance sont
  documentées et appliquées par les responsables.

Ne pas désactiver C4 pour rendre un affichage vert.
