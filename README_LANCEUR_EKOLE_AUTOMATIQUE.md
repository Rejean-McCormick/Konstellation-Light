# Konstellation Light — Explorer Ekole en un double-clic (v0.3)

## Pour toi — sans terminal

1. **Ferme** l’ancien `Previsualiser-Light.pyw` s’il est ouvert.
2. **Sauvegarde** le dossier `C:\mycode\Konstellation\Konstellation-Light` et extrais le ZIP v0.3 dedans. Ne l’extrais pas dans Ekole.
3. Double-clique sur **`Explorer-Ekole-Autochtones.pyw`**.
4. Le programme cherche `C:\mycode\Ekole` (ou le dossier frère de Konstellation), puis **construit et ouvre automatiquement** la carte du Kristal autonome.
5. Si Ekole n’est pas trouvé, clique sur **Parcourir** et sélectionne **la racine du dossier Ekole**, pas le fichier JSON.

L’application originale **`Previsualiser-Light.pyw` fonctionne aussi** : onglet **« Ekole · Graphe »**, bouton **« Créer / actualiser et OUVRIR le graphe »**.
`Previsualiser-Ekole.pyw` ouvre directement cet onglet, sans préparation automatique tant que tu ne cliques pas.

Le curseur **3 à 25 bulles**, le recentrage et les boutons Précédent / Départ restent ceux de la version Light v0.2.

## Ce qui est automatisé

- Détection du fichier `kristals/societes-autochtones-quebec/canon/domain/encyclopedie-v4.json`.
- Vérification du chemin et appel local de **Node.js** : projection sémantique puis construction d’un site statique. Aucune commande à taper.
- Stockage sous `previews/ekole-autochtones-local/<empreinte>/` ; un second lancement réutilise les fichiers tant que le Kristal et le code n’ont pas changé.
- Le programme n’efface **jamais** une projection modifiée ou existante et n’altère pas les fichiers du Kristal.
- Démarrage d’un serveur HTTP **sur 127.0.0.1 uniquement** (port 4177, puis 4178 et suivants si occupé) et ouverture du navigateur.
- Affichage d’une mention **prévisualisation candidate locale, non publiée v10**.

**Prérequis** : Windows, Python 3.10+ avec tkinter (lanceurs .pyw de Konstellation Light) et **Node.js** installé. Connexion Internet non nécessaire.

Le serveur reste disponible pendant que la fenêtre du lanceur est ouverte. Fermer la fenêtre arrête son serveur; relancer ouvre à nouveau les mêmes données mises en cache.

## Optionnel — ajouter à Ekole Élève

Depuis l’onglet Ekole, après avoir **relu et validé le contenu destiné aux élèves**, cocher la confirmation et cliquer **« Copier le site dans Ekole »**. Le site statique est copié dans `Ekole/site/eleve/konstellation` **uniquement si ce dossier n’existe pas**. Aucun remplacement automatique, aucun changement des Kristals ni des cours. Démarrer séparément Ekole sur 8765 et ouvrir :

`http://127.0.0.1:8765/eleve/konstellation/`

**Attention** : installer sur le serveur Ekole peut rendre le contenu accessible sur un réseau local. Une projection candidate ne devient pas culturellement ou historiquement approuvée simplement parce qu’elle est navigable. Pour une école entière, utiliser un export Élève isolé plutôt que le serveur Core.

## En cas de problème

- **Node.js introuvable** : installer Node.js, puis rouvrir le `.pyw`.
- **Dossier Ekole introuvable** : choisir manuellement `C:\mycode\Ekole` (racine contenant `kristals`).
- **Destination déjà présente** : le système protège tes données. Déplacer l’ancien dossier de sortie pour conserver une sauvegarde; aucun écrasement forcé.
- **Fenêtre ouverte mais rien dans le navigateur** : regarder le journal en bas, puis saisir l’URL `http://127.0.0.1:4177/` ou le port indiqué.
- **Ancien Previsualiser déjà démarré** : ce n’est pas bloquant; la carte choisit un autre port libre.

## Tests de validation

```powershell
py -3 -m unittest discover -s tests -p "test*.py" -v
node --test tests/*.test.mjs
```

Le `.pyw` utilise les deux compilateurs de la v0.2 ; le curseur de bulles et le moteur de rendu ne sont pas remplacés.
