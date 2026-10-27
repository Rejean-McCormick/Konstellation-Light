# Konstellation Light 0.5.2 — dépôt complet (lot 1)

Cette archive contient **le dépôt complet**, et non un patch à appliquer. Après sauvegarde et arrêt des outils, décompresser **le contenu** de l'archive dans le dossier de code de Konstellation Light. Ne pas remplacer les collections de données privées ni le canon Kristal. Les fichiers `FILETREE.txt` et `SHA256SUMS.txt` décrivent les fichiers inclus dans ce candidat.

La version 0.5.2 provient du correctif de présentation sémantique revu sur le snapshot 0.5.1; le manifeste détaillé `PATCH_MANIFEST.json` se trouve dans **l'archive de correctif séparée** `Konstellation-Light-0.5.2-correctif-revision.zip`, pas dans ce dépôt complet.

## Vérifications avant déploiement

```sh
node --test tests/*.test.mjs
python -m unittest discover -s tests -p 'test_*.py'
node scripts/c4-publication-gate.mjs --site light/site
```

**Publication :** C4 autorise uniquement la démonstration synthétique épinglée. Les données réelles restent bloquées sans C1/C2/C3. Une confirmation dans le GUI, `--public YES`, un hash de transport, un commit GitHub ou une sortie de test n'autorise pas la publication.

Cette archive n'a pas été qualifiée sur ton Windows ni pour la publication de véritables Kristals. Aucun dossier sous `D:` ne doit être migré pour cette installation.
