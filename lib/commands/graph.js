// `npx aegis-spec graph <subcommand> [args] [opts]`
//
// Subcommands:
//   build [--level L0|L1] [--since <ref>] [--files a,b,c]   Build (or incremental)
//   impact <file> [--json]                  Transitive reverse-deps (BFS)
//   deps <file> [--json]                    Direct outgoing deps
//   reverse-deps <file> [--json]            Direct incoming deps (1 level)
//   context <symbol> [--json]               L1 symbol → declaration + callers
//   signature <symbol> [--json]             L1 symbol → normalized signature
//   stats [--json]                          Node/edge counts per language
//
// Exit codes:
//   0  success
//   1  bad usage / missing graph
//   2  query target file or symbol not in graph

import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import chalk from 'chalk';
import { buildGraph } from '../graph/builder.js';
import { buildL1, mergeL0L1 } from '../graph/builder-l1.js';
import { incrementalUpdate } from '../graph/incremental.js';
import { readGraph, writeGraph } from '../graph/store.js';
import { impact } from '../graph/queries/impact.js';
import { deps } from '../graph/queries/deps.js';
import { reverseDeps } from '../graph/queries/reverse-deps.js';
import { signature, findSymbol } from '../graph/queries/signature.js';
import { context } from '../graph/queries/context.js';

const orange = chalk.hex('#ffa203');

function parseFlags(args) {
  const out = { positional: [], flags: {} };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--json') out.flags.json = true;
    else if (a === '--since') out.flags.since = args[++i];
    else if (a.startsWith('--since=')) out.flags.since = a.slice('--since='.length);
    else if (a === '--files') out.flags.files = (args[++i] ?? '').split(',').filter(Boolean);
    else if (a.startsWith('--files=')) out.flags.files = a.slice('--files='.length).split(',').filter(Boolean);
    else if (a === '--level') out.flags.level = args[++i];
    else if (a.startsWith('--level=')) out.flags.level = a.slice('--level='.length);
    else out.positional.push(a);
  }
  return out;
}

function isGitRepo(projectRoot) {
  try {
    execSync('git rev-parse --git-dir', { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function dirtyFilesSince(projectRoot, ref) {
  if (!isGitRepo(projectRoot)) {
    throw new Error('Not a git repository. --since requires git.');
  }
  try {
    const out = execSync(`git diff --name-only ${ref}`, {
      cwd: projectRoot, encoding: 'utf8', stdio: 'pipe',
    }).trim();
    if (!out) return [];
    return out.split('\n').filter(Boolean);
  } catch (e) {
    throw new Error(`git diff --name-only ${ref} failed: ${e.message}`);
  }
}

async function buildCmd(projectRoot, flags) {
  const t0 = Date.now();
  let graph;

  try {
    if (flags.since) {
      const existing = readGraph(projectRoot);
      if (!existing) {
        console.error(orange('  No existing graph; --since requires a prior build. Falling back to full rebuild.'));
        graph = buildGraph(projectRoot);
      } else {
        const dirty = dirtyFilesSince(projectRoot, flags.since);
        if (dirty.length === 0) {
          console.log(orange(`  No dirty files since ${flags.since}; nothing to update.`));
          return 0;
        }
        graph = incrementalUpdate(projectRoot, existing, dirty);
      }
    } else if (flags.files && flags.files.length > 0) {
      const existing = readGraph(projectRoot);
      if (!existing) {
        console.error(orange('  --files is incremental; building full graph first.'));
        graph = buildGraph(projectRoot);
      } else {
        graph = incrementalUpdate(projectRoot, existing, flags.files);
      }
    } else {
      graph = buildGraph(projectRoot);
    }
  } catch (e) {
    console.error(orange(`\n  Graph build failed: ${e.message}\n`));
    if (e.stack) console.error(e.stack);
    process.exit(1);
  }

  if (flags.level === 'L1') {
    const l1 = buildL1(projectRoot);
    graph = mergeL0L1(graph, l1);
  }

  const path = writeGraph(projectRoot, graph);
  const ms = Date.now() - t0;
  if (flags.json) {
    console.log(JSON.stringify({
      path,
      level: graph.level,
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      symbols: graph.symbols?.length ?? 0,
      calls: graph.calls?.length ?? 0,
      parse_errors: graph.parse_errors?.length ?? 0,
      ms,
    }));
  } else {
    console.log(orange(`\n  ✓  graph written: ${path}`));
    let line = `     ${graph.nodes.length} nodes, ${graph.edges.length} edges`;
    if (graph.level === 'L1') {
      line += `, ${graph.symbols?.length ?? 0} symbols, ${graph.calls?.length ?? 0} call sites`;
    }
    console.log(line + ` (${ms}ms)`);
    if (graph.parse_errors?.length > 0) {
      console.log(orange(`     ${graph.parse_errors.length} files failed to parse (logged in graph.parse_errors)`));
    }
    console.log('');
  }
  return 0;
}

function loadOrFail(projectRoot) {
  const g = readGraph(projectRoot);
  if (!g) {
    console.error(orange('\n  No graph found. Run: npx aegis-spec graph build\n'));
    process.exit(1);
  }
  return g;
}

function ensureNode(graph, file) {
  if (!graph.nodes.some((n) => n.id === file)) {
    console.error(orange(`\n  File not in graph: ${file}\n`));
    process.exit(2);
  }
}

function printList(label, items, jsonMode) {
  if (jsonMode) {
    console.log(JSON.stringify({ [label]: items, count: items.length }));
    return;
  }
  console.log(orange(`\n  ${label} (${items.length}):`));
  for (const item of items) console.log(`    - ${item}`);
  console.log('');
}

function statsCmd(graph, jsonMode) {
  const langCounts = {};
  for (const n of graph.nodes) {
    langCounts[n.lang] = (langCounts[n.lang] ?? 0) + 1;
  }
  if (jsonMode) {
    console.log(JSON.stringify({
      version: graph.version, level: graph.level, built_at: graph.built_at,
      nodes: graph.nodes.length, edges: graph.edges.length, by_language: langCounts,
    }));
    return 0;
  }
  console.log(orange(`\n  Graph stats (${graph.level}, v${graph.version}):`));
  console.log(`    built_at: ${graph.built_at}`);
  console.log(`    nodes:    ${graph.nodes.length}`);
  console.log(`    edges:    ${graph.edges.length}`);
  console.log(`    by language:`);
  for (const [lang, count] of Object.entries(langCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`      ${lang.padEnd(12)} ${count}`);
  }
  console.log('');
  return 0;
}

function usage() {
  console.log(`
  Usage: npx aegis-spec graph <subcommand> [args] [opts]

  Subcommands:
    build [--level L0|L1] [--since <ref>] [--files a,b,c]   Build (or incremental)
    impact <file> [--json]                  Transitive reverse-deps (BFS)
    deps <file> [--json]                    Direct outgoing deps
    reverse-deps <file> [--json]            Direct incoming deps (1 level)
    context <symbol> [--json]               L1: declaration + callers
    signature <symbol> [--json]             L1: normalized signature string
    stats [--json]                          Node/edge counts per language
`);
}

export default async function graphCmd(rawArgs) {
  const projectRoot = resolve(process.cwd());
  if (rawArgs.length === 0 || rawArgs[0] === '--help' || rawArgs[0] === '-h') {
    usage();
    return;
  }
  const sub = rawArgs[0];
  const { positional, flags } = parseFlags(rawArgs.slice(1));

  if (sub === 'build') {
    await buildCmd(projectRoot, flags);
    return;
  }

  if (sub === 'stats') {
    const g = loadOrFail(projectRoot);
    statsCmd(g, flags.json);
    return;
  }

  if (['impact', 'deps', 'reverse-deps'].includes(sub)) {
    const file = positional[0];
    if (!file) {
      console.error(orange(`\n  ${sub} requires a <file> argument.\n`));
      process.exit(1);
    }
    const g = loadOrFail(projectRoot);
    ensureNode(g, file);
    if (sub === 'impact') printList('impact', impact(g, file), flags.json);
    if (sub === 'deps') printList('deps', deps(g, file), flags.json);
    if (sub === 'reverse-deps') printList('reverse_deps', reverseDeps(g, file), flags.json);
    return;
  }

  if (sub === 'signature' || sub === 'context') {
    const target = positional[0];
    if (!target) {
      console.error(orange(`\n  ${sub} requires a <symbol> argument (id or name).\n`));
      process.exit(1);
    }
    const g = loadOrFail(projectRoot);
    if (g.level !== 'L1') {
      console.error(orange(`\n  Graph is L0; ${sub} needs L1. Run: npx aegis-spec graph build --level L1\n`));
      process.exit(1);
    }
    if (sub === 'signature') {
      const sig = signature(g, target);
      if (!sig) {
        console.error(orange(`\n  Symbol not found: ${target}\n`));
        process.exit(2);
      }
      if (flags.json) {
        const sym = findSymbol(g, target);
        console.log(JSON.stringify({ id: sym.id, name: sym.name, signature: sig, file: sym.file, line: sym.line }));
      } else {
        const sym = findSymbol(g, target);
        console.log(orange(`\n  ${sym.id}`));
        console.log(`    signature: ${sig}`);
        console.log(`    file:      ${sym.file}:${sym.line}`);
        console.log('');
      }
      return;
    }
    if (sub === 'context') {
      const ctx = context(g, target);
      if (!ctx) {
        console.error(orange(`\n  Symbol not found: ${target}\n`));
        process.exit(2);
      }
      if (flags.json) {
        console.log(JSON.stringify(ctx, null, 2));
      } else {
        const d = ctx.declaration;
        console.log(orange(`\n  ${d.id}`));
        console.log(`    type:      ${d.type}`);
        console.log(`    signature: ${d.signature ?? '—'}`);
        console.log(`    file:      ${d.file}:${d.line ?? '?'}`);
        console.log(`    exported:  ${d.exported ? 'yes' : 'no'}`);
        if (ctx.aliases.length > 0) {
          console.log(`    aliases:   ${ctx.aliases.join(', ')}`);
        }
        console.log(`    callers:   ${ctx.callers_count}`);
        for (const c of ctx.callers.slice(0, 10)) {
          console.log(`      ${c.file}:${c.line}  (${c.callee})`);
        }
        if (ctx.callers.length > 10) {
          console.log(`      … +${ctx.callers.length - 10} more`);
        }
        console.log('');
      }
      return;
    }
  }

  console.error(orange(`\n  Unknown subcommand: ${sub}\n`));
  usage();
  process.exit(1);
}

