// `npx reversa keeper auto [--dry-run] [--max-specs N] [--cwd <path>]`
//
// Reads `.reversa/keeper-queue.jsonl` (the drift queue produced by the hooks
// runner — see Phase 1), routes each entry through the auto policy decision
// tree, and reports what would happen. With `--dry-run` (default) it does
// not call the LLM and does not modify any spec.
//
// Without `--dry-run` it expects ANTHROPIC_API_KEY in the environment and
// calls the classifier (Haiku) for entries that aren't whitelist / blacklist
// hits. The spec rewriter (Sonnet) is invoked only for ROUTE_AUTO entries.
//
// Audit logging is delegated to lib/audit/writer.js (Phase 13). When auto
// mode is invoked outside an installed project the audit writer simply
// no-ops.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readAutoPolicy } from '../auto/policy-schema.js';
import {
  decide, ROUTE_AUTO, ROUTE_REVIEW, ROUTE_ESCALATE,
} from '../auto/decision-tree.js';
import { classify } from '../auto/classifier.js';
import { rewriteSpec } from '../auto/spec-writer.js';
import { appendAuditEntry } from '../audit/writer.js';

function parseArgs(args) {
  const out = {
    dryRun: false,
    maxSpecs: null,
    cwd: null,
    format: 'text',
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === 'auto') continue;
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--max-specs') out.maxSpecs = Number(args[++i]);
    else if (a.startsWith('--max-specs=')) out.maxSpecs = Number(a.slice('--max-specs='.length));
    else if (a === '--cwd') out.cwd = args[++i];
    else if (a.startsWith('--cwd=')) out.cwd = a.slice('--cwd='.length);
    else if (a === '--format') out.format = args[++i];
    else if (a.startsWith('--format=')) out.format = a.slice('--format='.length);
  }
  return out;
}

export default async function keeperAuto(args) {
  const opts = parseArgs(args);
  const root = resolve(opts.cwd ?? process.cwd());

  const policy = readAutoPolicy(root);
  if (!policy.enabled && !opts.dryRun) {
    emit(opts.format, {
      ok: false,
      error: 'auto_resolve disabled in auto-policy.yaml — pass --dry-run to preview',
    });
    process.exit(2);
  }

  const queue = readQueue(root);
  if (queue.length === 0) {
    emit(opts.format, {
      ok: true,
      decisions: [],
      summary: { auto_resolve: 0, needs_review: 0, escalate_block: 0 },
      dry_run: opts.dryRun,
    });
    return;
  }

  const cap = opts.maxSpecs ?? policy.max_specs_per_pr ?? Infinity;
  const trimmed = queue.slice(0, cap);

  const classifyFn = opts.dryRun ? null : (entry) => classify(entry, {
    model: policy.llm.model,
  });

  const decisions = [];
  for (const entry of trimmed) {
    const decision = await decide(policy, entry, classifyFn);
    decisions.push({ entry, decision });
    appendAuditEntry(root, {
      ts: new Date().toISOString(),
      kind: 'keeper-auto',
      file: entry.file,
      route: decision.route,
      reason: decision.reason,
      confidence: decision.confidence ?? null,
      dry_run: opts.dryRun,
    });

    if (!opts.dryRun && decision.route === ROUTE_AUTO && entry.spec_path) {
      try {
        const specContent = readFileSync(join(root, entry.spec_path), 'utf8');
        const updated = await rewriteSpec({
          model: policy.llm.fallback,
          specPath: entry.spec_path,
          specContent,
          diff: entry.diff ?? '',
          graphContext: entry.graph_context ?? null,
        });
        writeFileSync(join(root, entry.spec_path), updated.content, 'utf8');
        decision.spec_updated = true;
      } catch (e) {
        decision.spec_updated = false;
        decision.spec_update_error = e.message;
      }
    }
  }

  emit(opts.format, {
    ok: true,
    base: opts.dryRun ? 'dry-run' : 'live',
    dry_run: opts.dryRun,
    decisions,
    summary: summarize(decisions),
    capped: queue.length > trimmed.length,
    queue_total: queue.length,
  });
}

function readQueue(root) {
  const path = join(root, '.reversa', 'keeper-queue.jsonl');
  if (!existsSync(path)) return [];
  const out = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try { out.push(JSON.parse(trimmed)); } catch { /* skip malformed */ }
  }
  return out;
}

function summarize(decisions) {
  const out = { auto_resolve: 0, needs_review: 0, escalate_block: 0 };
  for (const d of decisions) {
    if (d.decision.route === ROUTE_AUTO) out.auto_resolve++;
    else if (d.decision.route === ROUTE_REVIEW) out.needs_review++;
    else if (d.decision.route === ROUTE_ESCALATE) out.escalate_block++;
  }
  return out;
}

function emit(format, payload) {
  if (format === 'json') {
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
    return;
  }
  if (payload.error) {
    process.stderr.write(`keeper auto: ${payload.error}\n`);
    return;
  }
  if (payload.dry_run) process.stdout.write('[dry-run] ');
  process.stdout.write(`Processed ${payload.decisions?.length ?? 0} drift entries`);
  if (payload.capped) process.stdout.write(` (capped from ${payload.queue_total})`);
  process.stdout.write('\n');
  for (const { entry, decision } of payload.decisions ?? []) {
    const icon = decision.route === ROUTE_AUTO ? '✓'
      : decision.route === ROUTE_ESCALATE ? '✗'
      : '?';
    process.stdout.write(`  ${icon} ${entry.file} → ${decision.route}: ${decision.reason}\n`);
  }
  const s = payload.summary;
  if (s) {
    process.stdout.write(
      `\n${s.auto_resolve} auto · ${s.needs_review} review · ${s.escalate_block} escalate\n`,
    );
  }
}
