import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {GUIDED_SCENES, GUIDED_SOURCE, guidedSceneId, projectGuidedReading, textFromMarkdownLine}
  from '../shared/guided-reading.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function fixture(slug){
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'guided-v21-'));
  const dir=path.join(folder,'kristals',slug);fs.mkdirSync(dir,{recursive:true});
  const relevant=GUIDED_SCENES.filter(s=>s.slug===slug);
  const lines=Array.from({length:Math.max(...relevant.map(s=>s.line))+1},()=> '');
  for(const row of relevant){
    lines[row.line-1]=[lines[row.line-1],row.quote].filter(Boolean).join(' ');
    for(const part of row.related||[])
      lines[part.line-1]=[lines[part.line-1],part.text].filter(Boolean).join(' ');
  }
  const bytes=Buffer.from(lines.join('\n'),'utf8');
  fs.writeFileSync(path.join(dir,'README.md'),bytes);
  const checked={slug,files:[{path:'README.md',size:bytes.length,
    sha256:'sha256:'+createHash('sha256').update(bytes).digest('hex')}]};
  return {folder,dir,checked,lines,close:()=>fs.rmSync(folder,{recursive:true,force:true})};
}

test('passages uniques: 16 scènes métier, IDs stables, scènes sans lecture préservées',()=>{
  assert.equal(GUIDED_SCENES.length,16);
  assert.equal(new Set(GUIDED_SCENES.map(x=>x.scene)).size,16);
  assert.deepEqual(GUIDED_SCENES.filter(x=>[1,2,18,20].includes(x.scene)),[]);
  assert.equal(guidedSceneId(7),'lecture-scene-07');
});
test('quotations match verified README SHA256 lines for all five slugs',t=>{
  for(const slug of [...new Set(GUIDED_SCENES.map(x=>x.slug))]){
    const f=fixture(slug);t.after(f.close);
    const result=projectGuidedReading(f.checked,f.folder,{repository:GUIDED_SOURCE.repository,commit:GUIDED_SOURCE.commit});
    const expected=GUIDED_SCENES.filter(x=>x.slug===slug);
    assert.equal(result.passages.length,expected.length);
    assert.equal(result.semantic_assertions_created,0);
    assert.equal(result.source_commit,GUIDED_SOURCE.commit);
    for(const item of result.passages){
      assert.equal(item.sha256,f.checked.files[0].sha256);
      assert.equal(item.source_path,'README.md');
      assert(textFromMarkdownLine(f.lines[item.line-1]).includes(item.text));
      for(const part of item.related||[])
        assert(textFromMarkdownLine(f.lines[part.line-1]).includes(part.text));
    }
  }
});
test('wrong source commitment never shows stale passages',t=>{
  const f=fixture('accounting');t.after(f.close);
  assert.equal(projectGuidedReading(f.checked,f.folder,{repository:GUIDED_SOURCE.repository,commit:'a'.repeat(40)}),null);
  assert.equal(projectGuidedReading(f.checked,f.folder,{}),null);
  assert.equal(projectGuidedReading({slug:'not-relevant',files:[]},f.folder,GUIDED_SOURCE),null);
});
test('tampered README always aborts, never substitutes something else',t=>{
  const f=fixture('biology');t.after(f.close);
  fs.appendFileSync(path.join(f.dir,'README.md'),'sneaky change');
  assert.throws(()=>projectGuidedReading(f.checked,f.folder,GUIDED_SOURCE),/modifié/);
});
test('moved or changed source line aborts construction',t=>{
  const f=fixture('craft');t.after(f.close);
  const rows=f.lines.slice();rows[4]='mauvais contenu';
  const bytes=Buffer.from(rows.join('\n'),'utf8');
  fs.writeFileSync(path.join(f.dir,'README.md'),bytes);
  f.checked.files[0].size=bytes.length;
  f.checked.files[0].sha256='sha256:'+createHash('sha256').update(bytes).digest('hex');
  assert.throws(()=>projectGuidedReading(f.checked,f.folder,GUIDED_SOURCE),/introuvable/);
});
test('only quoted source, separated explanation (non citation)',()=>{
  const french=GUIDED_SCENES.filter(x=>x.explanation);
  assert.equal(french.length,2);
  assert(french.every(x=>x.explanation.includes('non citation')));
});
test('web interface exposes stable selectors, verified provenance, no HTML injection',()=>{
  const app=fs.readFileSync(path.join(root,'light/src/app.js'),'utf8');
  assert.match(app,/quote\.dataset\.readingId=reading\.id/);
  assert.match(app,/element\('blockquote','v21-reading-quote'/);
  assert.match(app,/sourceAnchor\('Voir la ligne d’origine',reading\.source_path,reading\.line\)/);
  assert.match(app,/guides\.length/);
  const build=fs.readFileSync(path.join(root,'scripts/build-light.mjs'),'utf8');
  assert.match(build,/projectGuidedReading/);
  assert.match(build,/visual-v21\\\.css/);
  const index=fs.readFileSync(path.join(root,'light/src/index.html'),'utf8');
  assert.match(index,/visual-v21\.css/);
});
