import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractFromDiff, buildLiteralHints } from '../../../lib/auto/literal-extractor.js';

const SIM1_DIFF = `\
--- a/services/searchProducts/index.ts
+++ b/services/searchProducts/index.ts
@@ -10,7 +10,7 @@ export function searchProducts(query, opts) {
-  const re = /\\s{2,}/g;
+  const re = /\\s{3,}/g;
-  const limit = 50;
+  const limit = 100;
 }`;

describe('extractFromDiff', () => {
  it('collects removed and added literals from diff', () => {
    const { removed, added } = extractFromDiff(SIM1_DIFF);
    assert.ok(removed.has('/\\s{2,}/g'), 'removed regex');
    assert.ok(added.has('/\\s{3,}/g'), 'added regex');
    assert.ok(removed.has('50'), 'removed number');
    assert.ok(added.has('100'), 'added number');
  });

  it('ignores --- and +++ header lines', () => {
    const { removed } = extractFromDiff(SIM1_DIFF);
    assert.ok(![...removed].some((v) => v.includes('services/')), 'no path in removed');
  });

  it('returns empty sets for empty diff', () => {
    const { removed, added } = extractFromDiff('');
    assert.equal(removed.size, 0);
    assert.equal(added.size, 0);
  });

  it('skips single-digit numbers to reduce noise', () => {
    const diff = '-  const x = 1;\n+  const x = 2;';
    const { removed } = extractFromDiff(diff);
    assert.ok(!removed.has('1'), 'single digit filtered');
  });
});

describe('buildLiteralHints', () => {
  const spec = `## Contract
The search regex \`/\\s{2,}/g\` normalises whitespace.
Default limit is 50 results per page.`;

  it('returns hint when stale literal still in spec', () => {
    const hint = buildLiteralHints(SIM1_DIFF, spec);
    assert.ok(hint !== null, 'should produce hint');
    assert.ok(hint.includes('/\\s{2,}/g'), 'names stale regex');
    assert.ok(hint.includes('removed from code, still in spec'));
  });

  it('mentions newly introduced values', () => {
    const hint = buildLiteralHints(SIM1_DIFF, spec);
    assert.ok(hint.includes('/\\s{3,}/g') || hint.includes('100'), 'mentions new value');
  });

  it('returns null when no stale literal in spec', () => {
    const cleanSpec = '## Contract\nNo specific literals referenced.';
    const hint = buildLiteralHints(SIM1_DIFF, cleanSpec);
    assert.equal(hint, null);
  });

  it('returns null for empty diff', () => {
    assert.equal(buildLiteralHints('', spec), null);
  });

  it('returns null for empty spec', () => {
    assert.equal(buildLiteralHints(SIM1_DIFF, ''), null);
  });

  it('does not duplicate value in stale list if it also appears in added', () => {
    const diff = '-  const x = "foo";\n+  const x = "foo";';
    const specWithFoo = 'value is "foo"';
    const hint = buildLiteralHints(diff, specWithFoo);
    assert.equal(hint, null, 'unchanged literal should not trigger hint');
  });
});
