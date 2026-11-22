import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  isNamedForReader,readerKnowledgeSummary,defaultReaderLens,readerPreferredFocus,
  readerDocumentCategory,readerDocumentGroups,publicReaderLabel
} from '../light/src/semantic-display.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const read=(p)=>JSON.parse(source(p));

test('des noms réels, pas de codes, URL ni fausses traductions',()=>{
  assert(isNamedForReader({id:'a',kind:'notion',label:'Architecture'}));
  for(const label of ['KQ488172748482064854211045','Q123456','https://example.com/graph','canon/domain/graph.json']){
    assert(!isNamedForReader({id:'u',kind:'notion',label}),label);
  }
  assert(!isNamedForReader({id:'a',kind:'notion',label:'Architecture'},{requireReviewed:true}));
  assert(isNamedForReader({id:'a',kind:'notion',label:'KQ488172748482064854211045'},
    {localizedLabel:'Édifice',requireReviewed:true}));
  assert(!isNamedForReader({id:'a',kind:'notion',label:'Architecture',technical_identifier:true}));
});

test('le résumé regroupe les inconnus, ne fabrique ni identités ni arêtes',()=>{
  const nodes=[
    {id:'a',kind:'notion',label:'Architecture'},
    {id:'b',kind:'notion',label:'Connaissance'},
    {id:'c',kind:'notion',label:'KQ1234567890'},
    {id:'external',kind:'notion',label:'Q101',technical_identifier:true}
  ];
  const edges=[
    {from:'a',to:'b'},{from:'b',to:'c'},
    {from:'a',to:'c'},{from:'a',to:'external'}
  ];
  const before=JSON.stringify({nodes,edges});
  const info=readerKnowledgeSummary(nodes,edges);
  assert.deepEqual(info,{named:2,unnamed:1,declared:4,navigable:3,namedEdges:1});
  assert.equal(defaultReaderLens({view_kind:'derived-public-knowledge',nodes,edges}),'registry');
  assert.equal(defaultReaderLens({view_kind:'derived-public-knowledge',nodes,edges:[...edges,{from:'b',to:'a'}]}),'constellation');
  assert.equal(readerPreferredFocus(nodes,edges),'a');
  assert.equal(JSON.stringify({nodes,edges}),before);
});

test('priorité aux notions lisibles même si un nœud opaque est plus connecté',()=>{
  const nodes=[
    {id:'ghost',kind:'notion',label:'KQ1234567890'},
    {id:'a',kind:'notion',label:'Alpha'},
    {id:'b',kind:'notion',label:'Bêta'},
    {id:'c',kind:'notion',label:'Gamma'},
  ];
  const edges=[{from:'ghost',to:'a'},{from:'ghost',to:'b'},{from:'ghost',to:'c'},
    {from:'a',to:'b'},{from:'a',to:'c'}];
  assert.equal(readerPreferredFocus(nodes,edges),'a');
});

test('collections de documents classées sans déduire leur contenu',()=>{
  const nodes=[
    {id:'s',kind:'hosted_state',label:'Collection'},
    {id:'r',kind:'hosted_file',label:'README.md'},
    {id:'d',kind:'hosted_file',label:'docs/07_HANDBOOK.md'},
    {id:'t',kind:'hosted_file',label:'tests/test_graph.mjs'},
    {id:'m',kind:'hosted_file',label:'.kristal/v9/materializations/a.json'},
    {id:'a',kind:'logical_artifact',label:'urn:kristal:x:artifact'},
    {id:'z',kind:'hosted_file',label:'assets/example.png'}
  ];
  assert.equal(readerDocumentCategory(nodes[1]),'presentation');
  assert.equal(readerDocumentCategory(nodes[2]),'documentation');
  assert.equal(readerDocumentCategory(nodes[3]),'tests');
  assert.equal(readerDocumentCategory(nodes[4]),'data');
  assert.equal(readerDocumentCategory(nodes[5]),'data');
  const groups=readerDocumentGroups(nodes);
  assert.equal(groups.reduce((x,g)=>x+g.nodes.length,0),6);
  assert(groups.every(g=>g.label&&g.key));
  assert(!groups.some(g=>g.nodes.some(n=>n.kind==='hosted_state')));
  assert.equal(defaultReaderLens({view_kind:'derived-hosting-navigation',nodes,edges:[{from:'s',to:'r'}]}),'registry');
  assert.match(publicReaderLabel(nodes[1],{viewKind:'derived-hosting-navigation'}),/Présentation du projet/);
});

test('le lecteur public regroupe les notions anonymes et préfère la liste mobile',()=>{
  const js=source('light/src/app.js'), css=source('light/src/style.css');
  const html=source('light/src/index.html'), sw=source('light/src/sw.js');
  assert.match(js,/showUnnamed:false/);
  assert.match(js,/readerKnowledgeSummary/);
  assert.match(js,/defaultReaderLens/);
  assert.match(js,/function drawDocumentRegistry/);
  assert.match(js,/function drawRegistry/);
  assert.match(js,/reader-unnamed-group/);
  assert.match(js,/reader-mobile-map/);
  assert.match(js,/Explorer les relations existantes/);
  assert.match(css,/@media\(max-width:720px\)/);
  assert.match(css,/\.reader-graph-svg\{display:none!important\}/);
  assert.match(html,/Explorer individuellement les notions sans nom/);
  assert.match(sw,/v15-reader-media-audit-126/);
});

test('les 126 packs réels restent inchangés et sont regroupés de manière déterministe',()=>{
  const catalog=read('light/site/data/catalog.json');
  assert.equal(catalog.entries.length,126);
  const slugs=new Set();let knowledge=0,documents=0;
  for(const row of catalog.entries){
    assert(!slugs.has(row.slug));slugs.add(row.slug);
    const data=read(`light/site/${row.path}`),original=JSON.stringify(data);
    const lens=defaultReaderLens(data);
    assert(['registry','constellation'].includes(lens));
    if(data.view_kind==='derived-public-knowledge'){
      knowledge++;
      const info=readerKnowledgeSummary(data.nodes,data.edges);
      assert.equal(info.named+info.unnamed,data.nodes.filter(n=>!n.technical_identifier).length);
      assert.equal(info.declared,data.edges.length);
      assert(info.namedEdges<=info.navigable);
    }else if(data.view_kind==='derived-hosting-navigation'){
      documents++;
      assert.equal(lens,'registry');
      const grouped=readerDocumentGroups(data.nodes);
      assert.equal(grouped.reduce((n,g)=>n+g.nodes.length,0),data.nodes.filter(n=>['hosted_file','logical_artifact'].includes(n.kind)).length);
    }
    assert.equal(JSON.stringify(data),original);
  }
  assert(knowledge>0&&documents>0);
});
