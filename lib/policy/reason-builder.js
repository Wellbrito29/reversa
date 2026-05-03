// Build a structured `reason` object for a signature-driven block.
//
// Returns an object suitable for feeding directly into makeDecision. We keep
// both a `reason` string (so existing single-line UIs render something
// meaningful) and a `details` object so adapters that want to render rich
// output (CLI, Cursor revert comment, GitHub status) can.

import { suggestAlternatives } from './alternatives.js';

export function buildSignatureReason({
  file,
  contract,
  spec,
  change,
  callers = [],
}) {
  const before = change.before ?? {};
  const after = change.after ?? {};
  const reasons = change.reasons ?? [];
  const summary = headline({ file, contract, spec, before, after, reasons });

  return {
    reason: summary,
    details: {
      file,
      contract: contract ?? before.name ?? after.name ?? null,
      spec: spec ?? null,
      change: {
        kind: classify(reasons),
        reasons,
        before: shapeOf(before),
        after: shapeOf(after),
      },
      callers,
      alternatives: suggestAlternatives(change),
    },
  };
}

function headline({ file, contract, spec, before, after, reasons }) {
  const name = contract ?? after.name ?? before.name ?? '<symbol>';
  const where = spec ? ` (${spec})` : '';
  const tail = reasons.includes('signature')
    ? `signature: ${before.signature ?? '?'} → ${after.signature ?? '?'}`
    : reasons.join(', ');
  return `Signature change to protected \`${name}\` in ${file}${where}; ${tail}`;
}

function classify(reasons) {
  if (reasons.includes('signature')) return 'signature_change';
  if (reasons.includes('unexported')) return 'export_removed';
  if (reasons.includes('exported')) return 'export_added';
  if (reasons.length > 0) return reasons[0];
  return 'unknown';
}

function shapeOf(s) {
  if (!s) return null;
  return {
    id: s.id,
    name: s.name,
    type: s.type,
    line: s.line,
    signature: s.signature ?? null,
    exported: !!s.exported,
  };
}
