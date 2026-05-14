import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  labelsFor,
  LABEL_AUTO,
  LABEL_REVIEW,
  LABEL_ESCALATE,
} from '../../../lib/auto/labels.js';
import {
  ROUTE_AUTO,
  ROUTE_REVIEW,
  ROUTE_ESCALATE,
} from '../../../lib/auto/decision-tree.js';

test('labels: empty input yields no labels', () => {
  assert.deepEqual(labelsFor([]), []);
});

test('labels: single auto-resolved entry returns auto label', () => {
  assert.deepEqual(labelsFor([{ decision: { route: ROUTE_AUTO } }]), [LABEL_AUTO]);
});

test('labels: single needs-review entry returns review label', () => {
  assert.deepEqual(labelsFor([{ decision: { route: ROUTE_REVIEW } }]), [LABEL_REVIEW]);
});

test('labels: single escalate entry returns escalate label', () => {
  assert.deepEqual(labelsFor([{ decision: { route: ROUTE_ESCALATE } }]), [LABEL_ESCALATE]);
});

test('labels: escalate dominates auto + review', () => {
  const decisions = [
    { decision: { route: ROUTE_AUTO } },
    { decision: { route: ROUTE_REVIEW } },
    { decision: { route: ROUTE_ESCALATE } },
  ];
  assert.deepEqual(labelsFor(decisions), [LABEL_ESCALATE]);
});

test('labels: review dominates auto', () => {
  const decisions = [
    { decision: { route: ROUTE_AUTO } },
    { decision: { route: ROUTE_REVIEW } },
  ];
  assert.deepEqual(labelsFor(decisions), [LABEL_REVIEW]);
});

test('labels: multiple auto entries collapse to single auto label', () => {
  const decisions = [
    { decision: { route: ROUTE_AUTO } },
    { decision: { route: ROUTE_AUTO } },
  ];
  assert.deepEqual(labelsFor(decisions), [LABEL_AUTO]);
});

test('labels: unknown routes are ignored', () => {
  assert.deepEqual(labelsFor([{ decision: { route: 'mystery' } }]), []);
});

test('labels: namespace prefix is "keeper:"', () => {
  assert.match(LABEL_AUTO, /^keeper:/);
  assert.match(LABEL_REVIEW, /^keeper:/);
  assert.match(LABEL_ESCALATE, /^keeper:/);
});
