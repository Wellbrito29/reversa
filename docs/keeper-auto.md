# Keeper auto mode

LLM-driven drift triage for the Reversa Keeper. Auto mode replaces the
three-question HITL flow with a deterministic decision tree, falling back
to Claude Haiku only when the policy doesn't already cover the case. Spec
rewrites use Claude Sonnet, but only on the path that auto-resolves.

```bash
npx reversa keeper auto --dry-run
```

## Policy file

`_reversa_sdd/auto-policy.yaml` is read at every run. Auto mode is **off**
by default — it requires `auto_resolve.enabled: true`.

```yaml
auto_resolve:
  enabled: true
  confidence_threshold: 0.85
  max_specs_per_pr: 5
  whitelist:
    paths: ["**/*.test.*", "docs/**"]
    change_types: [test_only, format_only]
  blacklist:
    paths: ["**/contracts/**"]
    change_types: [public_api_change]
  escalate_on:
    - "spec_deletion"
  llm:
    model: claude-haiku-4-5
    fallback: claude-sonnet-4-6
```

A commented template ships at `templates/auto-policy.example.yaml`.

## Decision flow

```
queue entry  ─┬─ blacklist match? ─────────► escalate_block
              ├─ whitelist match? ─────────► auto_resolve
              ├─ escalate_on rule? ────────► escalate_block
              └─ classifier (Haiku) ───┬─ confidence ≥ threshold ────► auto_resolve
                                       └─ otherwise ─────────────────► needs_review
```

## CLI

```
npx reversa keeper auto [--dry-run] [--max-specs N] [--cwd <path>]
                        [--format text|json]
```

| Flag | Default | Meaning |
|---|---|---|
| `--dry-run` | off | Skip LLM calls; deterministic decisions only |
| `--max-specs` | from policy | Cap how many drift entries the run handles |
| `--cwd` | current dir | Operate against another project tree |
| `--format` | text | `json` for CI |

## Audit log

Every decision is appended to `.reversa/audit/YYYY-MM-DD.jsonl`. Schema
documented in `lib/audit/schema.md`. Configure redaction with
`_reversa_sdd/audit-policy.json`:

```json
{ "redact": ["diff", "commit_message"] }
```

## GitHub bot

`bot/keeper-bot/` ships a webhook-shape-agnostic handler. See
`bot/keeper-bot/install.md` for setup. The bot is restricted to commits
under `_reversa_sdd/**` — any change outside that prefix aborts the
push.
