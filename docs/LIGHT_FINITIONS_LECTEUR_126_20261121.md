# Konstellation-Light — Lot complet « Finition du lecteur » (21 novembre 2026)

## Périmètre

Source exacte : le dépôt Windows après installation de l’overlay **LECTURE_SIGNIFIANTE_126**.
La nouvelle version est strictement un changement de présentation et d’exploration. Aucune
modification aux 126 packs, au catalogue, à GitHub Actions, aux décisions C1–C4, aux
contrats multilingues, au code de publication ou au dépôt cristallin public.

## Correction du lecteur

1. Sur les 51 graphes sans lien directement lisible entre deux notions nommées,
   **Explorer les relations existantes** affiche, à la demande de l’utilisateur,
   des connexions réelles de la source. L’entrée est une notion nommée réellement
   connectée si elle existe, sinon un nœud existant connecté.
2. Les notions sans nom affichent **Notion sans intitulé · n° N** : le numéro n’est
   qu’un repère de navigation stable dans le Kristal, **jamais une identité**.
   Les codes, empreintes et chemins sources restent uniquement dans les packs.
3. Le lecteur propose toujours **Revenir aux notions nommées**. Les liens non
   nommés ne s’ouvrent pas automatiquement à chaque changement de Kristal.
4. Les graphes denses limitent les étiquettes SVG. Une liste de liens réels et
   cliquables affiche les noms complets et les intitulés de relations sans
   superposition. Sur mobile, cette liste est l’interface principale.
5. Les panneaux affichent le nombre de voisins réellement visibles séparément
   du nombre de relations déclarées dans la collection.
6. Les 49 collections documentaires gardent leur présentation par catégories.
   Les intitulés explicites de fichiers connus (README, GLOSSARY, INDEX…) sont
   présentés comme des **types de documents**, sans prétendre connaître leur contenu.
   La sélection du document est visible et ouvrable depuis sa source GitHub
   publique lorsqu’un lien de fichier est attesté.
7. Les années isolées sont décrites comme **Année mentionnée** plutôt que comme
   un fait historique inféré. Focus clavier et liens sont améliorés.
8. Le choix de la langue reste réservé aux *localisations révisées et attestées*.
   Aucune traduction inexistante n’est créée ni annoncée. Une notion non traduite
   est clairement étiquetée comme telle dans la langue de l’interface.
9. Le cache d’accès hors ligne utilise une nouvelle version pour éviter de
   servir l’ancien code du lecteur après un déploiement.

## Tests

46 tests Node réussis, incluant 5 nouveaux tests de finition et l’intégralité
parcours de vérification sélectionnée : graphes, lecteur, navigation, 126 packs,
multilingue, présentation publique et garde de bêta. Ils ne remplacent pas un
contrôle visuel Playwright sur Windows.

## Restriction

Le chantier de **curation sémantique** demeure nécessaire. L’interface ne peut
pas attribuer un nom réel à une notion opaque, définir une relation inconnue ou
ajouter les 14 langues sans données révisées correspondantes.

## Prévisualisation et publication

L’overlay est LOCAL : l’installateur ne fait jamais git add, commit, push, ni
publication. Lancer l’audit local V2 **LANCER-AUDIT-MOTS.cmd** après installation,
analyser les captures et journaux ; ne publier qu’après validation éditoriale
et décision explicite du propriétaire. Le workflow bêta déjà en ligne est inchangé.

## Revenir en arrière

L’installation produit un dossier `backup` dans `%LOCALAPPDATA%\Konstellation-Light\overlays\FINITIONS_LECTEUR_126\…`.
Exécuter :

`py -3.12 INSTALLER_LIGHT_FINITIONS_126.py --target "C:\mycode\Konstellation\Konstellation-Light" --rollback "CHEMIN_BACKUP"`

La restauration refuse les fichiers modifiés depuis l’installation.
