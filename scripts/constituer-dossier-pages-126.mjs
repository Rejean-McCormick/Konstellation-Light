#!/usr/bin/env node
/**
 * Assemble a *technical candidate* dossier for the 126 already-public Kristals.
 * This script never grants authorization and never deploys. It only checks
 * the independently generated transport/build/browser reports and static bytes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const SHA = /^sha256:[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;
const MAX_FILES = 10000;
const MAX_BYTES = 512 * 1024 * 1024;
const exactCount = 126;
const allowedC4 = 'BLOCK_REAL_COLLECTION';

function requireCondition(value, message) {
  if (!value) throw new Error(message);
}
function readJson(file, description) {
  requireCondition(typeof file === 'string' && fs.existsSync(file) && fs.statSync(file).isFile(), `${description} absent`);
  requireCondition(fs.statSync(file).size < 10 * 1024 * 1024, `${description} trop volumineux`);
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { throw new Error(`${description} invalide`); }
}
function safeFiles(dir) {
  const root = path.resolve(dir);
  requireCondition(fs.existsSync(root) && fs.lstatSync(root).isDirectory() && !fs.lstatSync(root).isSymbolicLink(), 'Site absent, invalide ou lié');
  const rows = [];
  let total = 0;
  function visit(folder) {
    for (const e of fs.readdirSync(folder, {withFileTypes:true})) {
      const absolute = path.join(folder, e.name);
      requireCondition(!e.isSymbolicLink(), `Lien symbolique refusé dans le site : ${e.name}`);
      if (e.isDirectory()) { visit(absolute); continue; }
      requireCondition(e.isFile(), 'Fichier spécial refusé dans le site');
      const name = path.relative(root, absolute).split(path.sep).join('/');
      const bytes = fs.readFileSync(absolute);
      total += bytes.length;
      rows.push({path:name, size:bytes.length, sha256:`sha256:${hash(bytes)}`});
      requireCondition(rows.length <= MAX_FILES && total <= MAX_BYTES, 'Budget de site dépassé');
    }
  }
  visit(root);
  rows.sort((a,b)=>Buffer.compare(Buffer.from(a.path),Buffer.from(b.path)));
  return {rows,total};
}
export function buildDossier({site,sourceReport,buildReport,browserReport,output,checksumOutput,summaryOutput}={}) {
  requireCondition(site && sourceReport && buildReport && browserReport && output && checksumOutput,'Arguments de dossier incomplets');
  const source = readJson(sourceReport,'Rapport de révision GitHub');
  const built = readJson(buildReport,'Rapport de construction');
  const browser = readJson(browserReport,'Rapport Chromium');
  requireCondition(source.format === 'konstellation.light-technical-source-pin/1.0' &&
    source.repository === 'Rejean-McCormick/kristal-public' &&
    source.count === exactCount && COMMIT.test(source.commit) && SHA.test(source.index_digest) &&
    source.qualification_verified === false && source.authorization_verified === false &&
    source.publication_verified === false && source.pages_deploy === false,
    'Révision GitHub invalide ou preuve de permission présumée');
  requireCondition(built.format === 'konstellation.light-web-preview-report/1.0' &&
    built.result === 'TECHNICAL_PREVIEW_VALID_NOT_PAGES_AUTHORIZED' &&
    built.collection_count === exactCount && built.catalog_entries === exactCount &&
    built.source_commit === source.commit && built.collection_index_digest === source.index_digest &&
    built.source_mode === 'verified_transport_pin' &&
    built.c4?.integrity === 'PASS' && built.c4.github_pages_gate === allowedC4 &&
    built.github_pages_deploy === false && built.publication_authorization === 'NOT_VERIFIED',
    'Construction et verrou C4 non conformes');
  requireCondition(browser.format === 'konstellation.light-browser-smoke/1.0' &&
    browser.status === 'PASS' && browser.count === exactCount &&
    browser.github_pages_deploy === false && browser.publication_authorization === 'NOT_VERIFIED' &&
    Array.isArray(browser.tested_slugs) && browser.tested_slugs.length >= 3 &&
    Array.isArray(browser.tests) && browser.tests.length >= 5 &&
    browser.tests.every(t => t.result === 'PASS'),
    'Test du navigateur incomplet');
  const {rows,total} = safeFiles(site);
  const byName = new Map(rows.map(x=>[x.path,x]));
  for (const name of ['index.html','app.js','data/catalog.json','.nojekyll']) {
    requireCondition(byName.has(name), `Ressource du site absente : ${name}`);
  }
  const catalog = readJson(path.join(site,'data','catalog.json'),'Catalogue Light');
  requireCondition(catalog.format === 'konstellation.light-catalog/1.0' &&
    Array.isArray(catalog.entries) && catalog.entries.length === exactCount,
    'Catalogue du site invalide');
  const slugs = new Set();
  for (const e of catalog.entries) {
    requireCondition(typeof e.slug === 'string' && e.slug !== 'pitheory-prime-bridge' && !slugs.has(e.slug),
      'Identité de cristal invalide ou doublon');
    slugs.add(e.slug);
    requireCondition(typeof e.path === 'string' && /^data\/pack-[a-f0-9]{64}\.json$/.test(e.path) &&
      byName.has(e.path) && byName.get(e.path).size === e.bytes && byName.get(e.path).sha256 === e.sha256,
      `Pack absent ou modifié : ${e.slug}`);
  }
  requireCondition(built.catalog_sha256 === byName.get('data/catalog.json').sha256,
    'Catalogue différent du rapport de construction');
  const canonicalRows = rows.map(x=>`${x.sha256}  ${x.path}\n`).join('');
  const dossier = {
    format:'konstellation.pages-candidate-dossier/1.0',
    status:'CANDIDAT_TECHNIQUE_VERIFIE_NON_AUTORISE',
    source:{repository:source.repository, commit:source.commit, index_digest:source.index_digest, kristals:exactCount},
    site:{files:rows.length,bytes:total,sha256_manifest:`sha256:${hash(Buffer.from(canonicalRows,'utf8'))}`,
      catalog_sha256:built.catalog_sha256},
    browser:{status:'PASS',sampled_slugs:browser.tested_slugs},
    controls:{collection_integrity:'PASS',reader_alignment:'PASS',browser:'PASS',
      c1_independent_qualification:'NOT_VERIFIED',c2_public_authorization:'NOT_VERIFIED',
      c3_immutable_release:'NOT_VERIFIED',c4_pages_gate:allowedC4},
    public_exposure_authorized:false,
    github_pages_deployed:false,
    note:'Ce dossier n’est pas un reçu C1/C2/C3, ni une autorisation de publier. Le verrou C4 demeure actif.'
  };
  for (const dest of [output,checksumOutput]) {
    const folder=path.dirname(path.resolve(dest));fs.mkdirSync(folder,{recursive:true});
  }
  fs.writeFileSync(output,JSON.stringify(dossier,null,2)+'\n','utf8');
  fs.writeFileSync(checksumOutput,canonicalRows,'utf8');
  if (summaryOutput) {
    fs.appendFileSync(summaryOutput,[
      '### Konstellation Light — candidat HTTPS de 126 cristaux (NON publié)',
      `- Intégrité : **PASS**, ${exactCount} cristaux, ${rows.length} fichiers de site`,
      `- Révision source : \`${source.commit}\``,
      '- Navigation Chromium : **PASS** (échantillon, pas 126 parcours individuels)',
      '- C1/C2/C3 : **NOT_VERIFIED**; C4 Pages : **BLOCK_REAL_COLLECTION**',
      '- GitHub Pages : **NON DÉPLOYÉ**. Artefact téléchargeable uniquement.',
      '',''].join('\n'),'utf8');
  }
  return dossier;
}

function parseArgs(argv) {
  const result={};
  for(let i=0;i<argv.length;i+=2){
    const name=argv[i], value=argv[i+1];
    if (!name?.startsWith('--') || !value || result[name]) throw Error(`Argument invalide : ${name}`);
    result[name]=value;
  }
  const allowed=new Set(['--site','--source-report','--build-report','--browser-report','--output','--checksums','--summary']);
  for(const key of Object.keys(result)) if(!allowed.has(key)) throw Error(`Option inconnue : ${key}`);
  return {site:result['--site'],sourceReport:result['--source-report'],buildReport:result['--build-report'],
    browserReport:result['--browser-report'],output:result['--output'],checksumOutput:result['--checksums'],summaryOutput:result['--summary']};
}
if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(buildDossier(parseArgs(process.argv.slice(2))))); }
  catch(e){console.error(e.message);process.exitCode=1;}
}
