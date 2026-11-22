import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {publicReaderLabel,publicReaderDescription,isOpaqueReaderText} from '../light/src/semantic-display.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('les identifiants opaques deviennent des mots neutres sans inventer de connaissance',()=>{
  for(const code of ['KQ488172748482064854211045','Q521','KP1020193551145685229411982','sha256:'+'a'.repeat(64),'urn:kristal:accounting:artifact:canonical-state','canon/domain/v11/semantic-graph.json']){
    assert(isOpaqueReaderText(code),code);
    const out=publicReaderLabel({id:'x',kind:'notion',label:code});
    assert.equal(out,'Notion sans intitulé');
    assert(!out.includes(code));
  }
  assert.equal(publicReaderLabel({id:'x',kind:'notion',label:'connaissance de référence'}),'connaissance de référence');
  assert.equal(publicReaderLabel({id:'x',kind:'notion',label:'KQ999'},{localizedLabel:'Architecture'}),'Architecture');
  assert.equal(publicReaderLabel({id:'x',kind:'notion',label:'architecture'},{requireReviewed:true}),'Notion non traduite');
});
test('les cheminements de fichiers sont présentés par type, jamais par chemin',()=>{
  assert.equal(publicReaderLabel({kind:'hosted_state',label:'Accounting'},{viewKind:'derived-hosting-navigation'}),'Documents de la collection');
  assert.equal(publicReaderLabel({kind:'hosted_file',label:'AGENTS.md'},{viewKind:'derived-hosting-navigation'}),'Consignes aux contributeurs');
  assert.equal(publicReaderLabel({kind:'hosted_file',label:'.kristal/v9/materializations/data.json'},{viewKind:'derived-hosting-navigation',ordinal:8}),'Document de la collection 8');
  assert.equal(publicReaderDescription('Fichier dérivé (materialization_manifest) ; 1324 octets ; sha256:'+'a'.repeat(64)),'');
  assert.equal(publicReaderDescription('Une notion utile pour comprendre la Terre.'),'Une notion utile pour comprendre la Terre.');
});
test('l’interface publique ne fabrique pas les 14 langues et cache les détails techniques',()=>{
  const app=read('light/src/app.js'), html=read('light/src/index.html'),css=read('light/src/style.css');
  assert.match(app,/const displayNode = n =>/);
  assert.match(app,/requireReviewed:Boolean\(state.locale\)/);
  assert.match(app,/Aucune traduction révisée n’est encore publiée/);
  assert(!html.includes('Export technique (JSON)'));
  assert(!html.includes('qualification C1'));
  assert(!app.includes('Sans nom · ${n.id.slice(-10)}'));
  assert(!app.includes('Notion sans nom (${n.label})'));
  assert(!app.includes("'Détails techniques et références'"));
  assert.match(css,/appearance:auto/);
});
test('les 126 packs restent intacts et les aperçus n’affichent aucun code brut',()=>{
  const catalogFile=path.join(root,'light/site/data/catalog.json');
  if(!fs.existsSync(catalogFile))return;
  const catalog=JSON.parse(fs.readFileSync(catalogFile));
  assert.equal(catalog.entries.length,126);
  for(const row of catalog.entries){
    const pack=JSON.parse(fs.readFileSync(path.join(root,'light/site',row.path)));
    for(const [i,n] of pack.nodes.slice(0,25).entries()){
      const label=publicReaderLabel(n,{viewKind:pack.view_kind,ordinal:i+1});
      assert(label.length>0 && !isOpaqueReaderText(label),`${row.slug} ${label}`);
      assert(!/(?:KQ\d{6}|sha256:|urn:kristal:|canon\/)/.test(label),`${row.slug}: ${label}`);
    }
  }
});
