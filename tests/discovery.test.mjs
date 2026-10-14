import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {fixture} from './helpers/light-fixture.mjs';
import {inspectSite} from '../scripts/c4-publication-gate.mjs';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function temp(t) {const dir=fs.mkdtempSync(path.join(os.tmpdir(),'light-discovery-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return {dir,collection:path.join(dir,'collection'),out:path.join(dir,'site')};}
function build(p, args=[]) {return spawnSync(process.execPath,['scripts/build-light.mjs','--collection',p.collection,'--out',p.out,'--public','YES','--revision','local',...args],{cwd:project,encoding:'utf8',timeout:15000});}
function bundle(p) {const cat=JSON.parse(fs.readFileSync(path.join(p.out,'data/catalog.json')));return JSON.parse(fs.readFileSync(path.join(p.out,cat.entries[0].path)));}
const fp='sha256:'+'a'.repeat(64);
function files({state='urn:kristal:state:light-demo',fingerprint=fp}={}) {
  const cls={arketype_version:'1.4.0',primary_archetype:'ARK-08',primary_usage:'PRF-15',usage_slug:'diagnostic-vehicule',usage_family:'diagnosis',domain:'automotive'};
  const discovery={format:'kristal.discovery/1.0',state_ref:state,classification:cls,
    data_layout:{state_architecture:'kristal.state/9.0',native_kind:'causal',organization:'segmented',inventory_ref:'derived/reader-inventory.json',materialization_profiles:[]},
    reader:{profile:'kristal.reader/causal-graph-v1',hints_ref:'derived/reader-profile.json'},
    size:{class:'small',tracked_local_bytes:222,completeness:'partial'},source_fingerprint:fingerprint,
    authority:'noncanonical_derived_metadata_not_access_or_publication_authority'};
  const inv={format:'kristal.reader-inventory/1.0',state_ref:state,source_fingerprint:fingerprint,size_class:'small',measurement:{},storage:{},cardinality:{},files:[],segments:[]};
  const reader={format:'kristal.reader-profile/1.0',state_ref:state,source_fingerprint:fingerprint,
    specialization:'kristal.reader/causal-graph-v1',configuration_status:'advisory_only',access_pattern:'selective',
    materialization_profiles:[],artifact_strategies:[],parser_candidates:[],constraints:[]};
  return {'kristal.discovery.json':JSON.stringify(discovery),
    'derived/reader-inventory.json':JSON.stringify(inv), 'derived/reader-profile.json':JSON.stringify(reader)};
}
test('Discovery absent: optional reading keeps legacy build valid',t=>{
  const p=temp(t);fixture(p.collection);const res=build(p,['--discovery','YES']);assert.equal(res.status,0,res.stderr);
  assert.equal(Object.hasOwn(bundle(p),'discovery'),false);
});
test('Discovery available: opt-in projects only bounded allow-listed metadata',t=>{
  const p=temp(t);fixture(p.collection,'Test',files());
  let res=build(p);assert.equal(res.status,0,res.stderr);assert.equal(Object.hasOwn(bundle(p),'discovery'),false);
  res=build(p,['--discovery','YES']);assert.equal(res.status,0,res.stderr);
  const b=bundle(p),d=b.discovery;
  assert.equal(d.classification.primary_usage,'PRF-15');assert.equal(d.reader_profile,'kristal.reader/causal-graph-v1');
  assert.equal(d.tracked_local_bytes,222);assert.equal(d.authority,'noncanonical_advisory_only');
  assert.equal(d.freshness,'not_independently_verified');
  assert.equal(Object.hasOwn(d,'source_fingerprint'),false);
  assert.equal(Object.hasOwn(d,'artifact_strategies'),false);
  assert.equal(b.semantic_authority,false);
  assert.equal(inspectSite(p.out).github_pages_gate,'BLOCK_REAL_COLLECTION');
});
test('Discovery opt-in rejects incomplete groups and preserves existing build',t=>{
  const p=temp(t);fixture(p.collection,'Test',{'kristal.discovery.json':files()['kristal.discovery.json']});
  let res=build(p);assert.equal(res.status,0,res.stderr);
  const old=fs.readFileSync(path.join(p.out,'data/catalog.json'));
  res=build(p,['--discovery','YES']);assert.notEqual(res.status,0);assert.match(res.stderr,/ensemble incomplet/);
  assert.deepEqual(fs.readFileSync(path.join(p.out,'data/catalog.json')),old);
});
test('Discovery fails closed for conflicting identity, inconsistent fingerprint and invalid authority',t=>{
  for (const [name, edit] of [
    ['state',x=>{x['kristal.discovery.json']=x['kristal.discovery.json'].replace('urn:kristal:state:light-demo','urn:kristal:state:other');}],
    ['fingerprint',x=>{x['derived/reader-profile.json']=x['derived/reader-profile.json'].replace(fp,'sha256:'+'b'.repeat(64));}],
    ['authority',x=>{x['kristal.discovery.json']=x['kristal.discovery.json'].replace('noncanonical_derived_metadata_not_access_or_publication_authority','is_public');}],
  ]){
    const p=temp(t), docs=files();edit(docs);fixture(p.collection,name,docs);
    const res=build(p,['--discovery','YES']);assert.notEqual(res.status,0,`${name}: ${res.stderr}`);
    assert.equal(fs.existsSync(p.out),false);
  }
});
test('Discovery opt-in rejects source modifications even if the original manifest stays unchanged',t=>{
  const p=temp(t), f=fixture(p.collection,'Test',files());
  fs.appendFileSync(path.join(p.collection,f.dir,'kristal.discovery.json'),' ');
  const res=build(p,['--discovery','YES']);assert.notEqual(res.status,0);assert.match(res.stderr,/Taille incorrecte|Empreinte SHA-256/);
});
