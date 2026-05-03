# Audit log schema (`.reversa/audit/YYYY-MM-DD.jsonl`)

Each line is a single JSON object — append-only, never rewritten in place. New
fields may appear over time; consumers should ignore unknown keys rather than
fail.

## Common fields

| Field        | Type     | Required | Description |
|--------------|----------|----------|-------------|
| `ts`         | ISO 8601 | yes      | Wall clock at decision time, UTC |
| `kind`       | string   | yes      | `keeper-auto` \| `keeper-bot` \| `policy-check` |
| `route`      | string   | optional | `auto_resolve` \| `needs_review` \| `escalate_block` (auto mode) |
| `decision`   | string   | optional | `approve` \| `approve+advisory` \| `block` (policy gate) |
| `file`       | string   | optional | Project-relative path of the changed file |
| `spec_path`  | string   | optional | Path to the spec the entry maps to |
| `reason`     | string   | optional | Free-form short explanation |
| `confidence` | number   | optional | 0..1, classifier confidence (auto mode) |
| `dry_run`    | bool     | optional | `true` when the entry was emitted by a dry-run |

## Bot fields (Phase 13)

| Field          | Type   | Description |
|----------------|--------|-------------|
| `pr_number`    | int    | GitHub PR number that triggered the run |
| `pr_url`       | string | Convenience link to the PR |
| `commit`       | string | Head SHA at the time of the run |
| `labels_added` | array  | Labels applied by the bot, e.g. `["keeper:auto-resolved"]` |

## Redaction

When `_reversa_sdd/audit-policy.json` declares fields to redact (`{ "redact": [...] }`),
the listed fields are replaced with `sha256:<16 hex>` and a top-level
`redacted` array is added listing the original field names. Redacted entries
remain valid JSON and remain correlatable — two entries touching the same
underlying value share the same hash prefix.

## Tooling

- `lib/audit/writer.js#appendAuditEntry(projectRoot, entry)` — write one line.
- `lib/audit/redact.js#redactEntry(entry, policy)` — pure helper, no IO.
- `bot/keeper-bot/handlers/pr.js` — PR handler that calls `appendAuditEntry`
  for every decision it emits.
