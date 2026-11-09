import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { fixture } from './helpers/light-fixture.mjs';
import {projectPublicKnowledge} from '../shared/public-knowledge.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const hash=x=>createHash('sha256').update(x).digest('hex');
function base(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'light-knowledge-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;}
const home='canon/domain/v11/latest/';
function canonical({brokenSha=false, includeHistorical=true}={}) {
 const dict=JSON.stringify({artifact_type:'kristal_curated_dictionary', entries:[
  {semantic_id:'KQ1',preferred_term:'Abeille'},{semantic_id:'KQ2',preferred_term:'Pollinisation'},
  {semantic_id:'KP1',preferred_term:'participe à'}]});
 const catalog=JSON.stringify({artifact_type:'kristal_dictionary_catalog',languages:[{tag:'fr', layers:[{
  path:'metadata-fr.json',priority:100,sha256:brokenSha?'0'.repeat(64):hash(dict)}]}]});
 const graph=JSON.stringify({artifact_type:'kristal_semantic_graph',entities:['KQ1','KQ2'],properties:['KP1'],sources:['KS1'],assertions:[
  {id:'KA1',subject:'KQ1',predicate:'KP1',object:{kind:'entity',id:'KQ2'},sources:['KS1']},
  {id:'KA2',subject:'KQ2',predicate:'KP1',object:{kind:'literal',value:'Un rôle attesté'},sources:['KS1']}]});
 const history='canon/domain/v11/older/graph.json';
 const artifacts=[...(includeHistorical?[{path:history,logical_contract:{id:'kristal.v11.semantic-graph'}}]:[]),
 {path:home+'graph.json',logical_contract:{id:'kristal.v11.semantic-graph'}},
 {path:home+'dictionaries/catalog.json',logical_contract:{id:'kristal.v11.dictionary-catalog'}}];
 const extra={
  'canon/state.index.json':JSON.stringify({canonical_artifacts:artifacts}),
  [home+'graph.json']:graph,
  [home+'dictionaries/catalog.json']:catalog,
  [home+'dictionaries/metadata-fr.json']:dict,
 };
 if(includeHistorical) extra[history]=JSON.stringify({artifact_type:'kristal_semantic_graph',entities:['OLD'],properties:[],sources:[],assertions:[]});
 return extra;
}
test('public semantic projection takes latest canonical graph, keeps literal, ID and provenance',t=>{
 const dir=base(t);const f=fixture(dir,'Public Test',canonical());
 const out=projectPublicKnowledge({slug:'example',files:f.sync.files},dir);
 assert.equal(out.knowledge.graph_versions_omitted,1);
 assert.equal(out.knowledge.declared_assertions,2);
 assert.equal(out.edges.length,2);
 assert.equal(out.nodes.find(n=>n.id==='KQ1').label,'Abeille');
 assert.equal(out.nodes.find(n=>n.id==='value:KA2').label,'Un rôle attesté');
 assert.equal(out.relation_labels.KP1,'participe à');
 assert.deepEqual(out.edges[0].source_refs,['KS1']);
 assert(!out.nodes.some(n=>n.id==='OLD'));
});
test('verified public collection builds searchable knowledge without faking qualification',t=>{
 const dir=base(t);const collection=path.join(dir,'collection');fs.mkdirSync(collection);
 fixture(collection,'Public Test',canonical());
 const dest=path.join(dir,'site');
 const result=spawnSync(process.execPath,['scripts/build-light.mjs','--collection',collection,'--out',dest,'--public','YES','--revision','local-test'],{cwd:root,encoding:'utf8',timeout:10000});
 assert.equal(result.status,0,result.stderr);
 const catalog=JSON.parse(fs.readFileSync(path.join(dest,'data/catalog.json')));
 const row=catalog.entries[0];const data=JSON.parse(fs.readFileSync(path.join(dest,row.path)));
 assert.equal(data.view_kind,'derived-public-knowledge');
 assert.equal(data.semantic_authority,false);
 assert.equal(data.edges.length,2);
 assert.equal(data.knowledge.referenced_sources,1);
 assert.equal(data.verification.semanticCommitmentVerified,false);
 assert.match(fs.readFileSync(path.join(dest,'app.js'),'utf8'),/derived-public-knowledge/);
});
test('mismatched dictionary digest blocks generation without replacing destination',t=>{
 const dir=base(t);const collection=path.join(dir,'collection');fs.mkdirSync(collection);
 fixture(collection,'Public Test',canonical({brokenSha:true}));
 const dest=path.join(dir,'site');
 const result=spawnSync(process.execPath,['scripts/build-light.mjs','--collection',collection,'--out',dest,'--public','YES'],{cwd:root,encoding:'utf8',timeout:10000});
 assert.notEqual(result.status,0);
 assert.match(result.stderr,/Dictionnaire différent/);
 assert.equal(fs.existsSync(dest),false);
});
test('native state without v11 graph stays hosting-navigation; no inferred concepts',t=>{
 const dir=base(t);const f=fixture(dir);
 assert.equal(projectPublicKnowledge({slug:'example',files:f.sync.files},dir),null);
});

// Regression: Chemistry publicly declares 10,569 assertions, but its
// derived navigation remains within the 12,000 nodes/edges reader budgets.
test('large declared graph projects all assertions when the actual navigation fits',t=>{
 const dir=base(t);const n=10569;
 const files=canonical({includeHistorical:false});
 files[home+'graph.json']=JSON.stringify({artifact_type:'kristal_semantic_graph',
   entities:['KQ1','KQ2'],properties:['KP1'],sources:['KS1'],
   assertions:Array.from({length:n},(_,i)=>({id:`KA${i+1}`,subject:'KQ1',predicate:'KP1',
     object:{kind:'literal',value:`valeur-${i+1}`},sources:['KS1']}))});
 const f=fixture(dir,'Large public graph',files);
 const result=projectPublicKnowledge({slug:'example',files:f.sync.files},dir);
 assert.equal(result.knowledge.declared_assertions,n);
 assert.equal(result.knowledge.displayed_assertions,n);
 assert.equal(result.knowledge.omitted_assertions,0);
 assert.equal(result.edges.length,n);
 assert.equal(result.nodes.length,n+2);
 const site=path.join(dir,'site');
 const build=spawnSync(process.execPath,['scripts/build-light.mjs','--collection',dir,'--out',site,
   '--public','YES','--revision','large-test'],{cwd:root,encoding:'utf8',timeout:60000});
 assert.equal(build.status,0,build.stderr);
 const catalog=JSON.parse(fs.readFileSync(path.join(site,'data/catalog.json')));
 assert(catalog.entries[0].bytes<8*1024*1024);
});
test('navigation limits still reject a projected graph over the 12,000-edge budget',t=>{
 const dir=base(t);const n=12001;
 const files=canonical({includeHistorical:false});
 files[home+'graph.json']=JSON.stringify({artifact_type:'kristal_semantic_graph',
   entities:['KQ1','KQ2'],properties:['KP1'],sources:['KS1'],
   assertions:Array.from({length:n},(_,i)=>({id:`KA${i+1}`,subject:'KQ1',predicate:'KP1',
     object:{kind:'entity',id:'KQ2'},sources:['KS1']}))});
 const f=fixture(dir,'Oversize public graph',files);
 assert.throws(()=>projectPublicKnowledge({slug:'example',files:f.sync.files},dir),
   /Projection v11 trop importante/);
});
