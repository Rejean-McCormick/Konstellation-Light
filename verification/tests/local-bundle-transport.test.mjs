import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash, webcrypto } from 'node:crypto';

const app = fs.readFileSync(new URL('../light/src/app.js', import.meta.url), 'utf8');
const start = app.indexOf('async function loadPack(entry) {');
const end = app.indexOf('\nfunction fillSelect(', start);
assert.ok(start >= 0 && end > start, 'extractable browser bundle reader');
const shaStart = app.indexOf('async function sha256(bytes) {');
const loaderSource = `${app.slice(shaStart, start)}\n${app.slice(start, end)}\nloadPack;`;
const bytes = Buffer.from(JSON.stringify({
  format:'konstellation.light-navigation/1.0', semantic_authority:false,
  view_kind:'derived-hosting-navigation', slug:'accounting', revision:'test',
  surface_digest:'sha256:surface',
  nodes:[{id:'root',kind:'hosted_state',label:'Accounting'}],edges:[]
}),'utf8');
const sha = createHash('sha256').update(bytes).digest('hex');
const entry = {slug:'accounting',revision:'test',surface_digest:'sha256:surface',
  path:`data/pack-${sha}.json`,sha256:`sha256:${sha}`,bytes:bytes.length};
function reader(fetch) {
  return vm.runInNewContext(loaderSource, {
    fetch, crypto:webcrypto, TextDecoder,
    Uint8Array, setTimeout:(fn)=>{fn(); return 0;},
  });
}
const response = (payload = bytes) => ({ok:true, status:200,
  arrayBuffer: async () => Uint8Array.from(payload).buffer});

test('interruption réseau temporaire : un réessai, puis validation SHA-256', async () => {
  const calls=[];
  const load=reader(async url=>{
    calls.push(url);
    if(calls.length===1) throw new TypeError('Failed to fetch');
    return response();
  });
  const obj=await load(entry);
  assert.equal(obj.slug,'accounting');
  assert.equal(calls.length,2);
  assert.ok(calls[1].includes('?retry=1'));
});

test('intégrité brisée : refus sans masquer le problème ni réessayer',async()=>{
  let calls=0;
  const load=reader(async()=>{calls++;return response(Buffer.concat([bytes,Buffer.from('!')]));});
  await assert.rejects(load(entry),/Taille du bundle incorrecte/);
  assert.equal(calls,1);
});

test('connexion inaccessible : diagnostic lisible plutôt que fausse corruption',async()=>{
  let calls=0;
  const load=reader(async()=>{calls++;throw new TypeError('Failed to fetch');});
  await assert.rejects(load(entry),/Connexion au serveur local interrompue/);
  assert.equal(calls,2);
});
