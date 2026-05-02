// Policy check engine.
//
// Inputs: project root, edited file path (rel to root).
// Output: { decision: 'approve' | 'approve+advisory' | 'block', ... }
//
// Decision flow:
//   1. Read policy-index.json. If missing or empty → approve.
//   2. If file is in `protected_files` (exact match) → block.
//   3. If file matches any `protected_globs` pattern → block.
//   4. If file is in auto-policy.yaml blacklist → block.
//   5. If overrides.js says override is active → demote block → advisory.
//   6. Else → approve.

import { readPolicyIndex } from './index-builder.js';
import { APPROVE, ADVISORY, BLOCK, makeDecision } from './decisions.js';
import { hasOverride } from './overrides.js';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function checkFile(projectRoot, file, ctx = {}) {
  const index = readPolicyIndex(projectRoot);
  if (!index) return makeDecision(APPROVE, { reason: 'no policy index' });

  const exact = index.protected_files?.[file];
  if (exact) {
    return maybeOverride(projectRoot, makeDecision(BLOCK, {
      reason: exact.reason ?? `Protected file: ${file}`,
      spec: exact.spec,
      contract: exact.contract,
      file,
    }), ctx);
  }

  for (const entry of index.protected_globs ?? []) {
    if (matchGlob(entry.pattern, file)) {
      return maybeOverride(projectRoot, makeDecision(BLOCK, {
        reason: entry.reason ?? `Matches protected glob: ${entry.pattern}`,
        spec: entry.spec,
        pattern: entry.pattern,
        file,
      }), ctx);
    }
  }

  const blacklist = readAutoPolicyBlacklist(projectRoot);
  for (const pattern of blacklist) {
    if (matchGlob(pattern, file)) {
      return maybeOverride(projectRoot, makeDecision(BLOCK, {
        reason: `Matches auto-policy.yaml blacklist: ${pattern}`,
        pattern,
        file,
      }), ctx);
    }
  }

  return makeDecision(APPROVE, { file });
}

function maybeOverride(projectRoot, decision, ctx) {
  if (decision.decision !== BLOCK) return decision;
  const ov = hasOverride(projectRoot, decision, ctx);
  if (ov.active) {
    return makeDecision(ADVISORY, {
      ...decision,
      decision: ADVISORY,
      reason: `${decision.reason} — overridden via ${ov.kind}`,
      override: ov,
    });
  }
  return decision;
}

function readAutoPolicyBlacklist(projectRoot) {
  const path = join(projectRoot, '_reversa_sdd', 'auto-policy.yaml');
  if (!existsSync(path)) return [];
  const out = [];
  let inBlacklist = false;
  for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
    const line = rawLine.replace(/#.*$/, '').trimEnd();
    if (/^blacklist\s*:/.test(line)) { inBlacklist = true; continue; }
    if (inBlacklist) {
      const m = line.match(/^\s*-\s+["']?([^"'\s]+)["']?\s*$/);
      if (m) out.push(m[1]);
      else if (/^[^\s]/.test(line)) inBlacklist = false; // new top-level key
    }
  }
  return out;
}

// Minimal glob matcher — supports `*`, `**`, and literal segments.
// Conventions:
//   - `**/x`  → matches `x`, `a/x`, `a/b/x`
//   - `x/**`  → matches `x` and everything under (`x/a`, `x/a/b`)
//   - `**/x/**` → matches `x/...` at any depth
//   - `*` → any chars except `/`
export function matchGlob(pattern, file) {
  const TRAIL = '__GLOB_TRAIL__';
  const LEAD = '__GLOB_LEAD__';
  const STAR = '__GLOB_STAR__';

  let p = pattern
    .replace(/\/\*\*$/g, TRAIL)         // trailing /** — match anything below (including nothing)
    .replace(/^\*\*\//g, LEAD)          // leading **/ — match zero or more dirs
    .replace(/\/\*\*\//g, '/' + STAR + '/')  // mid /**/
    .replace(/[.+^$|()[\]{}]/g, '\\$&')
    .replace(/\*/g, '[^/]*');

  p = p
    .replace(new RegExp(TRAIL, 'g'), '(?:/.*)?')
    .replace(new RegExp(LEAD, 'g'), '(?:.*/)?')
    .replace(new RegExp(STAR, 'g'), '(?:.*/)?');

  return new RegExp('^' + p + '$').test(file);
}
