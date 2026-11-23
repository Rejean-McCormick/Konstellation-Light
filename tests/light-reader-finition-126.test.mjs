import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readerConnectedNamedFocus,readableDocumentTitle,readerKnowledgeSummary,defaultReaderLens,isNamedForReader} from '../light/src/semantic-display.mjs';
import {connectedEntry,readableKnowledgeEdges,graphNeighborhood,secondaryRing} from '../light/src/graph-core.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const json=(p)=>JSON.parse(file(p));

test('l’exploration des relations existantes choisit une notion connectée plutôt qu’un titre isolé',()=>{
  const nodes=[{id:'isolé',label:'Architecture',kind:'notion'},
    {id:'principal',label:'Espace',kind:'notion'},
    {id:'anonyme',label:'KQ12345678901',kind:'notion'},
    {id:'tech',label:'Q7712',kind:'notion',technical_identifier:true}];
  const edges=[{from:'principal',to:'anonyme',relation:'P355'},
    {from:'principal',to:'tech',relation:'P355'}];
  assert.equal(readerConnectedNamedFocus(nodes,edges),'principal');
  assert.equal(readerConnectedNamedFocus(nodes,[],{}),null);
  assert.equal(readerConnectedNamedFocus(nodes,edges,{requireReviewed:true}),null);
  const localized=new Map([['principal',{label:'Space'}]]);
  assert.equal(readerConnectedNamedFocus(nodes,edges,{localized,requireReviewed:true}),'principal');
  assert.equal(graphNeighborhood(nodes,readableKnowledgeEdges(nodes,edges,''),'principal',8).degree,1);
  assert.equal(edges.length,2);
});

test('les documents reçoivent des titres de type, jamais un contenu inventé ou un chemin',()=>{
  const r=(label,kind='hosted_file')=>({label,kind});
  assert.equal(readableDocumentTitle(r('ai/GLOSSARY.md'),{ordinal:3,groupLabel:'Documentation'}),'Glossaire · document n° 3');
  assert.equal(readableDocumentTitle(r('README.md'),{ordinal:1}), 'Présentation du projet · document n° 1');
  assert.equal(readableDocumentTitle(r('.kristal/v9/materializations/opaque.json'),{ordinal:5,groupLabel:'Données et états'}), 'Données et états · document n° 5');
  assert.equal(readableDocumentTitle(r('urn:kristal:document', 'logical_artifact'),{ordinal:5,groupLabel:'Données et états'}), 'Données et états · document n° 5');
});

test('la finition du lecteur garde les liens réels et une liste accessible sur mobile',()=>{
  const js=file('light/src/app.js'),css=file('light/src/style.css'),visualV17=file('light/src/visual-v17.css'),sw=file('light/src/sw.js');
  assert.match(js,/function activateRealConnections/);
  assert.match(js,/readerConnectedNamedFocus/);
  assert.match(js,/function returnToReadableWords/);
  assert.match(js,/sans intitulé/);
  assert.match(js,/non traduite/);
  assert.match(js,/reader-relations-browser/);
  assert.match(js,/directNeighborPages\(all,links,selected.id/);
  assert.match(js,/readableKnowledgeEdges\(all,data.edges/);
  assert.match(js,/showUnnamed=true/);
  assert.match(js,/readableDocumentTitle/);
  assert.match(js,/aria-pressed/);
  assert.match(js,/liens déclarés dans la collection/);
  assert.match(css,/\.reader-relations-browser/);
  assert.match(visualV17,/\.visual \.reader-graph-svg\{display:block!important;/);
  assert.match(css,/#1e6864/);
  assert.match(sw,/v20-documented-126/);
  assert.doesNotMatch(file('light/src/index.html'),/onerror\s*=/);
});

test('126 Kristals : aucune nouvelle relation, les 51 vues sans graphe nommé restent explorables',()=>{
  const cat=json('light/site/data/catalog.json');
  assert.equal(cat.entries.length,126);
  const counts={knowledge:0,documents:0,summary:0,connected:0};
  for(const row of cat.entries){
    const pack=json('light/site/'+row.path), original=JSON.stringify(pack);
    assert.equal(pack.slug,row.slug);
    if(pack.view_kind==='derived-public-knowledge'){
      counts.knowledge++;
      const info=readerKnowledgeSummary(pack.nodes,pack.edges);
      if(readerKnowledgeSummary(pack.nodes,pack.edges).namedEdges<2){
        counts.summary++;
        const edges=readableKnowledgeEdges(pack.nodes,pack.edges,'');
        const focus=readerConnectedNamedFocus(pack.nodes,edges)||connectedEntry(pack.nodes,edges);
        if(info.navigable) {
          assert(focus,`Pas de point d’entrée: ${row.slug}`);
          const view=graphNeighborhood(pack.nodes,edges,focus,8);
          assert(view.degree>0,`Pas de voisin accessible: ${row.slug}`);
          for(const e of view.edges) assert(pack.edges.some(x=>x===e));
          counts.connected++;
        }
      }
    } else if(pack.view_kind==='derived-hosting-navigation')counts.documents++;
    assert.equal(JSON.stringify(pack),original,'Packs intacts');
  }
  assert.equal(counts.knowledge,77);
  assert.equal(counts.documents,49);
  assert.equal(counts.summary,51);
  assert.equal(counts.connected,51);
});

test('Architecture : entrée connectée, libellés neutres, aucune invention',()=>{
 const cat=json('light/site/data/catalog.json');
 const row=cat.entries.find(e=>e.slug==='architecture');
 const pack=json('light/site/'+row.path);
 assert.equal(pack.edges.length,248);
 const edges=readableKnowledgeEdges(pack.nodes,pack.edges,'');
 const focus=readerConnectedNamedFocus(pack.nodes,edges)||connectedEntry(pack.nodes,edges);
 assert(focus);
 const view=graphNeighborhood(pack.nodes,edges,focus,8);
 assert(view.nodes.length>1);
 assert(view.edges.every(e=>pack.edges.includes(e)));
 const secondary=secondaryRing(pack.nodes,edges,view.nodes.slice(1),focus,6);
 assert(secondary.every(s=>pack.edges.some(e=>(e.from===s.parentId&&e.to===s.node.id)||(e.to===s.parentId&&e.from===s.node.id))));
});
