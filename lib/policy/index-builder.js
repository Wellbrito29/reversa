// Policy index builder.
//
// Walks `_reversa_sdd/sdd/`, parses YAML frontmatter from each spec,
// extracts:
//   - contracts: [{ name, file, protected, reason }]
//   - protected_files: [glob, ...]
//
// Aggregates into `.reversa/context/policy-index.json` for fast lookup
// at hook time.
//
// Schema:
//   {
//     "version": 1,
//     "built_at": "...",
//     "specs": {
//       "_reversa_sdd/sdd/auth.md": { protected_globs: [...], contracts: [...] }
//     },
//     "protected_globs": [{ pattern, spec, reason }],
//     "protected_files": { "src/api/login.js": { spec, reason } }
//   }
//
// Frontmatter parsing is intentionally minimal — only the two keys we
// care about. We don't pull in a YAML lib for Phase 4 (keep zero-dep).

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, sep } from 'node:path';

const SDD_REL = '_reversa_sdd/sdd';
const POLICY_INDEX_REL = '.reversa/context/policy-index.json';

export function policyIndexPath(projectRoot) {
  return join(projectRoot, POLICY_INDEX_REL);
}

export function buildPolicyIndex(projectRoot) {
  const sddDir = join(projectRoot, SDD_REL);
  const result = {
    version: 1,
    built_at: new Date().toISOString(),
    specs: {},
    protected_globs: [],
    protected_files: {},
  };

  if (!existsSync(sddDir)) return result;

  for (const file of walkMarkdown(sddDir)) {
    const rel = normalize(file.slice(projectRoot.length + 1));
    const fm = parseFrontmatter(readFileSync(file, 'utf8'));
    if (!fm) continue;

    const specEntry = { protected_globs: [], contracts: [] };

    if (Array.isArray(fm.protected_files)) {
      for (const pattern of fm.protected_files) {
        if (typeof pattern !== 'string') continue;
        specEntry.protected_globs.push(pattern);
        result.protected_globs.push({ pattern, spec: rel, reason: fm.protected_reason ?? null });
      }
    }

    if (Array.isArray(fm.contracts)) {
      for (const c of fm.contracts) {
        if (!c || typeof c !== 'object') continue;
        specEntry.contracts.push(c);
        if (c.protected && typeof c.file === 'string') {
          result.protected_files[normalize(c.file)] = {
            spec: rel,
            reason: c.reason ?? null,
            contract: c.name ?? null,
          };
        }
      }
    }

    if (specEntry.protected_globs.length > 0 || specEntry.contracts.length > 0) {
      result.specs[rel] = specEntry;
    }
  }

  return result;
}

export function writePolicyIndex(projectRoot, index) {
  const path = policyIndexPath(projectRoot);
  mkdirSync(dirname(path), { recursive: true });
  const tmp = path + '.tmp';
  writeFileSync(tmp, JSON.stringify(index, null, 2) + '\n', 'utf8');
  renameSync(tmp, path);
  return path;
}

export function readPolicyIndex(projectRoot) {
  const path = policyIndexPath(projectRoot);
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch (e) { throw new Error(`policy-index.json malformed: ${e.message}`); }
}

function walkMarkdown(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try { entries = readdirSync(current, { withFileTypes: true }); }
    catch { continue; }
    for (const ent of entries) {
      const full = join(current, ent.name);
      if (ent.isDirectory()) stack.push(full);
      else if (ent.isFile() && ent.name.endsWith('.md')) out.push(full);
    }
  }
  return out;
}

// Minimal YAML frontmatter parser — supports only the shapes we use:
//   key: scalar
//   key:
//     - scalar
//     - { name: foo, file: bar.js, protected: true, reason: "..." }
//     - name: foo
//       file: bar.js
//       protected: true
function parseFrontmatter(content) {
  if (!content.startsWith('---')) return null;
  const end = content.indexOf('\n---', 3);
  if (end === -1) return null;
  const block = content.slice(3, end).trim();
  return parseYamlSubset(block);
}

function parseYamlSubset(block) {
  const lines = block.split('\n');
  const root = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) { i++; continue; }
    const m = line.match(/^([a-zA-Z_][\w-]*)\s*:\s*(.*)$/);
    if (!m) { i++; continue; }
    const key = m[1];
    const inline = m[2];
    if (inline !== '') {
      root[key] = parseScalar(inline);
      i++;
      continue;
    }
    const items = [];
    let j = i + 1;
    while (j < lines.length) {
      const next = lines[j];
      if (!next.startsWith('  ')) break;
      const trimmed = next.trim();
      if (trimmed.startsWith('- ')) {
        const item = trimmed.slice(2);
        if (item.startsWith('{') && item.endsWith('}')) {
          items.push(parseInlineObject(item));
        } else if (item.includes(':')) {
          const obj = {};
          const [k, v] = splitKV(item);
          obj[k] = parseScalar(v);
          let k2 = j + 1;
          while (k2 < lines.length && lines[k2].startsWith('    ')) {
            const childTrimmed = lines[k2].trim();
            if (childTrimmed.includes(':')) {
              const [ck, cv] = splitKV(childTrimmed);
              obj[ck] = parseScalar(cv);
            }
            k2++;
          }
          items.push(obj);
          j = k2 - 1;
        } else {
          items.push(parseScalar(item));
        }
      }
      j++;
    }
    root[key] = items;
    i = j;
  }
  return root;
}

function splitKV(s) {
  const idx = s.indexOf(':');
  return [s.slice(0, idx).trim(), s.slice(idx + 1).trim()];
}

function parseScalar(s) {
  const t = s.trim();
  if (t === '') return '';
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t === 'null' || t === '~') return null;
  if (/^-?\d+$/.test(t)) return parseInt(t, 10);
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function parseInlineObject(s) {
  const inner = s.slice(1, -1);
  const obj = {};
  for (const part of inner.split(',')) {
    const [k, v] = splitKV(part);
    obj[k] = parseScalar(v);
  }
  return obj;
}

function normalize(p) {
  return p.split(sep).join('/');
}
