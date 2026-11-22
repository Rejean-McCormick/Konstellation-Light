import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {isOpaqueReaderText,isReaderMachineConceptLabel,publicReaderDescription,publicReaderLabel,
  isNamedForReader,readerConnectedNamedFocus,defaultReaderLens,readerMediaCategory,isReaderMachineValue} from '../light/src/semantic-display.mjs';
import {readableKnowledgeEdges,graphNeighborhood,connectedEntry} from '../light/src/graph-core.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'));
const catalog=read('light/site/data/catalog.json');
const pack=entry=>read(path.posix.join('light/site',entry.path));
const machinePattern=/(?:\b[a-z][a-z0-9]{1,}(?:_[a-z0-9]{2,})+\b|\b(?:type|datatype|schema|coordinate|property)\s*[:=]\s*(?:string|integer|number|boolean|object|array|null)\b)/i;

test('Les clés ne deviennent pas des titres; les mots français réels restent inchangés',()=>{
  for(const key of ['crop_organism','authority_role','material_control','can_be_component_of','uses_primary_witness']){
    assert(isReaderMachineConceptLabel(key),key);
    const node={id:key,kind:'notion',label:key};
    assert(!isNamedForReader(node),key);
    assert.equal(publicReaderLabel(node),'Notion sans intitulé');
  }
  assert(isOpaqueReaderText('Q12345'));
  assert(!isOpaqueReaderText('Asie centrale'));
  assert.equal(publicReaderLabel({kind:'notion',label:'Asie centrale'}),'Asie centrale');
  assert(isNamedForReader({kind:'notion',label:'connaissance de référence'}));
  assert.equal(publicReaderLabel({kind:'notion',label:'Acquisition des connaissances'}),'Acquisition des connaissances');
});

test('Les 7 descriptions de type brut sont masquées, les vraies descriptions conservées',()=>{
  for(const kind of ['string','integer','boolean','uri','number','dateTime']){
    assert.equal(publicReaderDescription(`Valeur littérale déclarée; type : ${kind}.`),'',kind);
    assert.equal(publicReaderDescription(`Valeur littérale déclarée (fr); type : ${kind}.`),'',kind);
  }
  const prose='Théorie de l’évolution des espèces.';
  assert.equal(publicReaderDescription(prose),prose);
});

test('126 packs intacts: aucune clé serpent ni description de type dans la présentation directe',()=>{
  assert.equal(catalog.entries.length,126);
  let examined=0,technical=0,valueMeta=0;
  for(const entry of catalog.entries){
    const doc=pack(entry);
    for(const node of doc.nodes){
      examined++;
      const label=publicReaderLabel(node,{viewKind:doc.view_kind});
      const description=publicReaderDescription(node.description);
      if(isReaderMachineConceptLabel(node.label))technical++;
      if(/^Valeur littérale déclarée/.test(node.description||''))valueMeta++;
      assert(!machinePattern.test(label),`${entry.slug} label: ${label}`);
      assert(!machinePattern.test(description),`${entry.slug} description: ${description}`);
      if(isReaderMachineConceptLabel(node.label) && doc.view_kind==='derived-public-knowledge')
        assert(!isNamedForReader(node),`${entry.slug} machine node: ${node.label}`);
    }
  }
  assert(technical>1000);
  assert(valueMeta>30000);
  assert(examined>50000);
});

test('Les 51 registres ont des relations réelles et un focus affichable après activation',()=>{
  let checked=0;
  for(const entry of catalog.entries){
    const doc=pack(entry);
    if(doc.view_kind!=='derived-public-knowledge'||defaultReaderLens(doc)!=='registry')continue;
    checked++;
    const edges=readableKnowledgeEdges(doc.nodes,doc.edges,'');
    const eligible=doc.nodes.filter(n=>!n.technical_identifier && !readerMediaCategory(n) && !isReaderMachineValue(n));
    const focus=readerConnectedNamedFocus(eligible,edges)||connectedEntry(eligible,edges);
    assert(focus,`${entry.slug}: aucun focus connecté`);
    const resources=new Set(doc.nodes.filter(n=>readerMediaCategory(n)||isReaderMachineValue(n)).map(n=>n.id));
    const visible=edges.filter(e=>!resources.has(e.from)&&!resources.has(e.to));
    const graph=graphNeighborhood(doc.nodes,visible,focus,8);
    assert(graph.edges.length>0,`${entry.slug}: aucune arête visible après clic`);
  }
  assert.equal(checked,51);
});
