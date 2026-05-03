// Helpers for shaping classifier prompts so Anthropic prompt caching hits.
//
// The cache is a prefix match: any byte change in the prefix invalidates
// everything after it. So we sort the spec/file context that's stable across
// PRs first and put the per-PR diff last. The breakpoint goes on the last
// stable system block — Anthropic caches `tools` + `system` together when
// the breakpoint sits there.
//
// See shared/prompt-caching.md for the full invariant + audit checklist.

const STABLE_SYSTEM_PREFIX = `You are Reversa Keeper Auto, a drift triage assistant.
Your job is to classify whether a code change keeps a spec in sync, makes the
spec stale, or breaks a documented contract.

Output format: a single JSON object with exactly these keys:
  - severity:    "low" | "medium" | "high"
  - confidence:  float in [0, 1]
  - change_type: short snake_case label (e.g. "test_only", "format_only",
                 "public_api_change", "business_rule_change")
  - rationale:   one short sentence explaining the choice

Rules:
  - "high" means a documented contract is broken or a public-API signature
    changed. Always low confidence unless the diff makes it unambiguous.
  - "medium" means the spec is now out of sync but the contract still holds.
  - "low" means the spec is unaffected (tests, formatting, comments, log
    statements, dep bumps).

Reply with JSON only — no prose, no markdown fences.`;

export function buildSystemBlocks(specContext) {
  // System is rendered as an ordered list of text blocks. The first block is
  // the frozen instructions; the second is the spec context (typically the
  // contents of `_reversa_sdd/sdd/<spec>.md`). Cache breakpoint sits on the
  // second block — that caches both blocks and any tools rendered before.
  const blocks = [{ type: 'text', text: STABLE_SYSTEM_PREFIX }];
  if (specContext) {
    blocks.push({
      type: 'text',
      text: `Spec context (frozen across this PR):\n\n${specContext}`,
      cache_control: { type: 'ephemeral' },
    });
  } else {
    blocks[0].cache_control = { type: 'ephemeral' };
  }
  return blocks;
}

export function buildUserMessage({ file, diff, graphContext, commitMessage }) {
  const parts = [
    `File: ${file}`,
    commitMessage ? `Commit: ${commitMessage.trim().split('\n')[0]}` : null,
    graphContext ? `Graph context:\n${graphContext}` : null,
    `Diff:\n${diff}`,
  ].filter(Boolean);
  return parts.join('\n\n');
}
