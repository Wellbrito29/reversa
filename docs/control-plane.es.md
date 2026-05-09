# Control plane Aegis Spec

Aegis Spec 2.0 entrega un control plane alrededor de código generado por IA.
Tres pilares trabajan juntos:

| Pilar | Qué hace | Dónde vive |
|---|---|---|
| **Aegis Spec** | Autoridad de spec — features, contratos, invariantes, ADRs | `aegis/` |
| **Keeper** | Drift gate — mantiene spec y código en sync, opcionalmente vía LLM | `agents/aegis-keeper/` + `lib/auto/` |
| **Graph** | Oráculo del código — knowledge graph del código real | `lib/graph/` |

Todo MIT, todo corre local; llamadas a LLM son opt-in.

## Pipeline

```
Stage 1 — Discovery       Scout, Archaeologist, Detective, Architect, Writer, Reviewer
Stage 2 — Migration       Paradigm Advisor, Curator, Strategist, Designer, Inspector
Stage 3 — Build           Tu agente de código (Claude / Codex / Cursor / Gemini / Kimi)
Stage 4 — Control plane   Keeper + Graph + Policy gate (este documento)
```

Stages 1–2 producen specs. Stage 3 produce código. Stage 4 mantiene ambos honestos.

## Superficies del Stage 4

| Superficie | Trigger | Decide |
|---|---|---|
| **Hook pre-edit** | `Stop` / `afterFileEdit` en tu IDE | Bloquea signature break por edit |
| **CLI `policy-check`** | CI en cada PR | Bloquea PR con cambio de contrato |
| **`keeper auto`** | Después de que CI pase (o vía bot) | Actualiza specs o escala a humano |
| **Audit log** | Cada decisión | Persiste quién/qué/por qué en `aegis/runtime/audit/` |

## Lenguajes

| Lang | L0 (imports) | L1 (symbols + signatures) |
|---|---|---|
| JavaScript / TypeScript | ✅ | ✅ vía `@babel/parser` |
| Python | ✅ | ✅ vía `tree-sitter-python` |
| Go | ✅ | ✅ vía `tree-sitter-go` |
| Java | ✅ | ✅ vía `tree-sitter-java` |

Parsers L1 están en `optionalDependencies` y cargan lazy — cuando el binario
nativo falta, el lenguaje cae a L0.

## Modos

| Modo | Quién decide | Cuándo |
|---|---|---|
| **HITL** (default) | Humano responde 3 preguntas del Keeper | Contratos críticos, APIs públicas |
| **Auto** | LLM clasifica y escribe; whitelist/blacklist/threshold gate | Paths whitelisted, cambios triviales |
| **Hybrid** (recomendado) | Auto whitelist + HITL blacklist | Default en producción |

Auto mode exige `ANTHROPIC_API_KEY` y `auto_resolve.enabled: true` en
`aegis/config/auto-policy.yaml`. Ver `docs/keeper-auto.es.md`.

## CI

`templates/ci/` trae workflows listos para GitHub Actions, GitLab CI y
CircleCI. Cada uno corre tres jobs (drift-check, policy-check, keeper-auto).
El job auto está gated por el secret `ANTHROPIC_API_KEY` y se omite si falta.

## Migración desde 1.x

Ver `docs/migration-1.x-to-2.0.md`.
