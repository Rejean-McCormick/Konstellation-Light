# Konstellation-Light — V17, exploration visuelle prioritaire

**Objet :** restaurer une exploration visuelle, sans inventer de relations ni remplacer Konstellation complet.
**Périmètre :** interface statique, export de thème CSS, audit navigateur et tests. **Données publiques et sources intactes.**

## Comportement attendu

- Sur les 126 Kristals publics du catalogue de référence, la vue initiale est une **carte** et non une liste.
- 77 packs `derived-public-knowledge` : constellation de notions avec **uniquement des arêtes existantes**. Dans 51 packs, des relations réelles existent sans assez de libellés nommés pour une carte facile à lire : navigation ouverte sur une notion connectée et nœuds neutres numérotés (`Notion n° ...`), sans déduire leur sens.
- 49 packs `derived-hosting-navigation` : **carte de classement documentaire** avec un centre, les catégories issues des chemins et les fichiers de chacune. Les traits pointillés sont des **guides de regroupement visuel**, pas des assertions sémantiques. Le texte visible l'indique explicitement.
- Les catégories et documents sont sélectionnables par clic et clavier ; la fiche et le lien vers le fichier GitHub source restent présents.
- Sur mobile, la carte SVG reste visible dans une zone déroulable horizontalement, avec un accès complémentaire par boutons.
- L'inventaire documentaire, la vue de vérification, les versions et les mentions de non-qualification restent accessibles.
- La couleur, le thème et le service worker sont adaptés sans remplacer `style.css` existant : une feuille additionnelle `visual-v17.css` est exportée par `build-light.mjs` et autorisée dans le contrôle d'intégrité C4. Le C4 **n'autorise toujours pas la publication qualifiée** de la collection réelle.

## Validation locale du paquet

1. Tests de navigation sur les 126 packs immuables : 49/49 cartes documentaires avec fichiers groupés ; 77/77 cartes de connaissances ; 51/51 sous-ensembles neutres disposant d'un point connecté et de vrais liens (tests Node).
2. Tests ciblés du lecteur : 31/31 réussis. Nouveaux tests V17 : 4/4 réussis. Règles de l'auditeur : 4/4 réussies.
3. Suite Node élargie : 104 réussis sur 124, avec 20 échecs historiques observés dans l'instantané de référence incomplet (construction qui requiert notamment le SVG de marque absent de l'archive). **Cette suite n'est pas entièrement verte.**
4. Validation visuelle navigateur des 252 vues : **pas encore réalisée sur un navigateur exécutable dans cet environnement**. L'audit Playwright Windows est indispensable avant publication.

## Installation et contrôle

Utiliser exclusivement `INSTALLER_LIGHT_126_V17.py` du ZIP. Première passe `--check`, ensuite seulement `--install` si **toutes** les empreintes sont attendues. Aucune option de force n'est prévue. L'installateur conserve les octets originaux dans un dossier de sauvegarde des Téléchargements et supporte `--restore-check` puis `--restore` depuis ce dossier exact. Conserver les anciennes sauvegardes V15/V16.

Pour un audit visuel après installation, exécuter le lanceur existant `LANCER-AUDIT-MOTS.cmd` du kit Playwright et vérifier que les 252 vues sont **des cartes**, avec la navigation documentaire (49 × 2) et la navigation de connaissances (77 × 2), y compris les 51 vues à intitulés neutres. Envoyer le ZIP de l'audit pour analyse. **Pas de git push, pas de Run workflow avant examen des captures.**

## Limites

- Il ne s'agit pas d'une transplantation du moteur complet de Konstellation, ni de ses projections sophistiquées.
- Une carte de fichiers n'est pas un graphe de connaissances ; une notion numérotée n'est pas une traduction.
- Les 126 données source et les dictionnaires de traduction restent inchangés.
- Une empreinte SHA-256 valide ne garantit pas la justesse sémantique ou éditoriale.
