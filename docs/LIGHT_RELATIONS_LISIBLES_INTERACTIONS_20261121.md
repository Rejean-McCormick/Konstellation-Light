# Konstellation-Light — Relations lisibles et audit interactif, passe 2026-11-21

Ce lot est **strictement une présentation publique**. Il ne change ni le catalogue, ni les 126 packs, ni les assertions, ni les reçus C1–C4, ni la publication GitHub Pages.

## Problème observé
Les prédicats inconnus comme `uses_primary_witness` et `grounded_in_source_witness` apparaissaient dans la liste des relations du Kristal Bible. Le moteur de présentation découpait une clé informatique en pseudo-mots anglais, sans traduction révisée.

## Correction
- Une correspondance explicite de dictionnaire public (par exemple `P50` → « Auteur ») est conservée.
- Un intitulé de relation réellement fourni, non technique, est conservé.
- Une clé inconnue, codée ou sans véritable intitulé est montrée comme « Lien déclaré » ; aucune interprétation sémantique n'est inventée.
- Si une traduction révisée existe pour la langue sélectionnée, elle est prioritaire. Sinon l'interface indique « Relation non traduite ».
- Le cache hors ligne change de version pour ne pas servir l'ancienne interface.

## Audit interactif
Le kit Playwright V2 sera étendu aux actions de chaque vue (ordinateur et mobile) :
- 51 résumés : clic sur « Explorer les relations existantes », contrôle des bulles et des arêtes, capture, puis retour aux notions nommées ;
- 26 graphes : navigation par le lien de la liste (clavier Entrée sur ordinateur, clic mobile) ;
- 49 bibliothèques : sélection d'un document et contrôle de la fiche ;
- contrôle des clés de relation en `snake_case` dans les zones visibles ;
- captures après clic et `journaux/interactions.log` avec résultats détaillés.

## Limites explicites
Le test Playwright doit encore être exécuté sur Windows. Les 14 traductions ne sont pas créées par ce correctif et les 126 fichiers de données restent inchangés. Les tests d'intégrité C1–C4 ne sont ni simulés ni assouplis. Le site public n'est pas modifié tant qu'un déploiement manuel n'est pas lancé.
