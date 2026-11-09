import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {publicKristalTitle,isUnlabeledKnowledge,publicDescription,publicRelationLabel,publicNodeKind,publicConceptLabel,semanticLabel} from '../light/src/semantic-display.mjs';
import {fixture} from './helpers/light-fixture.mjs';
const root=path.resolve(import.meta.dirname,'..');
const html=fs.readFileSync(path.join(root,'light/src/index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'light/src/app.js'),'utf8');

test('visiteur : les titres évidents sont traduits, sans renommer les originaux dans le bundle',()=>{
  assert.equal(publicKristalTitle('astronomy','Astronomy'),'Astronomie');
  assert.equal(publicKristalTitle('chemistry','Chemistry'),'Chimie');
  assert.equal(publicKristalTitle('k-monetary-system','K-Monetary-System'),'K-Monetary-System');
});
test('visiteur : chemins techniques et notions sans libellé ne parasitent pas la lecture',()=>{
  assert.equal(publicDescription('Notion déclarée dans canon/domain/v11/graph.json.'),'');
  assert.equal(publicDescription('Un objet céleste est une entité astronomique.'),'Un objet céleste est une entité astronomique.');
  assert.equal(isUnlabeledKnowledge({kind:'notion',label:'Q10179543'}),true);
  assert.equal(isUnlabeledKnowledge({kind:'notion',label:'Objet céleste'}),false);
  assert.equal(publicNodeKind('notion'),'Notion');
  assert.equal(publicConceptLabel('Earth'),'Terre');
  assert.equal(publicConceptLabel('Unspecified new concept'),'Unspecified new concept');
  assert.equal(semanticLabel('decrit'),'Décrit');
});
test('visiteur : les codes non interprétés sont cachés, jamais transformés en significations inventées',()=>{
  assert.equal(publicRelationLabel('KP161263147650721173764525','KP161263147650721173764525 (sans libellé)'),'Lien déclaré');
  assert.equal(publicRelationLabel('P50',''),'Auteur');
  assert.equal(publicRelationLabel('P99999999',''),'Lien déclaré');
  assert.equal(publicRelationLabel('relation','Fait partie de'),'Fait partie de');
});
test('visiteur : navigation simple, divulgation C4 accessible et outils avancés fermés par défaut',()=>{
  assert.match(html,/Carte des connaissances/);
  assert.match(html,/Explorer les notions/);
  assert.match(html,/<details id="advanced-tools"/);
  assert.match(html,/<details><summary>Comment ces données sont-elles vérifiées/);
  assert.match(html,/id="compare-tab" hidden/);
  assert.match(html,/id="revision-row" class="revision-row" hidden/);
  assert.match(js,/Détails techniques et références/);
  assert.match(js,/isUnlabeledKnowledge/);
  assert.doesNotMatch(html,/<strong>C4 — LECTURE DÉRIVÉE/);
});
test('build local : site inclut les libellés grand public et préserve toutes les données du bundle',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kl-uservue-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const collection=path.join(dir,'collection'),output=path.join(dir,'site');fs.mkdirSync(collection);
  fixture(collection);
  const b=spawnSync(process.execPath,['scripts/build-light.mjs','--collection',collection,'--out',output,'--public','YES'],{cwd:root,encoding:'utf8',timeout:20000});
  assert.equal(b.status,0,b.stderr);
  assert.match(fs.readFileSync(path.join(output,'index.html'),'utf8'),/Options avancées/);
  assert.match(fs.readFileSync(path.join(output,'app.js'),'utf8'),/Détails techniques et références/);
  const catalog=JSON.parse(fs.readFileSync(path.join(output,'data/catalog.json')));
  const original=JSON.parse(fs.readFileSync(path.join(output,catalog.entries[0].path)));
  assert.equal(original.nodes.length,7);
  assert.equal(original.edges.length,6);
  assert(fs.existsSync(path.join(output,'assets/logo_k.svg')));
});
