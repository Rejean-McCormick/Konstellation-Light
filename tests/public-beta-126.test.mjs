import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {stampPublicBeta} from '../scripts/estampiller-beta-publique-126.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'light-beta-126-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const site=path.join(root,'site');fs.mkdirSync(path.join(site,'data'),{recursive:true});
  const commit='a'.repeat(40),index='sha256:'+'b'.repeat(64);
  const entries=[];
  for(let i=0;i<126;i++){
    const slug='kristal-'+String(i).padStart(3,'0');
    const bundle={slug,semantic_authority:false,state_ref:`urn:kristal:${slug}:state`,
      surface_digest:'sha256:'+'c'.repeat(64),source:{repository:'https://github.com/Rejean-McCormick/kristal-public',commit}};
    const bytes=Buffer.from(JSON.stringify(bundle)),digest=hash(bytes),p=`data/pack-${digest}.json`;
    fs.writeFileSync(path.join(site,p),bytes);
    entries.push({slug,path:p,sha256:'sha256:'+digest,bytes:bytes.length,
      state_ref:bundle.state_ref,surface_digest:bundle.surface_digest});
  }
  fs.writeFileSync(path.join(site,'data/catalog.json'),JSON.stringify({format:'konstellation.light-catalog/1.0',entries}));
  fs.writeFileSync(path.join(site,'index.html'),'<html><body><main>Konstellation</main></body></html>');
  const source={format:'konstellation.light-technical-source-pin/1.0',repository:'Rejean-McCormick/kristal-public',
    branch:'main',count:126,commit,index_digest:index,qualification_verified:false,
    authorization_verified:false,publication_verified:false,pages_deploy:false};
  const sourceReport=path.join(root,'source-pin.json');fs.writeFileSync(sourceReport,JSON.stringify(source));
  return {root,site,source,sourceReport,entries};
}
test('estampille une bêta publique sans inventer C1–C4',t=>{
  const f=fixture(t);const r=stampPublicBeta(f);
  assert.equal(r.count,126);assert.equal(r.independent_c1_c2_c3_c4_receipts_verified,false);
  assert.match(fs.readFileSync(path.join(f.site,'index.html'),'utf8'),/Bêta publique.*non qualifiées/);
});
test('refuse de réestampiller et refuse le double affichage',t=>{
  const f=fixture(t);stampPublicBeta(f);assert.throws(()=>stampPublicBeta(f),/déjà estampillé/);
});
test('refuse un commit de pack différent de la source publique',t=>{
  const f=fixture(t);f.source.commit='b'.repeat(40);fs.writeFileSync(f.sourceReport,JSON.stringify(f.source));
  assert.throws(()=>stampPublicBeta(f),/Provenance de pack/);
});
test('refuse les assertions de qualification fabriquées',t=>{
  const f=fixture(t);f.source.authorization_verified=true;fs.writeFileSync(f.sourceReport,JSON.stringify(f.source));
  assert.throws(()=>stampPublicBeta(f),/aucun droit C1/);
});
test('refuse un pack altéré et un 127e Kristal',t=>{
  const f=fixture(t);fs.appendFileSync(path.join(f.site,f.entries[0].path),'x');
  assert.throws(()=>stampPublicBeta(f),/modifié/);
  const g=fixture(t);const cat=path.join(g.site,'data/catalog.json');let c=JSON.parse(fs.readFileSync(cat));c.entries.push({...c.entries[0],slug:'extra'});fs.writeFileSync(cat,JSON.stringify(c));
  assert.throws(()=>stampPublicBeta(g),/126 Kristals/);
});
