import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {semanticLabel, readableNodeLabel, semanticQueryMatch} from '../light/src/semantic-display.mjs';
import {inspectSite} from '../scripts/c4-publication-gate.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('présentation française de Konstellation, identifiant original conservé',()=>{
  const predicate='P138';
  assert.equal(semanticLabel(predicate),'Nommé d’après');
  assert.equal(predicate,'P138');
  assert.equal(semanticLabel('P9745'),'Propriété Wikidata P9745 (libellé indisponible)');
  assert.equal(semanticLabel('saintete_reconnue'),'Source relative à la sainteté reconnue');
  assert.equal(semanticLabel('P138',{configured:'Lien documentaire déclaré'}),'Lien documentaire déclaré');
  assert.equal(readableNodeLabel('Q789'),'Élément Wikidata Q789 (libellé indisponible)');
});
test('recherche locale par mots, désambiguïsation sans fusion d’identités',()=>{
  const aquin={id:'A',label:'Thomas d’Aquin',kind:'person'};
  const joaquin={id:'B',label:'Joaquín de Fiore',kind:'person'};
  assert.equal(semanticQueryMatch(aquin,'aquin'),true);
  assert.equal(semanticQueryMatch(joaquin,'aquin'),false);
  assert.equal(semanticQueryMatch({id:'C',label:'Nom secondaire',aliases:['Albert le Grand'],kind:'person'},'Albert'),true);
  assert.equal(semanticQueryMatch(aquin,'AQUÍN'),true);
  assert.equal(semanticQueryMatch(aquin,''),true);
  assert.deepEqual([aquin,joaquin].filter(n=>semanticQueryMatch(n,'aquin')).map(n=>n.id),['A']);
});
test('le C4 refuse le nouveau runtime même si le bundle et catalogue sont valides',t=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'light-semantic-c4-'));
  t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
  const demo=path.join(tmp,'demo');fs.cpSync(path.join(root,'light/site'),demo,{recursive:true});
  assert.equal(inspectSite(demo).github_pages_gate,'ALLOW_DEMO_ONLY');
  fs.copyFileSync(path.join(root,'light/src/semantic-display.mjs'),path.join(demo,'semantic-display.mjs'));
  const decision=inspectSite(demo);
  assert.equal(decision.integrity,'PASS');
  assert.equal(decision.github_pages_gate,'BLOCK_REAL_COLLECTION');
});
test('prévisualisation candidate inclut son module; jamais publication ni canon',t=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'light-semantic-build-'));
  t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
  const input=path.join(root,'examples/ekole-curation-demo.json');
  const out=path.join(tmp,'site');
  const result=spawnSync(process.execPath,['scripts/build-semantic-preview.mjs','--input',input,'--out',out,'--local','YES'],{cwd:root,encoding:'utf8',timeout:15000});
  assert.equal(result.status,0,result.stderr);
  assert(fs.existsSync(path.join(out,'semantic-display.mjs')));
  assert.match(fs.readFileSync(path.join(out,'app.js'),'utf8'),/semantic-display\.mjs/);
  const decision=inspectSite(out);
  assert.equal(decision.github_pages_gate,'BLOCK_REAL_COLLECTION');
});
