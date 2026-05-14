import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import * as paths from '../../lib/paths.js';
import { makeTmpProject, cleanup, writeJson, writeFile } from '../_helpers.js';

test('paths: AEGIS_ROOT is "aegis"', () => {
  assert.equal(paths.AEGIS_ROOT, 'aegis');
});

test('paths: config constants live under aegis/config', () => {
  assert.equal(paths.STATE_JSON, join('aegis', 'config', 'state.json'));
  assert.equal(paths.CONFIG_TOML, join('aegis', 'config', 'config.toml'));
  assert.equal(paths.CONFIG_USER_TOML, join('aegis', 'config', 'config.user.toml'));
  assert.equal(paths.MANIFEST_YAML, join('aegis', 'config', 'manifest.yaml'));
  assert.equal(paths.FILES_MANIFEST_JSON, join('aegis', 'config', 'files-manifest.json'));
  assert.equal(paths.SETUP_JSON, join('aegis', 'config', 'setup.json'));
  assert.equal(paths.AUTO_POLICY_YAML, join('aegis', 'config', 'auto-policy.yaml'));
  assert.equal(paths.AUDIT_POLICY_JSON, join('aegis', 'config', 'audit-policy.json'));
});

test('paths: runtime constants live under aegis/runtime', () => {
  assert.equal(paths.RUNTIME_DIR, join('aegis', 'runtime'));
  assert.equal(paths.CONTEXT_DIR, join('aegis', 'runtime', 'context'));
  assert.equal(paths.GRAPH_JSON, join('aegis', 'runtime', 'context', 'graph.json'));
  assert.equal(paths.POLICY_INDEX_JSON, join('aegis', 'runtime', 'context', 'policy-index.json'));
  assert.equal(paths.QUEUE_DIR, join('aegis', 'runtime', 'queue'));
  assert.equal(paths.KEEPER_QUEUE_JSONL, join('aegis', 'runtime', 'queue', 'keeper-queue.jsonl'));
  assert.equal(paths.AUDIT_DIR, join('aegis', 'runtime', 'audit'));
  assert.equal(paths.RUNTIME_HOOKS_YML, join('aegis', 'runtime', 'hooks.yml'));
});

test('paths: spec subdirs live under aegis/specs', () => {
  assert.equal(paths.SPECS_DIR, join('aegis', 'specs'));
  assert.equal(paths.SDD_DIR, join('aegis', 'specs', 'sdd'));
  assert.equal(paths.USER_STORIES_DIR, join('aegis', 'specs', 'user-stories'));
  assert.equal(paths.ADRS_DIR, join('aegis', 'specs', 'adrs'));
  assert.equal(paths.OPENAPI_DIR, join('aegis', 'specs', 'openapi'));
  assert.equal(paths.DATABASE_DIR, join('aegis', 'specs', 'database'));
});

test('paths: report constants live under aegis/reports', () => {
  assert.equal(paths.REPORTS_DIR, join('aegis', 'reports'));
  assert.equal(paths.DRIFT_MD, join('aegis', 'reports', 'drift.md'));
  assert.equal(paths.CONFIDENCE_REPORT_MD, join('aegis', 'reports', 'confidence-report.md'));
  assert.equal(paths.GAPS_MD, join('aegis', 'reports', 'gaps.md'));
  assert.equal(paths.QUESTIONS_MD, join('aegis', 'reports', 'questions.md'));
  assert.equal(paths.CODE_ANALYSIS_MD, join('aegis', 'reports', 'code-analysis.md'));
});

test('paths: architecture / traceability / migration constants', () => {
  assert.equal(paths.ARCHITECTURE_DIR, join('aegis', 'architecture'));
  assert.equal(paths.ARCHITECTURE_MD, join('aegis', 'architecture', 'architecture.md'));
  assert.equal(paths.C4_CONTEXT_MD, join('aegis', 'architecture', 'c4-context.md'));
  assert.equal(paths.ERD_COMPLETE_MD, join('aegis', 'architecture', 'erd-complete.md'));
  assert.equal(paths.TRACEABILITY_DIR, join('aegis', 'traceability'));
  assert.equal(paths.MIGRATION_DIR, join('aegis', 'migration'));
});

test('paths: legacy constants are kept for migration commands', () => {
  assert.equal(paths.LEGACY_AEGIS_ROOT, '.aegis');
  assert.equal(paths.LEGACY_OUTPUT_FOLDER, '_aegis_sdd');
  assert.equal(paths.LEGACY_AGENTS_SKILLS, '.agents/skills');
  assert.equal(paths.LEGACY_CLAUDE_SKILLS, '.claude/skills');
});

test('paths: resolveFromRoot joins relative to project root', () => {
  assert.equal(paths.resolveFromRoot('/tmp/project', 'foo/bar'), join('/tmp/project', 'foo/bar'));
});

test('paths: getOutputFolder returns state.json output_folder when set', async (t) => {
  const root = makeTmpProject();
  t.after(() => cleanup(root));
  writeJson(root, 'aegis/config/state.json', { output_folder: 'custom_specs' });
  assert.equal(await paths.getOutputFolder(root), 'custom_specs');
});

test('paths: getOutputFolder falls back to "aegis" when state.json missing', async (t) => {
  const root = makeTmpProject();
  t.after(() => cleanup(root));
  assert.equal(await paths.getOutputFolder(root), 'aegis');
});

test('paths: getOutputFolder falls back to "aegis" when state.json malformed', async (t) => {
  const root = makeTmpProject();
  t.after(() => cleanup(root));
  writeFile(root, 'aegis/config/state.json', '{not valid json');
  assert.equal(await paths.getOutputFolder(root), 'aegis');
});

test('paths: getOutputFolder falls back when state.json has no output_folder field', async (t) => {
  const root = makeTmpProject();
  t.after(() => cleanup(root));
  writeJson(root, 'aegis/config/state.json', { other: 'thing' });
  assert.equal(await paths.getOutputFolder(root), 'aegis');
});
