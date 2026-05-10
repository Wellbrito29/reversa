# Principles

**Command:** `/aegis-principles`
**Phase:** Forward — out-of-cycle, runs anytime
**Status:** Optional, rare

---

## 📜 The principles guardian

Creates or updates the project's lasting principles and propagates adjustment suggestions to dependent templates. Principles are rare, change little, and influence every other artifact.

This skill is **not** part of the `requirements → plan → to-do → coding` pipeline. It runs standalone, even before the first feature.

---

## What it does

Principles is the slow-moving layer of the project. It captures rules that should hold across all features — code style invariants, architectural constraints, security baselines, naming conventions, deployment policies. When a principle is added, changed, or retired, the skill suggests where dependent templates (requirements, roadmap, actions) need adjusting.

Typical cadence: less than once a month.

---

## What it reads

- `aegis/config/state.json` — `output_folder`, `forward_folder`
- `aegis/config/principles.md` — current principles (created if missing)
- `aegis/runtime/hooks.yml` — `before-principles` and `after-principles` hooks

---

## What it produces

| File | Content |
|------|---------|
| `aegis/config/principles.md` | The lasting project principles, versioned and append-only |
| Suggestion list | Templates and active features that may need to align with the new/changed principle |

---

## When to use

- Before the first feature, to seed core principles
- When the team agrees on a new architectural rule
- When retiring or revising an existing principle

```
/aegis-principles
```

Manual invocation. Standalone — does not chain into the forward cycle.
