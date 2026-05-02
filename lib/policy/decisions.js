// Policy decision shape — shared across check + adapters.
//
// Three levels:
//   - approve              proceed silently
//   - approve+advisory     proceed but surface a warning to the user
//   - block                stop the edit; engine adapter renders refusal

export const APPROVE = 'approve';
export const ADVISORY = 'approve+advisory';
export const BLOCK = 'block';

export function makeDecision(kind, fields = {}) {
  return { decision: kind, ...fields };
}
