// Spec-only commit helper.
//
// The bot is allowed to push to the PR branch, but only files under
// `_aegis_sdd/**`. We enforce that here: if `git status --porcelain`
// shows anything outside that prefix, we abort without committing.
//
// We use plain `git` rather than the GitHub Git Database API: the bot
// runs in a checkout (Actions, Probot worker), and shelling out keeps
// the implementation small and easy to audit.

import { execFileSync } from 'node:child_process';

const ALLOWED_PREFIX = '_aegis_sdd/';

export async function commitSpecUpdates({ owner, repo, branch, projectRoot }) {
  const dirty = porcelain(projectRoot);
  if (dirty.length === 0) return null;

  for (const f of dirty) {
    if (!f.startsWith(ALLOWED_PREFIX)) {
      throw new Error(
        `keeper-bot refuses to commit: ${f} is outside ${ALLOWED_PREFIX}. ` +
        `The bot is restricted to spec-only edits.`,
      );
    }
  }

  run(projectRoot, ['add', ...dirty]);
  run(projectRoot, [
    'commit',
    '--no-verify',
    '-m',
    'reversa(keeper): auto-update specs [skip ci]',
  ]);
  const sha = run(projectRoot, ['rev-parse', 'HEAD']).trim();
  run(projectRoot, ['push', 'origin', `HEAD:${branch}`]);
  return sha;
}

function porcelain(cwd) {
  const out = execFileSync('git', ['-C', cwd, 'status', '--porcelain'], {
    encoding: 'utf8',
  });
  return out.split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^.. /, ''));
}

function run(cwd, args) {
  return execFileSync('git', ['-C', cwd, ...args], {
    encoding: 'utf8',
    env: process.env,
  });
}
