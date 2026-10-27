import {profileFamily, hasPortrait, portraitFor, orbitPreview, safePortraitUrl} from '../light/src/profile.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {clampSatellites,graphNeighborhood,navigationPath,buildNeighborIndex,previewNeighbors} from '../light/src/graph-core.mjs';
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
 for(const name of ['index.html','app.js','graph-core.mjs','profile.mjs','semantic-display.mjs','style.css','sw.js'])assert(fs.existsSync(path.join(out,name)));
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

test('fiches pour personne et lieu, jamais pour une notion générique',()=>{
 assert.equal(profileFamily('person')[1],'Personne');assert.equal(profileFamily('territoire')[1],'Lieu');
 assert.equal(hasPortrait({kind:'notion'}),false);
 const portrait=portraitFor({kind:'person',label:'Ada',description:'Biographie déclarée',period:'XIXe siècle'});
 assert.equal(portrait.description,'Biographie déclarée');assert.equal(portrait.fields[0].value,'XIXe siècle');
 assert.equal(safePortraitUrl('https://example.org/x.jpg'),null);
 assert.equal(safePortraitUrl('./images/ada.jpg'),'./images/ada.jpg');
});
test('aperçu secondaire borné et sans mutation des voisins',()=>{
 const nodes=Array.from({length:10},(_,i)=>({id:String(i),label:String(i)}));
 const points=orbitPreview(nodes,{x:735,y:25},760,470);
 assert.equal(points.length,6);
 assert(points.every(x=>x.x>=70&&x.x<=690&&x.y>=45&&x.y<=425));
 assert.equal(nodes.length,10);
});

test('prévisualisation autorise personne et lieu avec champs de fiche déclarés',t=>{
 const data=JSON.parse(fs.readFileSync(fixture));
 data.nodes.push({id:'person-test',kind:'person',label:'Personne de démonstration',description:'Exemple fictif, non documentaire.',period:'Période de démonstration',aliases:['P. test']});
 data.nodes.push({id:'place-test',kind:'location',label:'Lieu de démonstration',description:'Lieu fictif.',location:'Zone de démonstration'});
 data.edges.push({from:'organisation',to:'person-test',relation:'modele_personne'});
 data.edges.push({from:'person-test',to:'place-test',relation:'modele_lieu'});
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'light-portrait-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const file=path.join(dir,'portrait-curation.json');fs.writeFileSync(file,JSON.stringify(data));
 const out=path.join(dir,'site');
 const p=spawnSync(process.execPath,['scripts/build-semantic-preview.mjs','--input',file,'--out',out,'--local','YES'],{cwd:root,encoding:'utf8'});
 assert.equal(p.status,0,p.stderr);
 const entry=JSON.parse(fs.readFileSync(path.join(out,'data/catalog.json'))).entries[0];
 const bundle=JSON.parse(fs.readFileSync(path.join(out,entry.path)));
 assert.equal(portraitFor(bundle.nodes.find(n=>n.id==='person-test')).fields[0].value,'Période de démonstration');
 assert.equal(portraitFor(bundle.nodes.find(n=>n.id==='place-test')).typeLabel,'Lieu');
});

test('survol indexé : 6 voisins hors centre, tri stable, arêtes inchangées',()=>{
 const nodes=[{id:'a',label:'A'},{id:'b',label:'B'},...Array.from({length:7},(_,i)=>({id:'s'+i,label:'Satellite '+i}))];
 const edges=[{from:'b',to:'a'},...nodes.slice(2).map(n=>({from:'b',to:n.id}))];
 const original=JSON.stringify(edges);
 const idx=buildNeighborIndex(nodes,edges);
 assert.deepEqual(previewNeighbors(idx,'b',['a'],6).map(n=>n.id),['s0','s1','s2','s3','s4','s5']);
 assert.equal(JSON.stringify(edges),original);
 assert.deepEqual(previewNeighbors(idx,'unknown',[],6),[]);
});
test('images de fiche : seules les ressources raster locales non encodées sont autorisées',()=>{
 for(const x of ['//evil.co/m.png','/images/%2e%2e/.env.png','./images/x.svg','./images/x.jpg?q=1'])assert.equal(safePortraitUrl(x),null);
 assert.equal(safePortraitUrl('./images/photo.png'),'./images/photo.png');
});
test('prévisualisation locale copie les images déclarées et refuse leur falsification',t=>{
 const data=JSON.parse(fs.readFileSync(fixture));
 data.nodes.push({id:'person-local',kind:'person',label:'Personne fictive',description:'Démonstration',portrait:'portraits/person.png'});
 data.edges.push({from:'organisation',to:'person-local',relation:'demonstration'});
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'light-pictures-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 fs.mkdirSync(path.join(dir,'portraits'));
 const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/1sQAAAAASUVORK5CYII=','base64');
 fs.writeFileSync(path.join(dir,'portraits/person.png'),image);
 const input=path.join(dir,'sample.json');fs.writeFileSync(input,JSON.stringify(data));
 const good=run(t,input);assert.equal(good.result.status,0,good.result.stderr);
 const entry=JSON.parse(fs.readFileSync(path.join(good.out,'data/catalog.json'))).entries[0];
 const pack=JSON.parse(fs.readFileSync(path.join(good.out,entry.path)));
 const rel=pack.nodes.find(n=>n.id==='person-local').portrait;
 assert.match(rel,/^\.\/images\/[a-f0-9]{64}\.png$/);
 assert(fs.readFileSync(path.join(good.out,rel)).equals(image));
 data.nodes.at(-1).portrait='portraits/../../secret.png';fs.writeFileSync(input,JSON.stringify(data));
 const bad=run(t,input);assert.notEqual(bad.result.status,0);
});
