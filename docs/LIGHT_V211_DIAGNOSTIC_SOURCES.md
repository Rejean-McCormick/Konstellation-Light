# Konstellation-Light V2.1.1 — Diagnostic de collection source

Ce correctif évite une confusion observée le 24 novembre 2026 entre le fichier
**nécessaire** `kristals/index.json` et le reçu **facultatif pour le build**
`LIGHT_SOURCE_PIN.json`.

## Quel fichier faut-il réellement chercher ?

| Élément | Rôle | Nécessaire à `scripts/build-light.mjs` ? |
| --- | --- | --- |
| Dossier de collection v10 | Racine contenant `kristals/index.json` et les surfaces de Kristals | Oui |
| `kristals/index.json` | Index vérifiable de la collection | Oui |
| `kristals/<slug>/README.md` pour les cinq domaines guidés | Texte littéral des 16 lectures | Oui, pour V2.1 |
| `LIGHT_SOURCE_PIN.json` à la racine de la collection | Reçu de provenance d'un import Git épinglé | **Non** : vérifié uniquement s'il existe |
| Commit source cohérent avec `shared/guided-reading.mjs` | Sélectionner les citations de la version attendue | Oui, pour activer V2.1 |

L'absence de `LIGHT_SOURCE_PIN.json` **ne prouve pas** que le commit de la
collection est correct. Elle ne justifie pas non plus de bloquer tout build.
Si le PIN est présent et incohérent, le build doit refuser son utilisation.
Les voies de préparation/publication ont leurs propres exigences de provenance
et ne sont pas modifiées par ce correctif.

## Trouver une collection (sans rien modifier)

Dans PowerShell :

```powershell
cd "C:\mycode\Konstellation\Konstellation-Light"
node scripts/check-light-sources.mjs --root "C:\mycode" --root (Join-Path $HOME "Downloads")
```

Pour tester un dossier précis :

```powershell
node scripts/check-light-sources.mjs --collection "C:\chemin\vers\collection"
```

Le diagnostic effectue une recherche locale bornée et une vérification de
l'empreinte de l'index v10. Il indique séparément la présence des cinq README
ciblés et l'état du PIN. Il **ne vérifie pas les octets de tous les 126 Kristals**
ni la correspondance effective des 16 passages. Cette vérification doit être
faite par `scripts/build-light.mjs` lors d'une reconstruction locale isolée,
après avoir établi la provenance correcte des sources.

Si aucune collection n'est trouvée, un import épinglé des sources publiques est
une **étape distincte**, avec l'index digest exact attendu. Ne pas improviser
un commit, fabriquer un PIN ni modifier le dépôt public pour contourner les
contrôles de provenance.

## Tests

```powershell
node --test tests/check-light-sources-v211.test.mjs tests/guided-reading-v21.test.mjs
```

Le diagnostic ne produit ni vidéo ni build, ne lance aucune requête réseau,
ne touche pas à Git et n'autorise aucune publication.
