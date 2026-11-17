#!/usr/bin/env node
// Resolve the already-public main branch solely for read-only technical preview.
// This technical pin is NOT a C1/C2/C3 publication or qualification receipt.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { verifyCollectionIndex } from '../shared/kristal-v10.mjs';

const REPOSITORY = 'Rejean-McCormick/kristal-public';
const BASE = `https://github.com/${REPOSITORY}.git`;
const SHA = /^[a-f0-9]{40}$/;
const DIGEST = /^sha256:[a-f0-9]{64}$/;
const here = path.dirname(fileURLToPath(import.meta.url));

export function parseHead(text) {
  const rows = text.trim().split(/\r?\n/).filter(Boolean);
  if (rows.length !== 1) throw Error('Résolution Git ambiguë pour refs/heads/main.');
  const match = /^([a-f0-9]{40})\s+refs\/heads\/main$/.exec(rows[0]);
  if (!match) throw Error('Réponse Git incompatible avec une référence main épinglable.');
  return match[1];
}

export function validatePublicIndex(index, expectedCount = 126) {
  verifyCollectionIndex(index);
  if (index.count !== expectedCount || index.kristals.length !== expectedCount)
    throw Error(`Le nombre de Kristals a changé : ${index.count} au lieu de ${expectedCount}.`);
  if (index.kristals.some(row => row.slug === 'pitheory-prime-bridge'))
    throw Error('Le Kristal Prime Bridge ne doit pas entrer dans le site 126.');
  if (!DIGEST.test(index.index_digest)) throw Error('Empreinte d’index invalide.');
  return { count: index.count, index_digest: index.index_digest };
}

async function resolve() {
  const git = spawnSync('git', ['ls-remote', '--heads', BASE, 'main'], {
    encoding: 'utf8', timeout: 60000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
  });
  if (git.error || git.status !== 0) throw Error(`git ls-remote : ${(git.stderr || git.error?.message || 'échec').slice(0,300)}`);
  const commit = parseHead(git.stdout);
  const url = `https://raw.githubusercontent.com/${REPOSITORY}/${commit}/kristals/index.json`;
  const response = await fetch(url, { signal: AbortSignal.timeout(60000), headers: { 'Accept': 'application/json' } });
  if (!response.ok) throw Error(`Récupération de l’index à la révision ${commit} : HTTP ${response.status}.`);
  const sizeHeader = Number(response.headers.get('content-length'));
  if (sizeHeader > 8 * 1024 * 1024) throw Error('Index trop volumineux.');
  const body = Buffer.from(await response.arrayBuffer());
  if (body.length > 8 * 1024 * 1024) throw Error('Index trop volumineux.');
  const index = JSON.parse(body.toString('utf8'));
  const {count,index_digest} = validatePublicIndex(index);
  return {
    format: 'konstellation.light-technical-source-pin/1.0',
    repository: REPOSITORY, branch: 'main', commit, count, index_digest,
    index_file_sha256: `sha256:${createHash('sha256').update(body).digest('hex')}`,
    qualification_verified: false, authorization_verified: false,
    publication_verified: false, pages_deploy: false,
    usage: 'READ_ONLY_TECHNICAL_PREVIEW_ONLY'
  };
}

function argMap(argv) {
  const a={};for(let i=0;i<argv.length;i+=2){
    const opt=argv[i],val=argv[i+1];
    if(!['--report','--github-output','--github-summary'].includes(opt)||!val||a[opt])throw Error('Usage: --report FILE [--github-output FILE] [--github-summary FILE]');
    a[opt]=val;
  }
  if(!a['--report']) throw Error('Argument --report obligatoire.');
  return a;
}
function writeFile(target,content,append=false) {
  if(!target)return;
  const resolved=path.resolve(target);
  if(!fs.existsSync(path.dirname(resolved)))throw Error('Dossier de sortie inexistant.');
  if(append)fs.appendFileSync(resolved,content);else fs.writeFileSync(resolved,content);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(here,'resoudre-pin-kristals-126.mjs')) {
  try {
    const args=argMap(process.argv.slice(2));
    const report=await resolve();
    writeFile(args['--report'],JSON.stringify(report,null,2)+'\n');
    writeFile(args['--github-output'],`commit=${report.commit}\nindex_digest=${report.index_digest}\n`,true);
    writeFile(args['--github-summary'],`### Source technique 126 Kristals\n\nCommit : \`${report.commit}\`  \nIndex : \`${report.index_digest}\`  \nUsage : prévisualisation uniquement; qualification et autorisation **NON VÉRIFIÉES**.\n\n`,true);
    console.log(JSON.stringify(report));
  } catch(e) { console.error('Résolution bloquée : '+e.message);process.exitCode=1; }
}
