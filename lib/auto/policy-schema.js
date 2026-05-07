// Parse `aegis/config/auto-policy.yaml` into a typed shape.
//
// We accept only the documented schema (see templates/auto-policy.example.yaml).
// Indentation is two-space; lists are dashes at the next indent level.
//
//   auto_resolve:
//     enabled: true
//     confidence_threshold: 0.85
//     max_specs_per_pr: 5
//     whitelist:
//       paths: ["**/*.test.*", "docs/**"]
//       change_types: [test_only, format_only]
//     blacklist:
//       paths: ["**/contracts/**"]
//       change_types: [public_api_change]
//     escalate_on:
//       - "spec_deletion"
//     llm:
//       model: claude-haiku-4-5
//       fallback: claude-sonnet-4-6

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const DEFAULT_POLICY = Object.freeze({
  enabled: false,
  confidence_threshold: 0.85,
  max_specs_per_pr: 5,
  whitelist: { paths: [], change_types: [] },
  blacklist: { paths: [], change_types: [] },
  escalate_on: [],
  llm: {
    model: 'claude-haiku-4-5',
    fallback: 'claude-sonnet-4-6',
  },
});

export function readAutoPolicy(projectRoot) {
  const path = join(projectRoot, 'aegis', 'auto-policy.yaml');
  if (!existsSync(path)) return { ...clone(DEFAULT_POLICY), _source: null };
  const out = parsePolicy(readFileSync(path, 'utf8'));
  out._source = path;
  return out;
}

export function parsePolicy(raw) {
  const out = clone(DEFAULT_POLICY);
  const lines = raw.split('\n');

  // path[] tracks the section we're inside, indexed by indent level.
  // path[0] = top-level key (e.g., "auto_resolve"), path[1] = nested key.
  const path = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, '').replace(/\s+$/, '');
    if (line === '') continue;

    const indent = line.match(/^ */)[0].length;
    const trimmed = line.slice(indent);
    const level = indent / 2;

    if (trimmed.startsWith('-')) {
      const item = trimmed.slice(1).trim();
      pushList(out, path.slice(0, level), parseScalar(item));
      continue;
    }

    const m = trimmed.match(/^([\w_]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const [, key, value] = m;
    path[level] = key;
    path.length = level + 1;

    if (value === '') continue;
    assign(out, path.slice(), parseInline(value));
  }

  return out;
}

function assign(out, segs, value) {
  if (segs[0] !== 'auto_resolve') return;
  if (segs.length === 2) {
    const k = segs[1];
    if (k === 'enabled') out.enabled = !!value;
    else if (k === 'confidence_threshold') out.confidence_threshold = Number(value);
    else if (k === 'max_specs_per_pr') out.max_specs_per_pr = Number(value);
    return;
  }
  if (segs.length === 3 && (segs[1] === 'whitelist' || segs[1] === 'blacklist')) {
    if (Array.isArray(value)) out[segs[1]][segs[2]] = value.map(String);
    return;
  }
  if (segs.length === 3 && segs[1] === 'llm') {
    out.llm[segs[2]] = String(value);
  }
}

function pushList(out, segs, value) {
  if (segs[0] !== 'auto_resolve') return;
  if (segs[1] === 'escalate_on') {
    out.escalate_on.push(String(value));
    return;
  }
  if ((segs[1] === 'whitelist' || segs[1] === 'blacklist') && segs[2]) {
    out[segs[1]][segs[2]].push(String(value));
  }
}

function parseInline(v) {
  const t = v.trim();
  if (t.startsWith('[') && t.endsWith(']')) {
    return t
      .slice(1, -1)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map(parseScalar);
  }
  return parseScalar(t);
}

function parseScalar(s) {
  const t = String(s).trim();
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t === 'null' || t === '~') return null;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}
