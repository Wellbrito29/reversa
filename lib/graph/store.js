// Graph storage — read/write `.aegis/context/graph.json` atomically.
//
// Atomic = write to `<path>.tmp`, then rename. Rename is atomic on POSIX
// for files on the same filesystem, which is always the case here.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const GRAPH_REL = '.aegis/context/graph.json';

export function graphPath(projectRoot) {
  return join(projectRoot, GRAPH_REL);
}

export function readGraph(projectRoot) {
  const path = graphPath(projectRoot);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    throw new Error(`graph.json malformed: ${e.message}`);
  }
}

export function writeGraph(projectRoot, graph) {
  const path = graphPath(projectRoot);
  mkdirSync(dirname(path), { recursive: true });
  const tmp = path + '.tmp';
  writeFileSync(tmp, JSON.stringify(graph, null, 2) + '\n', 'utf8');
  renameSync(tmp, path);
  return path;
}
