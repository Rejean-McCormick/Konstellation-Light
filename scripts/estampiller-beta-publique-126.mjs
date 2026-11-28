#!/usr/bin/env node
/**
 * Add an accurate, human-visible PUBLIC BETA notice to a site built solely from
 * the exact already-public kristal-public GitHub commit.
 * This is the repository owner's explicit scope choice, NOT a C1/C2/C3/C4 receipt.
 * No network or publishing operations are performed by this program.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const EXPECTED_REPO = 'Rejean-McCormick/kristal-public';
export const EXPECTED_COUNT = 126;
const SHA = /^[a-f0-9]{40}$/;
const DIGEST = /^sha256:[a-f0-9]{64}$/;
const REL = /^data\/pack-([a-f0-9]{64})\.json$/;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const assert = (condition, message) => { if (!condition) throw Error(message); };

// Must remain completely static: the banner must not include untrusted data.
const notice = count => '<aside id="konstellation-public-beta-disclosure" role="note" data-ui="betaDisclosure' + count + '" '
  + 'style="position:relative;z-index:10;padding:0.7rem 1rem;margin:0;background:#fff3cd;color:#392800;border-bottom:2px solid #8a6d00;font:600 0.93rem/1.5 system-ui,sans-serif">'
  + `Bêta publique — navigation dérivée de ${count} Kristals déjà présents sur GitHub. `
  + 'Représentations et traductions non qualifiées; aucune certification sémantique ou éditoriale.</aside>';

function safeRoot(root){
  assert(fs.existsSync(root) && fs.lstatSync(root).isDirectory() && !fs.lstatSync(root).isSymbolicLink(),
    'Site absent, invalide ou lien symbolique.');
  for (let at = root; ; at = path.dirname(at)) {
    if (fs.existsSync(at)) assert(!fs.lstatSync(at).isSymbolicLink(), 'Chemin traversant un lien symbolique.');
    if (path.dirname(at) === at) break;
  }
}
function safeFile(root, relative) {
  assert(!relative.includes('..') && !relative.startsWith('/') && !relative.includes('\\'), 'Chemin invalide.');
  const full = path.join(root, relative);
  assert(fs.existsSync(full) && fs.lstatSync(full).isFile() && !fs.lstatSync(full).isSymbolicLink(),
    `Fichier absent ou lien symbolique : ${relative}`);
  return full;
}
export function stampPublicBeta({site, sourceReport, expectedCount=EXPECTED_COUNT}={}) {
  assert(typeof site === 'string' && typeof sourceReport === 'string', 'Utiliser --site et --source-report.');
  assert([126,127].includes(expectedCount),'Périmètre non autorisé.');
  const root=path.resolve(site);
  safeRoot(root);
  const source = JSON.parse(fs.readFileSync(sourceReport, 'utf8'));
  assert(source.format === 'konstellation.light-technical-source-pin/1.0' &&
    source.repository === EXPECTED_REPO && source.branch === 'main' &&
    source.count === expectedCount && SHA.test(source.commit) && DIGEST.test(source.index_digest) &&
    source.qualification_verified === false && source.authorization_verified === false &&
    source.publication_verified === false && source.pages_deploy === false,
    'Révision GitHub publique exacte non confirmée; aucun droit C1–C4 ne peut être présumé.');
  const cat = JSON.parse(fs.readFileSync(safeFile(root,'data/catalog.json'),'utf8'));
  assert(cat.format === 'konstellation.light-catalog/1.0' && Array.isArray(cat.entries) &&
    cat.entries.length === expectedCount, `Catalogue non conforme aux ${expectedCount} Kristals publics.`);
  const slugs = new Set();
  for (const item of cat.entries) {
    assert(typeof item.slug === 'string' && !slugs.has(item.slug) && item.slug !== 'pitheory-prime-bridge',
      'Identifiant de Kristal interdit ou dupliqué.');
    slugs.add(item.slug);
    assert(REL.test(item.path || '') && item.sha256 === `sha256:${REL.exec(item.path)[1]}` &&
      Number.isSafeInteger(item.bytes) && item.bytes >= 0 && item.bytes <= 8*1024*1024,
      'Chemin, empreinte ou taille de pack invalide.');
    const bytes = fs.readFileSync(safeFile(root,item.path));
    assert(bytes.length === item.bytes && item.sha256 === `sha256:${hash(bytes)}`,
      `Pack absent ou modifié : ${item.slug}`);
    const bundle=JSON.parse(bytes.toString('utf8'));
    assert(bundle.slug === item.slug && bundle.semantic_authority === false &&
      bundle.state_ref === item.state_ref && bundle.surface_digest === item.surface_digest &&
      bundle.source?.repository === `https://github.com/${EXPECTED_REPO}` &&
      bundle.source?.commit === source.commit,
      `Provenance de pack non épinglée : ${item.slug}`);
  }
  if(expectedCount===127)assert(slugs.has('hospital-ops'),'Hospital-Ops absent.');
  const htmlPath=safeFile(root,'index.html');
  const html=fs.readFileSync(htmlPath,'utf8');
  assert(html.length < 256*1024 && /<body(?:\s[^>]*)?>/i.test(html) &&
    !html.includes('konstellation-public-beta-disclosure'),
    'HTML du lecteur incompatible ou déjà estampillé.');
  const updated=html.replace(/(<body(?:\s[^>]*)?>)/i, `$1\n${notice(expectedCount)}`);
  fs.writeFileSync(htmlPath, updated, 'utf8');
  return {format:'konstellation.light-owner-approved-public-beta/1.0',
    site_kind:'already_public_github_surfaces', repository:EXPECTED_REPO,
    count:expectedCount, commit:source.commit, index_digest:source.index_digest,
    public_beta_notice_visible:true, independent_c1_c2_c3_c4_receipts_verified:false,
    semantic_authority:false, site_entrypoint_sha256:`sha256:${hash(Buffer.from(updated))}`};
}
function parse(argv) {
  const o={};
  for (let i=0;i<argv.length;i+=2) {
    const name=argv[i], value=argv[i+1];
    if (!['--site','--source-report','--expected-count'].includes(name) || !value || o[name]) throw Error('Usage: --site PATH --source-report PATH');
    o[name]=value;
  }
  if (!o['--site']||!o['--source-report']) throw Error('Usage: --site PATH --source-report PATH');
  return {site:o['--site'],sourceReport:o['--source-report'],expectedCount:Number(o['--expected-count']||126)};
}
if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(stampPublicBeta(parse(process.argv.slice(2))),null,2)); }
  catch (err) { console.error('Bêta publique refusée : '+err.message);process.exitCode=1; }
}
