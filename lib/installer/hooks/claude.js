// Claude Code hook generator (v1.7.0+, Phase 1).
//
// Writes hook configuration to .claude/settings.json (project-level, committed).
// Adds:
//   - PostToolUse matcher (Edit|Write|MultiEdit) → lean append to queue.jsonl
//   - Stop hook → advisory message at end of agent session
//
// PreToolUse hook removed (was heavy + onerous). Will return in Phase 4
// for the policy gate (signature-aware blocking).
//
// Existing settings.json contents are preserved — only hooks created by Reversa
// are touched, identified by the marker in the command string.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const RUNNER_MARKER = 'reversa/_hooks/runner.js';
const SETTINGS_REL = '.claude/settings.json';

function buildHookEntries(runnerPath) {
  const cmdPost = `node "${runnerPath}" --phase post --engine claude-code --tool "$CLAUDE_TOOL_NAME"`;
  const cmdStop = `node "${runnerPath}" --phase stop --engine claude-code`;

  return {
    PostToolUse: {
      matcher: 'Edit|Write|MultiEdit',
      hooks: [{ type: 'command', command: cmdPost }],
    },
    Stop: {
      hooks: [{ type: 'command', command: cmdStop }],
    },
  };
}

function isReversaHook(entry) {
  if (!entry || !Array.isArray(entry.hooks)) return false;
  return entry.hooks.some((h) => typeof h.command === 'string' && h.command.includes(RUNNER_MARKER));
}

export default {
  id: 'claude-code',
  name: 'Claude Code',

  describe() {
    return 'Adds PostToolUse + Stop hooks to .claude/settings.json (lean append-only)';
  },

  generate({ projectRoot, runnerPath }) {
    const settingsPath = join(projectRoot, SETTINGS_REL);
    const existing = existsSync(settingsPath)
      ? JSON.parse(readFileSync(settingsPath, 'utf8'))
      : {};

    const newEntries = buildHookEntries(runnerPath);
    const merged = { ...existing };
    merged.hooks = { ...(existing.hooks ?? {}) };

    // Phase 1: clean up any old PreToolUse Reversa hooks.
    if (Array.isArray(merged.hooks.PreToolUse)) {
      const filtered = merged.hooks.PreToolUse.filter((e) => !isReversaHook(e));
      if (filtered.length === 0) delete merged.hooks.PreToolUse;
      else merged.hooks.PreToolUse = filtered;
    }

    for (const evt of ['PostToolUse', 'Stop']) {
      const current = Array.isArray(merged.hooks[evt]) ? merged.hooks[evt] : [];
      const filtered = current.filter((e) => !isReversaHook(e));
      merged.hooks[evt] = [...filtered, newEntries[evt]];
    }

    return {
      files: [{ path: settingsPath, content: JSON.stringify(merged, null, 2) + '\n' }],
      summary: [
        `Will write to: ${SETTINGS_REL}`,
        `  hooks.PostToolUse[] ← matcher Edit|Write|MultiEdit, command: node ${runnerPath} --phase post …`,
        `  hooks.Stop[]        ← command: node ${runnerPath} --phase stop …`,
      ].join('\n'),
    };
  },

  remove({ projectRoot }) {
    const settingsPath = join(projectRoot, SETTINGS_REL);
    const result = { removed: [], cleaned: [] };
    if (!existsSync(settingsPath)) return result;

    const data = JSON.parse(readFileSync(settingsPath, 'utf8'));
    if (!data.hooks) return result;

    let changed = false;
    for (const evt of ['PreToolUse', 'PostToolUse', 'Stop']) {
      if (!Array.isArray(data.hooks[evt])) continue;
      const filtered = data.hooks[evt].filter((e) => !isReversaHook(e));
      if (filtered.length !== data.hooks[evt].length) {
        if (filtered.length === 0) delete data.hooks[evt];
        else data.hooks[evt] = filtered;
        changed = true;
      }
    }

    if (changed) {
      const stillHasHooks = Object.keys(data.hooks).length > 0;
      if (!stillHasHooks) delete data.hooks;
      writeFileSync(settingsPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
      result.cleaned.push(settingsPath);
    }

    return result;
  },
};
