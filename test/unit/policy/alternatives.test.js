import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestAlternatives } from '../../../lib/policy/alternatives.js';

test('alternatives: empty change still suggests spec-first as fallback', () => {
  const out = suggestAlternatives({});
  assert.equal(out.at(-1).kind, 'spec-first');
});

test('alternatives: signature change with new param → optional-param + spec-first', () => {
  const out = suggestAlternatives({
    reasons: ['signature'],
    before: { signature: '(a)' },
    after: { signature: '(a, b)' },
  });
  assert.equal(out[0].kind, 'optional-param');
  assert.equal(out.at(-1).kind, 'spec-first');
});

test('alternatives: signature change shrinking arity → overload', () => {
  const out = suggestAlternatives({
    reasons: ['signature'],
    before: { signature: '(a, b)' },
    after: { signature: '(a)' },
  });
  assert.equal(out[0].kind, 'overload');
});

test('alternatives: signature change same arity → shape-shift', () => {
  const out = suggestAlternatives({
    reasons: ['signature'],
    before: { signature: '(a, b)' },
    after: { signature: '(x, y)' },
  });
  assert.equal(out[0].kind, 'shape-shift');
});

test('alternatives: exported reason → internal-export', () => {
  const out = suggestAlternatives({ reasons: ['exported'] });
  assert.ok(out.some((a) => a.kind === 'internal-export'));
});

test('alternatives: unexported reason → deprecation', () => {
  const out = suggestAlternatives({ reasons: ['unexported'] });
  assert.ok(out.some((a) => a.kind === 'deprecation'));
});

test('alternatives: signature with no parens treats arity as 0/0 → shape-shift', () => {
  const out = suggestAlternatives({
    reasons: ['signature'],
    before: { signature: 'foo' },
    after: { signature: 'bar' },
  });
  assert.equal(out[0].kind, 'shape-shift');
});

test('alternatives: empty parens treated as zero arity', () => {
  const out = suggestAlternatives({
    reasons: ['signature'],
    before: { signature: '()' },
    after: { signature: '(x)' },
  });
  assert.equal(out[0].kind, 'optional-param');
});

test('alternatives: spec-first body references aegis/specs/sdd path', () => {
  const out = suggestAlternatives({});
  const last = out.at(-1);
  assert.match(last.body, /aegis\/specs\/sdd/);
});

test('alternatives: every entry has kind, title, body', () => {
  const out = suggestAlternatives({
    reasons: ['signature', 'exported', 'unexported'],
    before: { signature: '(a)' },
    after: { signature: '(a, b)' },
  });
  for (const alt of out) {
    assert.equal(typeof alt.kind, 'string');
    assert.equal(typeof alt.title, 'string');
    assert.equal(typeof alt.body, 'string');
  }
});
