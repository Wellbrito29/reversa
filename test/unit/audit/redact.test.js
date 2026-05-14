import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redactEntry } from '../../../lib/audit/redact.js';

test('redact: returns entry unchanged when policy is null', () => {
  const e = { file: 'src/x.js', diff: 'a' };
  assert.equal(redactEntry(e, null), e);
});

test('redact: returns entry unchanged when policy.redact is empty', () => {
  const e = { file: 'src/x.js', diff: 'a' };
  assert.equal(redactEntry(e, { redact: [] }), e);
});

test('redact: replaces redactable fields with sha256 prefix', () => {
  const e = { file: 'src/x.js', diff: '@@diff body@@', other: 'kept' };
  const out = redactEntry(e, { redact: ['file', 'diff'] });
  assert.match(out.file, /^sha256:[0-9a-f]{16}$/);
  assert.match(out.diff, /^sha256:[0-9a-f]{16}$/);
  assert.equal(out.other, 'kept');
  assert.deepEqual(out.redacted, ['file', 'diff']);
});

test('redact: same input maps to same hash (stable)', () => {
  const a = redactEntry({ file: 'x' }, { redact: ['file'] });
  const b = redactEntry({ file: 'x' }, { redact: ['file'] });
  assert.equal(a.file, b.file);
});

test('redact: different inputs produce different hashes', () => {
  const a = redactEntry({ file: 'x' }, { redact: ['file'] });
  const b = redactEntry({ file: 'y' }, { redact: ['file'] });
  assert.notEqual(a.file, b.file);
});

test('redact: ignores unknown keys (not in REDACTABLE)', () => {
  const e = { file: 'x', custom_field: 'sensitive' };
  const out = redactEntry(e, { redact: ['custom_field'] });
  assert.equal(out.custom_field, 'sensitive');
});

test('redact: skips keys whose value is null/undefined', () => {
  const e = { file: null, diff: undefined, commit_message: 'hi' };
  const out = redactEntry(e, { redact: ['file', 'diff', 'commit_message'] });
  assert.equal(out.file, null);
  assert.equal(out.diff, undefined);
  assert.match(out.commit_message, /^sha256:/);
});

test('redact: covers all REDACTABLE keys', () => {
  const e = {
    diff: 'd',
    commit_message: 'c',
    file: 'f',
    spec_path: 'sp',
    graph_context: 'g',
    rationale: 'r',
  };
  const out = redactEntry(e, {
    redact: ['diff', 'commit_message', 'file', 'spec_path', 'graph_context', 'rationale'],
  });
  for (const k of Object.keys(e)) assert.match(out[k], /^sha256:/);
});

test('redact: does not mutate the input entry', () => {
  const e = { file: 'orig.js' };
  redactEntry(e, { redact: ['file'] });
  assert.equal(e.file, 'orig.js');
});

test('redact: stringifies numeric values before hashing', () => {
  const e = { file: 42 };
  const out = redactEntry(e, { redact: ['file'] });
  assert.match(out.file, /^sha256:/);
});
