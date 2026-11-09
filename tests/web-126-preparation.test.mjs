import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { inspectSite } from '../scripts/c4-publication-gate.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cmd = path.join(root, 'scripts/preparer-site-web-126.mjs');
const fixture = path.join(root, 'examples/integrations/kristal-v10-demo');
const run = (...args) => spawnSync(process.execPath, [cmd, ...args], {encoding:'utf8', timeout:90000});
test('reject absent public index without writing output', () => {
  const t=fs.mkdtempSync(path.join(os.tmpdir(),'light126-negative-'));
  try {
    const out=path.join(t,'site');
    const r=run('--collection',t,'--out',out,'--local-only','YES');
    assert.notEqual(r.status,0);
    assert.equal(fs.existsSync(out),false);
  } finally {fs.rmSync(t,{recursive:true,force:true});}
});
test('C4 does not turn a verified public knowledge site into automatic authorization', () => {
  const site=fs.mkdtempSync(path.join(os.tmpdir(),'light126-site-'));
  try {
    const b = {
      format:'konstellation.light-navigation/1.0', semantic_authority:false,
      slug:'test',revision:'local',surface_digest:'sha256:'+'a'.repeat(64),
      view_kind:'derived-public-knowledge',nodes:[],edges:[]
    };
    const bytes=Buffer.from(JSON.stringify(b));
    const sha=createHash('sha256').update(bytes).digest('hex');
    fs.mkdirSync(path.join(site,'data'));
    fs.writeFileSync(path.join(site,`data/pack-${sha}.json`),bytes);
    const catalog={format:'konstellation.light-catalog/1.0',entries:[{
      slug:'test',revision:'local',path:`data/pack-${sha}.json`,sha256:`sha256:${sha}`,bytes:bytes.length,surface_digest:b.surface_digest
    }]};
    fs.writeFileSync(path.join(site,'data/catalog.json'),JSON.stringify(catalog));
    for(const f of ['index.html','app.js','graph-core.mjs','profile.mjs','style.css','sw.js','.nojekyll'])
      fs.writeFileSync(path.join(site,f),f==='index.html'?'<!doctype html><title>Test</title>':'');
    const outcome=inspectSite(site);
    assert.equal(outcome.integrity,'PASS');
    assert.equal(outcome.github_pages_gate,'BLOCK_REAL_COLLECTION');
    assert.equal(outcome.authorization,'NOT_VERIFIED');
  } finally {fs.rmSync(site,{recursive:true,force:true});}
});
