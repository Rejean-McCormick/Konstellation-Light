# Konstellation — pack cumulatif de production visuelle (local)

## En un clic

1. Extraire ce ZIP n'importe où (par exemple dans Téléchargements).
2. Double-cliquer sur **`LANCER_APERCU_CUMULATIF.cmd`**.
3. Le navigateur ouvre directement le **catalogue autonome des définitions** sur `http://127.0.0.1:4187/definitions.html` (ou un des ports suivants si occupé).
4. Choisir un des Kristals contenant des définitions candidates (10 actuellement), puis cliquer sur une notion. Le lien **Carte des connaissances** retourne à Light, qui continue de présenter les 126 Kristals lisibles. Le rapport contient les quarantaines.

Il faut Python 3 installé (il l'est dans ton diagnostic PowerShell 7). Ni Ollama, ni modèles externes, ni connexion Internet. Ne pas ouvrir `definitions.html` ou `index.html` en `file://` : les contrôles SHA-256 du navigateur exigent `localhost` ou HTTPS.


## Correctif de compatibilité avec la version multilingue de Light

Le premier ZIP échouait avec `Bloc inspection Light non reconnu` : la version multilingue de Light a changé la construction de sa fiche de notion. **Cette version remplace complètement le premier ZIP.** Elle reconnaît les deux dispositions connues, sans retirer les textes révisés.

En cas de prochaine évolution non reconnue de `app.js`, l'aperçu ne s'arrête plus : il conserve **l'interface Light originale intacte** et affiche les candidats dans `definitions.html`. Le rapport indique `viewer_integration: catalogue_autonome`. La carte des 126 Kristals reste disponible dans `index.html`.

Pour une notion possédant une définition **révisée** et une définition **candidate**, la définition révisée reste prioritaire dans l'inspecteur intégré. Le catalogue autonome signale toujours le statut candidat.

## Ce que le pack fait vraiment

- Copie **le site Light existant** `%LOCALAPPDATA%\Konstellation-Light\site-web-126-a-valider` dans un répertoire séparé `%LOCALAPPDATA%\Konstellation-Light\site-web-candidats-a-valider`.
- Vérifie les empreintes SHA-256 et les identités de chaque graphe. Si l'un échoue, le **quarantaine dans l'aperçu uniquement**, consigne la cause, et continue les autres.
- Relit les **10 archives de candidats** reçues, qui sont incluses dans le pack : contrôle leurs empreintes, les assertions, les nœuds, les références et la correspondance `surface_digest`/`state_ref`. Si une candidature ne correspond pas, elle est écartée sans bloquer le Kristal.
- Charge à la demande les définitions candidates par Kristal (fichiers JSON attachés à leur SHA-256). Le visiteur voit le texte, le statut **non vérifié**, les alertes de qualité et les sources repliées.
- Signale les **407 cas prioritaires** établis dans l'audit précédent. Tous les autres textes demeurent candidats, pas « approuvés ».
- Préserve les langues et les éventuelles traductions **révisées** déjà présentes dans le lecteur. Les candidats extraits sont encore `und` : aucune traduction des 14 langues n'est créée.
- Crée `RAPPORT_PRODUCTION_VISUELLE.json` dans le nouveau site, avec les résultats exacts et la liste des quarantaines.

## Ce que le pack ne fait PAS

Il ne réécrit **aucun Kristal**, ne change aucun des cinq dépôts, ne remplace pas le site source des 126, n'appelle pas SemantiK pour « inventer » des définitions, ne qualifie pas les RuntimeSets, ne fait aucun `git add`, `git push` ou déploiement GitHub Pages. Il n'accorde pas le sceau de validation totale, ni les autorisations C1/C2/C3/C4.

Si un Kristal échoue, son absence concerne **cette copie locale**. Son dossier original n'est jamais supprimé. Il pourra être réintégré lors d'une relance réussie. Les erreurs éditoriales ne déclenchent pas la quarantaine, seulement les incompatibilités/incohérences techniques des graphes.

Si la copie d'aperçu existe déjà, elle est sauvegardée avec un suffixe horodaté avant remplacement. Le site source n'est jamais touché.

## Suite du projet

Le branchement des outils diK / SemantiK Architect / Runtime Orchestrator / Spek est **déjà installé** dans les cinq dépôts. Ce pack réalise la **phase de visualisation massive du contenu existant**. Il **ne complète pas** la génération des `CommunicationRequest` manquantes ou la couverture linguistique. Ce travail reste distinct, de même que la validation scientifique des faits.

## Un seul ZIP de retour en cas d'écart

Le lanceur produit également **`%LOCALAPPDATA%\Konstellation-Light\A_DEPOSER_ICI_RAPPORT_PRODUCTION_VISUELLE.zip`**. C'est celui à déposer dans notre conversation si un Kristal est exclu, si des candidatures sont ignorées ou pour poursuivre l'automatisation. Il contient des rapports, pas les graphes ni les définitions complètes.

Le logo officiel `logo_k.svg` est conservé lorsqu'il existe; si le site source l'oublie, le pack le rétablit **dans la copie uniquement**.

Le lancement ouvre toujours `definitions.html` en premier. Il est aussi possible d’ouvrir `http://127.0.0.1:4187/` pour la carte du site (adapter le port affiché dans la console).
