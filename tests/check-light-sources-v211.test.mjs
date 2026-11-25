import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fixture } from './helpers/light-fixture.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOOL = path.join(ROOT, 'scripts', 'check-light-sources.mjs');

function workspace(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'light-source-diagnostic-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
function run(...args) {
  return spawnSync(process.execPath, [TOOL, ...args], { cwd: ROOT, encoding: 'utf8', timeout: 15000 });
}

test('diagnostic: help states collection is required and PIN optional', () => {
  const result = run('--help');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /kristals\/index\.json/);
  assert.match(result.stdout, /LIGHT_SOURCE_PIN\.json : facultatif/);
});

test('diagnostic: no collection reports the real missing input, not a missing PIN', t => {
  const dir = workspace(t);
  const result = run('--root', dir);
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stdout, /AUCUNE COLLECTION V10 TROUVÉE/);
  assert.match(result.stdout, /pas LIGHT_SOURCE_PIN\.json/);
  assert.equal(fs.readdirSync(dir).length, 0, 'diagnostic is read-only');
});

test('diagnostic: valid v10 index with no PIN is accepted as a collection', t => {
  const dir = workspace(t);
  fixture(dir);
  const result = run('--collection', dir);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /INDEX : v10 valide/);
  assert.match(result.stdout, /SOURCE PIN : absent — facultatif/);
  assert.match(result.stdout, /README ciblés V2\.1 : 0\/5 présents/);
  assert.equal(fs.existsSync(path.join(dir, 'LIGHT_SOURCE_PIN.json')), false);
});

test('diagnostic: finds nested collection under explicit roots', t => {
  const dir = workspace(t);
  const nested = path.join(dir, 'folder', 'public-collection');
  fixture(nested);
  const result = run('--root', dir);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes(`COLLECTION : ${nested}`));
});

test('diagnostic: corrupt index is rejected', t => {
  const dir = workspace(t);
  fixture(dir);
  fs.writeFileSync(path.join(dir, 'kristals', 'index.json'), '{}');
  const result = run('--collection', dir);
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stdout, /INDEX : INVALIDE/);
});

test('diagnostic: conflicting source pin stops readiness', t => {
  const dir = workspace(t);
  const { kr } = fixture(dir);
  const index = JSON.parse(fs.readFileSync(path.join(dir, 'kristals', 'index.json'), 'utf8'));
  fs.writeFileSync(path.join(dir, 'LIGHT_SOURCE_PIN.json'), JSON.stringify({
    format: 'konstellation.light-source-pin/1.0',
    repository: 'Rejean-McCormick/kristal-public', commit: 'a'.repeat(40),
    index_digest: index.index_digest, qualification_verified: false, publication_verified: false,
  }));
  assert.ok(kr.slug);
  const result = run('--collection', dir);
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stdout, /SOURCE PIN : invalide/);
  assert.match(result.stdout, /BLOCAGE/);
});

test('diagnostic: a missing collection path is not confused with a missing PIN', t => {
  const missing = path.join(workspace(t), 'inexistant');
  const result = run('--collection', missing);
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stdout, /INDEX : ABSENT/);
});
