# Konstellation-Light — overlay de correction de graphe et d'identité visuelle

**Base exacte :** GitHub `Rejean-McCormick/Konstellation-Light` commit `cb7f8470702f66cc1d9784d26c8a15445ba498c7` (source du 20 novembre 2026).

## Ce que fait ce lot

- Rend visibles par défaut les notions non libellées (et permet de les masquer via « Options avancées »).
- Évite d'ouvrir un Kristal sur sa toute première notion lorsque celle-ci n'a **aucun lien direct** : sélectionne une notion **réellement connectée**, en gardant le titre du domaine séparé.
- Montre jusqu'à six satellites de deuxième niveau, chacun relié à une arête **déjà déclarée**.
- Différencie visuellement le point central, les voisins directs, les satellites secondaires et les notions sans libellé.
- Fournit un bouton de retour vers un nœud connecté si l'utilisateur sélectionne une notion isolée.
- Remplace la dominante bleu nuit par une palette vert forêt, avec **#1e6864** comme couleur de marque officielle.
- Renouvelle le cache hors ligne pour que les visiteurs qui l'ont activé reçoivent l'interface mise à jour.

**Ne modifie pas :** `kristal-public`, les 126 packs, le catalogue, les scripts de publication et d'intégrité, les règles ou les workflow GitHub, la qualification C1–C4, l'autorisation éditoriale, les RuntimeSets ou les langues.

## Installation Windows (PowerShell)

Décompresse le ZIP dans un dossier local, puis :

```powershell
$light = 'C:\mycode\Konstellation\Konstellation-Light'
py -3.12 .\INSTALLER_LIGHT_GRAPH_BRAND_126.py --target $light --check
py -3.12 .\INSTALLER_LIGHT_GRAPH_BRAND_126.py --target $light --install
```

L'installateur bloque tout fichier source modifié par rapport à la base connue ou au correctif, refuse les liens/jonctions, sauvegarde les anciennes versions sous `%LOCALAPPDATA%\Konstellation-Light\overlays\GRAPH_BRAND_126` et exécute automatiquement les 6 tests ciblés. Il rétablit les fichiers si les tests échouent. Aucune commande Git ni action réseau n'est lancée.

Si tu veux revenir à l'ancienne version, utilise le chemin `backup` fourni par le résultat :

```powershell
py -3.12 .\INSTALLER_LIGHT_GRAPH_BRAND_126.py --target $light --rollback 'CHEMIN_EXACT_DU_BACKUP'
```

La restauration échoue volontairement si les fichiers ont été modifiés depuis l'installation.

## Validation complémentaire et publication

Depuis la racine du dépôt Light :

```powershell
node --test .\tests\light-public-graph-theme-126.test.mjs
node --test .\tests\public-beta-126.test.mjs

git status --short
```

Les commandes ci-dessus vérifient localement. **L'overlay ne déclenche pas de push ni de GitHub Pages.** Après inspection des changements et décision du propriétaire, committer les six fichiers ajoutés/modifiés puis pousser `main`; la bêta publique se reconstruit avec le **workflow existant** `konstellation-light-126-public-beta.yml` (confirmation `PUBLIER_126`). Ne pas utiliser le workflow historique réservé à la démonstration épinglée.

## Vérification après déploiement

Ouvrir `https://rejean-mccormick.github.io/Konstellation-Light/?k=architecture` en navigation privée :

- La palette doit être vert forêt et les accents principaux fondés sur `#1e6864`.
- La carte doit montrer une notion connectée, plusieurs voisins directs et des satellites secondaires réellement connectés (si disponibles).
- Les identifiants non libellés doivent être distinguables, avec un suffixe stable, sans labels inventés.
- En cochant/décochant « Afficher les notions sans nom », les résultats et la carte doivent s'ajuster.
- Les contrôles « Recherche », « Départ », « Précédent » et l'onglet « Explorer les notions » doivent continuer à fonctionner.
- Le bandeau de bêta et les réserves sur l'absence de qualification C1–C4 doivent rester visibles.

Un audit Playwright directement servi en HTTP n'a pas pu être exécuté dans l'environnement de préparation (navigation loopback bloquée). Les six tests automatisés Node ont été exécutés ; la vérification dans le navigateur de Windows reste à confirmer.
