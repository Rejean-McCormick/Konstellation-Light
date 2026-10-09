# C4 — Import GitHub public épinglé et porte de publication

Statut : **préparation / preview uniquement, aucun déploiement de collection réelle autorisé par cette livraison**.

## 1. Frontières et responsabilités

- C3 (`kristal-public`) possède la publication publique et son reçu de qualification/autorisation.
- C4 (Konstellation Light) **consomme** une surface GitHub v10 publiée, vérifie ses octets et produit une navigation dérivée ; il **ne décide pas** si le Kristal a le droit d'être publié, si sa sémantique est valide ou s'il est activé.
- La vérification locale SHA-256 et le SHA complet d'un commit ne prouvent **ni qualification indépendante, ni licence, ni autorisation, ni immutabilité d'une release**.
- `konstellation.light-source-pin/1.0` (fichier local `LIGHT_SOURCE_PIN.json`) est **uniquement un reçu de transfert technique non normatif**. Il porte `qualification_verified=false` et `publication_verified=false`.

## 2. Ce qui marche maintenant : importer un état *déjà public*, pour aperçu isolé

À exécuter seulement sur une révision dont l'exposition publique a déjà été approuvée en amont. Le dépôt doit être exactement `Rejean-McCormick/kristal-public` (liste de confiance C4 volontairement limitée).

```bash
node scripts/import-pinned-collection.mjs \
  --repository Rejean-McCormick/kristal-public \
  --commit <SHA_GIT_40_CARACTERES> \
  --expected-index-digest sha256:<INDEX_DIGEST_64_HEX> \
  --out /tmp/public-collection

node scripts/build-light.mjs \
  --collection /tmp/public-collection \
  --out /tmp/light-preview \
  --public YES \
  --revision <SHA_GIT_40_CARACTERES> \
  --repository https://github.com/Rejean-McCormick/kristal-public \
  --commit <SHA_GIT_40_CARACTERES>
```

Remplacer les placeholders par les valeurs exactes du commit et de l'index **déjà publics**. Un échec entraîne un refus sans création du dossier destination. Les scripts n'exécutent aucun programme du dépôt téléchargé, ne téléchargent pas automatiquement d'autres dépôts et rejettent les liens symboliques de la collection. `--out` de l'import doit pointer sur un dossier **non existant**, avec parent existant.

Le build Light respecte l'intégrité octet-à-octet de la surface v10, crée des packs immuables `pack-<SHA-256>.json` et refuse qu'une même paire `(slug, revision)` désigne un contenu différent ; sa sortie est assemblée avant remplacement, afin que les erreurs préalables ne remplacent pas l'ancien site.

## 3. Workflows GitHub fournis

- `.github/workflows/konstellation-light-intake.yml` : `workflow_dispatch` ou `repository_dispatch` de type `kristal-qualified-release-v1`, télécharge **uniquement** à un commit complet depuis le dépôt fixe, contrôle l'index et les octets, prépare le site statique puis **dépose un artefact d'aperçu de sept jours**. Il ne possède ni permission `pages:write`, ni permission `id-token:write`, ni étape `deploy-pages`.
- `.github/workflows/konstellation-light-pages.yml` : le déploiement manuel de la **démo existante** demeure possible. Une valeur non vide de `collection_directory` fait échouer explicitement le workflow jusqu'au raccordement de la qualification C3.

**La réception authentifiée d'un `repository_dispatch` ne prouve pas l'identité du producteur de la qualification** : tout acteur possédant l'autorisation d'envoyer cet événement peut choisir son contenu. Il est donc insuffisant pour ouvrir les droits de déploiement.

## 4. Contrat de coordination demandé à C3 (proposition, non accepté)

Avant de créer un déploiement automatisé, C3 doit produire un événement **après release effectivement vérifiée**, accompagné de références vers les preuves **autorisées** :

| Champ / preuve demandée | Validation C4 attendue |
|---|---|
| Dépôt source fixé à `Rejean-McCormick/kristal-public` | Identité du dépôt confirmée côté plateforme, pas seulement dans le payload |
| SHA Git de 40 caractères et tag de release | Tag résolu **au SHA exact**, pas à `main` ou une branche mutable |
| `kristals/index.json` et `index_digest` | Digest du schéma Framework et entrées vérifiés |
| Manifeste de sync v10 par Kristal | Rôles, empreintes, tailles, chemin, état et surface concordants |
| Reçu de qualification **indépendante** | Attestation vérifiable et reliée au même commit/manifeste/engagement logique |
| Autorisation initiale active et périmètre public | Reçu de C2, contrôlé à la version publiée (y compris exclusions) |
| Publication/release immuable C3 | Existence, statut et preuve d'immuabilité vérifiés par une source de confiance |
| Événement post-publication idempotent | Relecture/rejeu ne doit pas produire un nouveau résultat divergent |

**Tant que les formats et racines de confiance de ces reçus ne sont pas acceptés conjointement par C1/C2/C3/C4, le pipeline Pages reste fermé aux collections réelles.** Ce document n'invente pas un schéma normatif `publication_receipt/1.0`.

## 5. Historique de versions / catalogue

- `--append YES` garde les révisions existantes seulement si leurs anciens packs ont encore la bonne taille et le bon SHA-256.
- La même `(slug, revision)` ne peut pas être remplacée silencieusement.
- En l'absence d'horodatage/séquence **provenant de C3**, les révisions sont triées lexicalement. L'interface **ne peut pas garantir** que la dernière entrée est la révision chronologiquement la plus récente. Les liens directs `?k=<slug>&r=<revision>&lens=trace` restent déterministes.
- Le site publié ne contient pas de secret ; les archives et artefacts GitHub Actions peuvent être accessibles selon la configuration du dépôt.
- Aucun changement n'est apporté aux fichiers canon zoologiques, aux sources de vérité, aux engagements v9 ou à Kompiler.

## 6. Tests

```bash
node --test tests/kristal-v10.test.mjs tests/light.test.mjs tests/pinned-intake.test.mjs
python -m unittest discover -s tests -p 'test_windows_tools.py' -v
```

Les tests GitHub distants, le comportement natif Windows, l'attestation C3 et l'interface web hébergée n'ont **pas** été validés par ces tests locaux.
