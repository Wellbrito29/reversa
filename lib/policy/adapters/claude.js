// Claude Code policy adapter.
//
// Claude expects a JSON object on stdout when a hook returns non-zero
// to surface to the model:
//   { "decision": "block", "reason": "..." }
//
// On approve we write nothing (silent pass).
// On approve+advisory we print to stderr — Claude shows it to the user.

import { APPROVE, ADVISORY, BLOCK } from '../decisions.js';

export function emit(decision, { stdout, stderr }) {
  if (decision.decision === APPROVE) return 0;
  if (decision.decision === ADVISORY) {
    stderr.write(`[aegis-policy] advisory: ${decision.reason}\n`);
    return 0;
  }
  if (decision.decision === BLOCK) {
    stdout.write(JSON.stringify({
      decision: 'block',
      reason: decision.reason,
      spec: decision.spec ?? null,
    }) + '\n');
    return 2; // Claude convention: non-zero = surface to model
  }
  return 0;
}
