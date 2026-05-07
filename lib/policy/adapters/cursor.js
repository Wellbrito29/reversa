// Cursor policy adapter.
//
// Cursor doesn't expose a true pre-block hook for file edits; the
// closest contract is afterFileEdit, where we can revert + comment.
// For Phase 4 we surface the block as a stderr advisory so the user
// sees it. Auto-revert / file-comment behavior is documented but not
// wired in this phase — Phase 8+ ties it to git.

import { APPROVE, ADVISORY, BLOCK } from '../decisions.js';

export function emit(decision, { stdout, stderr }) {
  if (decision.decision === APPROVE) return 0;
  if (decision.decision === ADVISORY) {
    stderr.write(`[aegis-policy] advisory: ${decision.reason}\n`);
    return 0;
  }
  if (decision.decision === BLOCK) {
    stderr.write(`[aegis-policy] BLOCK: ${decision.reason}\n`);
    stdout.write(JSON.stringify({
      decision: 'block',
      reason: decision.reason,
      spec: decision.spec ?? null,
      note: 'Cursor cannot pre-block; revert this edit manually or via git.',
    }) + '\n');
    return 0; // Don't fail Cursor — would interrupt user flow
  }
  return 0;
}
