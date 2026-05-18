import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import {
  makeTmpProject, cleanup, writeFile, seedJsProject,
  runCommand, REPO_ROOT,
} from '../../_helpers.js';

const GRAPH = pathToFileURL(join(REPO_ROOT, 'lib/commands/graph.js')).href;

test('graph build: writes aegis/runtime/context/graph.json', async (t) => {
  const root = makeTmpProject();
  t.after(() => cleanup(root));
  seedJsProject(root);
  const r = await runCommand(GRAPH, ['build'], { cwd: root });
  assert.equal(r.exitCode, 0);
  assert.ok(existsSync(join(root, 'aegis/runtime/context/graph.json')));
});

test('graph build: --level L1 creates merged graph', async (t) => {
  const root = makeTmpProject();
  t.after(() => cleanup(root));
  writeFile(root, 'src/a.js', 'export function f() {}\n');
  const r = await runCommand(GRAPH, ['build', '--level', 'L1'], { cwd: root });
  assert.equal(r.exitCode, 0);
});

test('graph stats: prints counts after a build', async (t) => {
  const root = makeTmpProject();
  t.after(() => cleanup(root));
  seedJsProject(root);
  await runCommand(GRAPH, ['build'], { cwd: root });
  const r = await runCommand(GRAPH, ['stats'], { cwd: root });
  assert.equal(r.exitCode, 0);
  assert.match(r.stdout, /nodes/i);
});

test('graph deps: lists outgoing imports', async (t) => {
  const root = makeTmpProject();
  t.after(() => cleanup(root));
  seedJsProject(root);
  await runCommand(GRAPH, ['build'], { cwd: root });
  const r = await runCommand(GRAPH, ['deps', 'src/a.js'], { cwd: root });
  assert.equal(r.exitCode, 0);
  assert.match(r.stdout, /src\/b\.js/);
});

test('graph reverse-deps: lists incoming imports', async (t) => {
  const root = makeTmpProject();
  t.after(() => cleanup(root));
  seedJsProject(root);
  await runCommand(GRAPH, ['build'], { cwd: root });
  const r = await runCommand(GRAPH, ['reverse-deps', 'src/b.js'], { cwd: root });
  assert.equal(r.exitCode, 0);
  assert.match(r.stdout, /src\/a\.js/);
});

test('graph impact: BFS reverse closure', async (t) => {
  const root = makeTmpProject();
  t.after(() => cleanup(root));
  writeFile(root, 'src/a.js', "import './b.js';\n");
  writeFile(root, 'src/b.js', "import './c.js';\n");
  writeFile(root, 'src/c.js', '');
  await runCommand(GRAPH, ['build'], { cwd: root });
  const r = await runCommand(GRAPH, ['impact', 'src/c.js'], { cwd: root });
  assert.equal(r.exitCode, 0);
  // Both a and b transitively depend on c
  assert.match(r.stdout, /src\/a\.js/);
  assert.match(r.stdout, /src\/b\.js/);
});

test('graph impact --json: JSON output', async (t) => {
  const root = makeTmpProject();
  t.after(() => cleanup(root));
  writeFile(root, 'src/a.js', "import './b.js';\n");
  writeFile(root, 'src/b.js', '');
  await runCommand(GRAPH, ['build'], { cwd: root });
  const r = await runCommand(GRAPH, ['impact', 'src/b.js', '--json'], { cwd: root });
  assert.equal(r.exitCode, 0);
  const parsed = JSON.parse(r.stdout);
  assert.ok(Array.isArray(parsed.impact));
  assert.ok(parsed.impact.includes('src/a.js'));
});

test('graph: unknown subcommand → non-zero exit', async (t) => {
  const root = makeTmpProject();
  t.after(() => cleanup(root));
  const r = await runCommand(GRAPH, ['flarp'], { cwd: root });
  assert.notEqual(r.exitCode, 0);
});

test('graph deps: target file not in graph → exit 2', async (t) => {
  const root = makeTmpProject();
  t.after(() => cleanup(root));
  seedJsProject(root);
  await runCommand(GRAPH, ['build'], { cwd: root });
  const r = await runCommand(GRAPH, ['deps', 'nonexistent.js'], { cwd: root });
  assert.equal(r.exitCode, 2);
});

test('graph stats: no graph → exit 1', async (t) => {
  const root = makeTmpProject();
  t.after(() => cleanup(root));
  const r = await runCommand(GRAPH, ['stats'], { cwd: root });
  assert.equal(r.exitCode, 1);
  assert.match(r.stderr, /No graph found/);
});

test('graph build --since: non-git repo → exit 1', async (t) => {
  const root = makeTmpProject();
  t.after(() => cleanup(root));
  seedJsProject(root);
  const r = await runCommand(GRAPH, ['build', '--since=HEAD'], { cwd: root });
  assert.equal(r.exitCode, 1);
  assert.match(r.stderr, /Not a git repository/);
});
