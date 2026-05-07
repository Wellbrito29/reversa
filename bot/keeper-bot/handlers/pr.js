// PR handler — drives policy-check + keeper-auto for a single pull request.
//
// Webhook-shape agnostic: takes a structured event + an Octokit-shaped
// client (anything exposing `rest.issues.addLabels` and `rest.issues.createComment`).
// We deliberately don't import @octokit directly — the operator wires the
// client they want (Octokit, Probot context, GitHub Actions @actions/github).
//
// The handler runs the same CLI flows a human would run locally so the
// behavior is identical between bot and manual runs.

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { LABEL_AUTO, LABEL_REVIEW, LABEL_ESCALATE, labelsFor } from '../../../lib/auto/labels.js';
import { appendAuditEntry } from '../../../lib/audit/writer.js';
import { commitSpecUpdates } from '../commit.js';

export async function handlePullRequest({
  octokit,
  event,
  projectRoot,
  log = console,
}) {
  const { owner, repo, pr_number, base_ref, head_ref, head_sha } = event;
  const root = projectRoot ?? process.cwd();

  const audit = (entry) => appendAuditEntry(root, {
    ts: new Date().toISOString(),
    kind: 'keeper-bot',
    pr_number,
    pr_url: `https://github.com/${owner}/${repo}/pull/${pr_number}`,
    commit: head_sha,
    ...entry,
  });

  // 1. Policy index + policy-check (signature gate).
  runCli(root, ['policy-index', 'build']);
  const checkOut = runCli(root, [
    'policy-check',
    `--base=origin/${base_ref}`,
    '--head=HEAD',
    '--severity=high',
    '--format=json',
  ], { allowNonZero: true });

  let checkPayload;
  try { checkPayload = JSON.parse(checkOut.stdout); }
  catch {
    log.error?.('policy-check did not emit JSON; aborting bot run');
    audit({ stage: 'policy-check', error: 'invalid JSON output' });
    return { ok: false };
  }

  if (!checkPayload.ok) {
    audit({ stage: 'policy-check', decisions: checkPayload.decisions });
    await comment(octokit, owner, repo, pr_number, renderPolicyComment(checkPayload));
    await applyLabels(octokit, owner, repo, pr_number, [LABEL_ESCALATE], log);
    return { ok: false, stage: 'policy-check' };
  }

  // 2. Keeper auto. Only runs when auto-policy.yaml has enabled:true; in
  //    dry-run mode if no API key is present so the bot still produces
  //    useful labels in environments without an Anthropic credential.
  const haveKey = !!process.env.ANTHROPIC_API_KEY;
  const autoOut = runCli(root, [
    'keeper', 'auto',
    haveKey ? '' : '--dry-run',
    '--format=json',
  ].filter(Boolean), { allowNonZero: true });

  let autoPayload;
  try { autoPayload = JSON.parse(autoOut.stdout); }
  catch {
    audit({ stage: 'keeper-auto', error: 'invalid JSON output' });
    autoPayload = { decisions: [] };
  }

  audit({ stage: 'keeper-auto', summary: autoPayload.summary, dry_run: autoPayload.dry_run });

  // 3. Commit any spec changes back to the PR branch (spec-only guard).
  if (haveKey) {
    try {
      const committed = await commitSpecUpdates({
        octokit, owner, repo, branch: head_ref, projectRoot: root,
      });
      if (committed) audit({ stage: 'commit', sha: committed });
    } catch (e) {
      audit({ stage: 'commit', error: e.message });
    }
  }

  // 4. Labels.
  const labels = labelsFor(autoPayload.decisions ?? []);
  if (labels.length === 0) labels.push(LABEL_REVIEW);
  await applyLabels(octokit, owner, repo, pr_number, labels, log);
  audit({ stage: 'labels', labels });

  return { ok: true, labels, summary: autoPayload.summary ?? null };
}

function runCli(cwd, args, { allowNonZero = false } = {}) {
  try {
    const stdout = execFileSync('npx', ['aegis', ...args], {
      cwd,
      encoding: 'utf8',
      env: process.env,
    });
    return { stdout, code: 0 };
  } catch (e) {
    if (allowNonZero) return { stdout: e.stdout?.toString() ?? '', code: e.status ?? 1 };
    throw e;
  }
}

async function applyLabels(octokit, owner, repo, issue_number, labels, log) {
  if (!labels.length) return;
  try {
    await octokit.rest.issues.addLabels({ owner, repo, issue_number, labels });
  } catch (e) {
    log.warn?.(`label add failed: ${e.message}`);
  }
}

async function comment(octokit, owner, repo, issue_number, body) {
  try {
    await octokit.rest.issues.createComment({ owner, repo, issue_number, body });
  } catch {
    // Commenting is best-effort; we still apply labels and exit clean.
  }
}

function renderPolicyComment(payload) {
  const lines = ['### Aegis Spec policy gate blocked this PR', ''];
  for (const { file, decision } of payload.decisions ?? []) {
    if (decision.decision !== 'block') continue;
    lines.push(`- \`${file}\`: ${decision.reason ?? decision.category}`);
    const c = decision.details?.change;
    if (c) {
      lines.push(`  - kind: \`${c.kind}\``);
      lines.push(`  - old: \`${c.before?.signature ?? '<absent>'}\``);
      lines.push(`  - new: \`${c.after?.signature ?? '<absent>'}\``);
      for (const alt of decision.details.alternatives ?? []) {
        lines.push(`  - → ${alt.title}`);
      }
    }
  }
  return lines.join('\n');
}
