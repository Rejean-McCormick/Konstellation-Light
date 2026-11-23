import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {publicRelationLabel,isReaderPredicateCode,isOpaqueReaderText,readerMediaCategory,readerMediaGroups,isReaderMachineValue,isNamedForReader,publicReaderLabel,readerKnowledgeSummary,defaultReaderLens} from '../light/src/semantic-display.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const src=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Bible : prédicats de machine masqués sans inventer de sens',()=>{
  for(const code of ['uses_primary_witness','grounded_in_source_witness','Wikidata statement property P577','coordinate:ai_pipeline_stage.value','type: string','P12385']){
    assert(isReaderPredicateCode(code),code);
    assert.equal(publicRelationLabel('KP1234567890',code),'Lien déclaré');
  }
  assert.equal(publicRelationLabel('KP1234567890','a pour définition'),'a pour définition');
  assert.equal(publicRelationLabel('P50','P50'),'Auteur');
});

test('Zoologie : fichiers médias = ressources, jamais notions nommées',()=>{
  const cases=[['photo.JPG','images','Image de la collection'],['figure.svg','images','Image de la collection'],['chant.wav','audio','Enregistrement audio de la collection'],['film.mp4','video','Vidéo de la collection'],['annexe.pdf','documents','Document annexe de la collection']];
  for(const [label,category,presentation] of cases){
    const node={id:'x',kind:'valeur',label};
    assert.equal(readerMediaCategory(node),category);
    assert.equal(publicReaderLabel(node),presentation);
    assert.equal(isNamedForReader(node),false);
    assert.equal(isOpaqueReaderText(label),true);
  }
  const ordinary={id:'n',kind:'notion',label:'Tigre'};
  assert.equal(readerMediaCategory(ordinary),null);
  assert.equal(isNamedForReader(ordinary),true);
  assert.equal(readerMediaGroups([ordinary,{kind:'valeur',label:'a.jpg'},{kind:'valeur',label:'b.wav'}]).length,2);
});

test('Intelligence artificielle : type: string n’est ni un concept ni une traduction',()=>{
  const n={id:'m',kind:'valeur',label:'type: string'};
  assert(isReaderMachineValue(n));
  assert.equal(publicReaderLabel(n),'Information technique non présentée');
  assert(!isNamedForReader(n));
  const data=read('light/site/data/catalog.json');
  assert.equal(data.entries.length,126);
});

test('Fichiers des 126 Kristals restent identiques et classification vérifiée sur les vrais packs',()=>{
  const cat=read('light/site/data/catalog.json');
  let totalResources=0,knowledge=0,documentary=0;
  for(const row of cat.entries){
    const pack=read(`light/site/${row.path}`);
    const before=JSON.stringify(pack);
    assert(['registry','constellation'].includes(defaultReaderLens(pack)));
    if(pack.view_kind==='derived-public-knowledge'){
      knowledge++;
      const groups=readerMediaGroups(pack.nodes);
      const count=groups.reduce((n,g)=>n+g.count,0);totalResources+=count;
      const summary=readerKnowledgeSummary(pack.nodes,pack.edges);
      assert(summary.named+summary.unnamed===pack.nodes.filter(n=>!n.technical_identifier).length);
      for(const n of pack.nodes.filter(n=>readerMediaCategory(n)).slice(0,15))assert(!isNamedForReader(n));
    }else if(pack.view_kind==='derived-hosting-navigation')documentary++;
    assert.equal(JSON.stringify(pack),before);
  }
  assert(knowledge>0&&documentary>0);
  assert(totalResources>0,'Les médias réels de Zoologie doivent être détectés');
  const zooRow=cat.entries.find(x=>x.slug==='zoology');
  const zoo=read(`light/site/${zooRow.path}`);
  assert(readerMediaGroups(zoo.nodes).some(g=>g.key==='images'));
  const bibleRow=cat.entries.find(x=>x.slug==='bible');
  const bible=read(`light/site/${bibleRow.path}`);
  const pred=Object.entries(bible.relation_labels).find(([,v])=>v==='uses_primary_witness');
  assert(pred && publicRelationLabel(...pred)==='Lien déclaré');
});

test('Interface : médias regroupés, sélection mobile compacte, lecteur sans codes',()=>{
  const app=src('light/src/app.js'), css=src('light/src/style.css'),visualV17=src('light/src/visual-v17.css'),sw=src('light/src/sw.js');
  assert.match(app,/readerMediaGroups/);
  assert.match(app,/Ressources citées dans la collection/);
  assert.match(app,/isReaderPredicateCode/);
  assert.match(app,/!isReferenceOrMachineValue/);
  assert.match(visualV17,/\.visual \.reader-graph-svg\{display:block!important;/);
  assert.match(visualV17,/\.reader-doc-navigation/);
  assert.match(sw,/v19-readable-126/);
});
