// Path resolution for L0 graph edges.
//
// Goal: turn an import specifier like 'src/auth/login' or '../db/users' into
// a repo-relative file path that exists on disk. If we can't resolve, edge
// is dropped (we never invent files).
//
// Supports:
//   - Relative imports (./ ../)
//   - JS/TS extension search (+ /index.js, /index.ts, etc.)
//   - tsconfig.json baseUrl + paths
//   - Python: dotted path → directory/file (relative + absolute), respects
//     repo-root packages (presence of __init__.py)
//   - Go: go.mod module → strip module prefix, resolve to repo path
//   - Java: package qualifier → src/main/java/x/y/Z.java search
//
// External packages (node_modules, pip, maven) are NOT resolved — caller
// gets back null and the edge is skipped.

import { existsSync, readFileSync, statSync, readdirSync } from 'node:fs';
import { join, dirname, resolve as pathResolve, relative, sep, isAbsolute } from 'node:path';

const JS_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts'];
const JS_INDEX = JS_EXTS.map((e) => `index${e}`);

export class Resolver {
  constructor(projectRoot) {
    this.projectRoot = pathResolve(projectRoot);
    this.tsconfig = loadTsconfig(this.projectRoot);
    this.goModule = loadGoModule(this.projectRoot);
  }

  resolve(fromFile, specifier, language) {
    const fromAbs = pathResolve(this.projectRoot, fromFile);
    if (language === 'javascript' || language === 'typescript') {
      return this.resolveJs(fromAbs, specifier);
    }
    if (language === 'python') return this.resolvePython(fromAbs, specifier);
    if (language === 'go') return this.resolveGo(specifier);
    if (language === 'java') return this.resolveJava(specifier);
    return null;
  }

  resolveJs(fromAbs, spec) {
    if (spec.startsWith('.')) {
      const base = pathResolve(dirname(fromAbs), spec);
      return this.tryJsExtensions(base);
    }
    if (this.tsconfig) {
      const mapped = this.applyTsconfigPaths(spec);
      if (mapped) {
        const base = pathResolve(this.projectRoot, mapped);
        const hit = this.tryJsExtensions(base);
        if (hit) return hit;
      }
    }
    // External (node_modules) — drop.
    return null;
  }

  tryJsExtensions(base) {
    if (existsSync(base) && statSync(base).isFile()) return this.toRel(base);
    for (const ext of JS_EXTS) {
      const candidate = base + ext;
      if (existsSync(candidate)) return this.toRel(candidate);
    }
    if (existsSync(base) && statSync(base).isDirectory()) {
      for (const idx of JS_INDEX) {
        const candidate = join(base, idx);
        if (existsSync(candidate)) return this.toRel(candidate);
      }
    }
    return null;
  }

  applyTsconfigPaths(spec) {
    const { baseUrl, paths } = this.tsconfig;
    for (const pattern of Object.keys(paths)) {
      if (pattern === spec) {
        const target = paths[pattern][0];
        return join(baseUrl, target);
      }
      if (pattern.endsWith('/*')) {
        const prefix = pattern.slice(0, -2);
        if (spec === prefix) continue;
        if (spec.startsWith(prefix + '/')) {
          const tail = spec.slice(prefix.length + 1);
          const target = paths[pattern][0].replace(/\/\*$/, `/${tail}`);
          return join(baseUrl, target);
        }
      }
    }
    return null;
  }

  resolvePython(fromAbs, spec) {
    let parts;
    let base;
    if (spec.startsWith('.')) {
      const dotMatch = spec.match(/^(\.+)(.*)$/);
      const upLevels = dotMatch[1].length;
      const rest = dotMatch[2];
      base = dirname(fromAbs);
      for (let i = 1; i < upLevels; i++) base = dirname(base);
      parts = rest ? rest.split('.').filter(Boolean) : [];
    } else {
      base = this.projectRoot;
      parts = spec.split('.').filter(Boolean);
    }
    const target = join(base, ...parts);
    if (existsSync(target + '.py')) return this.toRel(target + '.py');
    if (existsSync(join(target, '__init__.py'))) return this.toRel(join(target, '__init__.py'));
    return null;
  }

  resolveGo(spec) {
    if (!this.goModule) return null;
    const { name, root } = this.goModule;
    if (!spec.startsWith(name)) return null;
    const tail = spec === name ? '' : spec.slice(name.length + 1);
    const dir = join(root, tail);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) return null;
    // Pick first .go file (any will do — L0 is file-level).
    try {
      for (const f of readdirSync(dir)) {
        if (f.endsWith('.go') && !f.endsWith('_test.go')) return this.toRel(join(dir, f));
      }
    } catch { /* ignore */ }
    return null;
  }

  resolveJava(spec) {
    const cleaned = spec.replace(/\.\*$/, '');
    const candidate = cleaned.split('.').join(sep) + '.java';
    for (const root of ['src/main/java', 'src/test/java', 'src']) {
      const full = pathResolve(this.projectRoot, root, candidate);
      if (existsSync(full)) return this.toRel(full);
    }
    return null;
  }

  toRel(abs) {
    const rel = relative(this.projectRoot, abs);
    if (rel.startsWith('..') || isAbsolute(rel)) return null;
    return rel.split(sep).join('/');
  }
}

function loadTsconfig(projectRoot) {
  const path = join(projectRoot, 'tsconfig.json');
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const cfg = JSON.parse(raw);
    const opts = cfg.compilerOptions ?? {};
    if (!opts.paths) return null;
    return { baseUrl: opts.baseUrl ?? '.', paths: opts.paths };
  } catch {
    return null;
  }
}

function loadGoModule(projectRoot) {
  const path = join(projectRoot, 'go.mod');
  if (!existsSync(path)) return null;
  try {
    const content = readFileSync(path, 'utf8');
    const match = content.match(/^\s*module\s+(\S+)/m);
    if (!match) return null;
    return { name: match[1], root: projectRoot };
  } catch {
    return null;
  }
}
