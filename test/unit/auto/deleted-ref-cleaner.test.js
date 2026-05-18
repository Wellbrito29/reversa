import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { findSpecsReferencingFile } from '../../../lib/auto/deleted-ref-cleaner.js';

let tmp;

before(() => {
  tmp = mkdtempSync(join(tmpdir(), 'deleted-ref-cleaner-'));
  mkdirSync(join(tmp, 'aegis', 'specs', 'sdd', 'search'), { recursive: true });
  mkdirSync(join(tmp, 'aegis', 'specs', 'sdd', 'auth'), { recursive: true });

  writeFileSync(
    join(tmp, 'aegis', 'specs', 'sdd', 'search', 'search.sdd.md'),
    '# Search\nImplemented in `src/services/search/SearchContainer.test.tsx`.\nSee also `src/services/search/index.ts`.',
  );
  writeFileSync(
    join(tmp, 'aegis', 'specs', 'sdd', 'auth', 'auth.sdd.md'),
    '# Auth\nNo reference to deleted file here.',
  );
  writeFileSync(
    join(tmp, 'aegis', 'specs', 'sdd', 'search', 'sort.sdd.md'),
    '# Sort\nTest coverage via `src/services/search/SearchContainer.test.tsx` (deleted).',
  );
});

after(() => rmSync(tmp, { recursive: true, force: true }));

describe('findSpecsReferencingFile', () => {
  const deleted = 'src/services/search/SearchContainer.test.tsx';

  it('finds specs that mention the deleted file', () => {
    const refs = findSpecsReferencingFile(tmp, deleted);
    assert.ok(refs.some((r) => r.includes('search.sdd.md')), 'search.sdd.md');
    assert.ok(refs.some((r) => r.includes('sort.sdd.md')), 'sort.sdd.md');
  });

  it('excludes specs that do not mention the file', () => {
    const refs = findSpecsReferencingFile(tmp, deleted);
    assert.ok(!refs.some((r) => r.includes('auth.sdd.md')), 'auth.sdd.md should be excluded');
  });

  it('returns empty array when specs dir does not exist', () => {
    const emptyRoot = mkdtempSync(join(tmpdir(), 'drc-empty-'));
    try {
      const refs = findSpecsReferencingFile(emptyRoot, deleted);
      assert.deepEqual(refs, []);
    } finally {
      rmSync(emptyRoot, { recursive: true, force: true });
    }
  });

  it('returns empty array when no spec references the deleted file', () => {
    const refs = findSpecsReferencingFile(tmp, 'src/totally/different/file.ts');
    assert.deepEqual(refs, []);
  });

  it('matches partial path segments without false positives', () => {
    // 'index.ts' alone should not match 'SearchContainer.test.tsx'
    const refs = findSpecsReferencingFile(tmp, 'src/services/search/index.ts');
    // search.sdd.md references index.ts, sort.sdd.md does not
    assert.ok(refs.some((r) => r.includes('search.sdd.md')));
    assert.ok(!refs.some((r) => r.includes('sort.sdd.md')));
  });
});
