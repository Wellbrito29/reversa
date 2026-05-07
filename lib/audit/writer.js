// Append-only audit log writer.
//
// Every auto-mode and bot decision lands in `aegis/runtime/audit/YYYY-MM-DD.jsonl`.
// Append-only line-delimited JSON — survives crashes, mergeable across
// processes, easy to ship to a SIEM.
//
// Redaction policy is read from `aegis/audit-policy.json` if present:
//
//   { "redact": ["diff", "commit_message", "file"] }
//
// Redacted fields are replaced with a stable SHA-256 prefix so two entries
// touching the same redacted value still correlate.

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { redactEntry } from './redact.js';

let _policyCache = null;
let _policyCacheRoot = null;

export function appendAuditEntry(projectRoot, entry) {
  const today = new Date().toISOString().slice(0, 10);
  const path = join(projectRoot, '.aegis', 'audit', `${today}.jsonl`);
  const policy = loadPolicy(projectRoot);
  const final = redactEntry(entry, policy);
  try {
    if (!existsSync(dirname(path))) mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, JSON.stringify(final) + '\n', 'utf8');
  } catch {
    // Audit log failures must not break the main path. They're surfaced
    // by `aegis status` instead, which warns when audit dir is missing
    // but auto mode is enabled.
  }
}

export function auditLogPath(projectRoot, date = new Date()) {
  const day = date.toISOString().slice(0, 10);
  return join(projectRoot, '.aegis', 'audit', `${day}.jsonl`);
}

function loadPolicy(projectRoot) {
  if (_policyCacheRoot === projectRoot) return _policyCache;
  const path = join(projectRoot, 'aegis', 'audit-policy.json');
  let policy = null;
  if (existsSync(path)) {
    try { policy = JSON.parse(readFileSync(path, 'utf8')); }
    catch { policy = null; }
  }
  _policyCache = policy;
  _policyCacheRoot = projectRoot;
  return policy;
}
