import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {connectedEntry, graphNeighborhood, secondaryRing, readableKnowledgeEdges} from '../light/src/graph-core.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=n=>fs.readFileSync(path.join(root,'light/src',n),'utf8');

test('focus par défaut : un nœud réellement relié, jamais de lien fabriqué',()=>{
  const nodes=[{id:'title',label:'Titre'},{id:'a',label:'KQ1'},{id:'b',label:'KQ2'},{id:'c',label:'KQ3'}];
  const edges=[{from:'a',to:'b',relation:'P1'},{from:'b',to:'c',relation:'P2'}];
  const before=JSON.stringify({nodes,edges});
  assert.equal(connectedEntry(nodes,edges),'b');
  const graph=graphNeighborhood(nodes,edges,connectedEntry(nodes,edges));
  assert.equal(graph.nodes.length,3);
  assert.equal(graph.degree,2);
  assert.equal(connectedEntry([nodes[0]],[]),null);
  assert.equal(JSON.stringify({nodes,edges}),before);
});

test('satellites de second niveau : seulement de vraies arêtes, budget et unicité',()=>{
  const nodes=Array.from({length:21},(_,i)=>({id:`n${i}`,label:`L${i}`}));
  const edges=[...Array.from({length:8},(_,i)=>({from:'n0',to:`n${i+1}`,relation:'direct'})),
    ...Array.from({length:8},(_,i)=>({from:`n${i+1}`,to:`n${i+9}`,relation:'secondary'})),
    {from:'n1',to:'n20',relation:'secondary'},
    {from:'n0',to:'n0',relation:'self'}];
  const first=graphNeighborhood(nodes,edges,'n0',8).nodes.slice(1);
  const baseline=JSON.stringify(edges);
  const second=secondaryRing(nodes,edges,first,'n0',6);
  assert.equal(second.length,6);
  assert.equal(new Set(second.map(x=>x.node.id)).size,6);
  assert(second.every(x=>!first.some(n=>n.id===x.node.id)));
  assert(second.every(x=>edges.some(e=>(e.from===x.parentId&&e.to===x.node.id)||(e.to===x.parentId&&e.from===x.node.id))));
  assert.equal(secondaryRing(nodes,edges,first,'n0',999).length,8);
  assert.equal(secondaryRing(nodes,edges,first,'n0',0).length,0);
  assert.equal(JSON.stringify(edges),baseline);
});

test('les identifiants externes restent exclus de la carte publique',()=>{
  const nodes=[{id:'x',label:'Notion'},{id:'y',label:'KQ1'},{id:'t',label:'Q100',technical_identifier:true}];
  const edges=[{from:'x',to:'y',relation:'R'},{from:'x',to:'t',relation:'EXTERNAL'}];
  const readable=readableKnowledgeEdges(nodes,edges,'x');
  assert.equal(readable.length,1);
  assert.equal(connectedEntry(nodes,readable),'x');
  assert.deepEqual(secondaryRing(nodes,edges,[nodes[0]],'y',3),[]);
});

test('vue : secondaires visibles par défaut, retour au mode nommé disponible',()=>{
  const js=source('app.js');
  assert.match(js,/showUnnamed:false/);
  assert.match(js,/params\.get\('ids'\)==='1'/);
  assert.match(js,/const unnamedIds=isKnowledge\(\) && !state\.showUnnamed/);
  assert.match(js,/connectedEntry\(data\.nodes, activeEdges\)/);
  assert.match(js,/secondaryRing\(all, displayEdges, shown\.slice\(1\), selected\.id, 6\)/);
  assert.match(js,/graph-node-secondary/);
  assert.match(js,/const displayNode = n =>/);
  assert.match(js,/graph-browse-connected/);
  assert.match(js,/Point de départ : notion existante la plus connectée/);
});

test('marque Konstellation : #1e6864, palette forêt, cache offline renouvelé',()=>{
  const css=source('style.css');
  assert.match(css,/:root\s*\{\s*--brand:#1e6864/);
  assert.match(css,/--forest-bg:#071c19/);
  assert.match(css,/\.rail\s*\{background:var\(--forest-rail\)/);
  assert.match(css,/\.graph-link-secondary/);
  assert.match(source('sw.js'),/konstellation-light-public-v15-reader-media-audit-126/);
});

test('Architecture déjà dans le dépôt : entrée initiale isolée, graphe connexe disponible',()=>{
  const catalogPath=path.join(root,'light/site/data/catalog.json');
  if(!fs.existsSync(catalogPath)) return;
  const catalog=JSON.parse(fs.readFileSync(catalogPath));
  const row=catalog.entries.find(e=>e.slug==='architecture');
  if(!row)return;
  const pack=JSON.parse(fs.readFileSync(path.join(root,'light/site',row.path)));
  const first=pack.nodes[0];
  assert.equal(pack.edges.some(e=>e.from===first.id||e.to===first.id),false);
  const readable=readableKnowledgeEdges(pack.nodes,pack.edges,'');
  const chosen=connectedEntry(pack.nodes,readable);
  assert(chosen);
  const graph=graphNeighborhood(pack.nodes,readable,chosen,8);
  assert(graph.degree>0);
  assert(graph.nodes.length>1);
  assert(secondaryRing(pack.nodes,readable,graph.nodes.slice(1),chosen,6).length>0);
  assert.equal(pack.edges.length,248);
});
