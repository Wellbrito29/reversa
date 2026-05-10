# Doubt

**Command:** `/aegis-doubt`
**Phase:** Forward — between Requirements (or Tech Brief) and Plan
**Status:** Optional

---

## ❓ The clarifier

Generates up to five directed questions to resolve ambiguities in the `requirements.md`, then integrates the answers back into the document. Optional step before planning, used when the requirements still has `[DÚVIDA]` markers, vague phrases, or undefined limits.

---

## What it does

Doubt scans the active feature's `requirements.md` for ambiguity signals — explicit `[DÚVIDA]` markers, vague language ("maybe", "probably", "if possible"), open terms without definition, missing edge cases — and asks the user up to five ranked questions.

Each question is multiple choice or short answer, never open-ended. The user answers what they can; Doubt updates the requirements in place, removing resolved markers and writing answers into a `## Esclarecimentos` section.

---

## What it reads

- `aegis/config/state.json` — `output_folder`, `forward_folder`
- `aegis/config/active-requirements.json` — current feature pointer
- `<feature-dir>/requirements.md` — document to clarify
- `aegis/runtime/hooks.yml` — `before-doubt` and `after-doubt` hooks

---

## What it produces

| File | Content |
|------|---------|
| `<feature-dir>/requirements.md` | Updated in place with `## Esclarecimentos` section and resolved markers removed |

---

## When to use

After `/aegis-requirements` (or `/aegis-tech-brief`), when the requirements still has open ambiguities the planner would stumble on.

```
/aegis-doubt
```

Manual invocation. Suggests `/aegis-doubt` again if questions remain, or `/aegis-plan` when clean.
