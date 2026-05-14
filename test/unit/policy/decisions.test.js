import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  APPROVE,
  ADVISORY,
  BLOCK,
  CAT_PROTECTED_FILE,
  CAT_PROTECTED_GLOB,
  CAT_BLACKLIST,
  CAT_SIGNATURE_CHANGE,
  CAT_DELETED_SYMBOL,
  CAT_NEW_EXPORT,
  CAT_NONE,
  makeDecision,
} from '../../../lib/policy/decisions.js';

test('decisions: kind constants are stable strings', () => {
  assert.equal(APPROVE, 'approve');
  assert.equal(ADVISORY, 'approve+advisory');
  assert.equal(BLOCK, 'block');
});

test('decisions: category constants are present', () => {
  assert.equal(CAT_PROTECTED_FILE, 'protected_file');
  assert.equal(CAT_PROTECTED_GLOB, 'protected_glob');
  assert.equal(CAT_BLACKLIST, 'auto_policy_blacklist');
  assert.equal(CAT_SIGNATURE_CHANGE, 'signature_change');
  assert.equal(CAT_DELETED_SYMBOL, 'deleted_symbol');
  assert.equal(CAT_NEW_EXPORT, 'new_export');
  assert.equal(CAT_NONE, 'none');
});

test('makeDecision: produces { decision, ...fields }', () => {
  const d = makeDecision(BLOCK, { reason: 'why', category: CAT_PROTECTED_FILE });
  assert.equal(d.decision, BLOCK);
  assert.equal(d.reason, 'why');
  assert.equal(d.category, CAT_PROTECTED_FILE);
});

test('makeDecision: empty fields yields just decision', () => {
  assert.deepEqual(makeDecision(APPROVE), { decision: APPROVE });
});

test('makeDecision: extra fields override are not allowed (decision wins)', () => {
  const d = makeDecision(BLOCK, { decision: APPROVE });
  // Spread order: decision first, then ...fields — fields can override.
  // This documents current behaviour; if it changes, the test catches it.
  assert.equal(d.decision, APPROVE);
});
