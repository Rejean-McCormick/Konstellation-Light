# Konstellation-Light 0.5.1 — Discovery 3.3, Arketype 1.4, migration locale

## Périmètre appliqué

Cette livraison met à jour uniquement le **dépôt Konstellation-Light** du snapshot du 13 octobre 2026. Les dépôts Konstellation complet, Kristal Manager, Authoring Kit, Arketype, EncyKlopedia et Skope n'ont pas été modifiés.

### Contrats reconnus

| Fichier produit par l’Authoring Kit | Format / usage Light |
| --- | --- |
| `kristal.discovery.json` | `kristal.discovery/1.0`, classification déclarée et pointeurs vérifiés |
| `derived/reader-inventory.json` | `kristal.reader-inventory/1.0`, taille physique des fichiers référencés |
| `derived/reader-profile.json` | `kristal.reader-profile/1.0`, recommandations **non exécutables** |

Le CLI et le GUI peuvent produire un champ `discovery` dans `konstellation.light-navigation/1.0` seulement avec activation explicite `--discovery YES`. Sa forme publique est un **nouveau DTO dérivé** : `konstellation.light-discovery-projection/1.0`. Aucun changement du canon `kristal.state/9.0` ou du format synchronisé v10. Aucun lien automatique avec Manager.

## Flux de compilation

1. `listGithubKristals` / `inspectGithubKristal` vérifient la collection v10, les tailles et SHA-256 de **tous** les fichiers de la surface déclarée et l'accord index/manifeste.
2. Si demandé, `shared/discovery.mjs` vérifie la présence **complète** des trois documents, leur source fingerprint commun, `state_ref`, autorité non canonique, cohérence d'usage et budgets de fichiers. Il relit leurs octets depuis les chemins fixes et revérifie les SHA-256 déclarés.
3. Seuls les champs explicitement admis sont projetés : version Arketype, ARK/PRF, slug/famille/domaine, organisation, type natif, profil de lecture et mode d'accès, classe de taille, nombre d'octets des sources locales référencées et complétude de mesure. Les chemins d'artefacts, sources détaillées, stratégies par fichier, textes libres et fingerprint sont exclus.
4. Le navigateur affiche la projection dans l'inspecteur du nœud « état hébergé ». Elle reste de la navigation technique : **ni identité certifiée, ni accès autorisé, ni vérité sémantique, ni publication**.
5. `--discovery NO` ou absence de l'option préserve l'ancien bundle. Des Kristals anciens sans ces trois fichiers restent navigables.

Les données dans Discovery, même fiables quant aux octets de transport, ne sont pas nécessairement fraîches ou garanties par les engagements canoniques. Les profils de lecteurs n'exécutent aucun code et ne sélectionnent pas automatiquement `simdjson`. Les mécanismes C1/C2/C3/C4 doivent valider et autoriser séparément toute exposition.

## Utilisation CLI

```bash
node scripts/build-light.mjs --collection ./collection-v10 --out ./previews/light-demo --public YES --revision test --discovery YES
node scripts/serve-light.mjs ./previews/light-demo
```

L'option `--public YES` demeure le signal d'intention d'exposer des données du compilateur existant : **elle n'est pas une autorisation C2/C4**. Utilise un corpus explicitement partageable. Ne vise pas `light/site` pour des essais de collections réelles.

## Déplacement interne et nettoyage Windows

- **Déplacé** : `server/integrations/kristal-v10.mjs` → `shared/kristal-v10.mjs`. Les imports du build, de l'ingestion épinglée et des tests sont actualisés.
- **Ajouté** : `shared/discovery.mjs`, `tests/discovery.test.mjs`, `tools/cleanup_update.py`, `tests/test_cleanup_update.py`, `Nettoyer_Mise_A_Jour.pyw`.
- **Conservé** : `light/site` et `config/c4-demo-pin.json` inchangés pour que la porte C4 ne s'ouvre pas à une vraie collection. `light/src` demeure la source des assets des futurs builds.

Après extraction d'une archive mise à jour dans un dépôt local ancien, Windows **ne supprime pas les fichiers absents du nouveau ZIP**. Double-clique sur `Nettoyer_Mise_A_Jour.pyw`, sélectionne la version historique reconnue, et confirme son retrait. L'outil crée une copie vérifiée dans `../Konstellation-Light_sauvegardes_migration/<date>-<id>/`, hors du dépôt, puis supprime le chemin ancien du dossier actif. Si l'ancien fichier a été modifié ou que le nouveau module manque / n'est pas la version attendue, **l'outil refuse de le toucher**. Restaurer en recopiant le fichier depuis la sauvegarde si nécessaire. Aucun nettoyage automatique n'est exécuté à l'extraction ou au démarrage de Light.

## Validation recommandée

```bash
node --test tests/*.test.mjs
python -m unittest discover -s tests
node scripts/c4-publication-gate.mjs --site light/site
```

Le test C4 doit retourner `ALLOW_DEMO_ONLY` pour la démonstration épinglée et `BLOCK_REAL_COLLECTION` pour une vraie collection ; les tests vérifient également les refus des métadonnées Discovery incomplètes ou corrompues. GUI Windows et déploiement Pages réel doivent être validés sur l'environnement cible.
