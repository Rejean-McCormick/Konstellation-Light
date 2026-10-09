#!/usr/bin/env node
// Build-only, read-only exporter for verified Kristal v10 GitHub surfaces.
// Its output is a derived navigation layer, NOT publication, activation, or semantic validation.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { inspectGithubKristal, listGithubKristals, toNavigationPack } from '../server/integrations/kristal-v10.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const digest = (x) => createHash('sha256').update(x).digest('hex');
const json = (value) => Buffer.from(JSON.stringify(value, null, 2) + '\n', 'utf8');
const options = {};
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i];
  if (!key.startsWith('--') || !process.argv[i + 1]) throw Error(`Argument invalide: ${key}`);
  options[key.slice(2)] = process.argv[i + 1];
}
if (options.help) { console.log('node scripts/build-light.mjs --collection PATH --out PATH --public YES [--revision LABEL] [--repository https://github.com/owner/repo] [--commit SHA] [--append YES]'); process.exit(0); }
const publicIntent = options.public === 'YES';
if (!publicIntent) throw Error('Export refusé : fournir explicitement --public YES (les données seront accessibles publiquement).');
const collection = options.collection ? path.resolve(options.collection) : '';
if (!collection || !fs.existsSync(path.join(collection, 'kristals/index.json'))) throw Error('Collection v10 introuvable (kristals/index.json requis).');
const output = path.resolve(options.out || path.join(root, 'light/site'));
const repoURL = options.repository || '';
const gitSHA = options.commit || '';
if ((repoURL && !gitSHA) || (!repoURL && gitSHA)) throw Error('--repository et --commit doivent être fournis ensemble.');
if (repoURL && !/^https:\/\/github\.com\/[a-zA-Z\d_.-]+\/[a-zA-Z\d_.-]+\/?$/.test(repoURL)) throw Error('URL GitHub non autorisée.');
if (gitSHA && !/^[a-f\d]{40}$/.test(gitSHA)) throw Error('Une empreinte de commit SHA-1 complète (40 caractères) est requise.');
// The importer's transport pin must agree with the commit embedded in the rendered links.
// A source-pin is NEVER a qualification or publication proof.
const sourcePinFile = path.join(collection, 'LIGHT_SOURCE_PIN.json');
if (fs.existsSync(sourcePinFile)) {
  const pin = JSON.parse(fs.readFileSync(sourcePinFile, 'utf8'));
  if (pin.format !== 'konstellation.light-source-pin/1.0' ||
      pin.repository !== 'Rejean-McCormick/kristal-public' ||
      pin.commit !== gitSHA ||
      repoURL.replace(/\/$/, '') !== `https://github.com/${pin.repository}` ||
      pin.index_digest !== JSON.parse(fs.readFileSync(path.join(collection,'kristals/index.json'),'utf8')).index_digest ||
      pin.qualification_verified !== false || pin.publication_verified !== false) {
    throw Error('Source pin incohérent : import épinglé et paramètres du build ne correspondent pas.');
  }
}
const revision = options.revision || (gitSHA || 'local');
if (!/^[a-zA-Z0-9._-]{1,70}$/.test(revision)) throw Error('Révision invalide.');
const append = options.append === 'YES';
const baseCatalogFile = path.join(output, 'data/catalog.json');
const previous = append && fs.existsSync(baseCatalogFile) ? JSON.parse(fs.readFileSync(baseCatalogFile)) : null;
if (previous && (previous.format !== 'konstellation.light-catalog/1.0' || !Array.isArray(previous.entries))) throw Error('Ancien catalogue non supporté.');
const staged = new Map();
const entries = previous ? [...previous.entries] : [];
const listed = listGithubKristals({ directory: collection }, root);
const maxRecords = 6000;
for (const item of listed) {
  const checked = inspectGithubKristal({ directory: collection, kristal: item.id, maxBytes: 128 * 1024 * 1024, maxFiles: 4096 }, root);
  const pack = toNavigationPack(checked, maxRecords);
  const nodes = pack.entities.map((e) => ({ id: e.id, kind: e.type, label: e.label, description: e.description }));
  const edges = pack.assertions.map((a) => ({ from: a.subject, to: a.value, relation: a.relation }));
  const bundle = {
    format: 'konstellation.light-navigation/1.0',
    view_kind: 'derived-hosting-navigation',
    semantic_authority: false,
    title: item.label, slug: item.id, revision,
    state_ref: checked.sync.state_ref,
    declared_commitment: checked.sync.state_logical_commitment,
    surface_digest: checked.sync.surface_digest,
    verification: checked.checks,
    source: repoURL ? { repository: repoURL.replace(/\/$/, ''), commit: gitSHA } : null,
    metrics: { members: checked.state.members.length, files: checked.files.length, bytes: checked.sync.total_bytes },
    nodes, edges,
  };
  const bytes = json(bundle), sha256 = digest(bytes);
  const filename = `data/pack-${sha256}.json`;
  staged.set(filename, bytes);
  const row = { slug: item.id, title: item.label, revision, state_ref: bundle.state_ref,
    surface_digest: bundle.surface_digest, path: filename, sha256: `sha256:${sha256}`, bytes: bytes.length,
    members: bundle.metrics.members, files: bundle.metrics.files };
  const existing = entries.findIndex(e => e.slug === row.slug && e.revision === revision);
  if (existing >= 0) {
    const old = entries[existing];
    if (old.sha256 !== row.sha256 || old.surface_digest !== row.surface_digest ||
        old.state_ref !== row.state_ref || old.path !== row.path) {
      throw Error(`Révision immuable : ${row.slug}@${revision} pointe déjà vers un autre contenu.`);
    }
    entries.splice(existing, 1);
  }
  entries.push(row);
}
entries.sort((a,b) => Buffer.compare(Buffer.from(a.slug+'\u0000'+a.revision),Buffer.from(b.slug+'\u0000'+b.revision)));
const names = new Set();
for (const e of entries) {
  const key = `${e.slug}@${e.revision}`;
  if (names.has(key) || !/^data\/pack-[a-f\d]{64}\.json$/.test(e.path) || !/^sha256:[a-f\d]{64}$/.test(e.sha256)) throw Error('Catalogue incohérent');
  names.add(key);
  if (!staged.has(e.path)) {
    const previousFile = path.join(output, e.path);
    const bytes = fs.readFileSync(previousFile);
    if (bytes.length !== e.bytes || `sha256:${digest(bytes)}` !== e.sha256) throw Error('Ancien bundle modifié : '+e.path);
    staged.set(e.path, bytes);
  }
}
const catalog = { format:'konstellation.light-catalog/1.0',
  notice: 'Navigation dérivée. Aucun contrôle de signature, publication, activation ou autorité sémantique.',
  entries };
staged.set('data/catalog.json', json(catalog));
for (const name of ['index.html','app.js','style.css','sw.js']) staged.set(name, fs.readFileSync(path.join(root, 'light/src', name)));
staged.set('.nojekyll', Buffer.from(''));
// Compose a complete site in a sibling directory and swap only after success.
// Existing deployments must not be left half-updated if source checks or disk I/O fail.
function refuseSymlinkAncestors(target) {
  let at = path.resolve(target);
  while (true) {
    if (fs.existsSync(at) && fs.lstatSync(at).isSymbolicLink()) throw Error(`Sortie symlink interdite : ${at}`);
    const parent = path.dirname(at);
    if (parent === at) break;
    at = parent;
  }
}
refuseSymlinkAncestors(output);
const outputParent = path.dirname(output);
fs.mkdirSync(outputParent, { recursive: true });
const temp = fs.mkdtempSync(path.join(outputParent, '.light-build-'));
const backup = path.join(outputParent, `.light-backup-${path.basename(temp)}`);
let backedUp = false;
try {
  for (const [rel, bytes] of staged) {
    if (!/^(?:data\/(?:pack-[a-f\d]{64}\.json|catalog\.json)|index\.html|app\.js|style\.css|sw\.js|\.nojekyll)$/.test(rel)) throw Error('Chemin de sortie non autorisé.');
    const target = path.join(temp, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
  }
  if (fs.existsSync(output)) {
    if (!fs.lstatSync(output).isDirectory()) throw Error('La destination n’est pas un dossier.');
    fs.renameSync(output, backup);
    backedUp = true;
  }
  try { fs.renameSync(temp, output); }
  catch (error) {
    if (backedUp) fs.renameSync(backup, output);
    backedUp = false;
    throw error;
  }
  if (backedUp) fs.rmSync(backup, { recursive: true, force: true });
} finally {
  if (fs.existsSync(temp)) fs.rmSync(temp, { recursive: true, force: true });
}
console.log(`Konstellation Light: ${listed.length} Kristal(s) verified, ${entries.length} revision(s) in ${output}`);
