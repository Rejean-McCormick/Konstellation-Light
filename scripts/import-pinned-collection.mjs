#!/usr/bin/env node
// Fetch a *public* Kristal GitHub collection at one exact commit. This checks
// transport + v10 byte integrity, NOT qualification, publication or rights.
// No GitHub checkout/release may itself be treated as a publishing permit.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { listGithubKristals, inspectGithubKristal } from '../server/integrations/kristal-v10.mjs';

const COMMIT = /^[a-f0-9]{40}$/;
const DIGEST = /^sha256:[a-f0-9]{64}$/;
const TRUSTED_REPOSITORY = 'Rejean-McCormick/kristal-public';
const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function runGit(args, cwd) {
  const r = spawnSync('git', ['-c', 'protocol.file.allow=always', '-c', 'core.hooksPath=/dev/null', ...args],
    { cwd, encoding:'utf8', timeout:30000, env: { ...process.env, GIT_TERMINAL_PROMPT:'0', GIT_CONFIG_NOSYSTEM:'1' } });
  if (r.error || r.status !== 0) throw Error(`Échec Git (${args[0]}) : ${(r.stderr || r.error?.message || '').slice(0,400)}`);
  return r.stdout.trim();
}
function checkCollectionTree(parent) {
  const main = path.join(parent, 'kristals');
  if (!fs.existsSync(main) || fs.lstatSync(main).isSymbolicLink() || !fs.statSync(main).isDirectory()) throw Error('Collection v10 absente ou symlink.');
  let fileCount = 0, bytesCount = 0;
  function walk(dir) {
    for (const d of fs.readdirSync(dir, {withFileTypes:true})) {
      const p = path.join(dir,d.name);
      if (d.isSymbolicLink()) throw Error('Liens symboliques refusés dans la collection.');
      if (d.isDirectory()) walk(p);
      else if (!d.isFile()) throw Error('Fichier spécial interdit dans la collection.');
      else {
        fileCount += 1; bytesCount += fs.statSync(p).size;
        if (fileCount > 8192 || bytesCount > 256*1024*1024) throw Error('Budget d’import de la collection dépassé.');
      }
    }
  }
  walk(main);
}
export function importPinnedCollection({ repository, commit, output, indexDigest, gitUrl } = {}) {
  if (repository !== TRUSTED_REPOSITORY) throw Error('Dépôt source non approuvé pour C4.');
  if (!COMMIT.test(commit || '')) throw Error('Commit Git SHA-1 complet requis.');
  if (!DIGEST.test(indexDigest || '')) throw Error('Digest exact de l’index de collection requis.');
  if (!output || !path.isAbsolute(output)) throw Error('Dossier de destination absolu requis.');
  const dest = path.resolve(output);
  if (fs.existsSync(dest)) throw Error('Destination déjà présente : import immuable uniquement.');
  const targetUrl = gitUrl || `https://github.com/${repository}.git`;
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'konstellation-import-'));
  if (!fs.existsSync(path.dirname(dest)) || fs.lstatSync(path.dirname(dest)).isSymbolicLink()) throw Error('Parent de sortie absent ou symbolique.');
  const staging = fs.mkdtempSync(path.join(path.dirname(dest), '.konstellation-import-stage-'));
  let committed = false;
  try {
    runGit(['init', '--quiet'],temp);
    runGit(['remote','add','origin',targetUrl],temp);
    runGit(['fetch','--no-tags','--depth','1','origin',commit],temp);
    runGit(['checkout','--force','--detach','FETCH_HEAD'],temp);
    const actual = runGit(['rev-parse','HEAD'],temp);
    if (actual !== commit) throw Error('Le commit effectivement extrait ne correspond pas au commit demandé.');
    checkCollectionTree(temp);
    fs.cpSync(path.join(temp,'kristals'),path.join(staging,'kristals'), {recursive:true,errorOnExist:true,force:false});
    const indexFile = path.join(staging,'kristals/index.json');
    if (fs.statSync(indexFile).size > 8*1024*1024) throw Error('Index de collection trop volumineux.');
    const index = JSON.parse(fs.readFileSync(indexFile,'utf8'));
    if (index.index_digest !== indexDigest) throw Error('Digest de l’index différent de la publication épinglée.');
    const entries = listGithubKristals({directory:staging},base);
    const allowed = new Set(['index.json', ...entries.map(x=>x.id)]);
    for (const name of fs.readdirSync(path.join(staging, 'kristals'))) {
      if (!allowed.has(name)) throw Error(`Chemin de collection non déclaré : kristals/${name}`);
    }
    for (const entry of entries) inspectGithubKristal({directory:staging,kristal:entry.id,maxBytes:128*1024*1024,maxFiles:4096},base);
    // A source-pin is intentionally NOT a qualification/publication receipt.
    fs.writeFileSync(path.join(staging,'LIGHT_SOURCE_PIN.json'),JSON.stringify({
      format:'konstellation.light-source-pin/1.0',repository,commit,index_digest:indexDigest,
      qualification_verified:false,publication_verified:false,
      note:'Transport pin and byte-integrity only; this file grants no publication rights.'
    },null,2)+'\n');
    fs.renameSync(staging,dest);
    committed = true;
    return {repository,commit,index_digest:indexDigest,entries:entries.length,directory:dest};
  } finally {
    fs.rmSync(temp,{recursive:true,force:true});
    if (!committed) fs.rmSync(staging,{recursive:true,force:true});
  }
}
function argsFrom(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i+=2) {
    const name=argv[i];
    if (!name?.startsWith('--') || !argv[i+1]) throw Error(`Argument invalide : ${name}`);
    opts[name.slice(2)]=argv[i+1];
  }
  for (const name of Object.keys(opts)) if (!['repository','commit','expected-index-digest','out'].includes(name)) throw Error(`Option inconnue : ${name}`);
  return opts;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    const opt=argsFrom(process.argv.slice(2));
    const receipt=importPinnedCollection({repository:opt.repository,commit:opt.commit,output:opt.out,indexDigest:opt['expected-index-digest']});
    console.log(JSON.stringify(receipt));
  } catch(error) { console.error(error.message); process.exitCode=1; }
}
