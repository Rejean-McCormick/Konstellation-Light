import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fixture } from './helpers/light-fixture.mjs';
import { inspectSite } from '../scripts/c4-publication-gate.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('brand: built reader uses the supplied SVG for identity and favicon',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kl-brand-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const collection=path.join(dir,'collection'),out=path.join(dir,'site');
 fs.mkdirSync(collection); fixture(collection);
 const run=spawnSync(process.execPath,['scripts/build-light.mjs','--collection',collection,'--out',out,'--public','YES'],{cwd:root,encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
 const original=fs.readFileSync(path.join(root,'light/src/assets/logo_k.svg'));
 assert.deepEqual(fs.readFileSync(path.join(out,'assets/logo_k.svg')),original);
 const index=fs.readFileSync(path.join(out,'index.html'),'utf8');
 assert.match(index,/class="brand-logo"/);
 assert.match(index,/rel="icon" type="image\/svg\+xml"/);
 assert.match(index,/#1e6864/);
 const css=fs.readFileSync(path.join(out,'style.css'),'utf8');
 assert.match(css,/--brand:#1e6864/);
 const sw=fs.readFileSync(path.join(out,'sw.js'),'utf8');
 assert.match(sw,/\.\/assets\/logo_k\.svg/);
 const result=inspectSite(out);
 assert.equal(result.integrity,'PASS');
 assert.equal(result.github_pages_gate,'BLOCK_REAL_COLLECTION');
 const altered=Buffer.from(original.toString('utf8').replace('#1e6864','#ff0000'),'utf8');
 fs.writeFileSync(path.join(out,'assets/logo_k.svg'),altered);
 assert.throws(()=>inspectSite(out),/Brand SVG differs/);
});
test('brand: pinned synthetic demo remains eligible only for demo Pages',()=>{
 const p=inspectSite(path.join(root,'light/site'));
 assert.equal(p.github_pages_gate,'ALLOW_DEMO_ONLY');
});
