// Claude Code hook generator (v1.8.0-alpha.3+, Phase 4).
//
// Writes hook configuration to .claude/settings.json (project-level, committed).
// Adds:
//   - PreToolUse matcher (Edit|Write|MultiEdit) → policy gate (file-level)
//   - PostToolUse matcher (Edit|Write|MultiEdit) → lean append to queue.jsonl
//   - Stop hook → advisory message at end of agent session
//
// PreToolUse runs the runner with --phase pre, which checks the policy
// index and emits {"decision":"block",...} on stdout if the file is
// protected. Approve = silent pass-through.
//
// Existing settings.json contents are preserved — only hooks created by Aegis Spec
// are touched, identified by the marker in the command string.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const RUNNER_MARKER = 'aegis/_hooks/runner.js';
const SETTINGS_REL = '.claude/settings.json';

function buildHookEntries(runnerPath) {
  const cmdPre = `node "${runnerPath}" --phase pre --engine claude-code --tool "$CLAUDE_TOOL_NAME"`;
  const cmdPost = `node "${runnerPath}" --phase post --engine claude-code --tool "$CLAUDE_TOOL_NAME"`;
  const cmdStop = `node "${runnerPath}" --phase stop --engine claude-code`;

  return {
    PreToolUse: {
      matcher: 'Edit|Write|MultiEdit',
      hooks: [{ type: 'command', command: cmdPre }],
    },
    PostToolUse: {
      matcher: 'Edit|Write|MultiEdit',
      hooks: [{ type: 'command', command: cmdPost }],
    },
    Stop: {
      hooks: [{ type: 'command', command: cmdStop }],
    },
  };
}

function isAegisSpecHook(entry) {
  if (!entry || !Array.isArray(entry.hooks)) return false;
  return entry.hooks.some((h) => typeof h.command === 'string' && h.command.includes(RUNNER_MARKER));
}

export default {
  id: 'claude-code',
  name: 'Claude Code',

  describe() {
    return 'Adds PreToolUse (policy gate) + PostToolUse + Stop hooks to .claude/settings.json';
  },

  generate({ projectRoot, runnerPath }) {
    const settingsPath = join(projectRoot, SETTINGS_REL);
    const existing = existsSync(settingsPath)
      ? JSON.parse(readFileSync(settingsPath, 'utf8'))
      : {};

    const newEntries = buildHookEntries(runnerPath);
    const merged = { ...existing };
    merged.hooks = { ...(existing.hooks ?? {}) };

    for (const evt of ['PreToolUse', 'PostToolUse', 'Stop']) {
      const current = Array.isArray(merged.hooks[evt]) ? merged.hooks[evt] : [];
      const filtered = current.filter((e) => !isAegisSpecHook(e));
      merged.hooks[evt] = [...filtered, newEntries[evt]];
    }

    return {
      files: [{ path: settingsPath, content: JSON.stringify(merged, null, 2) + '\n' }],
      summary: [
        `Will write to: ${SETTINGS_REL}`,
        `  hooks.PreToolUse[]  ← matcher Edit|Write|MultiEdit, command: node ${runnerPath} --phase pre …  (policy gate)`,
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
      const filtered = data.hooks[evt].filter((e) => !isAegisSpecHook(e));
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
