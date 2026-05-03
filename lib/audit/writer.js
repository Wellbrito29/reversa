// Append-only audit log writer.
//
// Every auto-mode decision lands in `.reversa/audit/YYYY-MM-DD.jsonl`.
// Append-only, line-delimited JSON — survives crashes, mergeable across
// processes, easy to ship to a SIEM.
//
// Phase 13 layers redaction and a structured schema doc on top.

import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

export function appendAuditEntry(projectRoot, entry) {
  const today = new Date().toISOString().slice(0, 10);
  const path = join(projectRoot, '.reversa', 'audit', `${today}.jsonl`);
  try {
    if (!existsSync(dirname(path))) mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, JSON.stringify(entry) + '\n', 'utf8');
  } catch {
    // Audit log failures must not break the main path. They're surfaced
    // by `reversa status` instead, which warns when audit dir is missing
    // but auto mode is enabled.
  }
}

export function auditLogPath(projectRoot, date = new Date()) {
  const day = date.toISOString().slice(0, 10);
  return join(projectRoot, '.reversa', 'audit', `${day}.jsonl`);
}
