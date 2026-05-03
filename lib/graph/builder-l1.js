// L1 graph builder (JS/TS) — augments an L0 graph with symbol-level
// nodes (functions, classes, methods) + `calls` edges + per-file
// `exports` metadata.
//
// Schema: extends v1 with:
//   - level: "L1"
//   - symbols: [{ id, type: "function"|"class"|"method", file, name, signature, line, exported, ... }]
//   - calls:   [{ from: "<file>#<symbol>", callee: "<name>", line, arity, await }]
//   - exports: [{ file, kind, name, line, source? }]
//
// Cross-file `calls` edges (caller-symbol → callee-symbol) are computed
// in `lib/graph/queries/context.js` at query time, since import
// resolution is already in the L0 layer.

import { existsSync, readFileSync, statSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { getL1ParserForFile } from './parsers-l1/index.js';

const DEFAULT_IGNORES = new Set([
  '.git', 'node_modules', 'dist', 'build', '.reversa', '_reversa_sdd',
  '.next', '.nuxt', '.cache', '.turbo', '.parcel-cache', 'coverage',
  '.venv', 'venv', '__pycache__', 'target', 'vendor', '.idea', '.vscode',
]);

export function buildL1(projectRoot, opts = {}) {
  const ignores = new Set([...DEFAULT_IGNORES, ...(opts.ignores ?? [])]);
  const onlyFiles = opts.onlyFiles ? new Set(opts.onlyFiles.map((f) => normalize(f))) : null;

  const files = walk(projectRoot, ignores);
  const targetFiles = onlyFiles
    ? files.filter((f) => onlyFiles.has(normalize(relative(projectRoot, f))))
    : files;

  const symbols = [];
  const calls = [];
  const exports_ = [];
  const errors = [];
  const langs = new Set();

  for (const absPath of targetFiles) {
    const parser = getL1ParserForFile(absPath);
    if (!parser) continue;
    const rel = normalize(relative(projectRoot, absPath));
    let ast;
    try {
      const src = readFileSync(absPath, 'utf8');
      ast = parser.parseAst(src, { filename: rel });
    } catch (e) {
      errors.push({ file: rel, message: e.message });
      continue;
    }
    langs.add(parser.language);

    let extracted;
    try {
      extracted = parser.extract(ast, rel);
    } catch (e) {
      errors.push({ file: rel, message: `extract: ${e.message}` });
      continue;
    }
    symbols.push(...(extracted.symbols ?? []));
    calls.push(...(extracted.calls ?? []));
    exports_.push(...(extracted.exports ?? []));
  }

  return {
    version: 2,
    level: 'L1',
    built_at: new Date().toISOString(),
    languages_detected: Array.from(langs).sort(),
    symbols,
    calls,
    exports: exports_,
    parse_errors: errors,
  };
}

export function mergeL0L1(l0, l1) {
  return {
    ...l0,
    version: 2,
    level: 'L1',
    built_at: l1.built_at,
    languages_detected: Array.from(new Set([
      ...(l0.languages_detected ?? []),
      ...(l1.languages_detected ?? []),
    ])).sort(),
    symbols: l1.symbols,
    calls: l1.calls,
    exports: l1.exports,
    parse_errors: l1.parse_errors,
  };
}

function walk(dir, ignores) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try { entries = readdirSync(current, { withFileTypes: true }); }
    catch { continue; }
    for (const ent of entries) {
      if (ignores.has(ent.name)) continue;
      if (ent.name.startsWith('.')) continue;
      const full = join(current, ent.name);
      if (ent.isDirectory()) stack.push(full);
      else if (ent.isFile()) out.push(full);
    }
  }
  return out;
}

function normalize(p) {
  return p.split(sep).join('/');
}
