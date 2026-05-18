import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { makeTmpProject, cleanup, writeFile, runCommand, REPO_ROOT } from '../../_helpers.js';

const CMD = pathToFileURL(join(REPO_ROOT, 'lib/commands/keeper-auto.js')).href;

test('keeper-auto: --dry-run on empty queue → ok=true with empty decisions', async (t) => {
  const root = makeTmpProject();
  t.after(() => cleanup(root));
  const r = await runCommand(CMD, ['auto', '--dry-run', '--format=json'], { cwd: root });
  const parsed = JSON.parse(r.stdout);
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.decisions, []);
  assert.equal(parsed.dry_run, true);
});

test('keeper-auto: live mode with disabled policy → exit 2', async (t) => {
  const root = makeTmpProject();
  t.after(() => cleanup(root));
  const r = await runCommand(CMD, ['auto', '--format=json'], { cwd: root });
  assert.equal(r.exitCode, 2);
  const parsed = JSON.parse(r.stdout);
  assert.match(parsed.error, /auto_resolve disabled/);
});

test('keeper-auto: --dry-run routes whitelist hit to ROUTE_AUTO', async (t) => {
  const root = makeTmpProject();
  t.after(() => cleanup(root));
  writeFile(root, 'aegis/config/auto-policy.yaml', `auto_resolve:
  enabled: true
  whitelist:
    paths:
      - "docs/**"
`);
  writeFile(root, 'aegis/runtime/queue/keeper-queue.jsonl',
    JSON.stringify({ file: 'docs/x.md', change_type: 'doc' }) + '\n');
  const r = await runCommand(CMD, ['auto', '--dry-run', '--format=json'], { cwd: root });
  const parsed = JSON.parse(r.stdout);
  assert.equal(parsed.summary.auto_resolve, 1);
});

test('keeper-auto: --dry-run + --max-specs caps queue', async (t) => {
  const root = makeTmpProject();
  t.after(() => cleanup(root));
  writeFile(root, 'aegis/runtime/queue/keeper-queue.jsonl',
    [
      JSON.stringify({ file: 'a.js' }),
      JSON.stringify({ file: 'b.js' }),
      JSON.stringify({ file: 'c.js' }),
    ].join('\n') + '\n');
  const r = await runCommand(
    CMD,
    ['auto', '--dry-run', '--max-specs', '2', '--format=json'],
    { cwd: root },
  );
  const parsed = JSON.parse(r.stdout);
  assert.equal(parsed.decisions.length, 2);
  assert.equal(parsed.capped, true);
});

test('keeper-auto: tolerates malformed JSONL lines', async (t) => {
  const root = makeTmpProject();
  t.after(() => cleanup(root));
  writeFile(root, 'aegis/runtime/queue/keeper-queue.jsonl',
    'not json\n' + JSON.stringify({ file: 'a.js' }) + '\n');
  const r = await runCommand(CMD, ['auto', '--dry-run', '--format=json'], { cwd: root });
  const parsed = JSON.parse(r.stdout);
  assert.equal(parsed.decisions.length, 1);
});

test('keeper-auto: text format prints summary line', async (t) => {
  const root = makeTmpProject();
  t.after(() => cleanup(root));
  writeFile(root, 'aegis/runtime/queue/keeper-queue.jsonl',
    JSON.stringify({ file: 'a.js' }) + '\n');
  const r = await runCommand(CMD, ['auto', '--dry-run'], { cwd: root });
  assert.match(r.stdout, /\[dry-run\]/);
  assert.match(r.stdout, /auto.*review.*escalate/);
});

test('keeper-auto: missing aegis/ → exit 1', async (t) => {
  const root = makeTmpProject();
  t.after(() => cleanup(root));
  // Don't create aegis/ directory
  const r = await runCommand(CMD, ['auto', '--dry-run', '--format=json'], { cwd: root });
  assert.equal(r.exitCode, 1);
  const parsed = JSON.parse(r.stdout);
  assert.match(parsed.error, /aegis\/ not found/);
});

test('keeper-auto: live mode without ANTHROPIC_API_KEY → exit 1', async (t) => {
  const root = makeTmpProject();
  t.after(() => cleanup(root));
  writeFile(root, 'aegis/config/auto-policy.yaml', 'auto_resolve:\n  enabled: true\n');
  const originalKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    const r = await runCommand(CMD, ['auto', '--format=json'], { cwd: root });
    assert.equal(r.exitCode, 1);
    const parsed = JSON.parse(r.stdout);
    assert.match(parsed.error, /ANTHROPIC_API_KEY not set/);
  } finally {
    if (originalKey) process.env.ANTHROPIC_API_KEY = originalKey;
  }
});
