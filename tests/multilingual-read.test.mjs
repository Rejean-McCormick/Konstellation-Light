import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {fixture} from './helpers/light-fixture.mjs';
import {validateLocalization} from '../shared/multilingual-read.mjs';
import {inspectSite} from '../scripts/c4-publication-gate.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha='sha256:c3f02fe52bb2a0f53ac9291fe1a7fa2fc722cec195c306664f43882715651409';
const seed={format:'konstellation.multilingual-read/1.0',authority:'derived_non_authoritative',
 slug:'example',state_ref:'urn:kristal:state:light-demo',surface_digest:sha,locale:'fr-CA',
 entries:[{node_id:'test-id',label:'Une notion',definition:'Définition révisée.',
 provenance:{provider:'editorial',review_status:'reviewed',review_ref:'review:1',source_refs:['source:1']}}]};
function workspace(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kl-l10n-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const collection=path.join(dir,'collection'),output=path.join(dir,'site'),langs=path.join(dir,'lang');
 fs.mkdirSync(collection);fixture(collection);return {dir,collection,output,langs};}
function build(p){return spawnSync(process.execPath,['scripts/build-light.mjs','--collection',p.collection,'--out',p.output,'--public','YES','--localizations',p.langs],{cwd:root,encoding:'utf8',timeout:20000});}
test('Contrat multilingue: identité, provenance, statut, langues arbitraires',()=>{
 assert.equal(validateLocalization(seed).entries[0].label,'Une notion');
 assert.equal(validateLocalization({...seed,locale:'zh-Hant'}).locale,'zh-Hant');
 assert.throws(()=>validateLocalization({...seed,entries:[{...seed.entries[0],node_id:'<script>'}]},{slug:seed.slug,state_ref:seed.state_ref,surface_digest:seed.surface_digest,nodes:[{id:'test-id'}]}),/Notion/);
 assert.throws(()=>validateLocalization({...seed,entries:[{...seed.entries[0],provenance:{...seed.entries[0].provenance,review_status:'candidate'}}]}),/Provenance/);
});
test('Compilation opt-in: ressources par langue chargées par empreinte, C4 reste BLOQUÉ',t=>{
 const p=workspace(t),out=path.join(p.langs,'example');fs.mkdirSync(out,{recursive:true});
 // Determine a real node identity from the generated fixture instead of inventing a canon id.
 const first=spawnSync(process.execPath,['scripts/build-light.mjs','--collection',p.collection,'--out',p.output,'--public','YES'],{cwd:root,encoding:'utf8',timeout:20000});
 assert.equal(first.status,0,first.stderr);
 const c=JSON.parse(fs.readFileSync(path.join(p.output,'data/catalog.json')));
 const base=JSON.parse(fs.readFileSync(path.join(p.output,c.entries[0].path)));
 const nodeId=base.nodes[0].id;
 const locale={...seed,entries:[{...seed.entries[0],node_id:nodeId}],relations:[{relation_id:base.edges[0].relation,label:'Lien en français',provenance:{provider:'dik',review_status:'reviewed',review_ref:'review:relation',source_refs:[]}}]};
 fs.writeFileSync(path.join(out,'fr-CA.json'),JSON.stringify(locale));
 const result=build(p);assert.equal(result.status,0,result.stderr);
 const catalog=JSON.parse(fs.readFileSync(path.join(p.output,'data/catalog.json')));
 const d=catalog.entries[0].localizations['fr-CA'];
 assert(d);assert.match(d.path,/^data\/lang-[a-f0-9]{64}\.json$/);
 assert.equal(JSON.parse(fs.readFileSync(path.join(p.output,d.path))).entries[0].node_id,nodeId);
 assert.equal(JSON.parse(fs.readFileSync(path.join(p.output,d.path))).relations[0].label,'Lien en français');
 assert.equal(inspectSite(p.output).github_pages_gate,'BLOCK_REAL_COLLECTION');
 const python=spawnSync('python',['-c',"import sys;sys.path.insert(0,'tools');from light_core import validated_site;import pathlib;print(validated_site(pathlib.Path(sys.argv[1])))",p.output],{cwd:root,encoding:'utf8'});
 assert.equal(python.status,0,python.stderr);
 assert.match(python.stdout,/revisions/);
 // Tamper: C4 must refuse a once-valid sidecar.
 fs.appendFileSync(path.join(p.output,d.path),' ');
 assert.throws(()=>inspectSite(p.output),/Locale digest or size/);
});
test('Candidat ou mauvaise identité : construction refusée sans remplacer le site',t=>{
 const p=workspace(t),out=path.join(p.langs,'example');fs.mkdirSync(out,{recursive:true});
 const baseline=spawnSync(process.execPath,['scripts/build-light.mjs','--collection',p.collection,'--out',p.output,'--public','YES'],{cwd:root,encoding:'utf8'});
 assert.equal(baseline.status,0,baseline.stderr);
 const old=fs.readFileSync(path.join(p.output,'data/catalog.json'));
 const baseCatalog=JSON.parse(old),pack=JSON.parse(fs.readFileSync(path.join(p.output,baseCatalog.entries[0].path)));
 const item={...seed,entries:[{...seed.entries[0],node_id:pack.nodes[0].id,provenance:{...seed.entries[0].provenance,review_status:'candidate'}}]};
 fs.writeFileSync(path.join(out,'fr-CA.json'),JSON.stringify(item));
 assert.notEqual(build(p).status,0);
 assert.deepEqual(fs.readFileSync(path.join(p.output,'data/catalog.json')),old);
 item.entries[0].provenance.review_status='reviewed';item.surface_digest='sha256:'+'1'.repeat(64);
 fs.writeFileSync(path.join(out,'fr-CA.json'),JSON.stringify(item));
 assert.notEqual(build(p).status,0);
 assert.deepEqual(fs.readFileSync(path.join(p.output,'data/catalog.json')),old);
});
