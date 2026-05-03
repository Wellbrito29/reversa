// Classifier — calls Claude (Haiku by default) to triage a drift entry.
//
// The Anthropic SDK is loaded lazily via createRequire so that users running
// pure offline / dry-run flows don't need it installed. When the SDK or an
// API key is missing we degrade gracefully: callers should treat that as the
// "needs_review" route rather than a hard failure.
//
// The classifier returns:
//   { severity, confidence, change_type, rationale, model, usage }
//
// Prompt caching: see prompt-cache.js. The system prompt has a cache_control
// breakpoint on the (stable) spec-context block, so repeated calls within
// the same PR re-use the prefix.

import { createRequire } from 'node:module';
import { buildSystemBlocks, buildUserMessage } from './prompt-cache.js';

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
      `Install with: npm install @anthropic-ai/sdk. ` +
      `Auto mode will fall back to needs_review for every entry.`,
    );
    throw _loadError;
  }
}

export function isAvailable() {
  if (_client) return true;
  if (_loadError) return false;
  try { loadClient(process.env.ANTHROPIC_API_KEY); return true; }
  catch { return false; }
}

export async function classify(entry, opts = {}) {
  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY not set — auto-mode classifier needs Claude API access',
    );
  }

  const client = loadClient(apiKey);
  const model = opts.model ?? 'claude-haiku-4-5';

  const system = buildSystemBlocks(opts.specContext ?? entry.spec_context ?? null);
  const userText = buildUserMessage({
    file: entry.file,
    diff: entry.diff ?? '<diff omitted>',
    graphContext: entry.graph_context ?? null,
    commitMessage: entry.commit_message ?? null,
  });

  const response = await client.messages.create({
    model,
    max_tokens: 512,
    system,
    messages: [{ role: 'user', content: [{ type: 'text', text: userText }] }],
  });

  const parsed = parseJsonResponse(response);
  return {
    severity: parsed.severity,
    confidence: Number(parsed.confidence ?? 0),
    change_type: parsed.change_type ?? entry.change_type ?? 'unknown',
    rationale: parsed.rationale ?? '',
    model,
    usage: response.usage ?? null,
  };
}

function parseJsonResponse(response) {
  const block = (response.content ?? []).find((b) => b.type === 'text');
  if (!block) throw new Error('classifier returned no text block');
  let text = block.text.trim();
  // Strip code fences defensively even though the prompt says not to use them.
  if (text.startsWith('```')) {
    text = text.replace(/^```\w*\n/, '').replace(/```$/, '').trim();
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`classifier returned invalid JSON: ${e.message}`);
  }
}
