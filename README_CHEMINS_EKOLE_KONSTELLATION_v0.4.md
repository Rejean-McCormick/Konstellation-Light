# Konstellation Light v0.4 — chemins canoniques Ekole et diagnostic

## Disposition recommandée (Windows)

```text
C:\mycode\
├── Ekole\
│   ├── kristals\
│   │   ├── societes-autochtones-quebec\
│   │   │   ├── kristal.workspace.json
│   │   │   └── canon\domain\encyclopedie-v4.json
│   │   ├── rencontres-coloniales-quebec\
│   │   ├── modele-organisation-humaine\
│   │   └── qc-pri-ma-028\            (et les 201 autres cours)
│   ├── site\eleve\
│   │   └── konstellation\             (PROJECTION facultative, pas une source)
│   ├── modules\qc-pri-us-009\         (références pédagogiques)
│   └── LANCER_EKOLE_3_APPS.bat
└── Konstellation\
    ├── Konstellation\                (moteur complet, si présent)
    └── Konstellation-Light\
        ├── Previsualiser-Light.pyw
        ├── Explorer-Ekole-Autochtones.pyw
        └── previews\ekole-autochtones-local\  (CACHE local)
```

**Ne pas déplacer les Kristals dans Konstellation.** Le Kristal autonome
reste la propriété de `Ekole/kristals/societes-autochtones-quebec/` ;
Konstellation ne consomme que sa représentation dérivée. Un Kristal de cours
comme `qc-pri-us-009` le référence sans lui appartenir.

## Pourquoi « introuvable » sur le poste

Le ZIP `znapshot_Ekole_10101537.zip` contient bien 45 fichiers sous
`kristals/societes-autochtones-quebec/`, dont `canon/domain/encyclopedie-v4.json`.
Le poste Windows a affiché une absence sous `C:\mycode\Ekole\...` :
les fichiers du ZIP ne sont donc pas forcément extraits à cet emplacement.

Le lanceur v0.4 :
- reconnaît Ekole même si le Kristal v4 est absent ;
- montre l’emplacement attendu, et repère un ZIP extrait sous un sous-dossier ;
- peut restaurer le Kristal manquant depuis **le ZIP existant**, sans écraser
  ni déplacer les autres fichiers (bouton « Restaurer … depuis un ZIP Ekole ») ;
- refuse toute restauration si un dossier Kristal est déjà présent, même partiel ;
- conserve l’ouverture locale et les protections contre la publication implicite.

## Installation en deux étapes

1. Extraire `Konstellation_Light_Chemins_Autoreparation_v0.4.zip` **dans**
   `C:\mycode\Konstellation\Konstellation-Light` (base v0.3 requise).
   Fermer auparavant tout lanceur encore ouvert.
2. Double-cliquer `Previsualiser-Light.pyw` → « Ekole · Graphe ».
   Le champ racine devrait afficher `C:\mycode\Ekole`, même si le fichier manque.
   Si l’état indique un Kristal manquant, cliquer « Restaurer … depuis un ZIP
   Ekole » et choisir ton fichier `znapshot_Ekole_10101537.zip`.
   Confirmer. Puis « Créer / actualiser et OUVRIR le graphe ».

*Alternative manuelle :* extraire seulement le sous-dossier
`kristals/societes-autochtones-quebec/` du snapshot ZIP à la racine Ekole,
si le dossier n’existe pas déjà. Faire une sauvegarde avant toute opération.

## Sécurité et politique documentaire

La restauration est non destructive et spécifique au Kristal autonome. Elle
n’installe ni corrigé, ni matière d’un autre cours, ni publication v10.
L’encyclopédie v4 reste un corpus **candidat**, à relire culturellement et
historiquement avant l’option facultative de copie dans `site/eleve/konstellation/`.
Une prévisualisation privée n’est pas une preuve d’approbation du contenu.
