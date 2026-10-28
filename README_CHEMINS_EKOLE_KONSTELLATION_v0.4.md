# Konstellation Light v0.4 — canonical Ekole paths and diagnostics

## Recommended Windows layout

```text
C:\mycode\
├── Ekole\
│   ├── kristals\
│   │   ├── societes-autochtones-quebec\
│   │   │   ├── kristal.workspace.json
│   │   │   └── canon\domain\encyclopedie-v4.json
│   │   ├── rencontres-coloniales-quebec\
│   │   ├── modele-organisation-humaine\
│   │   └── qc-pri-ma-028\            (and the other 201 courses)
│   ├── site\eleve\
│   │   └── konstellation\             (optional DERIVED PROJECTION, not a source)
│   ├── modules\qc-pri-us-009\         (educational references)
│   └── LANCER_EKOLE_3_APPS.bat
└── Konstellation\
    ├── Konstellation\                (full engine, if present)
    └── Konstellation-Light\
        ├── Previsualiser-Light.pyw
        ├── Explorer-Ekole-Autochtones.pyw
        └── previews\ekole-autochtones-local\  (local CACHE)
```

**Do not move Kristals into Konstellation.** The standalone Kristal remains owned by `Ekole/kristals/societes-autochtones-quebec/`; Konstellation only consumes its derived representation. A course Kristal such as `qc-pri-us-009` references it but does not own it.

## Why Windows reports “not found”

The ZIP `znapshot_Ekole_10101537.zip` does contain 45 files under `kristals/societes-autochtones-quebec/`, including `canon/domain/encyclopedie-v4.json`. Windows reported that they were missing under `C:\mycode\Ekole\...`; ZIP contents are therefore not necessarily extracted to that location.

The v0.4 launcher:
- recognizes Ekole even if the v4 Kristal is missing;
- shows the expected location and detects a ZIP extracted under a subdirectory;
- can restore the missing Kristal from **an existing ZIP**, without overwriting or moving other files (the “Restaurer le Kristal manquant depuis un ZIP Ekole…” (Restore from an Ekole ZIP) button);
- refuses restoration if any Kristal directory is already present, even if incomplete;
- preserves local access and protections against implicit publication.

## Two-step installation

1. Extract `Konstellation_Light_Chemins_Autoreparation_v0.4.zip` **into** `C:\mycode\Konstellation\Konstellation-Light` (requires the v0.3 base). Close any open launcher first.
2. Double-click `Previsualiser-Light.pyw` → “Ekole · Graphe” (Ekole · Graph). The root field should display `C:\mycode\Ekole`, even when the file is missing. If a Kristal is reported missing, click “Restaurer le Kristal manquant depuis un ZIP Ekole…” (Restore from an Ekole ZIP) and select `znapshot_Ekole_10101537.zip`. Confirm, then select “Créer / actualiser et OUVRIR le graphe” (Create/update and OPEN graph).

*Manual alternative:* extract only `kristals/societes-autochtones-quebec/` from the snapshot ZIP into the Ekole root, if the directory does not already exist. Make a backup before proceeding.

## Security and document policy

Restoration is non-destructive and specific to the standalone Kristal. It does not install answer keys, content from other courses, or any v10 publication. The v4 encyclopedia remains a **candidate** corpus requiring cultural and historical review before the optional copy into `site/eleve/konstellation/`. A private preview is not evidence of content approval.
