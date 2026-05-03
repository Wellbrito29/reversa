// Map auto-mode decisions onto GitHub labels.
//
// The bot reads keeper-queue.jsonl, runs the decision tree, and labels the
// PR according to the dominant outcome. Labels are intentionally namespaced
// under `keeper:` so they don't collide with project labels.

import { ROUTE_AUTO, ROUTE_REVIEW, ROUTE_ESCALATE } from './decision-tree.js';

export const LABEL_AUTO = 'keeper:auto-resolved';
export const LABEL_REVIEW = 'keeper:needs-review';
export const LABEL_ESCALATE = 'keeper:escalated';

export function labelsFor(decisions) {
  const seen = new Set();
  for (const { decision } of decisions) {
    if (decision.route === ROUTE_AUTO) seen.add(LABEL_AUTO);
    else if (decision.route === ROUTE_REVIEW) seen.add(LABEL_REVIEW);
    else if (decision.route === ROUTE_ESCALATE) seen.add(LABEL_ESCALATE);
  }
  // Escalation dominates — if any entry escalated, that's the headline label.
  if (seen.has(LABEL_ESCALATE)) return [LABEL_ESCALATE];
  if (seen.has(LABEL_REVIEW)) return [LABEL_REVIEW];
  if (seen.has(LABEL_AUTO)) return [LABEL_AUTO];
  return [];
}
