import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fixture } from './helpers/light-fixture.mjs';
const repo=path.resolve(import.meta.dirname || new URL('..',import.meta.url).pathname,'..');
const sha = bytes => 'sha256:'+createHash('sha256').update(bytes).digest('hex');
const workspace=t=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'light-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const collection=path.join(dir,'collection');fs.mkdirSync(collection);return {dir,collection,out:path.join(dir,'site')};};
function build(p,extra=[]){return spawnSync(process.execPath,['scripts/build-light.mjs','--collection',p.collection,'--out',p.out,'--public','YES',...extra],{cwd:repo,encoding:'utf8',timeout:15000});}
test('light: refuses build without explicit public intention',t=>{const p=workspace(t);fixture(p.collection);const result=spawnSync(process.execPath,['scripts/build-light.mjs','--collection',p.collection,'--out',p.out],{cwd:repo,encoding:'utf8'});assert.notEqual(result.status,0);assert.match(result.stderr,/--public YES/);});
test('light: build verifies v10 and generates a deterministic static bundle',t=>{
 const p=workspace(t);fixture(p.collection);const one=build(p,['--revision','v1']);assert.equal(one.status,0,one.stderr);
 const c=fs.readFileSync(path.join(p.out,'data/catalog.json'));
 const catalog=JSON.parse(c);assert.equal(catalog.entries.length,1);const e=catalog.entries[0];
 const b=fs.readFileSync(path.join(p.out,e.path));assert.equal(sha(b),e.sha256);const pack=JSON.parse(b);
 assert.equal(pack.semantic_authority,false);assert.equal(pack.metrics.members,1);assert.equal(pack.nodes.length,7);
 assert.equal(pack.edges.length,6);assert.equal(pack.verification.semanticCommitmentVerified,false);
 assert(fs.existsSync(path.join(p.out,'index.html')));
 assert.equal(build(p,['--revision','v1']).status,0);
 assert.deepEqual(fs.readFileSync(path.join(p.out,'data/catalog.json')),c);
});
test('light: refuses tampered source before publishing',t=>{
 const p=workspace(t);const f=fixture(p.collection);fs.writeFileSync(path.join(p.collection,f.dir,'AI_START_HERE.md'),'replaced');
 const res=build(p);assert.notEqual(res.status,0);assert.match(res.stderr,/incorrecte|invalide/i);
 assert(!fs.existsSync(path.join(p.out,'data/catalog.json')));
});
test('light: append retains verified previous revisions and allows comparison',t=>{
 const p=workspace(t);fixture(p.collection);assert.equal(build(p,['--revision','one']).status,0);
 assert.equal(build(p,['--revision','two','--append','YES']).status,0);
 const catalog=JSON.parse(fs.readFileSync(path.join(p.out,'data/catalog.json')));assert.equal(catalog.entries.length,2);
 assert.deepEqual(catalog.entries.map(x=>x.revision),['one','two']);
});
test('light: tampered previous bundle is not silently carried forward',t=>{
 const p=workspace(t);fixture(p.collection);assert.equal(build(p,['--revision','one']).status,0);
 const c=JSON.parse(fs.readFileSync(path.join(p.out,'data/catalog.json')));fs.appendFileSync(path.join(p.out,c.entries[0].path),'evil');
 const out=build(p,['--revision','two','--append','YES']);assert.notEqual(out.status,0);assert.match(out.stderr,/modifié/);
});
test('light: commit links require pinned GitHub URL and full SHA',t=>{
 const p=workspace(t);fixture(p.collection);
 let r=build(p,['--repository','https://example.com/repo','--commit','a'.repeat(40)]);assert.notEqual(r.status,0);
 r=build(p,['--repository','https://github.com/example/project','--commit','abcd']);assert.notEqual(r.status,0);
 r=build(p,['--repository','https://github.com/example/project','--commit','a'.repeat(40)]);assert.equal(r.status,0,r.stderr);
});
