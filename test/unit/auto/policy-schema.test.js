import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePolicy, readAutoPolicy, DEFAULT_POLICY } from '../../../lib/auto/policy-schema.js';
import { makeTmpProject, cleanup, writeFile } from '../../_helpers.js';

test('policy-schema: DEFAULT_POLICY is frozen and disabled', () => {
  assert.equal(DEFAULT_POLICY.enabled, false);
  assert.equal(DEFAULT_POLICY.confidence_threshold, 0.85);
  assert.equal(DEFAULT_POLICY.max_specs_per_pr, 5);
  assert.deepEqual(DEFAULT_POLICY.whitelist, { paths: [], change_types: [] });
  assert.deepEqual(DEFAULT_POLICY.blacklist, { paths: [], change_types: [] });
  assert.deepEqual(DEFAULT_POLICY.escalate_on, []);
  assert.equal(Object.isFrozen(DEFAULT_POLICY), true);
});

test('parsePolicy: empty string yields default policy', () => {
  const p = parsePolicy('');
  assert.equal(p.enabled, false);
  assert.equal(p.confidence_threshold, 0.85);
});

test('parsePolicy: parses enabled, threshold, max_specs_per_pr', () => {
  const yaml = `auto_resolve:
  enabled: true
  confidence_threshold: 0.7
  max_specs_per_pr: 10
`;
  const p = parsePolicy(yaml);
  assert.equal(p.enabled, true);
  assert.equal(p.confidence_threshold, 0.7);
  assert.equal(p.max_specs_per_pr, 10);
});

test('parsePolicy: inline lists for whitelist/blacklist paths', () => {
  const yaml = `auto_resolve:
  whitelist:
    paths: ["**/*.test.js", "docs/**"]
    change_types: [test_only, format_only]
  blacklist:
    paths: ["**/contracts/**"]
    change_types: [public_api_change]
`;
  const p = parsePolicy(yaml);
  assert.deepEqual(p.whitelist.paths, ['**/*.test.js', 'docs/**']);
  assert.deepEqual(p.whitelist.change_types, ['test_only', 'format_only']);
  assert.deepEqual(p.blacklist.paths, ['**/contracts/**']);
  assert.deepEqual(p.blacklist.change_types, ['public_api_change']);
});

test('parsePolicy: dash-list escalate_on', () => {
  const yaml = `auto_resolve:
  escalate_on:
    - spec_deletion
    - public_api_change
`;
  const p = parsePolicy(yaml);
  assert.deepEqual(p.escalate_on, ['spec_deletion', 'public_api_change']);
});

test('parsePolicy: llm sub-keys', () => {
  const yaml = `auto_resolve:
  llm:
    model: claude-haiku-4-5
    fallback: claude-sonnet-4-6
`;
  const p = parsePolicy(yaml);
  assert.equal(p.llm.model, 'claude-haiku-4-5');
  assert.equal(p.llm.fallback, 'claude-sonnet-4-6');
});

test('parsePolicy: ignores comments and trailing whitespace', () => {
  const yaml = `# top comment
auto_resolve:
  enabled: true   # inline comment
  confidence_threshold: 0.9
`;
  const p = parsePolicy(yaml);
  assert.equal(p.enabled, true);
  assert.equal(p.confidence_threshold, 0.9);
});

test('parsePolicy: ignores keys outside auto_resolve', () => {
  const yaml = `other_section:
  enabled: true
auto_resolve:
  enabled: false
`;
  const p = parsePolicy(yaml);
  assert.equal(p.enabled, false);
});

test('parsePolicy: parses single-quoted scalars', () => {
  const yaml = `auto_resolve:
  whitelist:
    paths: ['docs/**']
`;
  const p = parsePolicy(yaml);
  assert.deepEqual(p.whitelist.paths, ['docs/**']);
});

test('parsePolicy: dashed list under whitelist.paths', () => {
  const yaml = `auto_resolve:
  whitelist:
    paths:
      - "docs/**"
      - "**/*.md"
`;
  const p = parsePolicy(yaml);
  assert.deepEqual(p.whitelist.paths, ['docs/**', '**/*.md']);
});

test('readAutoPolicy: returns default + null source when file missing', (t) => {
  const root = makeTmpProject();
  t.after(() => cleanup(root));
  const p = readAutoPolicy(root);
  assert.equal(p.enabled, false);
  assert.equal(p._source, null);
});

test('readAutoPolicy: reads aegis/config/auto-policy.yaml when present', (t) => {
  const root = makeTmpProject();
  t.after(() => cleanup(root));
  writeFile(root, 'aegis/config/auto-policy.yaml',
    'auto_resolve:\n  enabled: true\n  confidence_threshold: 0.95\n');
  const p = readAutoPolicy(root);
  assert.equal(p.enabled, true);
  assert.equal(p.confidence_threshold, 0.95);
  assert.match(p._source, /aegis\/config\/auto-policy\.yaml$/);
});
