# Coding

**Command:** `/aegis-coding`
**Phase:** Forward — last skill of the cycle
**Status:** Required to execute the feature

---

## ⌨️ The executor

Walks through `actions.md` and turns each open checkbox into real code, phase by phase, respecting parallelism and dependencies. When done, leaves two audit trails: `legacy-impact.md` (what changed in the legacy) and `regression-watch.md` (what must remain true in future extractions).

---

## What it does

Coding reads the action list and executes each item top to bottom: edits files, runs commands, creates new modules, updates tests. It marks each finished action `[X]` and appends a JSONL progress record.

The skill respects the parallel-execution markers from To-Do — independent actions can be batched, dependent ones run in order. After execution, it produces two audit artifacts that future extractions and Keeper checks rely on.

---

## What it reads

- `aegis/config/state.json` — `output_folder`, `forward_folder`
- `aegis/config/active-requirements.json` — current feature pointer
- `<feature-dir>/actions.md` — the executable list
- `<feature-dir>/roadmap.md`, `data-delta.md`, `interfaces.md` — context for execution
- `aegis/runtime/hooks.yml` — `before-coding` and `after-coding` hooks

---

## What it produces

| File | Content |
|------|---------|
| `<feature-dir>/actions.md` | Updated in place — checkboxes flipped to `[X]` as actions complete |
| `<feature-dir>/progress.jsonl` | Append-only log of every action executed (timestamp, ID, status) |
| `<feature-dir>/legacy-impact.md` | What changed in the legacy code (files, modules, contracts) |
| `<feature-dir>/regression-watch.md` | Invariants that must hold in future extractions (Keeper input) |

Plus, of course, all the actual code changes the actions describe.

---

## When to use

After `/aegis-to-do` produces `actions.md`. Optionally after `/aegis-audit` and/or `/aegis-quality` if you want a review pass.

```
/aegis-coding
```

Manual invocation. Walks the action list and stops to ask only when explicitly required by an action.
