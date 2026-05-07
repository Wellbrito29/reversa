// Spec rewriter — calls Claude (Sonnet by default) to update a spec markdown
// file given the original spec, the diff that triggered the drift, and any
// graph context. Returns the new spec body.
//
// We deliberately keep the diff small (caller filters to the relevant hunks)
// and the spec full, since prompt caching keeps the spec prefix free across
// follow-up calls within the same PR.

import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);

let _client = null;
let _loadError = null;

function loadClient(apiKey) {
  if (_client) return _client;
  if (_loadError) throw _loadError;
  try {
    const Anthropic = require_('@anthropic-ai/sdk').default
      ?? require_('@anthropic-ai/sdk').Anthropic
      ?? require_('@anthropic-ai/sdk');
    _client = new Anthropic({ apiKey });
    return _client;
  } catch (e) {
    _loadError = new Error(
      `@anthropic-ai/sdk unavailable (${e.message}). ` +
      `Install with: npm install @anthropic-ai/sdk.`,
    );
    throw _loadError;
  }
}

const SYSTEM_PREFIX = `You are Aegis Spec Keeper Auto, a spec rewriter.

You will receive:
  1. The current contents of a spec markdown file (the source of truth).
  2. A code diff that has changed behavior described by that spec.
  3. Optional graph context (callers, exports, signatures) for the symbols touched.

Your job is to produce the updated spec content so that it accurately
describes the new behavior while preserving the structure, headings, frontmatter,
and Aegis Spec-specific conventions of the original.

Strict rules:
  - Output the FULL spec, not a diff.
  - Keep YAML frontmatter intact unless a documented field is invalidated.
  - Preserve "🟢/🟡/🔴" status markers; you may flip them if the change warrants.
  - Do not invent contracts or invariants that the diff does not justify.
  - Do not include backticks fencing the whole document; emit raw markdown.`;

export async function rewriteSpec({
  apiKey,
  model,
  specPath,
  specContent,
  diff,
  graphContext,
}) {
  const key = apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');
  const client = loadClient(key);
  const target = model ?? 'claude-sonnet-4-6';

  const response = await client.messages.create({
    model: target,
    max_tokens: 16000,
    system: [
      { type: 'text', text: SYSTEM_PREFIX },
      {
        type: 'text',
        text: `Spec file: ${specPath}\n\nCurrent contents:\n\n${specContent}`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: [
              'Diff that triggered the drift:',
              '',
              diff,
              graphContext ? `\nGraph context:\n${graphContext}` : '',
              '',
              'Return the updated spec content in full.',
            ].join('\n'),
          },
        ],
      },
    ],
  });

  const block = (response.content ?? []).find((b) => b.type === 'text');
  if (!block) throw new Error('spec-writer returned no text block');
  return {
    content: block.text,
    model: target,
    usage: response.usage ?? null,
  };
}
