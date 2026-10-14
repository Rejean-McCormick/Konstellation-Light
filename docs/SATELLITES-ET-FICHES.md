# Satellites secondaires et fiches — révision 2 (13 octobre 2026)

## Comportement

- Survol/focus clavier d'un satellite = overlay de **ses propres voisins**, sans modifier le centre, l'historique ou les arêtes.
- Les voisins sont classés avec la règle de voisinage existante et sélectionnés via un index d'adjacence construit une fois par rendu, plutôt que de parcourir le graphe à chaque survol. Le centre principal est exclu **avant** la limite de 6.
- L'overlay est purement informatif et non cliquable. Le clic sur la bulle reste la navigation.
- La disposition cherche des positions dans plusieurs rayons en évitant les bulles initiales, les aperçus déjà posés et les limites du canevas. Il s'agit d'une heuristique, pas d'une garantie de zéro collision.

## Fiches standardisées

- Le badge « i » n'apparaît que sur des familles reconnues : personne, lieu, organisation, œuvre, événement (selon les types des données réellement chargées).
- Champs affichés par famille + description/source/alias/lieu/période déclarés. Jamais d'inférence documentaire.
- Le badge est distinct du contrôle de navigation. Le focus va au bouton Fermer puis revient au badge, Échap ferme la fiche. Elle est non modale.
- Sans image déclarée ou si son chargement échoue : pictogramme. Les URL HTTP externes, SVG, requêtes et chemins dangereux sont rejetés.

## Utiliser une image dans une curation locale

Pour une prévisualisation `konstellation.semantic-curation/1.0`, dans le même dossier que `curation.json`, placer un fichier image sous `portraits/figure.png` et déclarer le champ `"portrait": "portraits/figure.png"` sur le nœud concerné.

`node scripts/build-semantic-preview.mjs --input /chemin/curation.json --out /chemin/site-neuf --local YES`

Le build vérifie que le fichier est local (sans lien symbolique ni traversée), que l'extension correspond à sa signature raster et qu'il reste inférieur à 2 Mio. Il copie l'image en `images/<sha256>.<extension>` et déclare `./images/...` dans le bundle. Cette empreinte nomme le média ; le lecteur ne **revérifie pas** sa signature SHA-256 indépendamment du bundle.

L'image doit être fournie et autorisée par l'opérateur. Aucun téléchargement ou génération de portrait n'est automatique. Le site public empaqueté par défaut reste une **démonstration verrouillée** par C4 ; ce circuit de portraits s'applique au site candidat local.

## Limites

- En petit écran et pour les graphes denses, des chevauchements de libellés restent possibles.
- Aucun accès aux données inédites : Light affiche uniquement les nœuds et liens déclarés dans le bundle local vérifié.
- L'essai navigateur n'a pas pu être effectué dans cet environnement ; les suites JS et Python passent.
