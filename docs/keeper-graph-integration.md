# Keeper × Graph integration

Since v1.8.0, Keeper consults the L0 dependency graph (`aegis/runtime/context/graph.json`) on top of the `code-spec-matrix.md` to widen its blast radius and classify drift severity.

## What changed in `/aegis-keeper after`

**Step 2** (mapear specs impactadas) now uses two sources, in order:

1. **Matrix** (`aegis/traceability/code-spec-matrix.md`) — primary mapping `file → spec`.
2. **Graph** — for files **without** a matrix entry, run `npx aegis-spec graph impact <file>`. Any of the impacted files that **do** have a matrix entry contribute their spec to the review list.

This means an edit in a file that has no spec can still trigger spec updates downstream — Keeper finds them via the import graph instead of giving up.

**Step 7** (atualizar `drift.md`) now records two new fields per spec:

- `blast_radius`: list of files affected by changes in this spec's files (top 20, then `+N more`).
- `severity`: classification per [drift-rules.md](../agents/aegis-keeper/references/drift-rules.md):
  - `LOW` — 0–1 reverse-deps direct
  - `MEDIUM` — 2–4
  - `HIGH` — 5+ (Keeper suggests `/aegis-reviewer`)

## What changed at the hook layer

The `Stop` hook (Claude Code) and `session.end` (Opencode) now do an **incremental graph update** for the dirty files at the end of every session, before the next `/aegis-keeper after` runs. Other engines (Cursor, Kimi, Codex) update the graph at commit-time via the git pre-commit fallback (Phase 1).

If `aegis/runtime/context/graph.json` doesn't exist, the update is skipped silently. Run `npx aegis-spec graph build` once to bootstrap.

## What changed in `drift-check`

`aegis drift-check --format=json` now includes an `affected_files` array per blocking spec, computed as the union of graph-impact sets for the files mapped to that spec.

```json
{
  "severity": "high",
  "blocking": [
    {
      "spec": "aegis/specs/sdd/auth.md",
      "status": "🔴 pending",
      "action": "Run /aegis-keeper after",
      "affected_files": [
        "src/api/handler.js",
        "src/middleware/auth.js",
        "+12 more"
      ]
    }
  ]
}
```

PR comment integrations (e.g. CI bots) can lift this into the PR description so reviewers see the blast radius up front.

If the graph doesn't exist or the matrix is missing, `affected_files` is `null` — drift-check still works in degraded mode.

## Bootstrapping in an existing project

```bash
npx aegis-spec graph build
npx aegis-spec policy-index build   # optional, Phase 4
/aegis-keeper after            # in your engine
```

After that, the Stop hook keeps the graph fresh on every session.
