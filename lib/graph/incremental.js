// Incremental graph update — re-parse only `dirtyFiles`, splice into
// the existing graph. Removes the old node + outgoing edges of each
// dirty file, then re-walks just those files.
//
// For deletions: file is removed from nodes; all incoming edges that
// pointed at it stay (resolver will drop them on next full rebuild,
// but they're harmless and represent stale-link signal).

import { existsSync } from 'node:fs';
import { join, sep } from 'node:path';
import { buildGraph } from './builder.js';

export function incrementalUpdate(projectRoot, currentGraph, dirtyFiles) {
  const dirty = dirtyFiles.map((f) => normalize(f));
  const dirtySet = new Set(dirty);

  const filteredNodes = currentGraph.nodes.filter((n) => !dirtySet.has(n.id));
  const filteredEdges = currentGraph.edges.filter((e) => !dirtySet.has(e.from));

  const existing = dirty.filter((f) => existsSync(join(projectRoot, f)));
  let partial = { nodes: [], edges: [], languages_detected: [] };
  if (existing.length > 0) {
    partial = buildGraph(projectRoot, { onlyFiles: existing });
  }

  const nodeMap = new Map();
  for (const n of filteredNodes) nodeMap.set(n.id, n);
  for (const n of partial.nodes) nodeMap.set(n.id, n);

  const seenEdges = new Set();
  const edges = [];
  for (const e of [...filteredEdges, ...partial.edges]) {
    const key = `${e.from}\0${e.to}\0${e.kind}`;
    if (seenEdges.has(key)) continue;
    seenEdges.add(key);
    edges.push(e);
  }

  const langs = new Set([
    ...(currentGraph.languages_detected ?? []),
    ...(partial.languages_detected ?? []),
  ]);

  return {
    version: currentGraph.version,
    level: currentGraph.level,
    built_at: new Date().toISOString(),
    languages_detected: Array.from(langs).sort(),
    nodes: Array.from(nodeMap.values()),
    edges,
  };
}

function normalize(p) {
  return p.split(sep).join('/');
}
