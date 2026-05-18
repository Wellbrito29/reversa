import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { resolveSpecPath } from '../../../lib/auto/spec-resolver.js';

const MATRIX_MD = `\
# Code-Spec Matrix

| File | Spec | Status |
|------|------|--------|
| \`src/services/search/index.ts\` | \`aegis/specs/sdd/search/search.sdd.md\` | 🟢 |
| \`src/services/auth/login.ts\` | \`aegis/specs/sdd/auth/auth.sdd.md\` | 🟢 |
`;

const GRAPH_JSON = JSON.stringify({
  nodes: [
    { id: 'src/services/search/index.ts' },
    { id: 'src/services/search/sortHelpers.ts' },
  ],
  edges: [
    { kind: 'imports', from: 'src/services/search/index.ts', to: 'src/services/search/sortHelpers.ts' },
  ],
});

let tmp;

before(() => {
  tmp = mkdtempSync(join(tmpdir(), 'spec-resolver-'));
  mkdirSync(join(tmp, 'aegis', 'traceability'), { recursive: true });
  mkdirSync(join(tmp, 'aegis', 'runtime', 'context'), { recursive: true });
  writeFileSync(join(tmp, 'aegis', 'traceability', 'code-spec-matrix.md'), MATRIX_MD);
  writeFileSync(join(tmp, 'aegis', 'runtime', 'context', 'graph.json'), GRAPH_JSON);
});

after(() => rmSync(tmp, { recursive: true, force: true }));

describe('resolveSpecPath', () => {
  it('resolves via direct matrix lookup', () => {
    const spec = resolveSpecPath('src/services/search/index.ts', { root: tmp });
    assert.equal(spec, 'aegis/specs/sdd/search/search.sdd.md');
  });

  it('resolves via graph reverse-dep when file not in matrix', () => {
    // sortHelpers.ts is imported by index.ts → index.ts maps to search.sdd.md
    const spec = resolveSpecPath('src/services/search/sortHelpers.ts', { root: tmp });
    assert.equal(spec, 'aegis/specs/sdd/search/search.sdd.md');
  });

  it('returns null when file has no matrix entry and no importers', () => {
    const spec = resolveSpecPath('src/utils/unknown.ts', { root: tmp });
    assert.equal(spec, null);
  });

  it('returns null when matrix file is missing', () => {
    const emptyRoot = mkdtempSync(join(tmpdir(), 'spec-resolver-empty-'));
    try {
      const spec = resolveSpecPath('src/services/search/index.ts', { root: emptyRoot });
      assert.equal(spec, null);
    } finally {
      rmSync(emptyRoot, { recursive: true, force: true });
    }
  });

  it('direct lookup takes priority over graph fallback', () => {
    // auth/login.ts is in matrix directly
    const spec = resolveSpecPath('src/services/auth/login.ts', { root: tmp });
    assert.equal(spec, 'aegis/specs/sdd/auth/auth.sdd.md');
  });

  it('returns null when graph.json is absent (matrix-only mode)', () => {
    const noGraphRoot = mkdtempSync(join(tmpdir(), 'spec-resolver-nograph-'));
    try {
      mkdirSync(join(noGraphRoot, 'aegis', 'traceability'), { recursive: true });
      writeFileSync(join(noGraphRoot, 'aegis', 'traceability', 'code-spec-matrix.md'), MATRIX_MD);
      // File not in matrix, no graph → null
      const spec = resolveSpecPath('src/services/search/sortHelpers.ts', { root: noGraphRoot });
      assert.equal(spec, null);
    } finally {
      rmSync(noGraphRoot, { recursive: true, force: true });
    }
  });
});
