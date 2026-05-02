#!/usr/bin/env node
//
// Reversa Keeper hook runner — lean append-only mode (v1.7.0+).
//
// Engine-agnostic. Invoked by hooks installed by `npx reversa add-hooks`.
//
// Phases:
//   - pre   : run policy check, dispatch engine adapter; exit code reflects
//             adapter outcome (0 approve, 2 block on engines that honor it).
//   - post  : append a single JSON line to .reversa/keeper-queue.jsonl
//   - stop  : emit a stderr advisory summarizing queued edits
//
// Contract:
//   - Reads JSON payload from stdin (best-effort — empty stdin is OK).
//   - Args: --phase <pre|post|stop> --engine <id> [--tool <name>] [--files <comma>]
//   - Errors logged to .reversa/keeper-errors.log (best-effort).
//
// JSONL append is atomic on POSIX for writes < PIPE_BUF (~4KB).
// No file locking needed.
//
// No external deps — runs with bare Node 18+.

import {
  existsSync, readFileSync, mkdirSync, appendFileSync,
} from 'node:fs';
import { join, dirname, relative, resolve as pathResolve } from 'node:path';
import { randomUUID } from 'node:crypto';

function parseArgs(argv) {
  const out = { phase: null, engine: null, tool: null, files: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--phase') out.phase = argv[++i];
    else if (a === '--engine') out.engine = argv[++i];
    else if (a === '--tool') out.tool = argv[++i];
    else if (a === '--files') out.files = (argv[++i] ?? '').split(',').filter(Boolean);
  }
  return out;
}

async function readStdin() {
  if (process.stdin.isTTY) return '';
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    const timeout = setTimeout(() => resolve(data), 200);
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => { clearTimeout(timeout); resolve(data); });
    process.stdin.on('error', () => { clearTimeout(timeout); resolve(data); });
  });
}

function findProjectRoot(startDir) {
  let dir = pathResolve(startDir);
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, '.reversa', 'state.json'))) return dir;
    dir = dirname(dir);
  }
  return startDir;
}

function logError(projectRoot, message) {
  try {
    const logPath = join(projectRoot, '.reversa', 'keeper-errors.log');
    mkdirSync(dirname(logPath), { recursive: true });
    appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n`, 'utf8');
  } catch { /* swallow */ }
}

function extractFilesFromPayload(payload, fallback) {
  if (!payload || typeof payload !== 'object') return fallback;
  const out = new Set(fallback);
  // Claude Code shapes
  const ti = payload.tool_input;
  if (ti) {
    if (typeof ti.file_path === 'string') out.add(ti.file_path);
    if (Array.isArray(ti.edits)) ti.edits.forEach((e) => e?.file_path && out.add(e.file_path));
    if (typeof ti.path === 'string') out.add(ti.path);
  }
  // Cursor / generic
  if (typeof payload.file_path === 'string') out.add(payload.file_path);
  if (Array.isArray(payload.files)) payload.files.forEach((f) => typeof f === 'string' && out.add(f));
  // Opencode
  if (payload.tool && payload.tool.input && typeof payload.tool.input.file_path === 'string') {
    out.add(payload.tool.input.file_path);
  }
  return Array.from(out);
}

function normalizeFiles(projectRoot, files) {
  return files.map((f) => {
    const abs = pathResolve(projectRoot, f);
    return relative(projectRoot, abs);
  }).filter((f) => !f.startsWith('..'));
}

function appendJsonl(projectRoot, entry) {
  const queuePath = join(projectRoot, '.reversa', 'keeper-queue.jsonl');
  mkdirSync(dirname(queuePath), { recursive: true });
  const line = JSON.stringify(entry) + '\n';
  appendFileSync(queuePath, line, 'utf8');
}

const ENGINE_TO_ADAPTER = {
  'claude-code': 'claude',
  'cursor': 'cursor',
  'kimi-cli': 'kimi',
  'codex': 'codex',
  'opencode': 'opencode',
};

async function runPolicy(projectRoot, engine, files) {
  if (files.length === 0) return 0;
  const adapterName = ENGINE_TO_ADAPTER[engine] ?? engine;
  let checkFile, adapter;
  try {
    ({ checkFile } = await import('../../policy/check.js'));
    adapter = await import(`../../policy/adapters/${adapterName}.js`);
  } catch (e) {
    logError(projectRoot, `policy modules unavailable: ${e.message}`);
    return 0;
  }
  let exitCode = 0;
  for (const file of files) {
    const decision = checkFile(projectRoot, file);
    const code = adapter.emit(decision, { stdout: process.stdout, stderr: process.stderr });
    if (code > exitCode) exitCode = code;
  }
  return exitCode;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.phase || !args.engine) return 0;
  if (!['pre', 'post', 'stop'].includes(args.phase)) return 0;

  const projectRoot = findProjectRoot(process.cwd());

  const stdinRaw = await readStdin();
  let payload = null;
  if (stdinRaw.trim()) {
    try { payload = JSON.parse(stdinRaw); } catch { /* non-JSON, ignore */ }
  }

  if (args.phase === 'pre') {
    const files = normalizeFiles(projectRoot, extractFilesFromPayload(payload, args.files));
    return await runPolicy(projectRoot, args.engine, files);
  }

  // For 'post' phase, extract changed files from payload/args.
  let files = [];
  if (args.phase === 'post') {
    files = normalizeFiles(projectRoot, extractFilesFromPayload(payload, args.files));
    if (files.length === 0) return 0;
  }

  const entry = {
    id: randomUUID(),
    ts: new Date().toISOString(),
    phase: args.phase,
    engine: args.engine,
    tool: args.tool ?? (payload?.tool_name ?? 'unknown'),
    files,
  };

  try {
    appendJsonl(projectRoot, entry);
  } catch (e) {
    logError(projectRoot, `queue append failed: ${e.message}`);
  }

  // For 'stop' phase, emit advisory to stderr — engine may show it to user.
  if (args.phase === 'stop') {
    let editFiles = new Set();
    try {
      const queuePath = join(projectRoot, '.reversa', 'keeper-queue.jsonl');
      if (existsSync(queuePath)) {
        const lines = readFileSync(queuePath, 'utf8').split('\n').filter(Boolean);
        const editLines = lines.filter((l) => {
          try { return JSON.parse(l).phase === 'post'; } catch { return false; }
        });
        if (editLines.length > 0) {
          editLines.forEach((l) => { try { JSON.parse(l).files?.forEach((f) => editFiles.add(f)); } catch {} });
          process.stderr.write(`\n[reversa-keeper] ${editLines.length} edits queued (${editFiles.size} files). Run /reversa-keeper after to update specs.\n\n`);
        }
      }
    } catch { /* swallow */ }

    // Phase 5: refresh graph incrementally with the dirty files. Best-effort —
    // never blocks. Skipped silently if the graph hasn't been built yet.
    if (editFiles.size > 0) {
      try { await refreshGraph(projectRoot, Array.from(editFiles)); }
      catch (e) { logError(projectRoot, `graph refresh failed: ${e.message}`); }
    }
  }
}

async function refreshGraph(projectRoot, dirtyFiles) {
  const graphPath = join(projectRoot, '.reversa', 'context', 'graph.json');
  if (!existsSync(graphPath)) return;
  const { incrementalUpdate } = await import('../../graph/incremental.js');
  const { readGraph, writeGraph } = await import('../../graph/store.js');
  const current = readGraph(projectRoot);
  if (!current) return;
  const updated = incrementalUpdate(projectRoot, current, dirtyFiles);
  writeGraph(projectRoot, updated);
}

main().then((code) => {
  process.exit(typeof code === 'number' ? code : 0);
}).catch((e) => {
  try {
    const root = findProjectRoot(process.cwd());
    logError(root, `runner crashed: ${e.message}`);
  } catch { /* ignore */ }
  process.exit(0);
});
