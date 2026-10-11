> **Mode simple v0.3** : plus aucune commande Node à taper. Extrais le [correctif v0.3](README_LANCEUR_EKOLE_AUTOMATIQUE.md) dans Konstellation-Light et double-clique sur `Explorer-Ekole-Autochtones.pyw`. Le reste du guide décrit les procédures avancées manuelles.

# Konstellation Light · Mise à jour « Bulles et Ekole »

La mise à jour part du snapshot `znapshot_Konstellation-Light_10101341.zip` et conserve l'application Windows, les compilations v10 vérifiées, les contraintes de publication et la traçabilité.

## Nouveautés

- **Curseur restauré : de 3 à 25 bulles voisines**, huit par défaut. Le réglage est partageable via `?n=8`.
- **Recentrage réel** : un clic (ou Entrée/Espace au clavier) place la bulle sélectionnée au centre; seules les relations déclarées apparaissent, dans les deux directions de navigation. Jamais de nœuds sans relation ajoutés pour remplir le quota.
- Boutons **Précédent** et **Départ**; détails de relation dans l'inspecteur et info-bulle.
- **Adaptateur de prévisualisation sémantique** candidat, séparé de la publication v10. Le lecteur sait explorer des notions, sociétés, rôles, tâches, ressources, sources, périodes et cours.
- **Projection optionnelle du Kristal autonome** `societes-autochtones-quebec` (`encyclopedie-v4.json`) vers un graphe révisable contenant des thèmes, fiches, préalables et sources. Aucune banque d'exercices, réponse de test ni correction n'est exportée.
- Fonctionne hors Internet avec un serveur HTTP statique de même origine que l'application; aucun appel API à un fournisseur d'IA.

## A — Installer la mise à jour dans Konstellation-Light

**Overlay léger** : extraire son ZIP à la racine du dépôt Konstellation-Light en remplaçant les fichiers de l'application. Ne pas l'extraire à la racine Ekole.

**Snapshot complet** : extraire le pack autonome dans un nouveau dossier, par exemple `C:\\mycode\\Konstellation\\Konstellation-Light-NEXT`.

Prévisualisation : double-cliquer `Previsualiser-Light.pyw` ou exécuter `node scripts/serve-light.mjs`, puis ouvrir `http://127.0.0.1:4177/`.

La démonstration livrée avec Light montre principalement des **liens techniques v10**. Les bulles y fonctionnent déjà; les connaissances sémantiques exigent une projection distincte.

## B — Générer une démonstration locale sémantique

```powershell
node scripts\build-semantic-preview.mjs --input examples\ekole-curation-demo.json --out previews\ekole-demo --local YES
node scripts\serve-light.mjs previews\ekole-demo
```

Le rendu est une **démonstration conceptuelle**, pas une collection v10 publiée. Le script refuse de remplacer le répertoire public `light/site` et refuse d'écraser une destination existante.

## C — Brancher le Kristal autochtone autonome, puis Ekole

Dans le dépôt Konstellation Light, avec un snapshot Ekole possédant le Kristal autonome :

```powershell
node scripts\project-ekole-encyclopedia.mjs --kristal "C:\\mycode\\Ekole\\kristals\\societes-autochtones-quebec\\canon\\domain\\encyclopedie-v4.json" --out previews\\curation-autochtones.json --local YES
```

**Réviser manuellement** la projection, ses sources et l'autorisation de la rendre accessible aux élèves avant l'étape suivante. Pour une prévisualisation sur un ordinateur privé :

```powershell
node scripts\build-semantic-preview.mjs --input previews\\curation-autochtones.json --out previews\\autochtones --local YES
node scripts\serve-light.mjs previews\\autochtones
```

Pour une intégration locale sous **Ekole Élève** après cette revue, remplacer `--out` par le dossier inexistant `C:\\mycode\\Ekole\\site\\eleve\\konstellation`, puis accéder à `http://127.0.0.1:8765/eleve/konstellation/`. Le serveur HTTP Ekole déjà présent suffit. **L'accès au réseau local ne nécessite pas Internet**, mais le serveur doit rester actif. Préférer l'export Élève isolé au serveur scolaire, puisque le Core Ekole contient des fichiers qui ne doivent pas être publics.

La projection statique candidate **n'est pas un build Kristal v10** : le lecteur l'identifie visiblement comme prévisualisation. Son SHA-256 protège le transport des octets, sans certifier la véracité ni l'autorisation culturelle de chaque affirmation. Les textes des sources et les corrigés ne sont pas exportés par l'adaptateur.

## Vérification

```powershell
node --test tests\*.test.mjs
py -3 -m unittest discover -s tests -p "test_windows_tools.py"
```

La prise en main visuelle et la navigation sur une vraie tablette restent à tester. **Ne pas lancer `build-light.mjs --public YES` sur une collection v9 ou une projection candidate.**
