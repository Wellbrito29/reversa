import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSignatureReason } from '../../../lib/policy/reason-builder.js';

test('reason-builder: signature change populates headline + details', () => {
  const r = buildSignatureReason({
    file: 'src/api.js',
    contract: 'createUser',
    spec: 'aegis/specs/sdd/user.md',
    change: {
      reasons: ['signature'],
      before: { name: 'createUser', signature: '(name)', exported: true },
      after: { name: 'createUser', signature: '(name, role)', exported: true },
    },
  });
  assert.match(r.reason, /Signature change to protected `createUser`/);
  assert.match(r.reason, /\(name\) → \(name, role\)/);
  assert.equal(r.details.file, 'src/api.js');
  assert.equal(r.details.contract, 'createUser');
  assert.equal(r.details.spec, 'aegis/specs/sdd/user.md');
  assert.equal(r.details.change.kind, 'signature_change');
});

test('reason-builder: contract falls back to before.name then after.name then <symbol>', () => {
  const r1 = buildSignatureReason({
    file: 'a.js',
    change: {
      reasons: ['signature'],
      before: { name: 'foo', signature: '()' },
      after: { signature: '(x)' },
    },
  });
  assert.match(r1.reason, /`foo`/);

  const r2 = buildSignatureReason({
    file: 'a.js',
    change: {
      reasons: ['signature'],
      before: {},
      after: { name: 'bar', signature: '(x)' },
    },
  });
  assert.match(r2.reason, /`bar`/);

  const r3 = buildSignatureReason({
    file: 'a.js',
    change: { reasons: ['signature'], before: {}, after: {} },
  });
  assert.match(r3.reason, /`<symbol>`/);
});

test('reason-builder: classify maps reasons to kind', () => {
  const sig = buildSignatureReason({
    file: 'a.js',
    change: { reasons: ['signature'], before: { signature: '()' }, after: { signature: '(x)' } },
  });
  assert.equal(sig.details.change.kind, 'signature_change');

  const removed = buildSignatureReason({
    file: 'a.js',
    change: { reasons: ['unexported'], before: {}, after: {} },
  });
  assert.equal(removed.details.change.kind, 'export_removed');

  const added = buildSignatureReason({
    file: 'a.js',
    change: { reasons: ['exported'], before: {}, after: {} },
  });
  assert.equal(added.details.change.kind, 'export_added');

  const other = buildSignatureReason({
    file: 'a.js',
    change: { reasons: ['mystery'], before: {}, after: {} },
  });
  assert.equal(other.details.change.kind, 'mystery');

  const unknown = buildSignatureReason({
    file: 'a.js',
    change: { reasons: [], before: {}, after: {} },
  });
  assert.equal(unknown.details.change.kind, 'unknown');
});

test('reason-builder: includes alternatives array', () => {
  const r = buildSignatureReason({
    file: 'a.js',
    change: {
      reasons: ['signature'],
      before: { signature: '(a)' },
      after: { signature: '(a, b)' },
    },
  });
  assert.ok(Array.isArray(r.details.alternatives));
  assert.ok(r.details.alternatives.length > 0);
});

test('reason-builder: shapeOf preserves id, name, type, line, signature, exported', () => {
  const r = buildSignatureReason({
    file: 'a.js',
    change: {
      reasons: ['signature'],
      before: { id: 'b1', name: 'foo', type: 'fn', line: 10, signature: '()', exported: true },
      after: { id: 'a1', name: 'foo', type: 'fn', line: 11, signature: '(x)', exported: false },
    },
  });
  assert.deepEqual(r.details.change.before, {
    id: 'b1', name: 'foo', type: 'fn', line: 10, signature: '()', exported: true,
  });
  assert.equal(r.details.change.after.exported, false);
});

test('reason-builder: empty before/after produce shape with undefined fields', () => {
  // change.before/after are coerced to {} via ?? {}, so shapeOf returns
  // an object with undefined slots rather than null.
  const r = buildSignatureReason({
    file: 'a.js',
    change: { reasons: ['signature'], before: null, after: null },
  });
  assert.equal(r.details.change.before.exported, false);
  assert.equal(r.details.change.after.exported, false);
  assert.equal(r.details.change.before.signature, null);
});

test('reason-builder: callers pass through unchanged', () => {
  const r = buildSignatureReason({
    file: 'a.js',
    change: { reasons: ['signature'], before: { signature: '()' }, after: { signature: '(x)' } },
    callers: ['src/x.js', 'src/y.js'],
  });
  assert.deepEqual(r.details.callers, ['src/x.js', 'src/y.js']);
});
