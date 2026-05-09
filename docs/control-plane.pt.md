# Control plane Aegis Spec

O Aegis Spec 2.0 entrega um control plane em volta de código gerado por IA.
Três pilares trabalham juntos:

| Pilar | O que faz | Onde mora |
|---|---|---|
| **Aegis Spec** | Autoridade de spec — features, contratos, invariantes, ADRs | `aegis/` |
| **Keeper** | Drift gate — mantém spec e código em sync, opcionalmente via LLM | `agents/aegis-keeper/` + `lib/auto/` |
| **Graph** | Oráculo do código — knowledge graph do código real | `lib/graph/` |

Tudo MIT, tudo roda local; chamadas a LLM são opt-in.

## Pipeline

```
Stage 1 — Discovery       Scout, Archaeologist, Detective, Architect, Writer, Reviewer
Stage 2 — Migration       Paradigm Advisor, Curator, Strategist, Designer, Inspector
Stage 3 — Build           Seu agente de código (Claude / Codex / Cursor / Gemini / Kimi)
Stage 4 — Control plane   Keeper + Graph + Policy gate (este documento)
```

Stages 1–2 produzem specs. Stage 3 produz código. Stage 4 mantém os dois honestos.

## Superfícies do Stage 4

| Superfície | Trigger | Decide |
|---|---|---|
| **Hook pre-edit** | `Stop` / `afterFileEdit` na sua IDE | Bloqueia signature break por edit |
| **CLI `policy-check`** | CI em todo PR | Bloqueia PR com mudança de contrato |
| **`keeper auto`** | Depois do CI passar (ou via bot) | Atualiza specs ou escala pra humano |
| **Audit log** | Toda decisão | Persiste quem/o quê/por quê em `aegis/runtime/audit/` |

## Linguagens

| Lang | L0 (imports) | L1 (symbols + signatures) |
|---|---|---|
| JavaScript / TypeScript | ✅ | ✅ via `@babel/parser` |
| Python | ✅ | ✅ via `tree-sitter-python` |
| Go | ✅ | ✅ via `tree-sitter-go` |
| Java | ✅ | ✅ via `tree-sitter-java` |

Parsers L1 ficam em `optionalDependencies` e carregam lazy — quando o native
binary falta, a linguagem cai pra L0.

## Modos

| Modo | Quem decide | Quando |
|---|---|---|
| **HITL** (padrão) | Humano responde 3 perguntas do Keeper | Contratos críticos, APIs públicas |
| **Auto** | LLM classifica e escreve; whitelist/blacklist/threshold gate | Paths whitelisted, mudanças triviais |
| **Hybrid** (recomendado) | Auto whitelist + HITL blacklist | Default em produção |

Auto mode exige `ANTHROPIC_API_KEY` e `auto_resolve.enabled: true` em
`aegis/config/auto-policy.yaml`. Ver `docs/keeper-auto.pt.md`.

## CI

`templates/ci/` traz workflows prontos pra GitHub Actions, GitLab CI e
CircleCI. Cada um roda três jobs (drift-check, policy-check, keeper-auto).
O job auto é gated pela secret `ANTHROPIC_API_KEY` e skip quando falta.

## Migração do 1.x

Ver `docs/migration-1.x-to-2.0.md`.
