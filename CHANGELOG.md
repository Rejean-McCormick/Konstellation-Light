# Konstellation Light Standalone — 0.1.0-standalone.1

- Distribution autonome à destination de `C:\mycode\Konstellation\Konstellation-Light`.
- Reprise des sources et bundles du prototype Light déjà qualifié (lecteur v10 et compilation de navigation dérivée).
- Ajout de cinq entrées Windows `.pyw`, interface graphique Python standard-library sans dépendances pip.
- Prévisualisation locale avec serveur Python HTTP en boucle locale ; Node.js inutile pour consulter le site.
- Export ZIP statique avec contrôle SHA-256 avant expédition.
- Préparation GitHub Pages dans un clone Git existant sous `docs/konstellation-light` ; version antérieure sauvegardée hors du dépôt Git ; pas de git push automatique.
- Génération d'une fiche GitBook avec URL `embed=1`.
- Compilation de collections publiques v10 possible avec Node.js, conservation optionnelle des révisions, rattachement GitHub à un commit complet.
- Livraison de la workflow Pages manuelle, de la documentation et des tests.

**Limites** : ne transforme pas les Lens sémantiques du serveur complet. Aucun déploiement distant ni test natif Windows ou GitBook n'a été réalisé.
