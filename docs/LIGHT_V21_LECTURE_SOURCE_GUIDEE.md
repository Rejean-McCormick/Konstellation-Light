# Konstellation-Light V21 — Extraits sourcés et parcours de lecture

## Objet

Le lecteur V21 expose, sans le transformer en assertions canoniques, **16 passages précisément choisis** dans les cinq README publics épinglés aux commits ci-dessous. Le passage d'avertissement de la scène 02 provient directement de l'interface du lecteur V20. Les scènes 01, 18 et 20 n'imposent pas de lecture.

- Référentiel documentaire : https://github.com/Rejean-McCormick/kristal-public
- Commit épinglé : `538b4d559f6c7cdd022283f5a21ef728b332c52a`
- Référence du code de départ : Konstellation-Light V20, `ebc6a0308c4aa24239029b47187b52284358275b`.

## Garanties

- Chaque citation est un extrait littéral d'une ligne précise de `kristals/<slug>/README.md`.
- `scripts/build-light.mjs` vérifie la présence et le SHA-256 du README déjà déclaré dans la collection v10; échoue si une ligne attendue ne correspond plus.
- Les passages figurent dans `bundle.guided_reading` et sont validés lors de la consultation.
- Aucun nœud, aucune relation, aucune traduction qualifiée, aucun fait nouveau n'est ajouté au graphe.
- Les deux reformulations comptables en français sont étiquetées **non citations**.
- La vue *Découvrir le Kristal* affiche les extraits de façon lisible, leur source épinglée, leur ligne d'origine et un identifiant stable.

## Liens par scène

Depuis le site construit (localement avant déploiement) :

`?k=accounting&lens=discover&lecture=lecture-scene-07`

L'élément surlignable porte :

`[data-reading-id="lecture-scene-07"]`

L'URL relative et la sélection sont déterministes; le moteur vidéo devra les exploiter **après** validation des passages, et non choisir une phrase par similarité dans le DOM.

## Hors champ de ce pack

- Aucune nouvelle narration ni nouveau rendu MP4.
- Aucun changement dans Visite Studio.
- Aucune modification de sources `kristal-public`.
- Aucune synchronisation Git, aucune publication GitHub Pages et aucune reconstruction automatique des 126 packs.

Pour afficher les nouvelles citations, il faudra reconstruire le lecteur avec la collection épinglée après contrôle, puis l'examiner sur localhost. La publication reste un acte séparé.
