# V2.3 ML6 — aperçu et bêta publique explicite

FR, EN, ES, IT, FI, DE seulement. Les 8 autres traductions UI restent en réserve. Les libellés et extraits source ne sont pas traduits par inférence.

Le pipeline local teste 127 Kristals, dont Hospital-Ops, sans Prime Bridge. Aucun changement des données source ni des autorisations C1–C4. Le workflow 126 reste historique; le workflow 127 exige `PUBLIER_127_ML6` et résout un commit public exact.

L'entrée facultative `manifest_sha256` doit être l'empreinte `sha256:...` d'un manifeste `light.reviewed-dictionary-handoff/1` réellement admis par le propriétaire, dans `public-ml6-handoff/` (fichiers déjà admissibles au partage public). Ne jamais y copier une base diK privée ni des candidats. `prepare-ml6-handoff.mjs` appelle le convertisseur existant, vérifie les six langues, le namespace, l'état, le graphe et les empreintes. Les aliases et définitions de notions ne sont exportés que depuis les lignes curatées admises; les prédicats gardent leurs libellés. La revue déclarée n'est pas une preuve indépendante de droits. Sans manifeste, aucune ressource linguistique n'est importée.

Recette échantillonnée: 2 domaines × 4 vues × 6 langues, logo, conservation du contexte, erreurs de rendu; rapport de couverture des graphes publics par langue et par Kristal. Le contrôle ne garantit ni la totalité de l'UI ni une traduction intégrale des documents.
