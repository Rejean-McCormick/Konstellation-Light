import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {publicRelationLabel,isMachineRelationLabel} from '../light/src/semantic-display.mjs';
import {readableKnowledgeEdges,connectedEntry,graphNeighborhood} from '../light/src/graph-core.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));

test('les clés informatiques et prédicats inconnus ne deviennent jamais des mots anglais plausibles',()=>{
 for(const raw of ['uses_primary_witness','grounded_in_source_witness','P9876543','KP161263147650721173764525','relation.some_key','usesPrimaryWitness']){
   assert.equal(publicRelationLabel(raw,raw),'Lien déclaré',raw);
   assert.equal(publicRelationLabel(raw,''),'Lien déclaré',raw);
 }
 assert(isMachineRelationLabel('grounded_in_source_witness'));
 assert(isMachineRelationLabel('source.document'));
 assert(!isMachineRelationLabel('Fait partie de'));
});

test('les intitulés éditoriaux explicitement présents et les dictionnaires sûrs sont conservés',()=>{
 assert.equal(publicRelationLabel('P50'),'Auteur');
 assert.equal(publicRelationLabel('decrit'),'Décrit');
 assert.equal(publicRelationLabel('something','Fait partie de'),'Fait partie de');
 assert.equal(publicRelationLabel('something','uses_primary_witness'),'Lien déclaré');
 assert.equal(publicRelationLabel('something','unknownRelation'),'Lien déclaré');
 assert.equal(publicRelationLabel('KP999','KP999 (sans libellé)'),'Lien déclaré');
});

test('le lecteur public utilise systématiquement la fonction stricte',()=>{
 const js=read('light/src/app.js');
 assert.match(js,/const readable=publicRelationLabel\(relation/);
 assert.match(js,/isMachineRelationLabel\(localized\)/);
 assert.doesNotMatch(js,/semanticLabel\(relation\)/);
 assert.match(read('light/src/sw.js'),/v20-documented-126/);
});

test('126 packs: toutes les relations publiques donnent un texte non technique',()=>{
 const catalog=json('light/site/data/catalog.json');
 assert.equal(catalog.entries.length,126);
 let predicateCount=0,opaqueCount=0;
 for(const entry of catalog.entries){
  const pack=json(path.posix.join('light/site',entry.path));
  for(const edge of pack.edges){
   predicateCount++;
   const label=publicRelationLabel(edge.relation,pack.relation_labels?.[edge.relation]);
   assert(label && !isMachineRelationLabel(label),`${entry.slug} / ${edge.relation}: ${label}`);
   if(label==='Lien déclaré')opaqueCount++;
  }
 }
 assert(predicateCount>80000);
 assert(opaqueCount>0);
});

test('les 51 graphes opt-in ont un point d’entrée et des liens réellement déclarés',()=>{
 const catalog=json('light/site/data/catalog.json');let summaries=0;
 for(const entry of catalog.entries){
   const pack=json(path.posix.join('light/site',entry.path));
   if(pack.view_kind!=='derived-public-knowledge')continue;
   const eligible=new Set(pack.nodes.filter(n=>!n.technical_identifier).map(n=>n.id));
   const named=new Set(pack.nodes.filter(n=>!n.technical_identifier&&!/^(?:KQ|Q)\d+$/i.test(n.label)).map(n=>n.id));
   const hasNamedEdge=pack.edges.some(e=>named.has(e.from)&&named.has(e.to));
   // All relation screens with no pair of two named notions can be explored.
   if(hasNamedEdge)continue;
   summaries++;
   const display=readableKnowledgeEdges(pack.nodes,pack.edges,'');
   const focus=connectedEntry(pack.nodes,display);
   assert(focus,entry.slug);
   const view=graphNeighborhood(pack.nodes,display,focus,8);
   assert(view.edges.length>0,entry.slug);
   assert(view.edges.every(e=>pack.edges.includes(e)),entry.slug);
 }
 assert(summaries>=45);
});
