// Extracts string literals, numbers, and regex patterns from a unified diff
// and cross-references them against spec content to surface concrete value
// mismatches to the LLM prompt.
//
// Motivation (K-03): LLM may miss a subtle regex quantifier change
// ({2,} → {3,}) even when the diff is provided. Explicit enumeration of
// stale literals in the prompt makes the mismatch unambiguous.

const LITERAL_RE = /(?:"[^"\\\n]{1,200}(?:\\.[^"\\\n]{0,200})*"|'[^'\\\n]{1,200}(?:\\.[^'\\\n]{0,200})*'|`[^`\\\n]{1,200}(?:\\.[^`\\\n]{0,200})*`|\/[^/\n]{2,100}\/[gimsuyv]*|\b\d+(?:\.\d+)?\b)/g;

const SKIP_RE = /^\d$|^\s*$/;

function extractFromDiff(diff) {
  const removed = new Set();
  const added = new Set();

  for (const line of diff.split('\n')) {
    if (line.startsWith('---') || line.startsWith('+++')) continue;
    const isRemoved = line.startsWith('-');
    const isAdded = line.startsWith('+');
    if (!isRemoved && !isAdded) continue;

    const body = line.slice(1);
    for (const m of body.matchAll(LITERAL_RE)) {
      const val = m[0];
      if (SKIP_RE.test(val)) continue;
      if (isRemoved) removed.add(val);
      else added.add(val);
    }
  }

  return { removed, added };
}

/**
 * Builds a literal-mismatch hint block for the spec-writer prompt.
 * Returns null when no stale literals are detected (no overhead added).
 *
 * @param {string} diff  Unified diff from the queue entry
 * @param {string} spec  Current spec content
 * @returns {string|null}
 */
export function buildLiteralHints(diff, spec) {
  if (!diff || !spec) return null;

  const { removed, added } = extractFromDiff(diff);
  if (removed.size === 0) return null;

  const stale = [...removed].filter((v) => !added.has(v) && spec.includes(v));
  if (stale.length === 0) return null;

  const introduced = [...added].filter((v) => !removed.has(v));

  const lines = [
    'Literal mismatch detected (spec must be updated to reflect these):',
  ];
  for (const v of stale) {
    lines.push(`  - ${v}  ← removed from code, still in spec`);
  }
  if (introduced.length > 0) {
    lines.push(`Newly introduced values: ${introduced.join(', ')}`);
  }
  return lines.join('\n');
}

export { extractFromDiff };
