# Secondary satellites and detail cards — revision 2 (October 13, 2026)

## Behavior

- Hovering over or keyboard-focusing a satellite displays an overlay of **its own neighbors**, without changing the center, history, or edges.
- Neighbors are ranked under the existing neighborhood rule and selected through an adjacency index built once per render, rather than scanning the graph on every hover. The primary center is excluded **before** the six-neighbor limit.
- The overlay is informational only and not clickable. Clicking the bubble still navigates.
- Layout searches across multiple radii while avoiding initial bubbles, already positioned previews, and canvas bounds. This is a heuristic, not a zero-collision guarantee.

## Standardized detail cards

- The “i” badge appears only for recognized families: person, place, organization, work, event (based on types actually loaded from the data).
- Displayed fields depend on family and declared description/source/aliases/place/period. No documentary inference.
- The badge is separate from navigation. Focus moves to Close and then returns to the badge; Escape closes the non-modal card.
- If no image is declared or loading fails, show a pictogram. External HTTP URLs, SVG, requests and unsafe paths are rejected.

## Using an image in local curation

For a `konstellation.semantic-curation/1.0` preview, put an image under `portraits/figure.png` next to `curation.json` and declare `"portrait": "portraits/figure.png"` on the relevant node.

`node scripts/build-semantic-preview.mjs --input /path/curation.json --out /path/new-site --local YES`

The build checks that the file is local (no symlinks or traversal), its extension matches its raster signature, and it is under 2 MiB. It copies the image to `images/<sha256>.<extension>` and declares `./images/...` in the bundle. This fingerprint names the media; the reader does **not independently reverify** its SHA-256 signature outside the bundle.

The operator must supply and authorize the image. No portrait is downloaded or generated automatically. The default packaged public site remains a **C4-locked demo**; this portrait workflow is for a candidate local site.

## Limitations

- Labels may overlap on small screens and dense graphs.
- No access to unpublished data: Light shows only nodes/links declared in the verified local bundle.
- Browser testing could not be performed in this environment; JS and Python suites passed.
