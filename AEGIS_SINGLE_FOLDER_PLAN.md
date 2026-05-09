# Plano: Estrutura Única aegis/

Objetivo: todo conteúdo Aegis no repo alvo fica dentro de `aegis/`, exceto entrypoints de engine na raiz (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, etc.).

## Estrutura Final

```txt
aegis/
├── config/
│   ├── state.json
│   ├── config.toml
│   ├── config.user.toml
│   ├── manifest.yaml
│   ├── files-manifest.json
│   ├── auto-policy.yaml         # opt-in (keeper auto)
│   └── audit-policy.json        # opt-in (audit redaction)
├── runtime/
│   ├── context/
│   │   ├── graph.json
│   │   ├── policy-index.json
│   │   ├── surface.json         # scout
│   │   └── modules.json         # archaeologist
│   ├── queue/
│   │   └── keeper-queue.jsonl
│   ├── audit/
│   │   ├── YYYY-MM-DD.jsonl
│   │   └── keeper-errors.log
│   ├── hooks/
│   │   └── runner.js
│   └── session-summaries/
├── skills/
│   ├── aegis/
│   ├── aegis-keeper/
│   └── ...
├── specs/                       # tudo que descreve o sistema
│   ├── sdd/<unit>/              # writer: requirements, design, tasks (+ opcionais)
│   ├── user-stories/            # writer
│   ├── adrs/                    # detective
│   ├── openapi/                 # writer
│   ├── database/                # data-master: erd, dictionary, etc
│   ├── design-system/           # design-system: tokens, palette, etc
│   └── ui/                      # visor: screen inventory, flow
├── architecture/                # architect: diagramas + visão geral
│   ├── architecture.md
│   ├── c4-context.md
│   ├── c4-containers.md
│   ├── c4-components.md
│   └── erd-complete.md
├── traceability/
│   ├── code-spec-matrix.md      # writer
│   └── spec-impact-matrix.md    # architect
├── reports/                     # análises geradas
│   ├── drift.md                 # keeper
│   ├── confidence-report.md     # reviewer
│   ├── gaps.md                  # reviewer
│   ├── questions.md             # reviewer
│   ├── cross-review-result.md   # reviewer
│   ├── code-analysis.md         # archaeologist
│   ├── data-dictionary.md       # archaeologist
│   ├── domain.md                # detective
│   ├── state-machines.md        # detective
│   ├── permissions.md           # detective
│   ├── deployment.md            # architect
│   ├── inventory.md             # scout
│   ├── dependencies.md          # scout
│   └── flowcharts/<modulo>.md   # archaeologist
├── changelog/                   # keeper append-only
│   └── YYYY-MM-DD.md
├── migration/                   # time de migração
└── forward/                     # aegis-requirements: features novas (NNN-nome/)
```

Raiz fica só com:
```txt
aegis/
AGENTS.md
CLAUDE.md
GEMINI.md
```

## Status

Layout single-folder finalizado em 2026-05-09. Todas as fases de implementação concluídas; fases de validação em repo alvo pendentes.

Notas de divergência vs. plano original:
- `aegis/forward/` previsto na estrutura mas não exposto em `lib/paths.js` (writer escreve em `aegis/runtime/templates/`, não `forward/`). Atualizar plan ou adicionar constante quando feature `aegis-requirements` for implementada.
- `aegis/runtime/hooks/runner.js` previsto mas atualmente só `aegis/runtime/hooks.yml` existe. Subdiretório `hooks/` não criado.

## Fases

### Fase 1 — Constantes De Paths ✅
- `lib/paths.js` criado, 57 constantes exportadas.
- Hardcoded `.aegis/`, `_aegis_sdd/`, `.agents/skills/`, `.claude/skills/` removidos do código (apenas migrações usam `LEGACY_*`).

### Fase 2 — Installer/Writer ✅
- `lib/installer/writer.js#createAegisSpecDir` cria árvore completa.
- State, config, manifest → `aegis/config/`.
- Skills → `aegis/skills/`.

### Fase 3 — Entrypoints ✅
- Templates de engines atualizados em `templates/engines/` apontam para `aegis/skills/...`.

### Fase 4 — Specs E Relatórios ✅
- Output default = `aegis/`.
- Agentes (writer, scout, archaeologist, reviewer, keeper, etc.) atualizados para escrever em `aegis/specs/`, `aegis/reports/`, `aegis/traceability/`, `aegis/architecture/`.

### Fase 5 — Graph, Policy, Keeper ✅
- Graph → `aegis/runtime/context/graph.json`.
- Policy index → `aegis/runtime/context/policy-index.json`.
- Keeper queue → `aegis/runtime/queue/keeper-queue.jsonl`.
- Audit → `aegis/runtime/audit/`.

### Fase 6 — Migração ✅
- `lib/commands/migrate-layout.js` implementado com 33 mappings.
- Suporta dry-run, confirm prompt, merge para skills duplicados.
- Avisa quando `output_folder` em `state.json` é valor custom.

### Fase 7 — Gitignore ✅
- `aegis/runtime/`, `aegis/config/config.user.toml` no `.gitignore`.
- `aegis/specs/`, `aegis/reports/`, `aegis/traceability/`, `aegis/architecture/` versionados.

### Fase 8 — Docs ✅
- README, docs (md/es/pt), templates e agents atualizados.

### Fase 9 — CI/Bot/Hooks ✅
- Templates `templates/ci/*.yml` atualizados.
- Hooks e bot referenciam `aegis/`.

### Fase 10 — Testes Repo Aegis ✅
- Syntax/import check passa em todos os módulos refatorados.
- Smoke e `npm pack` pendentes de validação manual.

### Fase 11 — Teste Repo Alvo ⏳
- Aplicar `migrate-layout` em poc-frame-ai.
- Rodar comandos end-to-end no repo migrado.

### Fase 12 — Release ⏳
- Documentar breaking change em CHANGELOG e migration guide.
