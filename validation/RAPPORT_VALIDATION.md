# Contrôle des 10 lots de définitions — 9 novembre 2026

## Verdict

- **2354 candidats techniquement vérifiés** : archives intactes, pas de doublon d’assertion, textes, relations et références cohérents avec le snapshot Light disponible.
- **407 candidats à revoir en priorité**, dont 399 déjà signalés par l’exporteur et 8 portant le même texte sur plusieurs notions.
- **0 texte approuvé ou publié** : les archives portent toutes `status=candidate`, `reviewed=false`.
- **0 définition nouvelle générée, 0 traduction créée** : le diagnostic indique `semantic_jobs_provided=0`, `dik.files=0`.

## Répartition

| Kristal | Candidats | Avertissements initiaux | Langue fr explicitée dans le graphe |
|---|---:|---:|---:|
| aerospace | 241 | 3 | 241 |
| evolution | 193 | 1 | 193 |
| foodscience | 340 | 323 | 0 |
| forestry | 212 | 0 | 212 |
| historytech | 349 | 5 | 349 |
| humanbody | 377 | 51 | 377 |
| literature | 40 | 7 | 0 |
| materials | 163 | 1 | 0 |
| neuroscience | 226 | 5 | 0 |
| nutrition | 213 | 3 | 213 |

## Contrôle de provenance et de langues

- Tous les candidats portent `locale=und` ; la langue devra être attribuée explicitement lors de la révision.
- Dans le snapshot des valeurs du graphe, 1 585 textes portent une annotation explicite `fr`; 769 ne portent pas d’indication de langue exploitable. Leur contenu paraît majoritairement français, mais cela ne constitue pas une déclaration de langue.
- Toutes les chaînes `source_refs` sont des identifiants internes `KS…`, identiques aux références dans les assertions du snapshot. Elles ne prouvent pas, à elles seules, l’authenticité ni l’exactitude factuelle de sources indépendantes.
- **Avertissement de version :** les dix empreintes de bundles déclarées par l’export sont différentes des dix empreintes correspondantes de l’ancien snapshot Light accessible ici. Les 2 354 triplets notion–relation–valeur et leurs références concordent néanmoins. Pour une preuve byte-à-byte, il faudrait les bundles exacts utilisés lors de l’export.

## Exemples de problèmes

- Foodscience : `Centrifugation` → « Procédé ou transformation alimentaire: Centrifugation. » (étiquette de catégorie, pas une définition).
- Humanbody : `Secondes`, `Minutes`, `Heures`, `Jours`, `Semaines`, `Mois`, `Années`, `Millisecondes` → tous « Bande temporelle de navigation. » (même texte pour huit notions distinctes).
- Humanbody : `Cellule` → « Référent cellulaire. » (insuffisamment informatif).

## Suites sûres

1. Ne pas injecter ces ZIP directement dans Light comme contenus révisés.
2. Prioriser les éléments de `REVISION_PRIORITAIRE.jsonl`, et revoir également les autres textes avant tout statut `reviewed`.
3. Demander à l’orchestrateur une véritable production des demandes sémantiques pour les autres notions, ainsi qu’une attribution de langue fiable depuis diK et les métadonnées du graphe.
4. Conserver la séparation candidats / contenus révisés et ne pas contourner C4.

## Fichiers

- `SYNTHESE_AUDIT.json` : comptages et empreintes.
- `REVISION_PRIORITAIRE.jsonl` : éléments portant des signaux de qualité ou une réutilisation anormale.
- `AUDIT_INTEGRAL_2354.jsonl` : état technique et éditorial pour chaque candidat, sans modifier les textes.
