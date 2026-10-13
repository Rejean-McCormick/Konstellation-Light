import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {inspectSite,assertDemoOnly} from '../scripts/c4-publication-gate.mjs';
import {fixture} from './helpers/light-fixture.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const demo=path.join(root,'light/site');
function work(t) {const dir=fs.mkdtempSync(path.join(os.tmpdir(),'light-c4-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;}
function createReal(t) {
 const tmp=work(t), source=path.join(tmp,'collection'), site=path.join(tmp,'site');
 fs.mkdirSync(source);fixture(source);
 const result=spawnSync(process.execPath,['scripts/build-light.mjs','--collection',source,'--out',site,'--public','YES','--revision','real-revision'],{cwd:root,encoding:'utf8',timeout:15000});
 assert.equal(result.status,0,result.stderr);return {tmp,source,site};
}
test('C4 preflight: pins only bundled demonstration, without treating it as qualified',()=>{
 const r=assertDemoOnly(demo);
 assert.equal(r.site_kind,'bundled_synthetic_demo');
 assert.equal(r.integrity,'PASS');
 for(const key of ['publication','authorization','qualification']) assert.equal(r[key],'NOT_VERIFIED');
});
test('C4 preflight: integrity-valid REAL collection remains publication BLOCKED',t=>{
 const {site}=createReal(t);const result=inspectSite(site);
 assert.equal(result.integrity,'PASS');
 assert.equal(result.github_pages_gate,'BLOCK_REAL_COLLECTION');
 assert.throws(()=>assertDemoOnly(site),{code:'C4_PUBLICATION_BLOCKED'});
 const cli=spawnSync(process.execPath,['scripts/c4-publication-gate.mjs','--site',site],{cwd:root,encoding:'utf8'});
 assert.equal(cli.status,3);assert.match(cli.stdout,/BLOCK_REAL_COLLECTION/);
});
test('C4 preflight: detects bytes changed, unlisted files and missing content',t=>{
 const tmp=work(t),site=path.join(tmp,'site');fs.cpSync(demo,site,{recursive:true});
 const row=JSON.parse(fs.readFileSync(path.join(site,'data/catalog.json'))).entries[0];
 fs.appendFileSync(path.join(site,row.path),'tamper');
 assert.throws(()=>inspectSite(site),{code:'BUNDLE_TAMPERED'});
 fs.cpSync(demo,site,{recursive:true,force:true});
 fs.writeFileSync(path.join(site,'private.csv'),'sensitive');
 assert.throws(()=>inspectSite(site),{code:'UNDECLARED_FILE'});
 fs.rmSync(path.join(site,'private.csv'));fs.rmSync(path.join(site,row.path));
 assert.throws(()=>inspectSite(site),{code:'BUNDLE_MISSING'});
});
test('C4 preflight: accidental edits to static site assets block Pages, even when catalog bundles still pass',t=>{
 const tmp=work(t),site=path.join(tmp,'site');fs.cpSync(demo,site,{recursive:true});
 fs.appendFileSync(path.join(site,'app.js'),'\n// accidental unreviewed edit');
 const result=inspectSite(site);
 assert.equal(result.integrity,'PASS');
 assert.equal(result.github_pages_gate,'BLOCK_REAL_COLLECTION');
 assert.throws(()=>assertDemoOnly(site),{code:'C4_PUBLICATION_BLOCKED'});
});
test('C4 preflight: symlinks rejected before publication',t=>{
 const tmp=work(t),site=path.join(tmp,'site');fs.cpSync(demo,site,{recursive:true});
 try{fs.symlinkSync(path.join(site,'index.html'),path.join(site,'side.html'));}
 catch(err){if(['EPERM','EACCES'].includes(err.code)){t.skip('No symlink support');return;}throw err;}
 assert.throws(()=>inspectSite(site),{code:'SYMLINK_DENIED'});
});
test('C4 preflight: workflow enforces Pages demo-only and preview never deploys',()=>{
 const pages=fs.readFileSync(path.join(root,'.github/workflows/konstellation-light-pages.yml'),'utf8');
 const intake=fs.readFileSync(path.join(root,'.github/workflows/konstellation-light-intake.yml'),'utf8');
 assert.match(pages,/Refuse any non-demo content/);
 assert.match(pages,/node scripts\/c4-publication-gate\.mjs --site light\/site/);
 assert.match(pages,/Reject real collection deployment/);
 assert.match(intake,/EXPECTED|Expected|expected/);
 const active=intake.split('\n').filter(x=>!x.trimStart().startsWith('#')).join('\n');
 assert.doesNotMatch(active,/deploy-pages@|pages:\s*write|id-token:\s*write|upload-pages-artifact@/);
});
