import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {graphCaptionLines,connectedEntryPoints,directNeighborPages,readableMapPositions,mapGeometrySafe} from '../light/src/exploration-v19.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('V19: 3 à 8 cartes: aucune collision, ni étiquette au-delà des limites',()=>{
  for(let n=0;n<=8;n++){
    const p=readableMapPositions(n);
    assert.equal(p.length,n);assert.equal(mapGeometrySafe(p),true,'n='+n);
  }
  assert.throws(()=>readableMapPositions(9),/Budget/);
});
test('V19: les longs noms restent dans une zone de trois lignes, jamais supprimés',()=>{
  const lines=graphCaptionLines('La transformation des matières et leur interaction avec des systèmes complexes',22,3);
  assert.equal(lines.length,3);assert.ok(lines.every(l=>l.length<=22));
  assert.equal(graphCaptionLines('Matière',22,3).join(' '),'Matière');
});
test('V19: pagination stable sans perte ou création de lien',()=>{
  const nodes=[{id:'center',label:'Centre'},...Array.from({length:23},(_,i)=>({id:'n'+i,label:'Notion '+i}))];
  const edges=nodes.slice(1).map(n=>({from:'center',to:n.id,relation:'lien'}));
  const seen=new Set();
  for(let pg=0;pg<4;pg++){
    const x=directNeighborPages(nodes,edges,'center',()=>true,n=>n.label,pg,6);
    assert.equal(x.total,23);assert.equal(x.pages,4);
    assert.ok(x.items.length<=6);
    for(const item of x.items){assert.ok(!seen.has(item.node.id));seen.add(item.node.id);assert.equal(item.relation,'lien');}
  }
  assert.equal(seen.size,23);
});
test('V19: suggestions basées exclusivement sur les connexions fournies',()=>{
  const nodes=[{id:'a',label:'A'},{id:'b',label:'B'},{id:'c',label:'C'},{id:'d',label:'D'}];
  const e=[{from:'a',to:'b',relation:'x'},{from:'b',to:'c',relation:'x'}];
  const picks=connectedEntryPoints(nodes,e,()=>true,n=>n.label,6);
  assert.ok(picks.length<=3);assert.ok(!picks.some(x=>x.node.id==='d'));
});
test('V19: les trois ressources CSS, JS et service worker sont embarquées dans le build',()=>{
  for(const name of ['index.html','app.js','sw.js','visual-v19.css','exploration-v19.mjs'])assert.ok(fs.existsSync(path.join(root,'light/src',name)));
  assert.match(read('light/src/index.html'),/visual-v19\.css/);
  assert.match(read('light/src/sw.js'),/exploration-v19\.mjs/);
  assert.match(read('scripts/build-light.mjs'),/visual-v19\.css/);
  assert.match(read('scripts/build-light.mjs'),/exploration-v19\.mjs/);
  assert.match(read('light/src/app.js'),/graph-visible-caption/);
  assert.doesNotMatch(read('light/src/app.js'),/count<=10 && shown/);
});
test('V19: les 126 packs restent des sources inchangées et tous ont un mode de carte',()=>{
  const catalog=JSON.parse(read('light/site/data/catalog.json'));
  assert.equal(new Set(catalog.entries.map(x=>x.slug)).size,126);
  const kinds={};let edges=0;
  for(const row of catalog.entries){
    const raw=fs.readFileSync(path.join(root,'light/site',row.path));
    assert.equal(raw.length,row.bytes);
    const obj=JSON.parse(raw);
    assert.equal(obj.slug,row.slug);
    assert.ok(Array.isArray(obj.nodes)&&Array.isArray(obj.edges));
    assert.ok(obj.nodes.length>0);
    kinds[obj.view_kind]=(kinds[obj.view_kind]||0)+1;
    edges+=obj.edges.length;
    const dataNodes=new Set(obj.nodes.map(x=>x.id));
    assert.ok(obj.edges.every(x=>dataNodes.has(x.from)&&dataNodes.has(x.to)));
  }
  assert.equal(kinds['derived-public-knowledge'],77);
  assert.equal(kinds['derived-hosting-navigation'],49);
  assert.ok(edges>0);
});
