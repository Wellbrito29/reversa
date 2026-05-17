import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTmpProject, cleanup, writeJson, readJson } from '../../_helpers.js';
import { migrateSetupJson } from '../../../lib/state/migrate-setup.js';

test('migrate-setup: noop when file missing', () => {
  const root = makeTmpProject();
  try {
    const r = migrateSetupJson(root);
    assert.equal(r.migrated, false);
  } finally {
    cleanup(root);
  }
});

test('migrate-setup: noop when already snake_case', () => {
  const root = makeTmpProject();
  try {
    writeJson(root, 'aegis/config/setup.json', {
      schema_version: 1,
      watch: { archive_after: 3, block_on_red: false },
    });
    const r = migrateSetupJson(root);
    assert.equal(r.migrated, false);
  } finally {
    cleanup(root);
  }
});

test('migrate-setup: converts kebab-case keys at all depths', () => {
  const root = makeTmpProject();
  try {
    writeJson(root, 'aegis/config/setup.json', {
      'schema-version': 1,
      'aegis-version': '2.0.0',
      'installed-at': '2026-05-08',
      watch: { 'archive-after': 3, 'block-on-red': false },
      paths: { 'sdd-dir': 'aegis/specs/sdd' },
      principles: { 'auto-load-into-plan': true },
    });
    const r = migrateSetupJson(root);
    assert.equal(r.migrated, true);
    const after = readJson(root, 'aegis/config/setup.json');
    assert.equal(after.schema_version, 1);
    assert.equal(after.aegis_version, '2.0.0');
    assert.equal(after.installed_at, '2026-05-08');
    assert.equal(after.watch.archive_after, 3);
    assert.equal(after.watch.block_on_red, false);
    assert.equal(after.paths.sdd_dir, 'aegis/specs/sdd');
    assert.equal(after.principles.auto_load_into_plan, true);
  } finally {
    cleanup(root);
  }
});

test('migrate-setup: preserves non-kebab and arrays', () => {
  const root = makeTmpProject();
  try {
    writeJson(root, 'aegis/config/setup.json', {
      'aegis-version': '2.0.0',
      language: 'pt-BR',
      list: [1, { 'foo-bar': 'baz' }],
    });
    const r = migrateSetupJson(root);
    assert.equal(r.migrated, true);
    const after = readJson(root, 'aegis/config/setup.json');
    assert.equal(after.language, 'pt-BR');
    assert.equal(after.list[1].foo_bar, 'baz');
  } finally {
    cleanup(root);
  }
});
