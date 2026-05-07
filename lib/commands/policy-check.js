// `npx aegis-spec policy-check [--base <ref>] [--head <ref>]
//                           [--format text|json] [--severity high|medium|low]`
//
// CI gate for signature-driven contract breakage. Reads the git diff between
// `base` and `head`, parses each changed file's contents at both refs, runs
// the smart policy gate from Phase 10, and reports decisions.
//
// Exit codes:
//   0 — no blocks at chosen severity
//   1 — at least one block at chosen severity
//   2 — invocation error (no git, no policy index, etc.)
//
// Severity:
//   high   = only signature_change / deleted_symbol on protected contracts
//   medium = + protected_file / protected_glob / new_export blocks
//   low    = + auto-policy blacklist; downgrades nothing — info only

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { checkFile } from '../policy/check.js';
import {
  BLOCK, ADVISORY, APPROVE,
  CAT_PROTECTED_FILE, CAT_PROTECTED_GLOB, CAT_BLACKLIST,
  CAT_SIGNATURE_CHANGE, CAT_DELETED_SYMBOL, CAT_NEW_EXPORT,
} from '../policy/decisions.js';
import { readPolicyIndex } from '../policy/index-builder.js';

function parseArgs(args) {
  const out = {
    base: 'origin/main',
    head: 'HEAD',
    format: 'text',
    severity: 'high',
    cwd: null,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--base') out.base = args[++i];
    else if (a.startsWith('--base=')) out.base = a.slice('--base='.length);
    else if (a === '--head') out.head = args[++i];
    else if (a.startsWith('--head=')) out.head = a.slice('--head='.length);
    else if (a === '--format' || a === '-f') out.format = args[++i];
    else if (a.startsWith('--format=')) out.format = a.slice('--format='.length);
    else if (a === '--severity' || a === '-s') out.severity = args[++i];
    else if (a.startsWith('--severity=')) out.severity = a.slice('--severity='.length);
    else if (a === '--cwd') out.cwd = args[++i];
    else if (a.startsWith('--cwd=')) out.cwd = a.slice('--cwd='.length);
  }
  return out;
}

const HIGH_CATS = new Set([CAT_SIGNATURE_CHANGE, CAT_DELETED_SYMBOL]);
const MEDIUM_CATS = new Set([
  ...HIGH_CATS,
  CAT_PROTECTED_FILE,
  CAT_PROTECTED_GLOB,
  CAT_NEW_EXPORT,
]);
const LOW_CATS = new Set([...MEDIUM_CATS, CAT_BLACKLIST]);

function gatesAt(severity) {
  if (severity === 'high') return HIGH_CATS;
  if (severity === 'medium') return MEDIUM_CATS;
  if (severity === 'low') return LOW_CATS;
  return HIGH_CATS;
}

export default async function policyCheck(args) {
  const opts = parseArgs(args);
  const root = resolve(opts.cwd ?? process.cwd());
  const index = readPolicyIndex(root);
  if (!index) {
    emit(opts.format, { ok: false, error: 'no policy index — run `aegis policy-index build` first' });
    process.exit(2);
  }

  let changed;
  try {
    changed = listChangedFiles(root, opts.base, opts.head);
  } catch (e) {
    emit(opts.format, { ok: false, error: `git diff failed: ${e.message}` });
    process.exit(2);
  }

  if (changed.length === 0) {
    emit(opts.format, { ok: true, base: opts.base, head: opts.head, decisions: [], summary: empty() });
    process.exit(0);
  }

  const decisions = [];
  for (const file of changed) {
    const before = readAt(root, opts.base, file);
    const after = readAt(root, opts.head, file);
    if (before == null && after == null) continue;
    const decision = checkFile(root, file, { before: before ?? '', after: after ?? '' });
    decisions.push({ file, decision });
  }

  const gateCats = gatesAt(opts.severity);
  const blocking = decisions.filter(
    (d) => d.decision.decision === BLOCK && gateCats.has(d.decision.category),
  );

  const payload = {
    ok: blocking.length === 0,
    base: opts.base,
    head: opts.head,
    severity: opts.severity,
    decisions,
    summary: summarize(decisions, gateCats),
  };

  emit(opts.format, payload);
  process.exit(payload.ok ? 0 : 1);
}

function summarize(decisions, gateCats) {
  const counts = { approve: 0, advisory: 0, block: 0, blocking: 0 };
  for (const d of decisions) {
    if (d.decision.decision === APPROVE) counts.approve++;
    else if (d.decision.decision === ADVISORY) counts.advisory++;
    else if (d.decision.decision === BLOCK) {
      counts.block++;
      if (gateCats.has(d.decision.category)) counts.blocking++;
    }
  }
  return counts;
}

function empty() {
  return { approve: 0, advisory: 0, block: 0, blocking: 0 };
}

function listChangedFiles(root, base, head) {
  const args = ['-C', root, 'diff', '--name-only', `${base}...${head}`];
  const out = execFileSync('git', args, { encoding: 'utf8' });
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

function readAt(root, ref, file) {
  try {
    return execFileSync('git', ['-C', root, 'show', `${ref}:${file}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null; // file did not exist at that ref
  }
}

function emit(format, payload) {
  if (format === 'json') {
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
    return;
  }
  emitText(payload);
}

function emitText(payload) {
  if (payload.error) {
    process.stderr.write(`policy-check: ${payload.error}\n`);
    return;
  }
  const head = `Comparing ${payload.base}...${payload.head} (severity=${payload.severity})`;
  process.stdout.write(head + '\n');

  for (const { file, decision } of payload.decisions) {
    if (decision.decision === APPROVE) continue;
    const icon = decision.decision === BLOCK ? '✗' : '!';
    process.stdout.write(`  ${icon} ${file}: ${decision.reason ?? decision.category}\n`);
    if (decision.details?.change) {
      const c = decision.details.change;
      const before = c.before?.signature ?? '<absent>';
      const after = c.after?.signature ?? '<absent>';
      process.stdout.write(`      kind: ${c.kind}\n`);
      process.stdout.write(`      old:  ${before}\n`);
      process.stdout.write(`      new:  ${after}\n`);
      if (decision.details.callers?.length) {
        process.stdout.write(`      callers: ${decision.details.callers.length}\n`);
      }
      const alts = decision.details.alternatives ?? [];
      for (const alt of alts) {
        process.stdout.write(`      → ${alt.title}\n`);
      }
    }
  }
  const s = payload.summary;
  process.stdout.write(
    `\nResults: ${s.approve} approved · ${s.advisory} advisory · ${s.block} blocked (${s.blocking} at gate)\n`,
  );
  if (payload.ok) {
    process.stdout.write('OK\n');
  } else {
    process.stdout.write('FAIL — at least one blocking decision at the chosen severity\n');
  }
}
