# Konstellation Light — contrat de lecture multilingue 1.0 (opt-in)

Une notion possède un seul identifiant canonique. Les textes par langue sont des **dérivés**, pas de nouveaux Kristals. Le contrat `konstellation.multilingual-read/1.0` contient `slug`, `state_ref`, `surface_digest`, `locale` et des entrées `{node_id, label?, definition?, provenance}` ainsi que des libellés facultatifs de prédicats `relations: [{relation_id, label, provenance}]`.

Chaque entrée indique son producteur (`dik`, `semantik_architect`, `spek` ou `editorial`), les références fournies et le statut `candidate` ou `reviewed`. Le statut `reviewed` exige un identifiant de revue éditoriale, qui n'est **pas authentifié** par ce contrat. Aucune validation scientifique, C1, C2, C3, C4 ou licence n'est produite ici.

Les langues utilisent des tags de type BCP 47; **aucune liste de langues n'est codée en dur**, aucune traduction ni repli implicite n'est inventé. Une langue manquante reste explicitement manquante.

## Format et limites

- Schéma identique dans les 5 dépôts: `integrations/konstellation_light/contract.schema.json`.
- Un fichier par Kristal **et** par langue: `<dossier>/astronomy/fr-CA.json`.
- Une entrée par `node_id` et par fichier de langue; 12 000 entrées maximum.
- Les identifiants et empreintes de la collection publiée sont épinglés; une entrée inconnue doit être refusée par le lecteur.
- Les candidats sont admis dans l'atelier privé **mais refusés** par le compilateur du lecteur public.
- Les données sources restent inchangées; le site statique charge la langue seulement lorsqu'elle est choisie.

La compilation locale n'est pas une autorisation de déploiement GitHub Pages. Le verrou C4 de Konstellation Light reste actif.

## Activation dans Light (locale facultative)

1. Conserver les fichiers `{slug}/{locale}.json` dans un dossier privé externe au dépôt.
2. Compiler via `node scripts/build-light.mjs --collection COLLECTION --out SITE_LOCAL --public YES --localizations DOSSIER`.
3. Ou utiliser le lanceur existant avec l'option supplémentaire `--localizations DOSSIER` : `node scripts/preparer-site-web-126.mjs --localizations DOSSIER` (sans autre changement).
4. Le catalogue contient alors des références SHA-256 `localizations` vers les fichiers `data/lang-<digest>.json`, chargés à la demande par le navigateur.

Le choix de langue ne traduit PAS encore toute l'interface (boutons, menus), qui reste en français dans ce raccordement. Il affiche les libellés et définitions correspondant à la langue choisie, en indiquant explicitement les contenus absents. Les 14 langues déjà opérationnelles sont libres d'être intégrées sans nouvelle liste codée en dur. **Aucun dictionnaire ni définition n'est créé automatiquement par ce correctif.**

ATTENTION: le site candidat est un aperçu local. `C4_PUBLICATION_BLOCKED` doit rester le résultat de publication des 126 tant que la preuve de qualification et d'autorisation indépendante n'est pas reliée à C4.
