## 0.5.0-c4-demo-gate-preview — Kristal v10 C4 boundaries (2026-10-12)

- New `scripts/c4-publication-gate.mjs`: verifies every bundle and the exact pinned **synthetic demo** before manual GitHub Pages deployment; any other collection returns `BLOCK_REAL_COLLECTION`, even if all hashes match. Pin is a repository review guard, not an authorization signature.
- GitHub Pages workflow performs the C4 preflight immediately before site upload. Pinned intake continues to create **review-only artifacts**, and now checks `BLOCK_REAL_COLLECTION` explicitly.
- Windows GUI now provides a **C4 status** check; checkout staging refuses any non-demo site, while ZIP export remains an explicitly confirmed review operation.
- Browser displays the distinction between SHA-256 byte integrity and publication/qualification; the revision label no longer claims `published` status, and the dark UI uses the `#1E6864` accent.
- The existing v10 adapter, Ekole local previews, append-only revision integrity, and Source Pin transport checks remain in place. No C1/C2/C3 receipt verifier has been added; real publication stays blocked.
- Added JS/Python regression tests, source-pinning documentation, regenerated site, and file manifest. **No live deployment or private collection exposure.**

## v0.4 — Diagnostic des chemins et restauration non destructive
- La racine Ekole est reconnue même lorsque le Kristal autochtone v4 manque.
- L’onglet Ekole affiche l’état de la source, son chemin canonique et les cas d’extraction imbriquée.
- Bouton de restauration sélective depuis un ZIP Ekole; refuse de remplacer un dossier existant.
- Les chemins recommandés et le rôle des projections sont décrits dans README_CHEMINS_EKOLE_KONSTELLATION_v0.4.md.
- Les compilations locales, la navigation en bulles et le contrat v10/v9 ne changent pas.

## v0.3 — Lanceur Ekole autochtone en un clic

- Ajout `Explorer-Ekole-Autochtones.pyw` (génère et ouvre automatiquement) et `Previsualiser-Ekole.pyw` (ouvre l’onglet).
- Onglet « Ekole · Graphe » intégré dans `Previsualiser-Light.pyw` : détection du dépôt Ekole, conversion/compilation sans commandes Node visibles, port local libre, cache par empreinte et journal.
- Intégration à Ekole Élève facultative et soumise à confirmation humaine; refus d’écraser un répertoire existant. Aucune publication officielle v10.
- Tests de construction, nouvelle version de source, cache, HTTP, limites d’export et conservation des fichiers.

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

## 0.2.0-ekole-next.1 — Konstellation Light × Ekole

- Curseur 3–25 bulles, huit par défaut, voisins réels et navigation par recentrage.
- Historique Précédent / Départ et retour optionnel vers Ekole.
- Prévisualisation sémantique candidate isolée des collections v10 publiables.
- Adaptateur facultatif au Kristal encyclopédique autonome v4, export sans corrigés.
- Graphes statiques vérifiables par SHA-256 et consultables sans Internet avec un serveur local.
- 30 tests JS et 7 tests Python lors de la réalisation.
