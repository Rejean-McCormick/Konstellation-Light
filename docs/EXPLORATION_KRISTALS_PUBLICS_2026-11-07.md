# Konstellation Light — exploration des Kristals publics (2026-11-07)

## Usage sur Windows

1. Installer les fichiers du correctif à la racine de `C:\mycode\Konstellation\Konstellation-Light` (fusion des dossiers, remplacement des fichiers concernés uniquement).
2. Ouvrir `Konstellation-Light.pyw`.
3. Dans **Accueil**, cliquer sur **Explorer mes Kristals publics**.
4. Le programme détecte `C:\mycode\Kristal\kristal-public` lorsque présent, valide la collection puis compile le site local et ouvre le navigateur sur `127.0.0.1:4177`.

Aucun dossier temporaire à nommer manuellement. Aucun git add, commit, push ou upload. Le site compilé dans `light/site` remplace la **prévisualisation locale** antérieure, pas les fichiers de `kristal-public`.

## Ce que le lecteur représente

- Pour un Kristal ayant un graphe `kristal.v11.semantic-graph` présent parmi les artefacts canoniques **et les fichiers de surface vérifiés**, Light présente les entités KQ, les relations KP, les valeurs littérales et les identifiants d'assertions KA avec leurs références KS explicitement déclarées.
- Le graphe retenu est le **dernier déclaré dans `canon/state.index.json`** dont le fichier est présent dans la surface; les versions historiques ne sont jamais mélangées. Cette sélection n'est pas une preuve d'activation ou une approbation du graphe.
- Les dictionnaires canoniques présents dans la surface fournissent les libellés existants; un identifiant opaque reste affiché en l'absence de libellé. Aucune traduction ou relation n'est inventée.
- Pour un contrat natif sans graphe v11 (comme Accounting dans la collection actuelle), Light conserve la navigation structurale et signale cette limite.

Le navigateur vérifie l'intégrité SHA-256 des bundles statiques, et le compilateur vérifie celle de chaque fichier du manifeste de synchronisation. Les références KS sont conservées mais ne prouvent ni l'existence indépendante de chaque source, ni la vérité des assertions, ni une qualification C1/C2.

## Résultats sur les graphes fournis

- Aerospace : 506 nœuds, 738 relations, 0 assertion écartée; graphe `wikidata-2026-10-27-v11-2`.
- Zoology : 5 807 nœuds, 6 083 relations, 0 assertion écartée; graphe `wikidata-structured-20261026-v3`.
- Accounting : pas de graphe canonique v11 déclaré; reste en mode hébergement.

Les deux graphes ont les mêmes SHA-256 que ceux mentionnés dans les manifestes GitHub consultés le 7 novembre 2026.

## Limites de publication

Ce correctif ne modifie **pas** les workflows GitHub, ne modifie pas Spek, Konstellation complet, Konstellation Publisher ni les 127 Kristals. `C4` continue de bloquer une publication GitHub Pages de collections réelles en l'absence des validations indépendantes exigées. Ne pas interpréter le bouton Explorer comme une autorisation de diffuser une nouvelle version du site.

## Dépannage

- Node.js doit être installé pour compiler. Python et tkinter sont utilisés pour le lanceur Windows.
- Si le dossier public n'est pas trouvé automatiquement, choisir le dossier contenant `kristals/index.json`.
- Les alertes de digest de dictionnaire doivent être résolues à la source, et non contournées.
- En cas de besoin, restaurer les fichiers remplacés à partir du snapshot Konstellation-Light précédent.
