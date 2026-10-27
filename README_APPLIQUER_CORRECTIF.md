# Correctif de Konstellation Light 0.5.2 — application prudente

**Candidat de travail. Aucun déploiement public n'est autorisé.**

1. Faire une sauvegarde distincte du dossier `Konstellation-Light` et vérifier les modifications locales avec Git ou un outil de comparaison.
2. Lire `PATCH_MANIFEST.json`. Chaque fichier remplacé indique son `original_sha256` (état attendu dans le snapshot fourni) et son nouveau `sha256`.
3. Refuser l'écrasement automatique si la copie de travail diffère de l'original. Fusionner les changements manuellement si nécessaire. Ne jamais modifier le canon Kristal ou les configurations privées pour appliquer ce correctif.
4. Copier les fichiers autorisés **après** cette revue et lancer les tests : `node --test tests/*.test.mjs`, `python -m unittest discover -s tests -p 'test_*.py'` et `node scripts/c4-publication-gate.mjs --site light/site`.
5. Le garde C4 ne permet que la démo synthétique épinglée. Ni `--public YES`, ni GitHub, ni les SHA-256 de transport ne valent autorisation C1/C2/C3.

Aucun fichier n'a été supprimé par ce correctif. `SNAPSHOT_INDEX.txt` et `SMARTDUMP_INDEX.txt` demeurent historiques. `SHA256SUMS.txt` et `FILETREE.txt` décrivent les octets du candidat présent.
