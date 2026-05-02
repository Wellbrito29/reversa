// L0 graph builder.
//
// Walks the repo, dispatches files to the right L0 parser, runs each
// import specifier through the resolver, and emits a `{ nodes, edges }`
// payload conforming to schema v1.
//
// Skipped: anything in `.git`, `node_modules`, `dist`, `build`, `.reversa`,
// hidden directories, or matched by the user's `.gitignore`-style ignores
// (we don't read gitignore yet — Phase 2 keeps the static skip list).

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { getParserForFile } from './parsers-l0/index.js';
import { Resolver } from './resolve.js';

const DEFAULT_IGNORES = new Set([
  '.git', 'node_modules', 'dist', 'build', '.reversa', '_reversa_sdd',
  '.next', '.nuxt', '.cache', '.turbo', '.parcel-cache', 'coverage',
  '.venv', 'venv', '__pycache__', '.pytest_cache', '.mypy_cache',
  'target', 'vendor', '.gradle', '.idea', '.vscode',
]);

export function buildGraph(projectRoot, opts = {}) {
  const root = projectRoot;
  const ignores = new Set([...DEFAULT_IGNORES, ...(opts.ignores ?? [])]);
  const onlyFiles = opts.onlyFiles ? new Set(opts.onlyFiles.map((f) => normalize(f))) : null;

  const files = walk(root, ignores);
  const targetFiles = onlyFiles
    ? files.filter((f) => onlyFiles.has(normalize(relative(root, f))))
    : files;

  const resolver = new Resolver(root);
  const nodes = new Map();
  const edges = [];
  const languages = new Set();

  for (const absPath of targetFiles) {
    const parser = getParserForFile(absPath);
    if (!parser) continue;
    const rel = normalize(relative(root, absPath));
    if (!nodes.has(rel)) {
      nodes.set(rel, { id: rel, type: 'file', lang: peekLanguage(parser) });
    }
    let parsed;
    try {
      const src = readFileSync(absPath, 'utf8');
      parsed = parser.parseL0(src);
    } catch {
      continue;
    }
    languages.add(parsed.language);
    nodes.set(rel, { id: rel, type: 'file', lang: parsed.language });
    for (const spec of parsed.imports) {
      const target = resolver.resolve(rel, spec, parsed.language);
      if (!target) continue;
      if (target === rel) continue;
      if (!nodes.has(target)) {
        const targetParser = getParserForFile(target);
        nodes.set(target, {
          id: target, type: 'file',
          lang: targetParser ? peekLanguage(targetParser) : 'unknown',
        });
      }
      edges.push({ from: rel, to: target, kind: 'imports' });
    }
  }

  return {
    version: 1,
    level: 'L0',
    built_at: new Date().toISOString(),
    languages_detected: Array.from(languages).sort(),
    nodes: Array.from(nodes.values()),
    edges: dedupEdges(edges),
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
      if (ent.name.startsWith('.') && !['__init__.py'].includes(ent.name)) continue;
      const full = join(current, ent.name);
      if (ent.isDirectory()) stack.push(full);
      else if (ent.isFile()) out.push(full);
    }
  }
  return out;
}

function peekLanguage(parser) {
  // Cheap: parse empty source to read .language without doing real work.
  try { return parser.parseL0('').language; }
  catch { return 'unknown'; }
}

function dedupEdges(edges) {
  const seen = new Set();
  const out = [];
  for (const e of edges) {
    const key = `${e.from}\0${e.to}\0${e.kind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

function normalize(p) {
  return p.split(sep).join('/');
}
