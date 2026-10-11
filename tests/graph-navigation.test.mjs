import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {clampSatellites,graphNeighborhood,navigationPath} from '../light/src/graph-core.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fixture=path.join(root,'examples','ekole-curation-demo.json');
test('curseur borné entre 3 et 25 et 8 par défaut',()=>{
 assert.equal(clampSatellites(0),3);assert.equal(clampSatellites(100),25);assert.equal(clampSatellites('8'),8);assert.equal(clampSatellites('bad'),8);
});
test('navigation centrée sur les voisins réels, sans ajout artificiel',()=>{
 const ns=[{id:'a',label:'A'},{id:'b',label:'B'},{id:'c',label:'C'},{id:'z',label:'Z'}];
 const es=[{from:'a',to:'b'},{from:'b',to:'c'}];
 const a=graphNeighborhood(ns,es,'a',25);assert.deepEqual(a.nodes.map(n=>n.id),['a','b']);assert.equal(a.degree,1);
 const b=graphNeighborhood(ns,es,'b',3);assert.equal(b.degree,2);assert.deepEqual(new Set(b.nodes.map(n=>n.id)),new Set(['a','b','c']));
 const z=graphNeighborhood(ns,es,'z',8);assert.equal(z.nodes.length,1);
});
test('navigation sans mutation et retour',()=>{
 const p=navigationPath(['a','b'],'c');assert.deepEqual(p,['a','b','c']);assert.deepEqual(navigationPath(p,'c'),p);assert.deepEqual(p,['a','b','c']);
});
function run(t,file){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'light-semantic-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const out=path.join(dir,'new-site');const result=spawnSync(process.execPath,['scripts/build-semantic-preview.mjs','--input',file,'--out',out,'--local','YES'],{cwd:root,encoding:'utf8'});return {result,out,dir};}
test('curation explicite produit site statique vérifiable, jamais un bundle v10',t=>{
 const {result,out}=run(t,fixture);assert.equal(result.status,0,result.stderr);
 const catalog=JSON.parse(fs.readFileSync(path.join(out,'data/catalog.json')));const row=catalog.entries[0];
 const bytes=fs.readFileSync(path.join(out,row.path));
 assert.equal(row.sha256,'sha256:'+createHash('sha256').update(bytes).digest('hex'));
 const pack=JSON.parse(bytes);
 assert.equal(pack.view_kind,'derived-semantic-preview');
 assert.equal(pack.semantic_authority,false);
 assert.equal(pack.revision,'candidate-local');
 assert(pack.nodes.length>=10);assert(pack.edges.length>=10);
 for(const name of ['index.html','app.js','graph-core.mjs','style.css','sw.js'])assert(fs.existsSync(path.join(out,name)));
 const second=spawnSync(process.execPath,['scripts/build-semantic-preview.mjs','--input',fixture,'--out',out,'--local','YES'],{cwd:root,encoding:'utf8'});
 assert.notEqual(second.status,0);assert.match(second.stderr,/Destination déjà présente/);
});

test('curation rejette les relations inventées et empêche la publication publique implicite',t=>{
 const data=JSON.parse(fs.readFileSync(fixture));data.edges.push({from:'organisation',to:'inconnu',relation:'invente'});
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'semantic-bad-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const input=path.join(dir,'bad.json');fs.writeFileSync(input,JSON.stringify(data));
 const r=run(t,input);assert.notEqual(r.result.status,0);assert(!fs.existsSync(r.out));
 const official=path.join(root,'light/site');
 const p=spawnSync(process.execPath,['scripts/build-semantic-preview.mjs','--input',fixture,'--out',official,'--local','YES'],{cwd:root,encoding:'utf8'});
 assert.notEqual(p.status,0);assert.match(p.stderr,/publique Light/);
});

test('adaptateur Kristal v4: extrait des faits et leurs sources, pas les exercices/corrigés',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'light-adapt-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const k=path.join(dir,'encyclopedie-v4.json'),out=path.join(dir,'curation.json');
 fs.writeFileSync(k,JSON.stringify({payload:{format:'kristal.encyclopedie-societes/4.0',slug:'societes-autochtones-quebec',
  themes:[{id:'habitat',titre:'Habitat'}],sources:[{id:'src1',titre:'Source test',ancrage:'Section test'}],
  articles:[{id:'a1',theme:'habitat',question:'Pourquoi?',reponse_courte:'Une réponse située.',epoque:'vers:1500',prerequis:[],liens_semantiques:[],sources:[{id:'src1'}]}],
  entrainements:[{id:'secret',bonne_option:'x',correction:'CORRIGE-SECRET'}]}}));
 const r=spawnSync(process.execPath,['scripts/project-ekole-encyclopedia.mjs','--kristal',k,'--out',out,'--local','YES'],{cwd:root,encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);const data=JSON.parse(fs.readFileSync(out));assert.equal(data.nodes.length,4);assert.equal(data.edges.length,3);
 assert(!fs.readFileSync(out,'utf8').includes('CORRIGE-SECRET'));
 const compiled=run(t,out);assert.equal(compiled.result.status,0,compiled.result.stderr);
});
