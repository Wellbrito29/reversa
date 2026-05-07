# Aegis Spec Keeper Bot

A small GitHub bot that runs `aegis keeper auto` against incoming PRs and
labels them based on the outcome. It commits any spec updates back to the
PR branch under `aegis/**` only — never source code.

The bot is intentionally **not** a hosted Anthropic service. You run it as
either:

1. **A GitHub Actions job** in the target repo (recommended for OSS / single-repo
   setups). See `templates/ci/keeper-bot.yml` (added by Phase 14).
2. **A long-running Octokit process** keyed off webhooks, for orgs that want
   one bot to serve many repos. Octokit/Probot scaffolding is the user's
   choice — the entrypoint exposed here (`bot/keeper-bot/handlers/pr.js`)
   is webhook-shape agnostic.

## What it does on a PR

1. Checks out the PR head.
2. Runs `npx aegis policy-index build` and `npx aegis policy-check
   --base origin/<base> --head HEAD --severity high --format json`.
3. If `policy-check` blocks, it posts a comment with the reasons + suggested
   alternatives, applies `keeper:escalated`, and stops.
4. Otherwise runs `npx aegis keeper auto --format json --max-specs 5`
   (auto mode requires `auto_resolve.enabled: true` in `auto-policy.yaml`).
5. Commits any changes under `aegis/**` with `[skip ci]` in the
   message.
6. Applies one of `keeper:auto-resolved`, `keeper:needs-review`,
   `keeper:escalated` based on the decision tree summary.

## Required permissions

| Permission                | Why |
|---------------------------|-----|
| `contents: write`         | Push spec-only commits |
| `pull-requests: write`    | Comment + label PRs |
| `issues: write`           | Label PRs (GitHub treats issue-labels as PR-labels) |

The bot must NOT have `contents: write` access outside `aegis/**`.
The handler hard-fails if it sees a staged change outside that prefix —
this is the safety boundary.

## Required secrets

| Secret              | Where it goes |
|---------------------|---------------|
| `GITHUB_TOKEN`      | Provided by GitHub Actions automatically |
| `ANTHROPIC_API_KEY` | Repo / org secret — required when `auto_resolve.enabled` is true |

## Audit log

Every decision is appended to `.aegis/audit/YYYY-MM-DD.jsonl` (see
`lib/audit/schema.md`). When running in CI, persist the audit dir as an
artifact if you want a long-term trail.

## Code map

- `handlers/pr.js` — entrypoint. Takes `{ owner, repo, pr_number, head_sha }`
  plus an Octokit-shaped client; runs the decisions and commits + labels.
- `commit.js` — guards the spec-only contract on the staged set before
  pushing, then commits via the Git Database API to bypass branch protection
  on the PR head ref's `[skip ci]` commit.
- `labels.js` (in `lib/auto/`) — maps decisions to label names.

## Why this is a thin wrapper, not a full app

A full GitHub App needs a webhook listener, a private key, a hosted
runtime, and a permissions manifest. That's appropriate for orgs running
the bot at scale, but it's overkill for the common case (one repo, run
inside Actions). Phase 13 ships the **decision-making core**; Phase 14
will land the Actions workflow that drives it. Wrapping the same handler
in a Probot/Octokit web service is straightforward and intentionally left
to the operator.
