// `npx reversa graph <subcommand> [args] [opts]`
//
// Subcommands:
//   build [--since <ref>] [--files a,b,c]   Build (or incrementally update) graph
//   impact <file> [--json]                  Transitive reverse-deps (BFS)
//   deps <file> [--json]                    Direct outgoing deps
//   reverse-deps <file> [--json]            Direct incoming deps (1 level)
//   stats [--json]                          Node/edge counts per language
//
// Exit codes:
//   0  success
//   1  bad usage / missing graph
//   2  query target file not in graph

import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import chalk from 'chalk';
import { buildGraph } from '../graph/builder.js';
import { incrementalUpdate } from '../graph/incremental.js';
import { readGraph, writeGraph } from '../graph/store.js';
import { impact } from '../graph/queries/impact.js';
import { deps } from '../graph/queries/deps.js';
import { reverseDeps } from '../graph/queries/reverse-deps.js';

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
    else out.positional.push(a);
  }
  return out;
}

function dirtyFilesSince(projectRoot, ref) {
  try {
    const out = execSync(`git diff --name-only ${ref}`, {
      cwd: projectRoot, encoding: 'utf8',
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
  const path = writeGraph(projectRoot, graph);
  const ms = Date.now() - t0;
  if (flags.json) {
    console.log(JSON.stringify({ path, nodes: graph.nodes.length, edges: graph.edges.length, ms }));
  } else {
    console.log(orange(`\n  ✓  graph written: ${path}`));
    console.log(`     ${graph.nodes.length} nodes, ${graph.edges.length} edges (${ms}ms)\n`);
  }
  return 0;
}

function loadOrFail(projectRoot) {
  const g = readGraph(projectRoot);
  if (!g) {
    console.error(orange('\n  No graph found. Run: npx reversa graph build\n'));
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
  Usage: npx reversa graph <subcommand> [args] [opts]

  Subcommands:
    build [--since <ref>] [--files a,b,c]   Build (or incrementally update)
    impact <file> [--json]                  Transitive reverse-deps (BFS)
    deps <file> [--json]                    Direct outgoing deps
    reverse-deps <file> [--json]            Direct incoming deps (1 level)
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

  console.error(orange(`\n  Unknown subcommand: ${sub}\n`));
  usage();
  process.exit(1);
}

