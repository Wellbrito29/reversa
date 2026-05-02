// Opencode policy adapter.
//
// Opencode plugins run inside a JS host. Throwing aborts the tool.
// For symmetry with the other adapters, we still emit JSON on stdout
// (the runner captures it for the keeper-queue.jsonl).

import { APPROVE, ADVISORY, BLOCK } from '../decisions.js';

export function emit(decision, { stdout, stderr }) {
  if (decision.decision === APPROVE) return 0;
  if (decision.decision === ADVISORY) {
    stderr.write(`[reversa-policy] advisory: ${decision.reason}\n`);
    return 0;
  }
  if (decision.decision === BLOCK) {
    const payload = JSON.stringify({
      decision: 'block',
      reason: decision.reason,
      spec: decision.spec ?? null,
    });
    stdout.write(payload + '\n');
    // Opencode plugin host: hook script throws, which aborts the tool call.
    // Keep this guarded so direct CLI invocations don't crash unexpectedly.
    if (process.env.REVERSA_OPENCODE_PLUGIN === '1') {
      throw new Error(`reversa policy block: ${decision.reason}`);
    }
    return 2;
  }
  return 0;
}
