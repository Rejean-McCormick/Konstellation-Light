import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {webcrypto} from 'node:crypto';
import {test} from 'node:test';
import {validateCandidateOverlay,loadCandidatePreview} from '../candidate-visual.mjs';
// Node 22 already exposes WebCrypto; browsers do too.
const site=process.env.KONSTELLATION_VISUAL_TEST_SITE||'/mnt/data/work_visual_20261109/site_preview_test';
const readJson = path => JSON.parse(readFileSync(join(site,path),'utf8'));
const catalog=readJson('data/catalog.json');
const manifest=readJson('data/candidates-catalog.json');
const loadBase = r => readJson(r.path);
globalThis.fetch = async url => {
  const path=String(url).replace(/^\.\//,'');
  if (!/^data\/[a-z0-9-]+\.json$/.test(path)) throw Error('invalid test fetch '+path);
  let body;
  try{body=readFileSync(join(site,path));}
  catch{return {ok:false,status:404};}
  return {ok:true, json:async()=>JSON.parse(body.toString('utf-8')),
          arrayBuffer:async()=>body.buffer.slice(body.byteOffset,body.byteOffset+body.byteLength)};
};
test('sidecars anchor to 10 actual graph surfaces, 2354 definitions',async()=>{
  let total=0, priority=0;
  for (const [slug, d] of Object.entries(manifest.entries)) {
    const row=catalog.entries.find(r=>r.slug===slug);
    assert.ok(row);
    const result=await loadCandidatePreview(row,loadBase(row));
    total += d.count;priority += d.priority;
    assert.ok(result.entries.size>0);
    assert.ok(result.entries.size<=d.count);
  }
  assert.equal(total,2354);assert.equal(priority,407);
});
test('candidate refuses wrong graph surface',()=>{
  const slug='aerospace', row=catalog.entries.find(r=>r.slug===slug);
  const d=manifest.entries[slug], doc=readJson(d.path);
  const base=loadBase(row);
  assert.throws(()=>validateCandidateOverlay(doc,{...base,surface_digest:'sha256:'+'0'.repeat(64)},d),/autre graphe/);
});
test('candidate refuses false source or assertion',()=>{
  const slug='aerospace', row=catalog.entries.find(r=>r.slug===slug);
  const d=manifest.entries[slug], doc=readJson(d.path), base=loadBase(row);
  const bad=structuredClone(doc);bad.entries[0].source_refs=['KS000000'];
  assert.throws(()=>validateCandidateOverlay(bad,base,d),/non reliée/);
});
test('candidate refuses promoting status',()=>{
  const slug='aerospace', row=catalog.entries.find(r=>r.slug===slug);
  const d=manifest.entries[slug], doc=readJson(d.path), base=loadBase(row);
  const bad=structuredClone(doc);bad.entries[0].reviewed=true;
  assert.throws(()=>validateCandidateOverlay(bad,base,d),/invalide/);
});
