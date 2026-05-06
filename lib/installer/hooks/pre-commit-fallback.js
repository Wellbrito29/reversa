// Git pre-commit fallback for engines without a session-end hook
// (Cursor, Kimi CLI, Codex). Triggers a Keeper batch right before
// commit so users still get drift detection even without Stop semantics.
//
// Idempotent: bracketed by markers so it merges safely with an
// existing `.git/hooks/pre-commit` script.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SECTION_START = '# >>> reversa-keeper pre-commit fallback (do not edit between markers) >>>';
const SECTION_END = '# <<< reversa-keeper pre-commit fallback <<<';

function buildSection(runnerPath, engineId) {
  return [
    SECTION_START,
    '# Drains .aegis/keeper-queue.jsonl to a "stop" advisory.',
    '# Always exits 0 — never blocks a commit.',
    `node "${runnerPath}" --phase stop --engine ${engineId} || true`,
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

export function buildPreCommitFallback({ projectRoot, runnerPath, engineId }) {
  const gitHooksDir = join(projectRoot, '.git', 'hooks');
  if (!existsSync(join(projectRoot, '.git'))) return null;
  const target = join(gitHooksDir, 'pre-commit');

  let existing = '';
  if (existsSync(target)) existing = readFileSync(target, 'utf8');

  const hasShebang = existing.startsWith('#!');
  const base = existing.length === 0 ? '#!/usr/bin/env sh\n' : existing;
  const stripped = stripExistingSection(base);
  const sep = stripped.endsWith('\n') ? '' : '\n';
  const content = stripped + sep + buildSection(runnerPath, engineId);

  return {
    path: target,
    content,
    mode: 0o755,
    preExisted: existing.length > 0 && hasShebang,
  };
}

export function removePreCommitFallback({ projectRoot }) {
  const target = join(projectRoot, '.git', 'hooks', 'pre-commit');
  if (!existsSync(target)) return null;
  const existing = readFileSync(target, 'utf8');
  if (!existing.includes(SECTION_START)) return null;
  const stripped = stripExistingSection(existing).replace(/\n{3,}/g, '\n\n');
  const onlyShebang = stripped.trim() === '#!/usr/bin/env sh' || stripped.trim() === '';
  return {
    path: target,
    content: stripped,
    mode: 0o755,
    deleteIfEmpty: onlyShebang,
  };
}
