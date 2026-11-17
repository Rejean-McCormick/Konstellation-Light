# Automatisation de Konstellation Light — 126 Kristals

**Statut : prévisualisation technique automatisée, sans publication.**

## Fonctionnement

Le workflow `.github/workflows/konstellation-light-126-auto-audit.yml` peut être démarré
manuellement dans **Actions → Konstellation Light - 126 Kristals automated read-only audit
→ Run workflow**. Après son commit et son push direct sur `main`, il est aussi planifié
à **11 h 17 UTC chaque jour** (horaire indicatif : GitHub peut retarder un cron).

1. Exécute les tests de lecture et de barrière C4, sans les modifier.
2. Résout le commit `main` actuellement public du dépôt `Rejean-McCormick/kristal-public`.
3. Lit à cette révision immuable le `kristals/index.json`, vérifie son schéma, son
   empreinte logique et ses 126 entrées. Ce SHA et cet `index_digest` forment un
   **pin technique**, jamais une preuve d'autorisation.
4. Importe la révision exacte et vérifie les fichiers et empreintes des 126 surfaces.
5. Reconstruit le site dans le dossier éphémère du runner, exige que la barrière
   C4 rapporte **BLOCK_REAL_COLLECTION**, et confirme que l'export reste une preview.
6. Ouvre la preview avec Chromium, change de Kristal, passe en mode « notions »,
   effectue une recherche et recharge un lien profond. Contrôle les exceptions JS.
7. Archive rapports et capture d'écran comme artefacts temporaires de 7 jours.

Toute erreur arrête la chaîne; les rapports intermédiaires disponibles sont
conservés. **Aucune écriture** dans `kristal-public`, aucun commit ni push
réalisé par le workflow, aucune release et aucun déploiement Pages.

## Limites de preuve

- Une preview techniquement correcte n'est pas une qualification indépendante C1.
- Un SHA et un digest ne sont pas un accord de publication C2, ni un reçu C3.
- La barrière C4 actuelle n'autorise que sa démo épinglée sur Pages; ce workflow
  ne l'affaiblit ni ne tente de la contourner.
- Trois cristaux (premier, milieu, dernier) sont testés en navigateur; les
  126 packs sont vérifiés en intégrité. Les interactions navigateur de tous les
  126 cristaux ne sont **pas** individuellement démontrées par cette campagne.
- Les avertissements locaux N03 (gros fichiers) et N06 (scan plafonné) du
  LevelUpDiag Windows restent un sujet séparé. Ils ne sont pas masqués.

## Pour finaliser la vraie publication

Il faudra adopter les formats de reçus C1/C2/C3, les autorités de confiance et les
règles de révocation, réaliser leur vérification automatique, puis approuver une
modification revue de C4 pour les collections réelles. Appliquer une protection de
branche et des revues obligatoires aux workflows, scripts et pins de publication.

Ces actions concernent des droits et décisions humaines; **aucun cron ne doit
produire une autorisation par défaut**.

## Activation directe sur `main` (sans branche intermédiaire)

Le fichier `C:\\mycode\\Kristal\\ACTIVER_AUDIT_GITHUB.cmd` vérifie que le clone
local `C:\\mycode\\Konstellation\\Konstellation-Light` est sur `main`, que
cette révision est identique à `origin/main`, que les changements indexés sont
vides et que les tests ciblés passent. Après une seule confirmation explicite,
il commite **uniquement les cinq fichiers du workflow** et pousse `main`
sans `--force`. Il ne crée pas de branche, de PR ou de sauvegarde parallèle.
