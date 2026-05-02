// Codex hook generator (v1.7.0+, Phase 1).
//
// Writes to .codex/hooks.toml (project-level). Codex hooks support
// pre/post tool events around apply_patch operations.
//
// PreToolUse removed in Phase 1 (returns in Phase 4 for policy gate).
//
// Marker-bracketed section so remove() is precise without touching
// user-managed entries elsewhere in the file.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildPreCommitFallback, removePreCommitFallback } from './pre-commit-fallback.js';

const SECTION_START = '# >>> reversa-keeper hooks (do not edit between markers) >>>';
const SECTION_END = '# <<< reversa-keeper hooks <<<';
const HOOKS_REL = '.codex/hooks.toml';

function buildSection(runnerPath) {
  const cmdPost = `node "${runnerPath}" --phase post --engine codex --tool apply_patch`;
  return [
    SECTION_START,
    '[[hook]]',
    'event = "PostToolUse"',
    'matcher = "apply_patch"',
    `command = """${cmdPost}"""`,
    SECTION_END,
    '',
  ].join('\n');
}

function stripExistingSection(content) {
  const startIdx = content.indexOf(SECTION_START);
  if (startIdx === -1) return content;
  const endIdx = content.indexOf(SECTION_END, startIdx);
  if (endIdx === -1) return content;
  const tail = content.slice(endIdx + SECTION_END.length);
  return content.slice(0, startIdx).replace(/\n+$/, '\n') + tail.replace(/^\n+/, '\n');
}

export default {
  id: 'codex',
  name: 'Codex',

  describe() {
    return 'Adds [[hook]] PostToolUse to .codex/hooks.toml (lean append-only)';
  },

  generate({ projectRoot, runnerPath }) {
    const target = join(projectRoot, HOOKS_REL);
    const existing = existsSync(target) ? readFileSync(target, 'utf8') : '';
    const stripped = stripExistingSection(existing);
    const merged = stripped + (stripped.length > 0 && !stripped.endsWith('\n') ? '\n' : '')
      + (stripped.length > 0 ? '\n' : '')
      + buildSection(runnerPath);

    const files = [{ path: target, content: merged }];
    const summary = [
      `Will write to: ${HOOKS_REL}`,
      `  Adds [[hook]] PostToolUse (matcher apply_patch) — lean append-only`,
      `  Existing entries preserved; Reversa section bracketed by markers.`,
    ];

    const fallback = buildPreCommitFallback({ projectRoot, runnerPath, engineId: 'codex' });
    if (fallback) {
      files.push({ path: fallback.path, content: fallback.content, mode: fallback.mode });
      summary.push(`  Adds git pre-commit fallback (drains queue at commit-time): .git/hooks/pre-commit`);
    } else {
      summary.push(`  (Not a git repo — skipping pre-commit fallback)`);
    }

    return { files, summary: summary.join('\n') };
  },

  remove({ projectRoot }) {
    const target = join(projectRoot, HOOKS_REL);
    const result = { removed: [], cleaned: [] };
    if (existsSync(target)) {
      const existing = readFileSync(target, 'utf8');
      if (existing.includes(SECTION_START)) {
        const stripped = stripExistingSection(existing).replace(/\n{3,}/g, '\n\n');
        writeFileSync(target, stripped, 'utf8');
        result.cleaned.push(target);
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
