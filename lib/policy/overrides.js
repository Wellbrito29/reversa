// Override detection.
//
// Three sources, any one active = override applied:
//   1. ADR exists in `_reversa_sdd/adrs/` whose body mentions the
//      protected file or contract name. Non-binding heuristic.
//   2. Commit message flag: `[reversa-override: <reason>]` in HEAD~0
//      (current commit being authored — checked from env REVERSA_COMMIT_MSG
//      or from `.git/COMMIT_EDITMSG`).
//   3. CLI unprotect: `.reversa/state.json` has
//      `policy_overrides: { "<file>": { until: ISO, reason } }`.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function hasOverride(projectRoot, decision, ctx = {}) {
  const adr = adrOverride(projectRoot, decision);
  if (adr) return { active: true, kind: 'adr', ...adr };

  const commit = commitMessageOverride(projectRoot, ctx);
  if (commit) return { active: true, kind: 'commit-flag', ...commit };

  const cli = cliUnprotectOverride(projectRoot, decision);
  if (cli) return { active: true, kind: 'cli-unprotect', ...cli };

  return { active: false };
}

function adrOverride(projectRoot, decision) {
  const adrsDir = join(projectRoot, '_reversa_sdd', 'adrs');
  if (!existsSync(adrsDir)) return null;
  const target = decision.file ?? decision.contract ?? decision.pattern;
  if (!target) return null;
  let entries;
  try { entries = readdirSync(adrsDir); }
  catch { return null; }
  for (const name of entries) {
    if (!name.endsWith('.md')) continue;
    const full = join(adrsDir, name);
    try {
      const content = readFileSync(full, 'utf8');
      if (content.includes(target)) return { adr: name };
    } catch { /* ignore */ }
  }
  return null;
}

function commitMessageOverride(projectRoot, ctx) {
  const sources = [
    ctx.commitMessage,
    process.env.REVERSA_COMMIT_MSG,
    readCommitEditmsg(projectRoot),
  ].filter(Boolean);
  for (const msg of sources) {
    const m = msg.match(/\[reversa-override(?::\s*([^\]]+))?\]/);
    if (m) return { reason: (m[1] ?? '').trim() || null };
  }
  return null;
}

function readCommitEditmsg(projectRoot) {
  const path = join(projectRoot, '.git', 'COMMIT_EDITMSG');
  if (!existsSync(path)) return null;
  try { return readFileSync(path, 'utf8'); } catch { return null; }
}

function cliUnprotectOverride(projectRoot, decision) {
  const path = join(projectRoot, '.reversa', 'state.json');
  if (!existsSync(path)) return null;
  let state;
  try { state = JSON.parse(readFileSync(path, 'utf8')); }
  catch { return null; }
  const overrides = state.policy_overrides ?? {};
  const target = decision.file ?? decision.pattern;
  const entry = overrides[target];
  if (!entry) return null;
  if (entry.until && new Date(entry.until).getTime() < Date.now()) return null;
  return { reason: entry.reason ?? null, until: entry.until ?? null };
}
