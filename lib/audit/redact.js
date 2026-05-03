// Audit log redaction.
//
// Some teams don't want raw diffs, commit messages, or filenames in their
// audit log (e.g. healthcare / regulated environments where the file path
// itself can leak PHI). Redaction is applied at write time — the redacted
// fields are replaced with a stable hash so two redacted entries for the
// same file still correlate.
//
// Redaction policy is a small object:
//
//   { redact: ["diff", "commit_message", "file"] }
//
// Anything not in the list passes through unchanged.

import { createHash } from 'node:crypto';

const REDACTABLE = new Set([
  'diff',
  'commit_message',
  'file',
  'spec_path',
  'graph_context',
  'rationale',
]);

export function redactEntry(entry, policy) {
  if (!policy || !Array.isArray(policy.redact) || policy.redact.length === 0) {
    return entry;
  }
  const out = { ...entry };
  for (const key of policy.redact) {
    if (!REDACTABLE.has(key)) continue;
    if (out[key] == null) continue;
    out[key] = stableHash(String(out[key]));
  }
  out.redacted = policy.redact.slice();
  return out;
}

function stableHash(s) {
  return 'sha256:' + createHash('sha256').update(s).digest('hex').slice(0, 16);
}
