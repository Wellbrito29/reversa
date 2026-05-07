// Codex policy adapter — same JSON shape as Claude. Codex blocks
// apply_patch tools when stdout contains `{"decision":"block",...}`
// and exit code is non-zero.

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
    return 2;
  }
  return 0;
}
