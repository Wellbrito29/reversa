# Plan

**Command:** `/aegis-plan`
**Phase:** Forward — third skill of the cycle
**Status:** Required to advance to coding

---

## 🏗️ The evolution architect

Translates the active feature's `requirements.md` into a concrete technical proposal expressed as a delta over the existing legacy. Generates the roadmap, investigation notes, data delta, onboarding guide, and interface specs that the To-Do skill will decompose into actions.

---

## What it does

Plan reads the requirements (and any clarifications from `/aegis-doubt`) and produces a multi-file technical design centered on what changes — not a full re-description of the legacy. Output focuses on architectural delta, data delta, contract delta, migration plan, risks, and definition of done.

If unresolved `[DÚVIDA]` markers remain, Plan asks the user whether to proceed (turning each marker into an explicit assumption with a visible warning) or to bounce back to `/aegis-doubt`.

---

## What it reads

- `aegis/config/state.json` — `output_folder`, `forward_folder`
- `aegis/config/active-requirements.json` — current feature pointer
- `<feature-dir>/requirements.md` — the source requirements
- `<feature-dir>/tech-brief.md` — if present, technical brief from the tech lead
- `aegis/runtime/hooks.yml` — `before-plan` and `after-plan` hooks
- `aegis/architecture/*.md`, `aegis/specs/sdd/<unit>/*.md` — legacy context

---

## What it produces

| File | Content |
|------|---------|
| `<feature-dir>/roadmap.md` | Approach summary, applied principles, technical decisions, architectural/data/contract deltas, migration plan, risks, done criteria |
| `<feature-dir>/investigation.md` | Background research, alternatives, external references, applicable patterns |
| `<feature-dir>/data-delta.md` | Conceptual diff over the extracted data model — new fields, removed fields, required migrations |
| `<feature-dir>/onboarding.md` | Executable walkthrough for a human testing the feature for the first time |
| `<feature-dir>/interfaces.md` | Contracts that will change |

---

## When to use

```
/aegis-plan
```

Manual invocation. Suggests `/aegis-to-do` next (or `/aegis-audit` if confidence is low).
