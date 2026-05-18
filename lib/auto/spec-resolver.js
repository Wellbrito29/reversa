// Resolves the spec path for a source file using two strategies:
//
//   1. Direct: look up `file` in code-spec-matrix.md (file → spec column).
//   2. Graph fallback: load graph.json, find files that import `file`
//      (reverse-deps, 1 level), then look each importer up in the matrix.
//      Returns the first match found.
//
// Used in keeper-auto when a queue entry lacks spec_path — happens for
// new files or cross-module utilities whose parent directory has no clear
// spec owner (K-05).

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function findMatrixPath(root) {
  const p = join(root, 'aegis', 'traceability', 'code-spec-matrix.md');
  return existsSync(p) ? p : null;
}

function parseFileToSpec(content) {
  const map = new Map();
  for (const line of content.split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').map((s) => s.trim()).filter(Boolean);
    if (cells.length < 2) continue;
    const fileMatch = cells[0].match(/`([^`]+)`/);
    const specMatch = cells[1].match(/`([^`]+)`/);
    if (!fileMatch || !specMatch) continue;
    if (!map.has(fileMatch[1])) map.set(fileMatch[1], specMatch[1]);
  }
  return map;
}

function loadGraph(root) {
  const p = join(root, 'aegis', 'runtime', 'context', 'graph.json');
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
}

function reverseImporters(graph, file) {
  return (graph.edges ?? [])
    .filter((e) => e.kind === 'imports' && e.to === file)
    .map((e) => e.from);
}

/**
 * Resolve the best-matching spec path for a source file.
 * Returns an absolute spec path string, or null if unresolvable.
 *
 * @param {string} file  Relative file path (as stored in queue entry)
 * @param {{ root: string }} opts
 * @returns {string|null}
 */
export function resolveSpecPath(file, { root }) {
  const matrixPath = findMatrixPath(root);
  if (!matrixPath) return null;

  const fileToSpec = parseFileToSpec(readFileSync(matrixPath, 'utf8'));

  const direct = fileToSpec.get(file);
  if (direct) return direct;

  const graph = loadGraph(root);
  if (!graph) return null;

  for (const importer of reverseImporters(graph, file)) {
    const via = fileToSpec.get(importer);
    if (via) return via;
  }

  return null;
}
