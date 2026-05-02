# Keeper × Graph integração

A partir da v1.8.0, o Keeper consulta o graph de dependências L0 (`.reversa/context/graph.json`) além do `code-spec-matrix.md` pra ampliar o blast radius e classificar severidade do drift.

## O que mudou em `/reversa-keeper after`

**Passo 2** (mapear specs impactadas) agora usa duas fontes, nesta ordem:

1. **Matrix** (`_reversa_sdd/traceability/code-spec-matrix.md`) — mapeamento primário `arquivo → spec`.
2. **Graph** — pra arquivos **sem** entrada na matrix, roda `npx reversa graph impact <arquivo>`. Qualquer arquivo no resultado que **tenha** entrada na matrix entra na lista de specs a revisar.

Edit em arquivo sem spec ainda dispara atualização de spec à jusante — Keeper acha via import graph em vez de desistir.

**Passo 7** (atualizar `drift.md`) registra dois campos novos por spec:

- `blast_radius`: arquivos afetados pelas mudanças nos arquivos desta spec (top 20, depois `+N more`).
- `severity`: classificação per [drift-rules.md](../agents/reversa-keeper/references/drift-rules.md):
  - `LOW` — 0–1 reverse-deps diretas
  - `MEDIUM` — 2–4
  - `HIGH` — 5+ (Keeper sugere `/reversa-reviewer`)

## O que mudou nos hooks

O hook `Stop` (Claude Code) e `session.end` (Opencode) fazem **update incremental do graph** dos arquivos dirty no final de cada sessão, antes do próximo `/reversa-keeper after`. Outras engines (Cursor, Kimi, Codex) atualizam o graph no commit via git pre-commit fallback (Fase 1).

Se `.reversa/context/graph.json` não existe, o update é pulado silenciosamente. Rode `npx reversa graph build` uma vez pra inicializar.

## O que mudou em `drift-check`

`reversa drift-check --format=json` agora inclui array `affected_files` por spec bloqueante, computado como união dos impacts via graph dos arquivos mapeados pra essa spec.

```json
{
  "severity": "high",
  "blocking": [
    {
      "spec": "_reversa_sdd/sdd/auth.md",
      "status": "🔴 pending",
      "action": "Rodar /reversa-keeper after",
      "affected_files": [
        "src/api/handler.js",
        "src/middleware/auth.js",
        "+12 more"
      ]
    }
  ]
}
```

CI bots de PR comment podem subir isso pro corpo do PR pros reviewers verem o blast radius de cara.

Se o graph não existir ou a matrix faltar, `affected_files` vira `null` — drift-check ainda funciona em modo degradado.

## Bootstrap em projeto existente

```bash
npx reversa graph build
npx reversa policy-index build   # opcional, Fase 4
/reversa-keeper after            # na sua engine
```

Depois disso, o hook Stop mantém o graph atualizado em toda sessão.
