// Cursor hook generator (v1.7.0+, Phase 1).
//
// Writes to .cursor/hooks.json (project-level, committed).
// Adds afterFileEdit hook calling the Reversa runner in lean append-only mode.
//
// Cursor doesn't expose a session-end hook today, so users wanting batch
// processing should install the git pre-commit fallback (see remove-hooks docs).

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildPreCommitFallback, removePreCommitFallback } from './pre-commit-fallback.js';

const RUNNER_MARKER = 'reversa/_hooks/runner.js';
const HOOKS_REL = '.cursor/hooks.json';

function isReversaHook(entry) {
  return !!(entry && typeof entry.command === 'string' && entry.command.includes(RUNNER_MARKER));
}

export default {
  id: 'cursor',
  name: 'Cursor',

  describe() {
    return 'Adds afterFileEdit hook to .cursor/hooks.json (lean append-only)';
  },

  generate({ projectRoot, runnerPath }) {
    const hooksPath = join(projectRoot, HOOKS_REL);
    const existing = existsSync(hooksPath)
      ? JSON.parse(readFileSync(hooksPath, 'utf8'))
      : {};

    const merged = { ...existing };

    // Phase 1: clean up any old beforeFileEdit Reversa hooks.
    if (Array.isArray(merged.beforeFileEdit)) {
      const filtered = merged.beforeFileEdit.filter((e) => !isReversaHook(e));
      if (filtered.length === 0) delete merged.beforeFileEdit;
      else merged.beforeFileEdit = filtered;
    }

    const currentAfter = Array.isArray(merged.afterFileEdit) ? merged.afterFileEdit : [];
    const filtered = currentAfter.filter((e) => !isReversaHook(e));
    merged.afterFileEdit = [
      ...filtered,
      {
        command: `node "${runnerPath}" --phase post --engine cursor --tool afterFileEdit`,
        matchers: ['**/*'],
      },
    ];

    const files = [{ path: hooksPath, content: JSON.stringify(merged, null, 2) + '\n' }];
    const summary = [
      `Will write to: ${HOOKS_REL}`,
      `  afterFileEdit[]  ← matcher **/*, command: node ${runnerPath} --phase post …`,
    ];

    const fallback = buildPreCommitFallback({ projectRoot, runnerPath, engineId: 'cursor' });
    if (fallback) {
      files.push({ path: fallback.path, content: fallback.content, mode: fallback.mode });
      summary.push(`  Adds git pre-commit fallback (drains queue at commit-time): .git/hooks/pre-commit`);
    } else {
      summary.push(`  (Not a git repo — skipping pre-commit fallback)`);
    }

    return { files, summary: summary.join('\n') };
  },

  remove({ projectRoot }) {
    const hooksPath = join(projectRoot, HOOKS_REL);
    const result = { removed: [], cleaned: [] };

    if (existsSync(hooksPath)) {
      const data = JSON.parse(readFileSync(hooksPath, 'utf8'));
      let changed = false;
      for (const evt of ['afterFileEdit', 'beforeFileEdit', 'beforeShellExecution', 'afterShellExecution']) {
        if (!Array.isArray(data[evt])) continue;
        const filtered = data[evt].filter((e) => !isReversaHook(e));
        if (filtered.length !== data[evt].length) {
          if (filtered.length === 0) delete data[evt];
          else data[evt] = filtered;
          changed = true;
        }
      }
      if (changed) {
        writeFileSync(hooksPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
        result.cleaned.push(hooksPath);
      }
    }

    const fb = removePreCommitFallback({ projectRoot });
    if (fb) {
      writeFileSync(fb.path, fb.content, 'utf8');
      result.cleaned.push(fb.path);
    }
    return result;
  },
};
