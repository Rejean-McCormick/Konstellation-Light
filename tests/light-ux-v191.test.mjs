import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const get=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('V19.1: les connecteurs SVG ne remplissent plus de polygones noirs',()=>{
  const css=get('light/src/visual-v19.css');
  assert.match(css,/path\.v19-card-link,[\s\S]*?path\.document-cluster-link\{fill:none!important/);
  assert.match(css,/stroke-linecap:round/);
});
test('V19.1: le titre central a un fond sombre et un texte clair',()=>{
  const css=get('light/src/visual-v19.css');
  assert.match(css,/\.v19-center-title\{fill:#103f37!important/);
  assert.match(css,/\.v19-title-text\{fill:#f4fff9!important/);
  // WCAG ratio for actual nominal CSS colors (Chromium re-measures in V19.1).
  const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  const l=hex=>rgb(hex).map(v=>{let c=v/255;return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
  const a=l('#103f37'),b=l('#f4fff9');
  assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5);
});
test('V19.1: la carte tactile mobile est produite pour les liens et catégories',()=>{
  const app=get('light/src/app.js');
  const css=get('light/src/visual-v19.css');
  assert.match(app,/function drawMobileConnectionMap\(/);
  assert.match(app,/drawMobileConnectionMap\(target,centerLabel,items,\{documentary\}\)/);
  assert.match(app,/button\.addEventListener\('click',item\.open\)/);
  assert.match(app,/v191-mobile-hub/);
  assert.match(css,/@media\(max-width:920px\)/);
  assert.match(css,/\.v191-mobile-diagram\{display:block/);
  assert.match(css,/\.v191-mobile-branch:focus-visible/);
});
test('V19.1: audit mesure des styles calculés, pas seulement la présence du DOM',()=>{
  const audit=get('../kit/capturer-light-mots.mjs');
  assert.match(audit,/getComputedStyle\(x\)\.fill/);
  assert.match(audit,/center_contrast/);
  assert.match(audit,/mobile_diagram_visible/);
  assert.match(audit,/bad_link_fills/);
});
test('V19.1: bundles publiables inchangés et deux catégories distinctes',()=>{
  const catalog=JSON.parse(get('light/site/data/catalog.json'));
  assert.equal(new Set(catalog.entries.map(x=>x.slug)).size,126);
  const counts={};
  for(const row of catalog.entries){
    const b=fs.readFileSync(path.join(root,'light/site',row.path));
    const json=JSON.parse(b);
    counts[json.view_kind]=(counts[json.view_kind]||0)+1;
    assert.ok(json.edges.every(e=>json.nodes.some(n=>n.id===e.from)&&json.nodes.some(n=>n.id===e.to)));
  }
  assert.equal(counts['derived-public-knowledge'],77);
  assert.equal(counts['derived-hosting-navigation'],49);
});
