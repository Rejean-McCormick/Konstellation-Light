#!/usr/bin/env node
// Diagnostic V2.1.1 en lecture seule : repère les collections v10, sans import,
// construction, écriture, publication ni confiance implicite dans leur provenance.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyCollectionIndex } from '../shared/kristal-v10.mjs';
import { GUIDED_SCENES, GUIDED_SOURCE } from '../shared/guided-reading.mjs';

const MAX_DIRS = 30000;
const MAX_DEPTH = 16;
const SKIP = new Set(['.git','node_modules','.venv','venv','__pycache__','.next',
  '.cache','.idea','.vs','coverage']);
const REQUIRED = [...new Set(GUIDED_SCENES.map(scene => scene.slug))].sort();

function usage() {
  console.log('Diagnostic Konstellation-Light V2.1.1 (lecture seule)');
  console.log('Usage : node scripts/check-light-sources.mjs --root CHEMIN [--root CHEMIN]');
  console.log('        node scripts/check-light-sources.mjs --collection CHEMIN');
  console.log('Recherche : collection v10 contenant kristals/index.json.');
  console.log('LIGHT_SOURCE_PIN.json : facultatif pour scripts/build-light.mjs.');
}

function args(argv) {
  const roots = [];
  let collection;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' && argv.length === 1) return { help: true };
    if (!['--root','--collection'].includes(arg) || !argv[i + 1] || argv[i + 1].startsWith('--'))
      throw Error(`Argument invalide : ${arg}. Utiliser --help.`);
    const value = path.resolve(argv[++i]);
    if (arg === '--root') roots.push(value);
    else if (collection !== undefined) throw Error('--collection fourni deux fois.');
    else collection = value;
  }
  if ((collection && roots.length) || (!collection && !roots.length))
    throw Error('Fournir --collection OU une ou plusieurs options --root.');
  return { roots, collection };
}

function indexFile(collection) {
  return path.join(collection, 'kristals', 'index.json');
}

function existsFile(file) {
  try { return fs.statSync(file).isFile() && !fs.lstatSync(file).isSymbolicLink(); }
  catch { return false; }
}

function pinStatus(collection, index) {
  const file = path.join(collection, 'LIGHT_SOURCE_PIN.json');
  try { if (fs.lstatSync(file).isSymbolicLink()) return { message: 'invalide (lien symbolique)', valid: false }; }
  catch (error) { if (error.code !== 'ENOENT') return { message: 'inaccessible', valid: false }; }
  if (!existsFile(file)) {
    // A special file must not be mistaken for normal absence.
    if (fs.existsSync(file)) return { message: 'invalide (pas un fichier régulier)', valid: false };
    return { message: 'absent — facultatif pour le build, provenance Git non attestée par PIN', valid: true };
  }
  try {
    const pin = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (pin.format !== 'konstellation.light-source-pin/1.0' ||
        pin.repository !== 'Rejean-McCormick/kristal-public' ||
        pin.commit !== GUIDED_SOURCE.commit ||
        pin.index_digest !== index.index_digest ||
        pin.qualification_verified !== false || pin.publication_verified !== false)
      throw Error('métadonnées incompatibles avec les sources V2.1');
    return { message: `cohérent avec le commit ${pin.commit} (transport seulement)`, valid: true };
  } catch (error) { return { message: `invalide (${error.message})`, valid: false }; }
}

function inspect(collection) {
  console.log(`\nCOLLECTION : ${collection}`);
  if (!existsFile(indexFile(collection))) {
    console.log('INDEX : ABSENT — kristals/index.json est obligatoire.');
    console.log('PIN : sans objet; inutile de chercher LIGHT_SOURCE_PIN.json.');
    return false;
  }
  let index;
  try {
    index = verifyCollectionIndex(JSON.parse(fs.readFileSync(indexFile(collection), 'utf8')));
  } catch (error) {
    console.log(`INDEX : INVALIDE — ${error.message}`);
    return false;
  }
  console.log(`INDEX : v10 valide (${index.kristals.length} Kristals; empreinte vérifiée).`);
  const known = new Set(index.kristals.map(row => row.slug));
  const available = REQUIRED.filter(slug => known.has(slug) && existsFile(path.join(collection,'kristals',slug,'README.md')));
  console.log(`README ciblés V2.1 : ${available.length}/${REQUIRED.length} présents (contenu et SHA non encore vérifiés).`);
  if (available.length !== REQUIRED.length)
    console.log(`MANQUANTS : ${REQUIRED.filter(slug => !available.includes(slug)).join(', ')}`);
  const pin = pinStatus(collection,index);
  console.log(`SOURCE PIN : ${pin.message}.`);
  if (!pin.valid) console.log('BLOCAGE : résoudre la contradiction du PIN avant le build.');
  if (available.length === REQUIRED.length && pin.valid)
    console.log('SUITE : vérifier les manifestes et les 16 citations avec le build V2.1, sur un aperçu local isolé.');
  else if (pin.valid) console.log('SUITE : compléter la collection v10 avant le parcours guidé.');
  console.log('Aucune source modifiée; aucun déploiement ni vidéo lancés.');
  return pin.valid;
}

function scan(root, results) {
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory() || fs.lstatSync(root).isSymbolicLink()) {
    console.log(`RACINE IGNORÉE (absente ou non régulière) : ${root}`);
    return;
  }
  const pending = [{ directory: root, depth: 0 }];
  let scanned = 0;
  for (let i = 0; i < pending.length && scanned < MAX_DIRS; i++) {
    const { directory, depth } = pending[i];
    scanned++;
    if (existsFile(indexFile(directory))) results.add(directory);
    if (depth >= MAX_DEPTH) continue;
    let entries;
    try { entries = fs.readdirSync(directory, { withFileTypes: true }); }
    catch { continue; }
    for (const ent of entries) {
      if (ent.isDirectory() && !ent.isSymbolicLink() && !SKIP.has(ent.name))
        pending.push({ directory: path.join(directory, ent.name), depth: depth + 1 });
    }
  }
  console.log(`RACINE EXAMINÉE : ${root} (${scanned} dossiers; lecture seule).`);
  if (scanned === MAX_DIRS) console.log('ATTENTION : limite de recherche atteinte; résultat incomplet.');
}

export function main(argv = process.argv.slice(2)) {
  let opt;
  try { opt = args(argv); }
  catch (error) { console.error(error.message); usage(); return 1; }
  if (opt.help) { usage(); return 0; }
  const found = new Set();
  if (opt.collection) found.add(opt.collection);
  else for (const root of opt.roots) scan(root,found);
  if (!found.size) {
    console.log('AUCUNE COLLECTION V10 TROUVÉE : chercher kristals/index.json, pas LIGHT_SOURCE_PIN.json.');
    console.log('Si la source est absente, prévoir un import public épinglé distinct de toute publication.');
    return 2;
  }
  let valid = 0;
  for (const collection of [...found].sort()) if (inspect(collection)) valid++;
  return valid ? 0 : 2;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]))
  process.exitCode = main();
