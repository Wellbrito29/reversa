# Requirements

**Command:** `/aegis-requirements`
**Phase:** Forward — first skill of the cycle
**Status:** Required to start a new feature

---

## ✍️ The requirements drafter

Turns a raw idea (a sentence or paragraph from the user) into a complete `requirements.md`, anchored on the artifacts already produced by the discovery pipeline. First skill of the forward cycle: requirements → tech-brief → doubt → plan → to-do → audit → quality → coding.

---

## What it does

The user describes a feature in plain language — "I want customers to be able to cancel orders within 24h". Requirements transforms that into a structured document with goals, scope, behaviors, acceptance criteria, and open questions, cross-referenced with what the discovery pipeline already knows about the system.

It detects in-progress features (looking at physical artifacts inside `aegis/forward/`) and refuses to overwrite without explicit confirmation.

---

## What it reads

- `aegis/config/state.json` — `output_folder`, `forward_folder`, `doc_language`
- `aegis/config/active-requirements.json` — current feature pointer
- `aegis/runtime/hooks.yml` — `before-requirements` and `after-requirements` hooks
- `aegis/runtime/context/surface.json` — module list
- `aegis/specs/sdd/<unit>/*.md` — existing legacy specs for cross-reference

---

## What it produces

| File | Content |
|------|---------|
| `aegis/forward/<NNN-feature-name>/requirements.md` | Full requirements doc |
| `aegis/config/active-requirements.json` | Pointer to the active feature dir |

The feature folder uses sequential prefixes (`001-name`, `002-name`, ...) by default.

---

## When to use

```
/aegis-requirements
```

Manual invocation. Suggests next step (`/aegis-tech-brief` or `/aegis-doubt`) and waits — never auto-chains.
