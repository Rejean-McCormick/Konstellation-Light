#!/usr/bin/env node
/**
 * Prepare a verified Konstellation Light site from already-public Kristal surfaces.
 * NO Git changes, network upload, GitHub Pages deployment or C1/C2 claims.
 * Only immutable read materializations in a stable, out-of-checkout directory.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { verifyCollectionIndex } from '../shared/kristal-v10.mjs';
import { inspectSite } from './c4-publication-gate.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultCollection = path.resolve(root, '..', '..', 'Kristal', 'kristal-public');
const defaultOut = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'),
  'Konstellation-Light', 'site-web-126-a-valider');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const opts = {};
for (let i = 2; i < process.argv.length; i += 2) {
  const option = process.argv[i];
  const value = process.argv[i + 1];
  if (!option?.startsWith('--') || !value || !['--collection', '--out', '--expected-count', '--local-only', '--localizations'].includes(option)) {
    throw Error('Usage: node scripts/preparer-site-web-126.mjs [--collection PATH] [--out PATH] [--expected-count 126] [--local-only YES] [--localizations PATH]');
  }
  if (opts[option]) throw Error(`Option dupliquée : ${option}`);
  opts[option] = value;
}
const count = Number(opts['--expected-count'] ?? '126');
if (!Number.isSafeInteger(count) || count < 1 || count > 500) throw Error('Nombre de Kristals attendu invalide.');
const localOnly = opts['--local-only'] === 'YES';
if (opts['--local-only'] && !localOnly) throw Error('Utiliser uniquement --local-only YES.');
const collection = path.resolve(opts['--collection'] || defaultCollection);
const output = path.resolve(opts['--out'] || defaultOut);
const within = (parent, child) => child === parent || child.startsWith(parent + path.sep);
if (within(root, output) || within(collection, output) || within(output, collection))
  throw Error('Le site candidat doit être construit hors du dépôt Light et du dépôt kristal-public.');
if (!fs.existsSync(path.join(collection, 'kristals', 'index.json'))) throw Error(`Collection absente : ${collection}`);
if (fs.lstatSync(collection).isSymbolicLink()) throw Error('La source ne peut pas être un lien symbolique.');
const sourceIndex = JSON.parse(fs.readFileSync(path.join(collection, 'kristals', 'index.json'), 'utf8'));
const verifiedIndex = verifyCollectionIndex(sourceIndex);
if (verifiedIndex.kristals.length !== count) throw Error(`Collection incomplète : ${verifiedIndex.kristals.length}/${count} Kristals.`);
if (verifiedIndex.kristals.some(row => row.slug === 'pitheory-prime-bridge')) throw Error('Prime Bridge interdit dans ce site public.');

function git(args, timeout = 60000) {
  const p = spawnSync('git', ['-C', collection, ...args], { encoding: 'utf8', timeout,
    env: {...process.env, GIT_TERMINAL_PROMPT: '0'} });
  if (p.error || p.status !== 0) throw Error(`Vérification Git impossible : ${p.stderr || p.error?.message || args.join(' ')}`);
  return p.stdout.trim();
}
let commit = null;
let sourceMode = 'offline_local_preview';
const pinPath = path.join(collection, 'LIGHT_SOURCE_PIN.json');
if (fs.existsSync(pinPath)) {
  const pin = JSON.parse(fs.readFileSync(pinPath, 'utf8'));
  if (pin.format !== 'konstellation.light-source-pin/1.0' ||
      pin.repository !== 'Rejean-McCormick/kristal-public' ||
      !/^[a-f0-9]{40}$/.test(pin.commit) ||
      pin.index_digest !== verifiedIndex.index_digest ||
      pin.qualification_verified !== false || pin.publication_verified !== false)
    throw Error('Source GitHub épinglée incohérente.');
  commit = pin.commit;
  sourceMode = 'verified_transport_pin';
} else if (!localOnly) {
  const origin = git(['remote', 'get-url', 'origin']);
  if (!/^(?:https:\/\/github\.com\/Rejean-McCormick\/kristal-public(?:\.git)?\/?|git@github\.com:Rejean-McCormick\/kristal-public(?:\.git)?)$/i.test(origin))
    throw Error('Le dépôt local n’a pas le dépôt GitHub public attendu comme origin.');
  const branch = git(['branch','--show-current']);
  if (branch !== 'main') throw Error(`Branche locale attendue: main; trouvée: ${branch}`);
  if (git(['status','--porcelain','--untracked-files=no'])) throw Error('Modifications locales non synchronisées : commit/push avant de préparer le site en mode GitHub.');
  commit = git(['rev-parse','HEAD']);
  if (!/^[a-f0-9]{40}$/.test(commit)) throw Error('Commit Git local invalide.');
  const remoteRow = git(['ls-remote','--heads','origin','main'], 120000).split(/\s+/)[0];
  if (commit !== remoteRow) throw Error('Le commit local diffère de main sur GitHub. Synchroniser le dépôt public d’abord.');
  sourceMode = 'github_main_confirmed';
}
const revision = commit || ('local-' + verifiedIndex.index_digest.slice(7, 23));
const args = [path.join(root, 'scripts', 'build-light.mjs'), '--collection', collection,
  '--out', output, '--public', 'YES', '--revision', revision];
if (opts['--localizations']) args.push('--localizations',path.resolve(opts['--localizations']));
if (commit) args.push('--repository', 'https://github.com/Rejean-McCormick/kristal-public', '--commit', commit);
console.log(`Source : ${collection}`);
console.log(`Collection : ${count} Kristals; Prime Bridge absent; index ${verifiedIndex.index_digest}`);
console.log(`Mode : ${sourceMode}. Construction locale, sans Git ni déploiement...`);
const builder = spawnSync(process.execPath, args, {stdio: 'inherit', cwd: root});
if (builder.error || builder.status !== 0) throw Error(`Construction de Light interrompue (${builder.error?.message || builder.status}).`);
const preflight = inspectSite(output);
if (preflight.integrity !== 'PASS' || preflight.github_pages_gate !== 'BLOCK_REAL_COLLECTION')
  throw Error('Résultat de précontrôle C4 inattendu : ' + JSON.stringify(preflight));
const catalogFile = path.join(output, 'data', 'catalog.json');
const contents = fs.readFileSync(catalogFile);
const catalog = JSON.parse(contents);
if (catalog.entries.length !== count || new Set(catalog.entries.map(x=>x.slug)).size !== count ||
    catalog.entries.some(x=>x.slug === 'pitheory-prime-bridge')) throw Error('Le catalogue Light ne contient pas exactement la sélection attendue.');
const report = {
  format: 'konstellation.light-web-preview-report/1.0',
  result: 'TECHNICAL_PREVIEW_VALID_NOT_PAGES_AUTHORIZED',
  collection_count: count,
  collection_index_digest: verifiedIndex.index_digest,
  source_mode: sourceMode,
  source_commit: commit,
  site_directory: output,
  catalog_sha256: `sha256:${sha(contents)}`,
  catalog_entries: catalog.entries.length,
  localized_kristals: catalog.entries.filter(x=>Object.keys(x.localizations||{}).length).length,
  localized_language_packs: catalog.entries.reduce((n,x)=>n+Object.keys(x.localizations||{}).length,0),
  c4: preflight,
  git_add: false, git_commit: false, git_push: false, github_pages_deploy: false,
  publication_authorization: 'NOT_VERIFIED',
  required_before_pages: 'Reçus C1, C2 et C3 authentiques, vérifiés selon les autorités de confiance, puis raccordement du contrôle C4.'
};
fs.mkdirSync(path.dirname(output), {recursive: true});
const reportPath = path.join(path.dirname(output), 'RAPPORT_PREPARATION_SITE_WEB_126.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(`\nPrévisualisation locale validée : ${count} Kristals.`);
console.log(`Site : ${output}`);
console.log(`Rapport : ${reportPath}`);
console.log('Pages : BLOQUÉ tant que les autorisations C1/C2/C3 ne sont pas vérifiées.');
