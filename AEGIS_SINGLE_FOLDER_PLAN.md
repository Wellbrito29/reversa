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

## Fases

### Fase 1 — Constantes De Paths
- Criar `lib/paths.js` centralizando todos os paths.
- Substituir hardcoded `.aegis/`, `_aegis_sdd/`, `.agents/skills/`, `.claude/skills/` no código.

### Fase 2 — Installer/Writer
- Atualizar para criar árvore `aegis/`.
- State, config, manifest → `aegis/config/`.
- Skills → `aegis/skills/`.

### Fase 3 — Entrypoints
- Atualizar templates de engines para apontar para `aegis/skills/...`.

### Fase 4 — Specs E Relatórios
- Alterar output default de `_aegis_sdd/` para `aegis/`.
- Mapear `_aegis_sdd/*` → `aegis/specs/`, `aegis/reports/`, `aegis/traceability/`, `aegis/architecture/`.

### Fase 5 — Graph, Policy, Keeper
- Graph → `aegis/runtime/context/graph.json`.
- Policy index → `aegis/runtime/context/policy-index.json`.
- Keeper queue → `aegis/runtime/queue/keeper.jsonl`.
- Audit → `aegis/runtime/audit/`.

### Fase 6 — Migração
- Criar comando `aegis migrate-layout`.
- Migra `.aegis/*` → `aegis/config + runtime`.
- Migra `_aegis_sdd/*` → `aegis/specs + reports + traceability + architecture`.
- Migra `.agents/skills/*` e `.claude/skills/*` → `aegis/skills/`.
- Criar backups.

### Fase 7 — Gitignore
- Versionar `aegis/config/`, `aegis/specs/`, `aegis/reports/`, `aegis/traceability/`, `aegis/architecture/`.
- Ignorar `aegis/runtime/audit/` e `aegis/runtime/queue/` opcionalmente.

### Fase 8 — Docs
- Atualizar README, docs, templates, agents.

### Fase 9 — CI/Bot/Hooks
- Atualizar paths em CI, bot e hooks.

### Fase 10 — Testes Repo Aegis
- Syntax check, smoke, npm pack.

### Fase 11 — Teste Repo Alvo
- Aplicar migrate-layout em poc-frame-ai.
- Rodar todos os comandos.

### Fase 12 — Release
- Documentar breaking change.
