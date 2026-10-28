> **Simple mode v0.3:** you no longer need to type Node commands. Extract the [v0.3 update](README_LANCEUR_EKOLE_AUTOMATIQUE.md) into Konstellation-Light and double-click `Explorer-Ekole-Autochtones.pyw`. The rest of this guide describes advanced manual procedures.

# Konstellation Light · “Bubbles and Ekole” update

The update builds on snapshot `znapshot_Konstellation-Light_10101341.zip` and retains the Windows application, verified v10 builds, publication restrictions, and traceability.

## What's new

- **Restored slider: 3 to 25 neighboring bubbles**, default eight. Share the setting using `?n=8`.
- **Real recentering:** click a bubble (or press Enter/Space) to move it to the center. Only declared relationships appear in both navigation directions. Unrelated nodes are never added just to meet the count.
- **Back** and **Home** buttons; relationship details appear in the inspector and tooltip.
- A candidate **semantic-preview adapter**, separate from v10 publication. The reader can explore concepts, societies, roles, tasks, resources, sources, time periods, and courses.
- **Optional projection of the standalone Kristal** `societes-autochtones-quebec` (`encyclopedie-v4.json`) into a reviewable graph containing themes, entries, prerequisites, and sources. No exercise bank, test answers, or answer keys are exported.
- Works offline using a static HTTP server on the same origin as the application; no calls to an AI provider API.

## A — Install the update in Konstellation-Light

**Lightweight overlay:** extract its ZIP at the root of the Konstellation-Light repository, replacing application files. Do not extract it at the Ekole root.

**Full snapshot:** extract the standalone pack into a new directory, e.g. `C:\mycode\Konstellation\Konstellation-Light-NEXT`.

Preview: double-click `Previsualiser-Light.pyw` or run `node scripts/serve-light.mjs`, then open `http://127.0.0.1:4177/`.

The demo bundled with Light mainly shows **technical v10 links**. The bubbles already work; semantic knowledge requires a separate projection.

## B — Generate a local semantic demo

```powershell
node scripts\build-semantic-preview.mjs --input examples\ekole-curation-demo.json --out previews\ekole-demo --local YES
node scripts\serve-light.mjs previews\ekole-demo
```

This is a **concept demonstration**, not a published v10 collection. The script refuses to replace the public `light/site` directory and refuses to overwrite an existing destination.

## C — Connect the standalone Indigenous Peoples Kristal, then Ekole

From the Konstellation Light repository, with an Ekole snapshot that includes the standalone Kristal:

```powershell
node scripts\project-ekole-encyclopedia.mjs --kristal "C:\mycode\Ekole\kristals\societes-autochtones-quebec\canon\domain\encyclopedie-v4.json" --out previews\curation-autochtones.json --local YES
```

**Manually review** the projection, its sources, and permission to make it available to students before the next step. For a preview on a private machine:

```powershell
node scripts\build-semantic-preview.mjs --input previews\curation-autochtones.json --out previews\autochtones --local YES
node scripts\serve-light.mjs previews\autochtones
```

For local integration into **Ekole Student** after that review, change `--out` to the nonexistent directory `C:\mycode\Ekole\site\eleve\konstellation`, then visit `http://127.0.0.1:8765/eleve/konstellation/`. The existing Ekole HTTP server is sufficient. **Local-network access does not require Internet**, but the server must remain active. Prefer an isolated Student export over the school server, since Ekole Core contains files that should not be public.

The candidate static projection **is not a Kristal v10 build**: the reader labels it visibly as a preview. SHA-256 protects byte transport, but does not certify truth or cultural authorization of each assertion. The adapter exports neither source text nor answer keys.

## Verification

```powershell
node --test tests\*.test.mjs
py -3 -m unittest discover -s tests -p "test_windows_tools.py"
```

Visual usability and navigation on a real tablet still need testing. **Do not run `build-light.mjs --public YES` on a v9 collection or candidate projection.**
