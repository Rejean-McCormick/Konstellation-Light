# Konstellation-Light 0.5.1 — Discovery 3.3, Arketype 1.4, local migration

## Scope applied

This release updates only the **Konstellation-Light repository** from the October 13, 2026 snapshot. The full Konstellation, Kristal Manager, Authoring Kit, Arketype, EncyKlopedia, and Skope repositories were not modified.

### Recognized contracts

| File produced by the Authoring Kit | Format / Light usage |
| --- | --- |
| `kristal.discovery.json` | `kristal.discovery/1.0`, declared classification and verified pointers |
| `derived/reader-inventory.json` | `kristal.reader-inventory/1.0`, physical sizes of referenced files |
| `derived/reader-profile.json` | `kristal.reader-profile/1.0`, **non-executable** recommendations |

The CLI and GUI can include a `discovery` field in `konstellation.light-navigation/1.0` only with explicit `--discovery YES` opt-in. Its public shape is a **new derived DTO**, `konstellation.light-discovery-projection/1.0`. There are no changes to the `kristal.state/9.0` canon or the synchronized v10 format, and no automatic link to Manager.

## Build flow

1. `listGithubKristals` / `inspectGithubKristal` verify the v10 collection, sizes and SHA-256 digests of **all** files on the declared surface, and index/manifest consistency.
2. If requested, `shared/discovery.mjs` verifies the **complete** presence of all three documents, a common source fingerprint, `state_ref`, non-canonical authority, consistent usage and file budgets. It rereads their bytes from fixed paths and rechecks their declared SHA-256 digests.
3. Only expressly allowed fields are projected: Arketype version, ARK/PRF, slug/family/domain, organization, native type, reader profile and access mode, size class, referenced local-source byte count and measurement completeness. Artifact paths, detailed sources, per-file strategies, free text and the fingerprint are excluded.
4. The browser displays the projection in the “hosted state” node inspector. It remains technical navigation: **not certified identity, authorized access, semantic truth or publication**.
5. `--discovery NO` or omitting the option preserves the previous bundle. Older Kristals without the three files remain navigable.

Discovery information, even when transport bytes are trustworthy, is not necessarily current or backed by canonical commitments. Reader profiles execute no code and do not automatically select `simdjson`. C1/C2/C3/C4 mechanisms must validate and separately authorize any exposure.

## CLI usage

```bash
node scripts/build-light.mjs --collection ./collection-v10 --out ./previews/light-demo --public YES --revision test --discovery YES
node scripts/serve-light.mjs ./previews/light-demo
```

`--public YES` remains the existing compiler's declaration of intent to expose data; **it is not C2/C4 authorization**. Use a corpus explicitly approved for sharing. Do not target `light/site` when experimenting with real collections.

## Internal relocation and Windows cleanup

- **Moved:** `server/integrations/kristal-v10.mjs` → `shared/kristal-v10.mjs`. Imports in build, pinned intake and tests were updated.
- **Added:** `shared/discovery.mjs`, `tests/discovery.test.mjs`, `tools/cleanup_update.py`, `tests/test_cleanup_update.py`, `Nettoyer_Mise_A_Jour.pyw`.
- **Preserved:** unchanged `light/site` and `config/c4-demo-pin.json`, so the C4 gate cannot open for a real collection. `light/src` remains the source for future build assets.

After extracting an updated archive into an older local repository, Windows **does not delete files absent from the new ZIP**. Double-click `Nettoyer_Mise_A_Jour.pyw`, select the recognized historical version and confirm its removal. The tool makes a verified copy in `../Konstellation-Light_sauvegardes_migration/<date>-<id>/` outside the repository, then deletes the old path from the active directory. If the previous file was modified or the new module is missing / has an unexpected version, **the tool refuses to touch it**. Restore by copying from the backup if necessary. No automatic cleanup occurs at extraction or startup.

## Recommended validation

```bash
node --test tests/*.test.mjs
python -m unittest discover -s tests
node scripts/c4-publication-gate.mjs --site light/site
```

The C4 test must return `ALLOW_DEMO_ONLY` for the pinned demo and `BLOCK_REAL_COLLECTION` for a real collection. Tests also cover rejection of incomplete or corrupted Discovery metadata. The Windows GUI and actual Pages deployment still require validation in the target environment.
