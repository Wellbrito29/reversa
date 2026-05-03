// Policy check engine.
//
// Inputs: project root, edited file path (rel to root), optional ctx with
// before/after sources and (optionally) the upstream graph for caller lookup.
//
// Output: { decision: 'approve' | 'approve+advisory' | 'block', ... }
//
// Decision flow (Phase 4 + Phase 10):
//   1. Read policy-index.json. If missing or empty → approve.
//   2. If file is in `protected_files` (exact match):
//        a. With before/after present → diff signatures; BLOCK only on a
//           signature/export/extends change. Body-only edits APPROVE.
//        b. Without before/after → BLOCK conservatively (Phase 4 behaviour).
//   3. Same logic for `protected_globs`.
//   4. If file is in auto-policy.yaml blacklist → BLOCK (any edit; the
//      blacklist is path-based, not symbol-based).
//   5. If overrides.js says override is active → demote BLOCK → ADVISORY.
//   6. Else → APPROVE.

import { readPolicyIndex } from './index-builder.js';
import {
  APPROVE, ADVISORY, BLOCK, makeDecision,
  CAT_PROTECTED_FILE, CAT_PROTECTED_GLOB, CAT_BLACKLIST,
  CAT_SIGNATURE_CHANGE, CAT_DELETED_SYMBOL, CAT_NEW_EXPORT, CAT_NONE,
} from './decisions.js';
import { hasOverride } from './overrides.js';
import { diffSignatures } from './diff-detector.js';
import { buildSignatureReason } from './reason-builder.js';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function checkFile(projectRoot, file, ctx = {}) {
  const index = readPolicyIndex(projectRoot);
  if (!index) return makeDecision(APPROVE, { reason: 'no policy index', category: CAT_NONE });

  const exact = index.protected_files?.[file];
  if (exact) {
    return resolveProtected(projectRoot, {
      file,
      ctx,
      category: CAT_PROTECTED_FILE,
      hit: { spec: exact.spec, contract: exact.contract, reason: exact.reason },
      fallbackReason: exact.reason ?? `Protected file: ${file}`,
    });
  }

  for (const entry of index.protected_globs ?? []) {
    if (matchGlob(entry.pattern, file)) {
      return resolveProtected(projectRoot, {
        file,
        ctx,
        category: CAT_PROTECTED_GLOB,
        hit: { spec: entry.spec, contract: null, reason: entry.reason, pattern: entry.pattern },
        fallbackReason: entry.reason ?? `Matches protected glob: ${entry.pattern}`,
      });
    }
  }

  const blacklist = readAutoPolicyBlacklist(projectRoot);
  for (const pattern of blacklist) {
    if (matchGlob(pattern, file)) {
      return maybeOverride(projectRoot, makeDecision(BLOCK, {
        reason: `Matches auto-policy.yaml blacklist: ${pattern}`,
        pattern,
        file,
        category: CAT_BLACKLIST,
      }), ctx);
    }
  }

  return makeDecision(APPROVE, { file, category: CAT_NONE });
}

// Smart policy decision for protected files/globs. When we have before/after
// sources we run the L1 signature diff; only contract-relevant changes
// (signature/export/extends) trigger BLOCK. Body-only edits are approved.
function resolveProtected(projectRoot, { file, ctx, category, hit, fallbackReason }) {
  const haveDiff = typeof ctx.before === 'string' && typeof ctx.after === 'string';

  if (!haveDiff) {
    return maybeOverride(projectRoot, makeDecision(BLOCK, {
      reason: fallbackReason,
      spec: hit.spec,
      contract: hit.contract,
      pattern: hit.pattern,
      file,
      category,
    }), ctx);
  }

  const diff = diffSignatures(file, ctx.before, ctx.after);

  if (!diff.parsed) {
    return maybeOverride(projectRoot, makeDecision(BLOCK, {
      reason: `${fallbackReason} (diff unavailable: ${diff.reason ?? 'parse failed'})`,
      spec: hit.spec,
      contract: hit.contract,
      pattern: hit.pattern,
      file,
      category,
    }), ctx);
  }

  const change = pickRelevantChange(diff, hit.contract);
  if (!change) {
    return makeDecision(APPROVE, {
      file,
      category: CAT_NONE,
      reason: 'protected file edited but no signature/export/extends change',
      spec: hit.spec,
      contract: hit.contract,
    });
  }

  const callers = ctx.graph ? findCallers(ctx.graph, change.symbol?.id) : [];
  const built = buildSignatureReason({
    file,
    contract: hit.contract,
    spec: hit.spec,
    change: change.kind === 'changed'
      ? change.entry
      : { before: change.kind === 'removed' ? change.symbol : null,
          after: change.kind === 'added' ? change.symbol : null,
          reasons: change.kind === 'removed' ? ['removed'] : ['added'] },
    callers,
  });

  return maybeOverride(projectRoot, makeDecision(BLOCK, {
    reason: built.reason,
    details: built.details,
    spec: hit.spec,
    contract: hit.contract,
    pattern: hit.pattern,
    file,
    category: categoryForChange(change),
  }), ctx);
}

function pickRelevantChange(diff, contractName) {
  // Prefer a `changed` entry that touches the named contract.
  if (contractName) {
    const named = diff.changed.find(
      (c) => c.before?.name === contractName || c.after?.name === contractName,
    );
    if (named) return { kind: 'changed', entry: named, symbol: named.after ?? named.before };
    const removed = diff.removed.find((s) => s.name === contractName);
    if (removed) return { kind: 'removed', symbol: removed };
  }

  if (diff.changed.length) {
    const exported = diff.changed.find((c) => c.before?.exported || c.after?.exported);
    const pick = exported ?? diff.changed[0];
    return { kind: 'changed', entry: pick, symbol: pick.after ?? pick.before };
  }
  const removedExported = diff.removed.find((s) => s.exported);
  if (removedExported) return { kind: 'removed', symbol: removedExported };
  const addedExported = diff.added.find((s) => s.exported);
  if (addedExported) return { kind: 'added', symbol: addedExported };
  return null;
}

function categoryForChange(change) {
  if (change.kind === 'removed') return CAT_DELETED_SYMBOL;
  if (change.kind === 'added') return CAT_NEW_EXPORT;
  return CAT_SIGNATURE_CHANGE;
}

function findCallers(graph, symbolId) {
  if (!graph || !symbolId) return [];
  const calls = graph.calls ?? [];
  const out = [];
  const targetName = symbolId.split('#').pop();
  for (const call of calls) {
    if (!call.from || call.from === symbolId) continue;
    if (call.callee === targetName || call.callee?.endsWith(`.${targetName}`)) {
      out.push({ from: call.from, line: call.line ?? null });
    }
  }
  return out;
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
