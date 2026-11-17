import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {buildDossier} from '../scripts/constituer-dossier-pages-126.mjs';

const sha=x=>'sha256:'+createHash('sha256').update(x).digest('hex');
function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'kristal-pages-test-'));
  const site=path.join(root,'site'); fs.mkdirSync(path.join(site,'data'),{recursive:true});
  for(const [name,content] of [['index.html','<!doctype html>'],['app.js','console.log("ok")'],['.nojekyll','']])fs.writeFileSync(path.join(site,name),content);
  const entries=[];
  for(let i=0;i<126;i++){
    const slug='cristal-'+String(i).padStart(3,'0');
    const bytes=Buffer.from(JSON.stringify({slug, nodes: []}));
    const digest=sha(bytes).slice(7);
    const pathname=`data/pack-${digest}.json`;
    fs.writeFileSync(path.join(site,pathname),bytes);
    entries.push({slug, path:pathname, sha256:'sha256:'+digest,bytes:bytes.length});
  }
  const catalog=Buffer.from(JSON.stringify({format:'konstellation.light-catalog/1.0',entries}));
  fs.writeFileSync(path.join(site,'data','catalog.json'),catalog);
  const commit='a'.repeat(40), index='sha256:'+'b'.repeat(64);
  const source={format:'konstellation.light-technical-source-pin/1.0',repository:'Rejean-McCormick/kristal-public',count:126,commit,index_digest:index,qualification_verified:false,authorization_verified:false,publication_verified:false,pages_deploy:false};
  const build={format:'konstellation.light-web-preview-report/1.0',result:'TECHNICAL_PREVIEW_VALID_NOT_PAGES_AUTHORIZED',collection_count:126,catalog_entries:126,source_commit:commit,collection_index_digest:index,source_mode:'verified_transport_pin',catalog_sha256:sha(catalog),c4:{integrity:'PASS',github_pages_gate:'BLOCK_REAL_COLLECTION'},github_pages_deploy:false,publication_authorization:'NOT_VERIFIED'};
  const browser={format:'konstellation.light-browser-smoke/1.0',status:'PASS',count:126,github_pages_deploy:false,publication_authorization:'NOT_VERIFIED',tested_slugs:['cristal-000','cristal-050','cristal-125'],tests:Array.from({length:6},(_,i)=>({test:'test'+i,result:'PASS'}))};
  for(const [name,v] of [['source.json',source],['build.json',build],['browser.json',browser]])fs.writeFileSync(path.join(root,name),JSON.stringify(v));
  const args={site,sourceReport:path.join(root,'source.json'),buildReport:path.join(root,'build.json'),browserReport:path.join(root,'browser.json'),output:path.join(root,'dossier.json'),checksumOutput:path.join(root,'checksums.txt'),summaryOutput:path.join(root,'summary.md')};
  return {root,args,source,build,browser};
}
function dispose(t,f){t.after(()=>fs.rmSync(f.root,{recursive:true,force:true}));return f;}

test('Candidat complet: empreintes exactes et aucun droit de publier',t=>{
  const f=dispose(t,fixture());const r=buildDossier(f.args);
  assert.equal(r.status,'CANDIDAT_TECHNIQUE_VERIFIE_NON_AUTORISE');
  assert.equal(r.source.kristals,126);
  assert.equal(r.public_exposure_authorized,false);
  assert.equal(r.github_pages_deployed,false);
  assert.equal(r.controls.c4_pages_gate,'BLOCK_REAL_COLLECTION');
  assert.ok(fs.readFileSync(f.args.checksumOutput,'utf8').includes('data/catalog.json'));
});
test('Rejette un pack modifié après construction',t=>{
  const f=dispose(t,fixture());const pack=f.build && JSON.parse(fs.readFileSync(path.join(f.args.site,'data/catalog.json'))).entries[0].path;
  fs.appendFileSync(path.join(f.args.site,pack),'ALTÉRÉ');
  assert.throws(()=>buildDossier(f.args),/Pack absent ou modifié/);
});
test('Rejette un rapport qui prétend que C4 accepte Pages',t=>{
  const f=dispose(t,fixture());f.build.c4.github_pages_gate='ALLOW';fs.writeFileSync(f.args.buildReport,JSON.stringify(f.build));
  assert.throws(()=>buildDossier(f.args),/verrou C4/);
});
test('Rejette les parcours navigateur incomplets',t=>{
  const f=dispose(t,fixture());f.browser.tests[0].result='FAIL';fs.writeFileSync(f.args.browserReport,JSON.stringify(f.browser));
  assert.throws(()=>buildDossier(f.args),/navigateur incomplet/);
});
test('Rejette un lien symbolique dans le site',t=>{
  const f=dispose(t,fixture());try{fs.symlinkSync(path.join(f.root,'source.json'),path.join(f.args.site,'lien.json'));}catch {t.skip('symlink inaccessible sur cette plateforme');return;}
  assert.throws(()=>buildDossier(f.args),/symbolique/);
});
test('Rejette un faux statut d’autorisation dans le rapport source',t=>{
  const f=dispose(t,fixture());f.source.authorization_verified=true;fs.writeFileSync(f.args.sourceReport,JSON.stringify(f.source));
  assert.throws(()=>buildDossier(f.args),/permission présumée/);
});
test('Le workflow ne possède aucune permission de publication Pages',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/konstellation-light-126-candidat-pages.yml',import.meta.url),'utf8');
  assert.match(workflow,/permissions:\s*\n\s+contents:\s+read/);
  assert.doesNotMatch(workflow,/^\s+(pages|id-token):\s*write\s*$/m);
  assert.doesNotMatch(workflow,/^\s+uses:\s+actions\/deploy-pages@/m);
  assert.doesNotMatch(workflow,/^\s+run:.*git push/m);
  assert.match(workflow,/workflow_run:/);
  assert.match(workflow,/workflow_dispatch:/);
});
