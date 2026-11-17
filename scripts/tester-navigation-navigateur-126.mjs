#!/usr/bin/env node
// Real Chromium smoke test of technical navigation; never authorizes publication.
// Requires Playwright installed in the CI job (not a production dependency).
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const dir=path.dirname(fileURLToPath(import.meta.url));
const project=path.resolve(dir,'..');
const options={};
for(let i=2;i<process.argv.length;i+=2){
  const key=process.argv[i],value=process.argv[i+1];
  if(!['--site','--report','--screenshots'].includes(key)||!value||options[key])throw Error('Argument invalide : '+key);
  options[key]=value;
}
if(!options['--site']||!options['--report'])throw Error('Usage: --site DOSSIER --report FICHIER [--screenshots DOSSIER]');
const site=path.resolve(options['--site']);
const reportFile=path.resolve(options['--report']);
const shots=options['--screenshots']?path.resolve(options['--screenshots']):null;
const catalogFile=path.join(site,'data','catalog.json');
if(!fs.existsSync(catalogFile))throw Error('Catalogue HTML absent : '+catalogFile);
const catalog=JSON.parse(fs.readFileSync(catalogFile,'utf8'));
if(catalog.format!=='konstellation.light-catalog/1.0'||catalog.entries.length!==126)throw Error('Catalogue attendu : 126 entrées.');
const slugs=[...new Set(catalog.entries.map(e=>e.slug))];
if(slugs.length!==126)throw Error('Il faut 126 slugs uniques.');
if(slugs.includes('pitheory-prime-bridge'))throw Error('Prime Bridge interdit.');
if(!fs.existsSync(path.dirname(reportFile)))throw Error('Dossier de rapport inexistant.');
if(shots)fs.mkdirSync(shots,{recursive:true});
let browser, server;
const result={format:'konstellation.light-browser-smoke/1.0', status:'FAIL',
  source:'local_http_preview', count:126, tested_slugs:[], tests:[],
  publication_authorization:'NOT_VERIFIED', github_pages_deploy:false};
function ok(label,detail){result.tests.push({test:label,result:'PASS',detail});}
function fail(label,detail){result.tests.push({test:label,result:'FAIL',detail});throw Error(`${label} : ${detail}`);}
async function probe(url){
  for(let n=0;n<90;n++){
    try{const r=await fetch(url,{signal:AbortSignal.timeout(1500)});if(r.ok)return;}catch{}
    await sleep(250);
  }
  throw Error('Serveur local indisponible.');
}
try {
  const {chromium}=await import('playwright');
  const port=20000+Math.floor(Math.random()*20000);
  const url=`http://127.0.0.1:${port}/`;
  server=spawn(process.execPath,[path.join(dir,'serve-light.mjs'),site],{
    cwd:project,env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']
  });
  const stdout=[];
  server.stdout.on('data',b=>stdout.push(b.toString()));
  server.stderr.on('data',b=>stdout.push(b.toString()));
  await probe(url);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({locale:'fr-CA',viewport:{width:1366,height:900}});
  const runtimeErrors=[];
  page.on('pageerror',err=>runtimeErrors.push(err.message));
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  if(response?.status()!==200)fail('HTTP reader','Index HTML non accessible.');
  await page.waitForFunction(()=>document.querySelector('#collection')?.options.length===126 &&
    document.querySelector('#visual')?.querySelector('svg, .registry-list, .empty, .node-grid, .notions-list, .graph-container'),{},{timeout:60000});
  ok('catalogue', '126 choix disponibles et première vue chargée');
  const sample=[slugs[0],slugs[Math.floor(slugs.length/2)],slugs[slugs.length-1]];
  for(const slug of sample){
    await page.locator('#collection').selectOption(slug);
    await page.waitForFunction(s=>new URL(location.href).searchParams.get('k')===s &&
      document.querySelector('#title')?.textContent?.trim(),slug,{timeout:60000});
    if(await page.locator('#visual .error').count())fail('navigation',`Vue en erreur pour ${slug}`);
    result.tested_slugs.push(slug);
  }
  ok('changement de cristaux',sample.join(', '));
  await page.locator('[data-lens="registry"]').click();
  await page.waitForFunction(()=>new URL(location.href).searchParams.get('lens')==='registry');
  ok('vue notions','Changement de vue fonctionnel');
  await page.locator('#search').fill('zzz_impossible_test_126');
  await page.waitForFunction(()=>new URL(location.href).searchParams.get('q')==='zzz_impossible_test_126');
  ok('recherche','Recherche synchronisée avec le lien profond');
  await page.locator('#search').fill('');
  await page.locator('[data-lens="constellation"]').click();
  const lastUrl=page.url();
  await page.reload({waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(s=>new URL(location.href).searchParams.get('k')===s &&
    document.querySelector('#collection')?.options.length===126,sample[2],{timeout:60000});
  if(new URL(lastUrl).searchParams.get('k')!==sample[2])fail('rechargement','Cristal sélectionné non conservé.');
  ok('lien profond','Cristal préservé après rechargement');
  if(runtimeErrors.length)fail('exceptions JavaScript',runtimeErrors.slice(0,8).join('; '));
  ok('exceptions JavaScript','Aucune exception non gérée observée dans les trois parcours');
  if(shots){const screenshot=path.join(shots,'navigation-126.png');await page.screenshot({path:screenshot,fullPage:false});result.screenshot='navigation-126.png';}
  result.status='PASS';
} catch(e){result.error=e.message;process.exitCode=1;
} finally {
  await browser?.close().catch(()=>{});
  if(server && !server.killed){server.kill('SIGTERM');}
  fs.writeFileSync(reportFile,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
}
