// Install a git pre-commit hook that runs `aegis policy-check --severity
// medium` against the staged diff. Catches signature breaks before they ever
// reach CI. Uses `git diff --cached` semantics by checking the staged tree
// against HEAD.
//
// Idempotent: re-running adds no duplicate content. If the user has an
// existing pre-commit hook, we append our block guarded by markers so we
// can later remove or update it cleanly.

import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';

const BEGIN = '# >>> aegis policy-check >>>';
const END = '# <<< aegis policy-check <<<';

const HOOK_BODY = [
  BEGIN,
  '# Installed by `aegis install --git-hooks`. Remove the block between',
  '# the markers (or run `aegis remove-hooks --git`) to disable.',
  'if command -v npx >/dev/null 2>&1; then',
  '  npx --no-install aegis policy-check --base HEAD --head :0 --severity medium || exit 1',
  'fi',
  END,
].join('\n');

export function installGitHook(projectRoot) {
  const dir = join(projectRoot, '.git', 'hooks');
  if (!existsSync(join(projectRoot, '.git'))) {
    throw new Error('not a git repository — run `git init` first');
  }
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'pre-commit');

  let existing = existsSync(path) ? readFileSync(path, 'utf8') : '#!/bin/sh\n';
  if (existing.includes(BEGIN)) {
    // Replace the existing block to keep it up to date.
    const re = new RegExp(`${BEGIN}[\\s\\S]*?${END}`);
    existing = existing.replace(re, HOOK_BODY);
  } else {
    if (!existing.endsWith('\n')) existing += '\n';
    existing += '\n' + HOOK_BODY + '\n';
  }
  writeFileSync(path, existing, 'utf8');
  chmodSync(path, 0o755);
  return path;
}

export function removeGitHook(projectRoot) {
  const path = join(projectRoot, '.git', 'hooks', 'pre-commit');
  if (!existsSync(path)) return false;
  const existing = readFileSync(path, 'utf8');
  if (!existing.includes(BEGIN)) return false;
  const re = new RegExp(`\\n*${BEGIN}[\\s\\S]*?${END}\\n*`);
  const cleaned = existing.replace(re, '\n');
  writeFileSync(path, cleaned, 'utf8');
  return true;
}
