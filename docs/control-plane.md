# Aegis Spec control plane

Aegis Spec 2.0 ships a control plane around AI-generated code. Three pillars
work together:

| Pillar | What it does | Where it lives |
|---|---|---|
| **Aegis Spec** | Spec authority — features, contracts, invariants, ADRs | `aegis/` |
| **Keeper** | Drift gate — keeps spec and code in sync, optionally via LLM | `agents/aegis-keeper/` + `lib/auto/` |
| **Graph** | Code oracle — knowledge graph of the real code | `lib/graph/` |

Everything is MIT-licensed and runs locally; LLM calls are opt-in.

## Pipeline

```
Stage 1 — Discovery       Scout, Archaeologist, Detective, Architect, Writer, Reviewer
Stage 2 — Migration       Paradigm Advisor, Curator, Strategist, Designer, Inspector
Stage 3 — Build           Your coding agent (Claude / Codex / Cursor / Gemini / Kimi)
Stage 4 — Control plane   Keeper + Graph + Policy gate (this document)
```

Stages 1–2 produce specs. Stage 3 produces code. Stage 4 keeps them honest.

## Stage 4 surfaces

| Surface | Trigger | Decides |
|---|---|---|
| **Pre-edit hook** | `Stop` / `afterFileEdit` in your IDE | Block per-edit signature break (`lib/policy/check.js`) |
| **`policy-check` CLI** | CI on every PR | Block any PR with a contract-breaking signature change |
| **`keeper auto`** | After CI passes (or via the bot) | Update specs to match new code, or escalate to a human |
| **Audit log** | Every decision | Persist who/what/why under `aegis/runtime/audit/` |

## Languages

| Language | L0 (imports) | L1 (symbols + signatures) |
|---|---|---|
| JavaScript / TypeScript | ✅ | ✅ via `@babel/parser` |
| Python | ✅ | ✅ via `tree-sitter-python` |
| Go | ✅ | ✅ via `tree-sitter-go` |
| Java | ✅ | ✅ via `tree-sitter-java` |

L1 parsers are declared in `optionalDependencies` and loaded lazily — when a
native binary is missing, the language falls back to L0.

## Modes of operation

| Mode | Who decides | When to use |
|---|---|---|
| **HITL** (default) | Human answers Keeper's three questions | Critical contracts, public APIs |
| **Auto** | LLM classifies + writes; whitelist + blacklist + threshold gate | Whitelisted paths, trivial changes |
| **Hybrid** (recommended) | Auto whitelist + HITL blacklist | Production default |

Auto mode requires an `ANTHROPIC_API_KEY` and `auto_resolve.enabled: true` in
`aegis/config/auto-policy.yaml`. See `docs/keeper-auto.md`.

## Files Aegis Spec adds to your repo

| Path | Purpose |
|---|---|
| `aegis/specs/sdd/*.md` | Specs with frontmatter (`contracts:`, `protected_files:`) |
| `aegis/config/auto-policy.yaml` | Optional — enables auto mode |
| `aegis/config/audit-policy.json` | Optional — declares fields to redact in the audit log |
| `aegis/runtime/context/graph.json` | The code graph. Built by `aegis graph build`. |
| `aegis/runtime/context/policy-index.json` | Compiled spec frontmatter. Built by `aegis policy-index build`. |
| `aegis/runtime/queue/keeper-queue.jsonl` | Append-only drift queue from the hooks runner |
| `aegis/runtime/audit/YYYY-MM-DD.jsonl` | Audit log |

## CI templates

`templates/ci/` ships clone-ready workflows for GitHub Actions, GitLab CI,
and CircleCI. Each runs the three jobs (drift-check, policy-check,
keeper-auto). The auto job is gated by the `ANTHROPIC_API_KEY` secret and
skipped when missing — the rest of the gate still runs.

## Migrating from 1.x

See `docs/migration-1.x-to-2.0.md`.
