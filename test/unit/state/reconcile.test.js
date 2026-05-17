import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTmpProject, cleanup, writeFile, writeJson, readJson } from '../../_helpers.js';
import { reconcileState, pruneStaleCheckpoints } from '../../../lib/state/reconcile.js';

test('reconcile: missing state.json returns missing_state=true', () => {
  const root = makeTmpProject();
  try {
    const r = reconcileState(root);
    assert.equal(r.missing_state, true);
    assert.equal(r.ok, false);
  } finally {
    cleanup(root);
  }
});

test('reconcile: empty checkpoints returns ok=true', () => {
  const root = makeTmpProject();
  try {
    writeJson(root, 'aegis/config/state.json', { checkpoints: {} });
    const r = reconcileState(root);
    assert.equal(r.ok, true);
    assert.equal(r.total_stale, 0);
    assert.equal(r.checkpoints.length, 0);
  } finally {
    cleanup(root);
  }
});

test('reconcile: all outputs present → ok=true', () => {
  const root = makeTmpProject();
  try {
    writeFile(root, 'aegis/reports/code-analysis.md', '# x');
    writeFile(root, 'aegis/reports/data-dictionary.md', '# y');
    writeJson(root, 'aegis/config/state.json', {
      checkpoints: {
        archaeologist: {
          outputs: ['aegis/reports/code-analysis.md', 'aegis/reports/data-dictionary.md'],
        },
      },
    });
    const r = reconcileState(root);
    assert.equal(r.ok, true);
    assert.equal(r.checkpoints[0].name, 'archaeologist');
    assert.deepEqual(r.checkpoints[0].stale, []);
    assert.equal(r.checkpoints[0].present.length, 2);
  } finally {
    cleanup(root);
  }
});

test('reconcile: detects stale entries', () => {
  const root = makeTmpProject();
  try {
    writeFile(root, 'aegis/reports/exists.md', '# x');
    writeJson(root, 'aegis/config/state.json', {
      checkpoints: {
        detective: {
          outputs: [
            'aegis/reports/exists.md',
            'aegis/specs/adrs/ADR-001-old-name.md',
            'aegis/specs/adrs/ADR-002-also-renamed.md',
          ],
        },
      },
    });
    const r = reconcileState(root);
    assert.equal(r.ok, false);
    assert.equal(r.total_stale, 2);
    assert.deepEqual(r.checkpoints[0].stale, [
      'aegis/specs/adrs/ADR-001-old-name.md',
      'aegis/specs/adrs/ADR-002-also-renamed.md',
    ]);
    assert.deepEqual(r.checkpoints[0].present, ['aegis/reports/exists.md']);
  } finally {
    cleanup(root);
  }
});

test('reconcile: missing outputs array on checkpoint treated as empty', () => {
  const root = makeTmpProject();
  try {
    writeJson(root, 'aegis/config/state.json', {
      checkpoints: { writer: { units_generated: 15 } },
    });
    const r = reconcileState(root);
    assert.equal(r.ok, true);
    assert.equal(r.checkpoints[0].stale.length, 0);
  } finally {
    cleanup(root);
  }
});

test('prune: drops stale entries and rewrites state.json', () => {
  const root = makeTmpProject();
  try {
    writeFile(root, 'aegis/reports/keep.md', '# keep');
    writeJson(root, 'aegis/config/state.json', {
      checkpoints: {
        detective: {
          outputs: ['aegis/reports/keep.md', 'aegis/reports/gone.md', 'aegis/reports/also-gone.md'],
        },
      },
    });
    const r = pruneStaleCheckpoints(root);
    assert.equal(r.pruned, 2);
    assert.equal(r.report.ok, true);
    const after = readJson(root, 'aegis/config/state.json');
    assert.deepEqual(after.checkpoints.detective.outputs, ['aegis/reports/keep.md']);
  } finally {
    cleanup(root);
  }
});

test('prune: keeps checkpoint metadata when all outputs are stale', () => {
  const root = makeTmpProject();
  try {
    writeJson(root, 'aegis/config/state.json', {
      checkpoints: {
        writer: { units_generated: 15, outputs: ['gone.md'] },
      },
    });
    const r = pruneStaleCheckpoints(root);
    assert.equal(r.pruned, 1);
    const after = readJson(root, 'aegis/config/state.json');
    assert.equal(after.checkpoints.writer.units_generated, 15);
    assert.deepEqual(after.checkpoints.writer.outputs, []);
  } finally {
    cleanup(root);
  }
});

test('prune: missing state.json is noop', () => {
  const root = makeTmpProject();
  try {
    const r = pruneStaleCheckpoints(root);
    assert.equal(r.pruned, 0);
    assert.equal(r.report.missing_state, true);
  } finally {
    cleanup(root);
  }
});
