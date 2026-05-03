// Auto-mode decision tree.
//
// Inputs:
//   policy   — output of readAutoPolicy()
//   entry    — { file, change_type, severity, spec? }   from drift detection
//   classify — async fn that returns { severity, confidence, rationale, change_type }
//              when called; usually backed by classifier.js (LLM) or a stub.
//
// Outputs (for each entry):
//   { route, reason, confidence?, source }
//
// Routes:
//   auto_resolve   — whitelisted or LLM said high-confidence + within threshold
//   needs_review   — uncertain; flag spec as 🟡 stale
//   escalate_block — blacklisted or matched escalate_on rule

import { matchGlob } from '../policy/check.js';

export const ROUTE_AUTO = 'auto_resolve';
export const ROUTE_REVIEW = 'needs_review';
export const ROUTE_ESCALATE = 'escalate_block';

export async function decide(policy, entry, classify) {
  if (!policy.enabled) {
    return { route: ROUTE_REVIEW, reason: 'auto_resolve disabled', source: 'policy' };
  }

  const blacklisted = matchPathsOrTypes(entry, policy.blacklist);
  if (blacklisted) {
    return {
      route: ROUTE_ESCALATE,
      reason: `blacklist: ${blacklisted}`,
      source: 'policy.blacklist',
    };
  }

  const whitelisted = matchPathsOrTypes(entry, policy.whitelist);
  if (whitelisted) {
    return {
      route: ROUTE_AUTO,
      reason: `whitelist: ${whitelisted}`,
      source: 'policy.whitelist',
    };
  }

  const escalateMatch = (policy.escalate_on ?? []).find((rule) => matchEscalate(entry, rule));
  if (escalateMatch) {
    return {
      route: ROUTE_ESCALATE,
      reason: `escalate_on: ${escalateMatch}`,
      source: 'policy.escalate_on',
    };
  }

  if (typeof classify !== 'function') {
    return { route: ROUTE_REVIEW, reason: 'no classifier provided', source: 'policy' };
  }

  let result;
  try {
    result = await classify(entry);
  } catch (e) {
    return {
      route: ROUTE_REVIEW,
      reason: `classifier failed: ${e.message}`,
      source: 'classifier',
    };
  }

  const conf = Number(result?.confidence ?? 0);
  if (conf >= policy.confidence_threshold && result.severity !== 'high') {
    return {
      route: ROUTE_AUTO,
      reason: `classifier ${conf.toFixed(2)} ≥ threshold ${policy.confidence_threshold}`,
      confidence: conf,
      source: 'classifier',
      classification: result,
    };
  }

  return {
    route: ROUTE_REVIEW,
    reason:
      result.severity === 'high'
        ? `classifier severity=high (conf ${conf.toFixed(2)})`
        : `classifier ${conf.toFixed(2)} < threshold ${policy.confidence_threshold}`,
    confidence: conf,
    source: 'classifier',
    classification: result,
  };
}

function matchPathsOrTypes(entry, list) {
  for (const pattern of list?.paths ?? []) {
    if (matchGlob(pattern, entry.file)) return `path ${pattern}`;
  }
  if (entry.change_type) {
    for (const ct of list?.change_types ?? []) {
      if (ct === entry.change_type) return `change_type ${ct}`;
    }
  }
  return null;
}

function matchEscalate(entry, rule) {
  if (rule === entry.change_type) return true;
  if (rule === entry.severity) return true;
  if (entry.tags && Array.isArray(entry.tags) && entry.tags.includes(rule)) return true;
  if (rule.startsWith('🟢 → 🟡') && entry.transition === '🟢 → 🟡') return true;
  if (rule.startsWith('🟢 → 🔴') && entry.transition === '🟢 → 🔴') return true;
  return false;
}
