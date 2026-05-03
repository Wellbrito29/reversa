// Policy decision shape — shared across check + adapters.
//
// Three levels:
//   - approve              proceed silently
//   - approve+advisory     proceed but surface a warning to the user
//   - block                stop the edit; engine adapter renders refusal
//
// `category` (added in Phase 10) classifies *why* a decision was made, so
// adapters and CI surfaces can format output without re-parsing reason text.

export const APPROVE = 'approve';
export const ADVISORY = 'approve+advisory';
export const BLOCK = 'block';

// Categories — used by Phase 10's smart policy gate and Phase 11's CLI.
export const CAT_PROTECTED_FILE = 'protected_file';
export const CAT_PROTECTED_GLOB = 'protected_glob';
export const CAT_BLACKLIST = 'auto_policy_blacklist';
export const CAT_SIGNATURE_CHANGE = 'signature_change';
export const CAT_DELETED_SYMBOL = 'deleted_symbol';
export const CAT_NEW_EXPORT = 'new_export';
export const CAT_NONE = 'none';

export function makeDecision(kind, fields = {}) {
  return { decision: kind, ...fields };
}
