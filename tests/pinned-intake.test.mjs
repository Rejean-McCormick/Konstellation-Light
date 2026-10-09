import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fixture } from './helpers/light-fixture.mjs';
import { importPinnedCollection } from '../scripts/import-pinned-collection.mjs';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repo='Rejean-McCormick/kristal-public';
function git(cwd,...args){ const r=spawnSync('git',args,{cwd,encoding:'utf8',timeout:15000});assert.equal(r.status,0,r.stderr);return r.stdout.trim(); }
function newFixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'c4-intake-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const source=path.join(root,'source');fs.mkdirSync(source);
 const f=fixture(source);
 git(source,'init','--quiet');git(source,'-c','user.name=Test','-c','user.email=test@example.invalid','add','.');
 git(source,'-c','user.name=Test','-c','user.email=test@example.invalid','commit','--quiet','-m','Synthetic v10 collection');
 const commit=git(source,'rev-parse','HEAD');
 const indexDigest=JSON.parse(fs.readFileSync(path.join(source,'kristals/index.json'))).index_digest;
 return {root,source,commit,indexDigest,f,out:path.join(root,'result')};
}
const input=p=>({repository:repo,gitUrl:p.source,commit:p.commit,indexDigest:p.indexDigest,output:p.out});
const digestTree=dir=>fs.readdirSync(dir).sort();
test('intake: exact SHA import of synthetic public-like collection, no qualification claim',t=>{
 const p=newFixture(t);const r=importPinnedCollection(input(p));
 assert.equal(r.commit,p.commit);assert.equal(r.entries,1);
 const pin=JSON.parse(fs.readFileSync(path.join(p.out,'LIGHT_SOURCE_PIN.json')));
 assert.equal(pin.qualification_verified,false);assert.equal(pin.publication_verified,false);
 const buildOut=path.join(p.root,'light-site');
 const command=spawnSync(process.execPath,['scripts/build-light.mjs','--collection',p.out,'--out',buildOut,'--public','YES','--revision',p.commit,'--repository',`https://github.com/${repo}`,'--commit',p.commit],{cwd:project,encoding:'utf8',timeout:15000});
 assert.equal(command.status,0,command.stderr);
 const catalog=JSON.parse(fs.readFileSync(path.join(buildOut,'data/catalog.json')));
 assert.equal(catalog.entries[0].revision,p.commit);
 assert.equal(JSON.parse(fs.readFileSync(path.join(buildOut,catalog.entries[0].path))).source.commit,p.commit);
 assert.throws(()=>importPinnedCollection(input(p)),/Destination déjà présente/);
});
test('intake: rejects unexpected repository, SHA, missing index digest',t=>{
 const p=newFixture(t);
 assert.throws(()=>importPinnedCollection({...input(p),repository:'attacker/fork'}),/non approuvé/);
 assert.throws(()=>importPinnedCollection({...input(p),commit:'f'.repeat(12)}),/SHA-1 complet/);
 assert.throws(()=>importPinnedCollection({...input(p),indexDigest:null}),/Digest exact/);
 assert(!fs.existsSync(p.out));
});
test('intake: refuses index pin mismatch without a leftover destination',t=>{
 const p=newFixture(t);
 assert.throws(()=>importPinnedCollection({...input(p),indexDigest:'sha256:'+'0'.repeat(64)}),/Digest de l.index différent/);
 assert(!fs.existsSync(p.out));
});
test('intake: refuses a tampered public-like surface pinned at a new exact SHA',t=>{
 const p=newFixture(t);
 fs.writeFileSync(path.join(p.source,p.f.dir,'AI_START_HERE.md'),'tampered contents');
 git(p.source,'add','.');git(p.source,'-c','user.name=Test','-c','user.email=test@example.invalid','commit','--quiet','-m','Tampered');
 p.commit=git(p.source,'rev-parse','HEAD');
 assert.throws(()=>importPinnedCollection(input(p)),/incorrecte|invalide/i);
 assert(!fs.existsSync(p.out));
});
test('intake: refuses unlisted collection subdirectories and symlinks',t=>{
 const p=newFixture(t);
 fs.mkdirSync(path.join(p.source,'kristals','unlisted'));
 fs.writeFileSync(path.join(p.source,'kristals','unlisted','private.txt'),'Do not export');
 git(p.source,'add','.');git(p.source,'-c','user.name=Test','-c','user.email=test@example.invalid','commit','--quiet','-m','Extra');
 p.commit=git(p.source,'rev-parse','HEAD');
 assert.throws(()=>importPinnedCollection(input(p)),/non déclaré|non annonc|collection/i);
 assert(!fs.existsSync(p.out));
});
test('intake: refuses a committed symbolic link in public-like tree',t=>{
 const p=newFixture(t);
 try { fs.symlinkSync('AI_MANIFEST.json',path.join(p.source,p.f.dir,'extra.link')); }
 catch { t.skip('Symlink unavailable on this host');return; }
 git(p.source,'add','.');git(p.source,'-c','user.name=Test','-c','user.email=test@example.invalid','commit','--quiet','-m','Symlink');
 p.commit=git(p.source,'rev-parse','HEAD');
 assert.throws(()=>importPinnedCollection(input(p)),/symboliques/);
 assert(!fs.existsSync(p.out));
});
test('intake: workflow cannot deploy to Pages, no write token',()=>{
 const workflow=fs.readFileSync(path.join(project,'.github/workflows/konstellation-light-intake.yml'),'utf8');
 assert.match(workflow,/repository_dispatch:/);
 assert.match(workflow,/kristal-qualified-release-v1/);
 const active=workflow.split('\n').filter(x=>!x.trimStart().startsWith('#')).join('\n');
 assert.doesNotMatch(active,/deploy-pages@|pages:\s*write|id-token:\s*write|upload-pages-artifact@/);
 assert.match(workflow,/upload-artifact@v4/);
});

test('intake: main Pages workflow refuses all collection paths pending C3 qualification gate',()=>{
 const yml=fs.readFileSync(path.join(project,'.github/workflows/konstellation-light-pages.yml'),'utf8');
 assert.match(yml,/Reject real collection deployment/);
 assert.match(yml,/if: \$\{\{ inputs.collection_directory != '' \}\}/);
 assert.match(yml,/exit 1/);
});
