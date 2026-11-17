import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHead, validatePublicIndex} from '../scripts/resoudre-pin-kristals-126.mjs';

test('exact GitHub main commit is required',()=>{
  const sha='a'.repeat(40);
  assert.equal(parseHead(`${sha}\trefs/heads/main\n`),sha);
  assert.throws(()=>parseHead('abc refs/heads/main'),/Git/);
  assert.throws(()=>parseHead(`${sha}\trefs/heads/main\n${sha}\trefs/heads/dev`),/ambigu/);
});
test('index must be authentic, complete, and v10',()=>{
  assert.throws(()=>validatePublicIndex({format:'bad',count:126,kristals:[]}),/v10/);
  assert.throws(()=>validatePublicIndex({format:'kristal.github-collection-index\/1.0',count:125,kristals:[],index_digest:'sha256:'+'a'.repeat(64)}),/index|Compteur|v10/i);
});
