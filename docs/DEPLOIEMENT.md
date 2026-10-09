# Déployer Konstellation Light

## Préparer

Utiliser l'application graphique `Konstellation-Light.pyw`. Le dossier `light/site` contient initialement une **démonstration publique** ; il ne reflète pas automatiquement tes vrais Kristals. Pour d'autres données, sélectionner une collection synchronisée v10 et confirmer explicitement la diffusion publique.

## Méthode la plus simple : clone GitHub + Pages `/docs`

1. Cloner un dépôt GitHub autorisé sur ton PC (ou utiliser un clone existant).
2. Ouvrir `Deployer-Light.pyw`, sélectionner la racine du clone (avec `.git`), puis choisir **Préparer GitHub Pages dans ce dépôt**.
3. L'outil place les fichiers sous `docs/konstellation-light` ; aucune commande Git n'est lancée automatiquement.
4. Examiner les fichiers ajoutés, réaliser `git add`, `git commit`, `git push` manuellement.
5. Sur GitHub, dans **Settings → Pages**, choisir **Deploy from a branch**, la branche concernée et le dossier `/docs`.
6. URL typique : `https://OWNER.github.io/REPO/konstellation-light/` (ou domaine personnalisé selon configuration).

Si `docs/` héberge déjà un site, la nouvelle application se place dans son sous-dossier, sans remplacer l'accueil. Si une précédente édition Light est présente, l'outil la sauvegarde **en dehors du dépôt**, dans `.<nom-du-dépôt>-Konstellation-Light-backups/` sous le dossier parent du clone. Les sauvegardes ne doivent pas être ajoutées au dépôt Git.

## Variante : dépôt dédié + GitHub Actions

La workflow incluse sous `.github/workflows/konstellation-light-pages.yml` utilise `workflow_dispatch`, non les pushes automatiques, afin d'éviter une publication inattendue. Sur le dépôt GitHub :

1. Copier le **projet autonome** dans la racine d'un dépôt destiné à Pages (ou adapter les chemins de la workflow).
2. Configurer **Settings → Pages → Source: GitHub Actions**.
3. Dans **Actions**, déclencher manuellement `Konstellation Light — opt-in public Pages`.
4. Sans collection spécifiée, la workflow publie uniquement la démonstration déjà générée ; une collection réelle est **bloquée**, même versionnée dans le dépôt, jusqu’à la réception vérifiée des preuves C3.
5. Surveiller les contrôles CI et la protection d'environnement `github-pages`.

Attention : un dépôt privé ne rend pas automatiquement le site Pages privé. Ne pas y déposer des surfaces sensibles. Les versions et commits Github ne créent pas d'autorité sémantique.

## Hébergeur statique quelconque

Utiliser `Deployer-Light.pyw` → **Exporter un ZIP du site**, puis envoyer son contenu (et non le ZIP lui-même, sauf si l'hébergeur l'extrait) dans le dossier public de l'hébergeur. Servir en HTTPS pour le Service Worker.

## GitBook

Utiliser `GitBook-Light.pyw`, fournir l'URL complète du site et récupérer `exports/GitBook-Embed.md`. Favoriser le bloc Embed/Webframe de GitBook. L'intégration par iframe dépend des en-têtes de sécurité du site, de GitBook et du domaine cible ; le plein écran par lien doit rester disponible.

## Vérifications après publication

- Charger le catalogue et un bundle depuis le navigateur ; vérifier qu'aucune API GitHub n'est nécessaire au chargement normal.
- Vérifier les liens partagés incluant `lens`, `k`, `revision` et `focus` selon les paramètres disponibles.
- Tester une URL avec `?embed=1`.
- Tester un écran mobile et les politiques CSP d'intégration avant de communiquer le lien GitBook.
- Ne pas confondre un contrôle SHA-256 du transport avec une validation de signatures et d'autorité.
