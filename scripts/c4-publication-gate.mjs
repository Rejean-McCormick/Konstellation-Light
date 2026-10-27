#!/usr/bin/env node
// C4 local preflight: verifies bundled demo-only Pages payload. It deliberately
// DOES NOT verify C1/C2/C3 approval or authorize real-collection publication.
// A repository maintainer MUST protect this pin, the workflow and its code.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = b => createHash('sha256').update(b).digest('hex');
const PACK = /^data\/pack-([a-f0-9]{64})\.json$/;
const optionalLocal = new Set(['semantic-display.mjs']);
const fixed = new Set(['.nojekyll', 'app.js', 'graph-core.mjs', 'profile.mjs', 'index.html', 'style.css', 'sw.js', 'data/catalog.json']);
const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
export class C4GateError extends Error { constructor(code,message) {super(message);this.name='C4GateError';this.code=code;} }
const reject = (code,message) => {throw new C4GateError(code,message);};
function filesUnder(root) {
  const seen=[];
  function walk(dir) {
    for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
      const absolute=path.join(dir,ent.name);
      if(ent.isSymbolicLink()) reject('SYMLINK_DENIED','Symbolic links are forbidden in a Pages payload.');
      if(ent.isDirectory()) walk(absolute);
      else if(ent.isFile()) seen.push(path.relative(root,absolute).split(path.sep).join('/'));
      else reject('SPECIAL_FILE_DENIED','Special files are forbidden.');
      if(seen.length>1006) reject('SITE_TOO_LARGE','Excessive site file count.');
    }
  }
  walk(root);return seen;
}
export function inspectSite(site, demoPin = path.join(project,'config/c4-demo-pin.json')) {
  const root=path.resolve(site);
  if(!fs.existsSync(root)||!fs.lstatSync(root).isDirectory()||fs.lstatSync(root).isSymbolicLink())
    reject('SITE_INVALID','Site directory missing, invalid or linked.');
  const fileList=filesUnder(root);
  const catalogPath=path.join(root,'data/catalog.json');
  if(!fs.existsSync(catalogPath)) reject('CATALOG_MISSING','Static catalog is missing.');
  let catalog, pin;
  const catalogBytes=fs.readFileSync(catalogPath);
  if(catalogBytes.length>1024*1024) reject('CATALOG_TOO_LARGE','Catalog size budget exceeded.');
  try {catalog=JSON.parse(catalogBytes);} catch {reject('CATALOG_INVALID','Invalid JSON catalog.');}
  if(!catalog||catalog.format!=='konstellation.light-catalog/1.0'||!Array.isArray(catalog.entries)||
     catalog.entries.length<1||catalog.entries.length>1000) reject('CATALOG_INVALID','Unsupported static catalog.');
  const allowed=new Set(fixed), keys=new Set();
  for(const entry of catalog.entries) {
    if(!entry||typeof entry.slug!=='string'||typeof entry.revision!=='string'||
       !PACK.test(entry.path||'')||entry.sha256!==`sha256:${entry.path.slice(10,-5)}`||
       !Number.isSafeInteger(entry.bytes)||entry.bytes<0||entry.bytes>8*1024*1024||
       typeof entry.surface_digest!=='string'||!/^sha256:[a-f0-9]{64}$/.test(entry.surface_digest))
      reject('CATALOG_INVALID','Invalid catalog entry.');
    const key=entry.slug+'\0'+entry.revision;
    if(keys.has(key)) reject('CATALOG_INVALID','Duplicate slug/revision.');
    keys.add(key);
    const file=path.join(root,entry.path);
    if(!fs.existsSync(file)) reject('BUNDLE_MISSING','Catalog bundle missing.');
    const contents=fs.readFileSync(file);
    if(contents.length!==entry.bytes || `sha256:${sha(contents)}`!==entry.sha256)
      reject('BUNDLE_TAMPERED','Catalog bundle digest or size mismatch.');
    let bundle;try{bundle=JSON.parse(contents);}catch{reject('BUNDLE_INVALID','Invalid bundle JSON.');}
    if(bundle.format!=='konstellation.light-navigation/1.0'||bundle.semantic_authority!==false||
       bundle.slug!==entry.slug||bundle.revision!==entry.revision||bundle.surface_digest!==entry.surface_digest||
       !['derived-hosting-navigation','derived-semantic-preview'].includes(bundle.view_kind))
       reject('BUNDLE_INVALID','Bundle identity or representation invalid.');
    allowed.add(entry.path);
  }
  // Recognize one additional JS presentation asset for review-only local builds.
  // Its presence always prevents the Pages-demo pin from matching.
  for (const file of fileList) if (optionalLocal.has(file)) allowed.add(file);
  const unexpected=fileList.filter(name=>!allowed.has(name));
  const missing=[...allowed].filter(name=>!fileList.includes(name));
  if(unexpected.length||missing.length) reject('UNDECLARED_FILE','Static payload contains undeclared or missing files.');
  try {pin=JSON.parse(fs.readFileSync(demoPin,'utf8'));} catch {reject('PIN_UNAVAILABLE','Bundled demo reference pin is missing.');}
  if(pin.format!=='konstellation.light-demo-pin/1.0') reject('PIN_INVALID','Unknown demo pin format.');
  const entry=catalog.entries[0];
  const entryFile=path.join(root,entry.path);
  const b=JSON.parse(fs.readFileSync(entryFile,'utf8'));
  const assetHashesOK = pin.site_assets_sha256 && [...fixed].filter((file)=>file!=='data/catalog.json')
    .every((file)=>typeof pin.site_assets_sha256[file]==='string' &&
      sha(fs.readFileSync(path.join(root,file)))===pin.site_assets_sha256[file]);
  const demo = Boolean(assetHashesOK) && !fileList.some(file=>optionalLocal.has(file)) && catalog.entries.length===1 && entry.slug===pin.slug && entry.revision===pin.revision &&
    entry.state_ref===pin.state_ref && b.state_ref===pin.state_ref && b.view_kind==='derived-hosting-navigation' &&
    b.source===null && !own(entry,'mode') && sha(catalogBytes)===pin.catalog_sha256 &&
    sha(fs.readFileSync(entryFile))===pin.bundle_sha256;
  return {
    format:'konstellation.light-c4-preflight/1.0',
    integrity:'PASS', site_kind: demo?'bundled_synthetic_demo':'other_valid_site',
    qualification:'NOT_VERIFIED', authorization:'NOT_VERIFIED', publication:'NOT_VERIFIED',
    github_pages_gate:demo?'ALLOW_DEMO_ONLY':'BLOCK_REAL_COLLECTION',
    description:demo?'Exact bundled demonstration matches repository pin; no real Kristal release qualification asserted.'
                    :'Verified file bytes alone do not authorize a real Kristal Pages deployment.'
  };
}
export function assertDemoOnly(site,pin) {
 const result=inspectSite(site,pin);
 if(result.github_pages_gate!=='ALLOW_DEMO_ONLY') reject('C4_PUBLICATION_BLOCKED','Only the pinned bundled demo is currently permitted for Pages.');
 return result;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const argv=process.argv.slice(2);
  try {
    if(argv.length!==2 || argv[0]!=='--site') reject('USAGE','Usage: node scripts/c4-publication-gate.mjs --site PATH');
    const result=inspectSite(argv[1]);
    console.log(JSON.stringify(result,null,2));
    if(result.github_pages_gate!=='ALLOW_DEMO_ONLY') process.exitCode=3;
  } catch(e) {
    console.error(JSON.stringify({format:'konstellation.light-c4-preflight/1.0',integrity:'FAIL',github_pages_gate:'BLOCK',code:e.code||'INTERNAL_ERROR',message:e.message},null,2));
    process.exitCode=2;
  }
}
