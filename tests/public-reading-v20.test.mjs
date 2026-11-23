import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {fixture} from './helpers/light-fixture.mjs';
import {extractPublicMarkdown, projectPublicReading} from '../shared/public-reading.mjs';
import {inspectGithubKristal} from '../shared/kristal-v10.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const markdown=`# Kristal-Anthropology

**Version 0.1.0 — Kristal Standard 6.0**

Kristal-Anthropology représente des **systèmes culturels comparables sans les réduire à des essences**.

## Objets centraux

- **systèmes culturels** — unités de comparaison contextualisées;
- **éléments culturels** — pratiques et institutions;

## Validation

- python tools/validate.py
`;
test('V20: intro fidèle et thèmes documentaires, sans associations canonisées',()=>{
 const d=extractPublicMarkdown(markdown,'README.md','a'.repeat(64));
 assert.match(d.excerpt,/systèmes culturels comparables/);
 assert.equal(d.topics.length,2);
 assert.equal(d.topics[0].title,'systèmes culturels');
 assert.match(d.topics[0].detail,/unités de comparaison/);
 assert(!d.topics.some(t=>t.title==='python tools/validate.py'));
 assert.equal(d.path,'README.md');
 assert(d.topics.every(t=>Number.isInteger(t.line)));
});
test('V20: source HTML et code exclus des résumés',()=>{
 const d=extractPublicMarkdown('# A\n\n<script>alert(1)</script>\n\n```js\nconst evil=1;\n```\n\nUne présentation utilisable qui demeure issue du Markdown.','README.md');
 assert(!JSON.stringify(d).includes('<script>'));
 assert(!JSON.stringify(d).includes('const evil'));
 assert.match(d.excerpt,/présentation utilisable/);
});
test('V20: bundle strict, chemins source et empreintes manifestées',t=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'v20-reading-'));t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
 fixture(folder,'Example',{'README.md':markdown,'docs/02_NATIVE_MODEL.md':'# Modèle natif\n\nLe corpus contient des événements représentés par un modèle comptable documenté.'});
 const checked=inspectGithubKristal({directory:folder,kristal:'example'},root);
 const value=projectPublicReading(checked,folder);
 assert.equal(value.format,'konstellation.light-reading/1.0');
 assert.equal(value.semantic_assertions_created,0);
 assert.equal(value.documents.length,3);
 assert(value.documents.some(x=>x.path==='README.md'&&x.topics.length===2));
 assert(value.documents.some(x=>x.path==='docs/02_NATIVE_MODEL.md'&&x.title==='Modèle natif'));
});
test('V20: export du site embarque les lectures et le CSS, sans mutation du source',t=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'v20-export-'));t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
 const source=path.join(folder,'collection'),out=path.join(folder,'site');
 fixture(source,'Example',{'README.md':markdown});
 const before=fs.readFileSync(path.join(source,'kristals/example/README.md'));
 const r=spawnSync(process.execPath,['scripts/build-light.mjs','--collection',source,'--out',out,'--public','YES','--revision','v20','--repository','https://github.com/example/project','--commit','a'.repeat(40)],{cwd:root,encoding:'utf8',timeout:20000});
 assert.equal(r.status,0,r.stderr);
 const catalog=JSON.parse(fs.readFileSync(path.join(out,'data/catalog.json'))),pack=JSON.parse(fs.readFileSync(path.join(out,catalog.entries[0].path)));
 assert.equal(pack.reading.overview_path,'README.md');
 assert.match(pack.reading.intro,/systèmes culturels comparables/);
 assert.equal(pack.source.commit,'a'.repeat(40));
 assert(fs.existsSync(path.join(out,'visual-v20.css')));
 assert.match(fs.readFileSync(path.join(out,'index.html'),'utf8'),/data-lens="discover"/);
 assert.deepEqual(fs.readFileSync(path.join(source,'kristals/example/README.md')),before);
});
test('V20: modification d’un document public refusée avant construction',t=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'v20-corrupt-'));t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
 const source=path.join(folder,'collection'),out=path.join(folder,'site');fixture(source,'Example',{'README.md':markdown});
 fs.appendFileSync(path.join(source,'kristals/example/README.md'),'modifié');
 const r=spawnSync(process.execPath,['scripts/build-light.mjs','--collection',source,'--out',out,'--public','YES'],{cwd:root,encoding:'utf8',timeout:20000});
 assert.notEqual(r.status,0);
 assert(!fs.existsSync(path.join(out,'data/catalog.json')));
});
test('V20: les URLs de signalement utilisent état courant et non URL périmée',()=>{
 const app=fs.readFileSync(path.join(root,'light/src/app.js'),'utf8');
 assert.match(app,/new URL\(location\.pathname,location\.origin\)/);
 assert.match(app,/here\.searchParams\.set\('k',d\.slug\)/);
 assert.match(app,/here\.searchParams\.set\('focus',n\.id\)/);
});
