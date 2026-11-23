import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  defaultReaderLens,readerDocumentMap,readerDocumentGroups,readerKnowledgeSummary,
  readerConnectedNamedFocus,isNamedForReader,readerMediaCategory,isReaderMachineValue,
} from '../light/src/semantic-display.mjs';
import {readableKnowledgeEdges,connectedEntry,graphNeighborhood} from '../light/src/graph-core.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const catalog=read('light/site/data/catalog.json');
const pack=row=>read('light/site/'+row.path);

test('V17: la carte visuelle est le défaut de TOUS les types de surface',()=>{
  assert.equal(defaultReaderLens({view_kind:'derived-public-knowledge',nodes:[],edges:[]}),'constellation');
  assert.equal(defaultReaderLens({view_kind:'derived-hosting-navigation',nodes:[],edges:[]}),'constellation');
  assert.equal(defaultReaderLens({view_kind:'derived-semantic-preview',nodes:[],edges:[]}),'constellation');
});

test('V17: 49 cartes documentaires dérivées, aucune nouvelle relation',()=>{
  let docs=0;
  for(const row of catalog.entries){
    const data=pack(row);if(data.view_kind!=='derived-hosting-navigation')continue;
    docs++;
    const original=JSON.stringify(data);
    const plan=readerDocumentMap(data.nodes,{limit:8});
    const source=readerDocumentGroups(data.nodes);
    assert.equal(plan.selected,null);
    assert(plan.groups.length>=1 && plan.groups.length<=5,row.slug);
    assert.equal(plan.groups.reduce((n,g)=>n+g.nodes.length,0),source.reduce((n,g)=>n+g.nodes.length,0));
    for(const group of plan.groups){
      const selected=readerDocumentMap(data.nodes,{category:group.key,limit:8});
      assert(selected.selected && selected.selected.key===group.key);
      assert(selected.visible.length>0 && selected.visible.length<=8);
      assert.equal(selected.total,group.nodes.length);
      assert(selected.visible.every(node=>data.nodes.includes(node)));
      assert(!selected.visible.some(node=>node.kind==='hosted_state'));
    }
    assert.equal(JSON.stringify(data),original,'Le pack n’est jamais modifié: '+row.slug);
  }
  assert.equal(catalog.entries.length,126);
  assert.equal(docs,49);
});

test('V17: 77 cartes de connaissances, dont 51 nœuds neutres connectés sans relation inventée',()=>{
  let knowledge=0,neutral=0;
  for(const row of catalog.entries){
    const data=pack(row);if(data.view_kind!=='derived-public-knowledge')continue;
    knowledge++;
    const original=JSON.stringify(data);
    const byId=new Map(data.nodes.map(n=>[n.id,n]));
    const eligible=data.nodes.filter(n=>!n.technical_identifier&&!readerMediaCategory(n)&&!isReaderMachineValue(n));
    const visibleEdges=readableKnowledgeEdges(data.nodes,data.edges,'').filter(e=>{
      const a=byId.get(e.from),b=byId.get(e.to);
      return a && b && !readerMediaCategory(a) && !readerMediaCategory(b) && !isReaderMachineValue(a) && !isReaderMachineValue(b);
    });
    const connected=connectedEntry(eligible,visibleEdges);
    const summary=readerKnowledgeSummary(data.nodes,data.edges);
    if(summary.namedEdges<2){
      neutral++;
      const start=readerConnectedNamedFocus(eligible,visibleEdges)||connected;
      assert(start,`${row.slug}: aucune notion reliée`);
      const graph=graphNeighborhood(data.nodes,visibleEdges,start,8);
      assert(graph.degree>0,`${row.slug}: aucune connexion réelle`);
      assert(graph.edges.length>0,`${row.slug}: aucun lien réel`);
      assert(graph.edges.every(e=>data.edges.includes(e)),`${row.slug}: lien inventé`);
    }
    assert(eligible.every(n=>!n.technical_identifier));
    assert.equal(JSON.stringify(data),original,'Le pack n’est jamais modifié: '+row.slug);
  }
  assert.equal(knowledge,77);
  assert.equal(neutral,51);
});

test('V17: le build exporte le thème, C4 garde le blocage des collections réelles',()=>{
  const text=p=>fs.readFileSync(path.join(root,p),'utf8');
  assert.match(text('light/src/index.html'),/href="\.\/visual-v17\.css"/);
  assert.match(text('scripts/build-light.mjs'),/visual-v17\.css/);
  assert.match(text('scripts/c4-publication-gate.mjs'),/visual-v17\.css/);
  assert.match(text('light/src/sw.js'),/v17-visual-126/);
  assert.match(text('light/src/app.js'),/function drawDocumentConstellation/);
  assert.match(text('light/src/app.js'),/data-map-mode':'documents'/);
  assert.match(text('light/src/app.js'),/showUnnamed=namedEdges<2/);
  assert.match(text('light/src/visual-v17.css'),/reader-doc-navigation/);
  assert.match(text('scripts/c4-publication-gate.mjs'),/BLOCK_REAL_COLLECTION/);
});
