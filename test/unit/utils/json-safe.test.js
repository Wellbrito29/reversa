import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readJsonSafe } from '../../../lib/utils/json-safe.js';
import { makeTmpProject, cleanup, writeFile } from '../../_helpers.js';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';

test('readJsonSafe: parses plain UTF-8 JSON', (t) => {
  const root = makeTmpProject();
  t.after(() => cleanup(root));
  const path = writeFile(root, 'a.json', '{"k":1}');
  assert.deepEqual(readJsonSafe(path), { k: 1 });
});

test('readJsonSafe: strips a leading BOM before parsing', (t) => {
  const root = makeTmpProject();
  t.after(() => cleanup(root));
  const path = join(root, 'b.json');
  // Write BOM (0xEF 0xBB 0xBF) + content
  writeFileSync(path, Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from('{"k":2}')]));
  assert.deepEqual(readJsonSafe(path), { k: 2 });
});

test('readJsonSafe: throws on malformed JSON', (t) => {
  const root = makeTmpProject();
  t.after(() => cleanup(root));
  const path = writeFile(root, 'c.json', '{not valid');
  assert.throws(() => readJsonSafe(path), /JSON/);
});

test('readJsonSafe: throws when file missing', () => {
  assert.throws(() => readJsonSafe('/nonexistent/aegis-test-missing.json'), /ENOENT/);
});

test('readJsonSafe: handles arrays and nested objects', (t) => {
  const root = makeTmpProject();
  t.after(() => cleanup(root));
  const path = writeFile(root, 'd.json', '[{"a":[1,2]},{"b":{"c":"x"}}]');
  assert.deepEqual(readJsonSafe(path), [{ a: [1, 2] }, { b: { c: 'x' } }]);
});
