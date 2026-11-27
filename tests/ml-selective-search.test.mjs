import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedSearchLocales,selectedDescriptors,searchMatches,loadSearchResources,MAX_SEARCH_LANGUAGES,validateLocalization} from '../light/src/multilingual-read.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fixture} from './helpers/light-fixture.mjs';
import {inspectSite} from '../scripts/c4-publication-gate.mjs';
import {auditMultilingual} from '../scripts/audit-multilingual.mjs';

test('Default UI + English; language tags normalized, duplicate-free and bounded',()=>{
 assert.deepEqual(selectedSearchLocales('fr'),['fr','en']);
 assert.deepEqual(selectedSearchLocales('en'),['en']);
 assert.deepEqual(selectedSearchLocales('de',['fr','EN','de','es','bad tag']),['de','en','fr','es']);
 assert.equal(selectedSearchLocales('fr',Array.from({length:300},(_,i)=>'qaa-x-'+i)).length,MAX_SEARCH_LANGUAGES);
});
test('300 descriptors: no implicit fallback or display-language expansion',()=>{
 const desc=Object.fromEntries(Array.from({length:298},(_,i)=>['qaa-x-'+i,{i}]));
 Object.assign(desc,{fr:{i:298},en:{i:299}});
 assert.equal(Object.keys(desc).length,300);
 assert.deepEqual(selectedDescriptors(selectedSearchLocales('fr'),desc).map(x=>x.tag),['fr','en']);
 assert.deepEqual(selectedDescriptors(selectedSearchLocales('fr',['qaa-x-20']),desc).map(x=>x.tag),['fr','en','qaa-x-20']);
 assert.deepEqual(selectedDescriptors(['fr-CA'],desc),[]);
 assert.throws(()=>selectedDescriptors(['fr'],{fr:{},FR:{}}),/ambiguës/);
});
test('Selective async loader calls only selected descriptors, handles refusal and cancellation',async()=>{
 const desc={fr:{},en:{},de:{},es:{}}, calls=[];
 const result=await loadSearchResources(['fr','en'],desc,async r=>{calls.push(r.tag);if(r.tag==='en')throw Error('tampered');return {entries:[]};});
 assert.deepEqual(calls,['fr','en']);assert.deepEqual(result.resources.map(x=>x.locale),['fr']);assert.equal(result.failures[0].locale,'en');
 const controller=new AbortController();const stopped=await loadSearchResources(['fr','en','de','es'],desc,async r=>{controller.abort();return {entries:[]};},{signal:controller.signal});
 assert(stopped.aborted);assert.deepEqual(stopped.resources,[]);
});
test('Search merges same ID but preserves homonyms; label exact before definition',()=>{
 const rows=[{node_id:'a',locale:'en',label:'Cell'},{node_id:'a',locale:'fr',label:'Cell'},{node_id:'b',locale:'en',label:'Cell'}, {node_id:'c',locale:'fr',label:'Autre',definition:'Cell is a word'}];
 const result=searchMatches('cell',rows);
 assert.deepEqual(result.map(x=>x.node_id),['a','b','c']);
 assert.equal(result[0].matches.length,2);
 assert.equal(result[0].matches[0].locale,'fr');
 assert.equal(searchMatches('cell word',rows).length,1);
 assert.equal(searchMatches('cell autre',[{node_id:'a',locale:'en',label:'cell'},{node_id:'a',locale:'fr',label:'autre'}]).length,0);
 assert.equal(searchMatches('cafe\u0301',[{node_id:'a',locale:'fr',label:'Café'}]).length,1);
});
test('Sidecar contract still refuses candidates and wrong graph/identity',()=>{
 const base={slug:'example',state_ref:'urn:x',surface_digest:'sha256:'+'a'.repeat(64),nodes:[{id:'a'}],edges:[]};
 const row={node_id:'a',label:'Cell',provenance:{provider:'dik',source_refs:[],review_status:'reviewed',review_ref:'test-fixture'}};
 const doc={format:'konstellation.multilingual-read/1.0',authority:'derived_non_authoritative',slug:base.slug,state_ref:base.state_ref,surface_digest:base.surface_digest,locale:'en',entries:[row]};
 assert.equal(validateLocalization(doc,base),doc);
 assert.throws(()=>validateLocalization({...doc,entries:[{...row,node_id:'b'}]},base));
 assert.throws(()=>validateLocalization({...doc,entries:[{...row,provenance:{...row.provenance,review_status:'candidate'}}]},base));
 assert.throws(()=>validateLocalization({...doc,state_ref:'urn:y'},base));
});
test('Real compiler and both preflights accept 300 synthetic language sidecars, C4 remains BLOCKED',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'kl-ml300-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const collection=path.join(root,'collection'),site=path.join(root,'site'),langs=path.join(root,'langs'),dir=path.join(langs,'example');
 fs.mkdirSync(collection);fixture(collection);fs.mkdirSync(dir,{recursive:true});
 const build=(...extra)=>spawnSync(process.execPath,['scripts/build-light.mjs','--collection',collection,'--out',site,'--public','YES',...extra],{encoding:'utf8',timeout:30000});
 const first=build();assert.equal(first.status,0,first.stderr);
 const catalog=JSON.parse(fs.readFileSync(path.join(site,'data/catalog.json'))),entry=catalog.entries[0],base=JSON.parse(fs.readFileSync(path.join(site,entry.path)));
 const tags=['fr','en',...Array.from({length:298},(_,i)=>'qaa-x-'+i)];
 for(const locale of tags){const doc={format:'konstellation.multilingual-read/1.0',authority:'derived_non_authoritative',slug:base.slug,state_ref:base.state_ref,surface_digest:base.surface_digest,locale,entries:[{node_id:base.nodes.find(n=>n.kind==='hosted_file').id,label:'Synthetic fixture '+locale,provenance:{provider:'editorial',source_refs:[],review_status:'reviewed',review_ref:'test-only-not-real-review'}}]};fs.writeFileSync(path.join(dir,locale+'.json'),JSON.stringify(doc));}
 const second=build('--localizations',langs);assert.equal(second.status,0,second.stderr);
 const actual=JSON.parse(fs.readFileSync(path.join(site,'data/catalog.json')));assert.equal(Object.keys(actual.entries[0].localizations).length,300);
 assert.equal(actual.entries[0].sha256,entry.sha256,'language overlay must not alter graph pack');
 assert.equal(inspectSite(site).github_pages_gate,'BLOCK_REAL_COLLECTION');
 const audit=auditMultilingual(site);assert.equal(audit.sidecars,300);assert.equal(audit.localized_revisions,1);assert.equal(audit.language_totals.length,300);
 const py=spawnSync(process.env.PYTHON||'python',['-c','import sys; from pathlib import Path; from tools.light_core import validated_site; print(validated_site(Path(sys.argv[1])))',site],{encoding:'utf8',timeout:30000});assert.equal(py.status,0,py.stderr);
 // Test failure closed on one changed resource.
 fs.appendFileSync(path.join(site,actual.entries[0].localizations.en.path),' ');
 assert.throws(()=>inspectSite(site),/Locale digest or size/);
});
