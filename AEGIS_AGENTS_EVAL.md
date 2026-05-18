# Aegis Agents — Avaliação Comportamental contra poc-frame-ai

> Data: 2026-05-17
> Repo alvo: `/home/wellington/Documents/RD/IA-RD-Iframe/poc-frame-ai`
> Aegis v2.0.0 instalado em `aegis/` (28 skills)
> Método: leitura sistemática de cada `SKILL.md` + simulação manual contra diff hipotético
> Diff simulado:
>   - SIM-1: modify `web/Shared/src/services/searchProducts/index.ts` (regex `{2,}` → `{3,}`, adicionar param `customSort`)
>   - SIM-2: add `web/Shared/src/services/searchProducts/sortHelpers.ts`
>   - SIM-3: delete `web/Shared/src/containers/search/SearchContainer.test.tsx`

---

## Resumo executivo

Pipeline de descoberta rodou completo (Scout→Reviewer, confidence 0.81). Estado pós-instalação tem 28 skills, mas **maquinaria reativa nunca foi exercitada**: keeper queue vazia, audit vazio, session-summaries vazio, sem hooks git. **Forward team inteiro bloqueado** (8 skills) por falta de `active-requirements.json`. **Migration team bloqueado** (5 skills) por falta de `migration_brief.md` — by design. Skills generativas são non-destructive: rerodar Writer/Architect **não propaga mudanças de código** para specs já existentes. O **único agente reativo a diffs é o Keeper**, e ele opera em modo degradado (sem `graph.json`, sem CLI publicada).

**Veredito**: arquitetura cobre o ciclo, mas integração no dia-a-dia depende de instalação de hooks git + CLI funcional + bootstrap de `aegis/forward/` que **não acontecem automaticamente** após `aegis install`.

---

## Issues por agente

Severidade: 🔴 CRITICAL · 🟠 HIGH · 🟡 MEDIUM · 🔵 LOW

### Cross-cutting (afetam múltiplos agentes)

| # | Sev | Issue | Onde |
|---|-----|-------|------|
| ~~X-01~~ | ❌ falso positivo | `npx aegis-spec <subcmd>` funciona pós-publish: pacote tem bin único (`aegis`), npm resolve single-bin packages automaticamente. Não há bug aqui. | revisado 2026-05-17 |
| X-02 | 🔴 | Pacote `aegis-spec` **não publicado no npm registry** (HTTP 404). Toda referência `npx aegis-spec ...` quebra em projeto cliente. Version check do orquestrador (`registry.npmjs.org/aegis-spec/latest`) também quebra. | global |
| X-03 | 🟠 | `state.json.checkpoints` desincronizado do filesystem. `detective.outputs` lista ADRs (`ADR-001-busca-dual-engine`, `ADR-002-patrocinados-topsort`) que **não existem** — nomes reais no FS são `001-multi-tenant-via-yarn-workspaces.md` etc. Nenhum agente reconcilia. | `aegis/config/state.json` |
| X-04 | 🟠 | 8 skills do Forward (requirements, doubt, plan, to-do, audit, quality, coding, resume) abortam por falta de `aegis/config/active-requirements.json`. Esse arquivo é criado **só** por `/aegis-requirements`. **Sem caminho de bootstrap claro** — usuário precisa adivinhar que `/aegis-requirements` é o ponto de entrada. | Forward team |
| X-05 | 🟠 | `aegis/forward/` referenciado em `state.json.forward_folder` e `setup.json.paths.forward-dir`, mas **não existe**. Instalador cria a pasta de specs mas não a pasta forward — UX inconsistente. | installer + state.json |
| X-06 | 🟠 | `aegis/runtime/context/graph.json` **nunca gerado** (só modules.json + surface.json). Keeper modo `after` cai em modo degradado: sem `blast_radius`, sem `severity`. Nenhum passo do pipeline de descoberta gera graph.json — ele é v1.8.0+ feature mas instalador 2.0.0 não dispara. | installer + graph cmd |
| X-07 | 🟡 | `aegis/runtime/hooks.yml` instalado com todos os arrays vazios (before-/after- pra 9 stages). Instalador não interage com usuário pra wirear hooks específicos do projeto. | installer |
| X-08 | 🟡 | `aegis/runtime/queue/`, `aegis/runtime/audit/`, `aegis/runtime/session-summaries/` criados vazios. Sem git hook que escreva em `keeper-queue.jsonl`, Keeper depende de `git diff HEAD` (manual). | installer |
| X-09 | 🟡 | Skills generativas (writer, architect, detective, scout) são **non-destructive**: rerodar não atualiza specs existentes. **Apenas Keeper reage a mudanças de código**. Re-extração só funciona se usuário deletar specs antigas manualmente. | writer, architect, detective, scout |
| X-10 | 🟡 | `setup.json.watch.archive-after` e `watch.block-on-red` definidos mas **não espelhados** em `state.json`. Duas fontes de verdade pra config — risco de divergência. | config |
| X-11 | 🔵 | `aegis/config/files-manifest.json` listado como **deleted** no git status. Instalador parece tê-lo gerado em runs anteriores mas não na instalação atual — re-instalação pode falhar ou duplicar. | installer |
| X-12 | 🔵 | Mistura de naming convention em config: `state.json` usa `snake_case` (`output_folder`, `chat_language`), `setup.json` usa `kebab-case` (`schema-version`, `aegis-version`), `manifest.yaml` usa `camelCase` (`installDate`, `lastUpdated`). | config |

### aegis (orquestrador)

| # | Sev | Issue |
|---|-----|-------|
| O-01 | 🟠 | Comportamento com `phase=completo` (estado atual do poc-frame-ai) **não documentado** em `references/step-02-resume.md`. Provavelmente diz "nada a fazer". UX confuso — usuário não sabe se deve re-rodar agentes individuais ou aceitar estado. |
| O-02 | 🟡 | Version check via `registry.npmjs.org/aegis-spec/latest` falha (X-02). Skill diz "informe discretamente após saudação" — silenciosamente broken. |
| O-03 | 🟡 | Compressão de contexto via `session-summaries/` é boa ideia mas dir está vazio. Nunca acionado em primeira run (provavelmente skill gera summaries só durante execução, não retroativamente). |
| O-04 | 🔵 | "Salve checkpoint" + "Marque tarefa em plan.md" — `plan.md` atual ainda tem todos `[ ]` apesar de `state.json.completed` listar tudo. **plan.md não foi atualizado** apesar de checkpoint feito. |

### aegis-scout

| # | Sev | Issue |
|---|-----|-------|
| S-01 | 🟡 | Hard-coded exclusions: `node_modules`, `.git`, `aegis`, `dist`, `build`, `coverage`, `__pycache__`, `.cache`. **Não inclui** `.next`, `.turbo`, `.vercel`, `target` (Rust), `vendor` (Go), `_modules` (yarn berry pnp). |
| S-02 | 🔵 | Conta extensões mas não detecta multi-language repos com mesma extensão (`.js` Node vs Deno, `.ts` Node vs Bun). Não bloqueante. |

### aegis-archaeologist

| # | Sev | Issue |
|---|-----|-------|
| A-01 | 🟠 | Reroda só se usuário invocar manualmente — não detecta automaticamente módulo modificado. Se SIM-2 (`sortHelpers.ts`) adiciona arquivo importante, archaeologist precisa ser re-rodado mas não há sinal pro orquestrador. |
| A-02 | 🟡 | `modules.json` regenerado preserva existentes? SKILL diz "non-destructive" — verificar se merge módulos novos com mantidos. |

### aegis-detective

| # | Sev | Issue |
|---|-----|-------|
| D-01 | 🟠 | ADRs gerados com nomes "tópicos" (002-search-engine-fallback-ladder) ao invés de "decisão" sequenciais. `state.json` ainda referencia nomes antigos. Não há reconciliação. |
| D-02 | 🟡 | `domain.md` regras numeradas (RN-01, RN-02…) mas **sem schema enforced**. Reroda renumera? Mantém? Quebra rastreabilidade do keeper que cita "RN-01". |

### aegis-architect

| # | Sev | Issue |
|---|-----|-------|
| AR-01 | 🟡 | Gera C4 + ERD + spec-impact-matrix. Re-execução com `non-destructive` significa que diagramas Mermaid não atualizam após mudanças. Manual delete necessário. |
| AR-02 | 🟡 | Não há "diff mode" — usuário não consegue pedir "atualize só C4 components". |

### aegis-writer

| # | Sev | Issue |
|---|-----|-------|
| W-01 | 🟠 | Non-destructive estrito: **arquivos canônicos existentes nunca são sobrescritos**, mesmo se código drift. Único caminho: deletar arquivo manualmente antes de re-rodar. Não há flag `--force` documentada. |
| W-02 | 🟡 | `state.json.redator_progress` campo citado mas **ausente** no state.json atual. Resume de Writer interrompido fica órfão. |
| W-03 | 🟡 | "Pausa preventiva entre units (3+)" boa para context budget mas força fricção UX desnecessária quando rodando em modo automation. |
| W-04 | 🔵 | Confidence marker (🟢🟡🔴) "sempre presente" — verificar se tooling valida ou é só convenção textual. |

### aegis-reviewer

| # | Sev | Issue |
|---|-----|-------|
| R-01 | 🟠 | "Revisão cruzada via Codex" condicional em `doc_level=completo/detalhado`. Codex é provedor específico — assume API key. Sem fallback claro pra outros providers. |
| R-02 | 🟡 | `confidence-report.md` regerado a cada run sobrescreve histórico de confiança. Sem timeline de regressão de qualidade. |

### aegis-keeper ⭐ (mais crítico — único reativo)

| # | Sev | Issue |
|---|-----|-------|
| K-01 | 🔴 | Sem `code-spec-matrix.md` aborta. Sem `graph.json` cai em degradado sem severity. **Dois pré-reqs frágeis**, instalação default não garante nenhum. |
| K-02 | 🔴 | CLI `aegis-spec graph impact <file> --json` referenciado mas comando errado (X-01) + package não publicado (X-02). Modo `after` v1.8.0+ broken em qualquer projeto cliente. |
| K-03 | 🟠 | "Atualizar specs in-place" depende de LLM detectar contradição textual entre código novo e spec antiga. **Sem validação AST/regex**. SIM-1 (regex `{2,}` → `{3,}`) pode passar batido se LLM não notar a string específica no spec. |
| K-04 | 🟠 | `aegis/reports/domain.md` contém RN-XX referenciadas no código (`services/searchProducts/index.ts:122-129` para RN-01). Keeper SKILL diz ler "regras de negócio do domain.md **quando referenciado**" — ambíguo. Se spec SDD não menciona RN-01 explicitamente, mudança no regex invalida RN-01 mas keeper não percebe. |
| K-05 | 🟠 | Heurística "spec do diretório pai" pra mapear arquivo novo. **Falha** pra utilitários cross-module (e.g. `sortHelpers.ts` em SIM-2 — qual spec é "pai"? `search/` ou nenhuma?). Resulta em entry vago na matrix. |
| K-06 | 🟠 | Arquivo deletado: matrix marca `~~deletado~~` mas spec correspondente **não é atualizada** para remover referências ao arquivo morto. SIM-3 (test removido) deixa spec referenciando teste inexistente. |
| K-07 | 🟡 | `state-machines.md`, `permissions.md`, `architecture/*` **não estão no read path** do keeper. Mudanças que afetam fluxo (não regra de negócio simples) podem ficar invisíveis. |
| K-08 | 🟡 | `aegis/changelog/` e `aegis/reports/drift.md` criados sob demanda — primeiro run de keeper bootstraps esses paths. Usuário não sabe que vão existir. |
| K-09 | 🟡 | Queue file `keeper-queue.jsonl` esperado em `aegis/runtime/queue/` mas **nenhum hook gera**. Schema em `references/queue-schema.md` mas instalador não wira git pre-commit/post-commit para escrever. |
| K-10 | 🟡 | Reconciliação `state.json` desync (X-03) não é responsabilidade do keeper — mas ninguém faz. Bug órfão. |
| K-11 | 🔵 | Modo `before` "Mostre ao usuário" — só funciona em modo interativo. Em CI/automation onde keeper roda sem prompt, retorno é descartado. |

### aegis-data-master / aegis-design-system / aegis-visor

| # | Sev | Issue |
|---|-----|-------|
| DM-01 | 🟡 | Skills "any phase" mas sem trigger automatic. Usuário precisa lembrar de invocar quando DB schema ou design tokens mudam. |
| DS-01 | 🟡 | Design-system reroda regenerando `color-palette.md` etc — overrides customizações manuais. Non-destructive comportamento documentado pro writer mas não-claro pra design-system. |
| V-01 | 🔵 | Visor precisa de screenshots manualmente; sem integração com Playwright/storybook screenshot capture. |

### aegis-migrate / paradigm-advisor / curator / strategist / designer / inspector

| # | Sev | Issue |
|---|-----|-------|
| M-01 | 🟠 | Time inteiro bloqueado sem `migration_brief.md`. `aegis-migrate` orquestra criação mas usuário precisa saber que esse é o entry-point. |
| M-02 | 🟡 | Pausa humana obrigatória entre paradigm-advisor → curator → strategist → designer → inspector. **5 stops** em pipeline. Bom pra controle, ruim pra throughput. Sem modo `--auto-approve`. |
| M-03 | 🟡 | `inspector` gera Gherkin `.feature` — não há tradutor automático pra Jest/Playwright/Cypress. Specs viram código por outro caminho. |

### aegis-reconstructor

| # | Sev | Issue |
|---|-----|-------|
| RC-01 | 🟡 | "Bottom-up, uma tarefa por sessão" preserva tokens mas requer disciplina pra resumir. Sem state tracking robusto, fácil perder o lugar. |

### Forward team (requirements, doubt, plan, to-do, audit, quality, coding, resume)

| # | Sev | Issue |
|---|-----|-------|
| F-01 | 🟠 | **Todos bloqueados** sem `active-requirements.json` (X-04). |
| F-02 | 🟠 | `aegis-coding` exige `architecture.md` E `domain.md` "no diretório aegis/". V2 layout move pra `aegis/architecture/architecture.md` e `aegis/reports/domain.md` — **check pode falhar por path literal**. Precisa testar. |
| F-03 | 🟡 | `aegis-audit` produz `feature-dir/audit/cross-check.md`. Sem feature ativa, dir nem existe. |
| F-04 | 🟡 | `aegis-doubt` integra respostas no `requirements.md` original. Se usuário edita requirements entre runs, integração pode quebrar markdown. |
| F-05 | 🟡 | `aegis-quality` puramente leitor — bom princípio. Mas relatório vai em `feature-dir/quality/`? SKILL não especifica path exato. |
| F-06 | 🟡 | `aegis-coding` "atualiza checkboxes para [X]" no `actions.md` — depende de pattern de checkboxes consistente. Sem schema validado. |
| F-07 | 🔵 | `aegis-resume` swap só funciona se `paused-features` tiver entries. Sem isso, abort claro. OK. |

### aegis-principles

| # | Sev | Issue |
|---|-----|-------|
| P-01 | 🟡 | "Propaga sugestões nos templates dependentes" — não há mecanismo automático de propagation, só prompt pro LLM. Frágil. |
| P-02 | 🔵 | Princípios em `aegis/config/principles.md`. Tem template em `runtime/templates/principles-template.md` mas keeper/writer não leem princípios por default. |

### aegis-n8n

| # | Sev | Issue |
|---|-----|-------|
| N-01 | 🔵 | Único skill com input externo dedicado (`n8n_json_workflows/`). Convenção isolada, não integra com `aegis/specs/` naturalmente. |

### aegis-agents-help

| # | Sev | Issue |
|---|-----|-------|
| H-01 | 🔵 | Texto estático apresentado verbatim ("sem alterações, sem resumir"). Pode ficar desatualizado vs lista real de agentes. |

---

## Recomendações de melhoria (estratégico)

### Tier 1 — bloqueadores

1. **Publicar `aegis-spec` no npm** ou trocar todas as menções por install path local (`./node_modules/.bin/aegis`, git URL install). X-02.
2. **Corrigir invocação CLI** em SKILL.md: `aegis graph build` ao invés de `npx aegis-spec graph build`. X-01, K-02.
3. **Gerar `graph.json` automaticamente** no fim do pipeline de descoberta (ou no Writer / Architect). Sem graph, Keeper não calcula severity. X-06.
4. **Bootstrap `active-requirements.json`** quando instalador finaliza, com placeholder `null` — forward skills detectam null vs ausente e exibem onboarding claro. X-04, F-01.

### Tier 2 — robustez

5. **Reconciliar `state.json` ↔ filesystem** ao iniciar qualquer skill. Stale checkpoint outputs = warning visível. X-03.
6. **Atualizar `plan.md` automaticamente** após checkpoint (orquestrador). O-04.
7. **Keeper lê reports/** (domain, state-machines, permissions) sempre, não só specs/sdd. K-04, K-07.
8. **Force flag explícita** em writer/architect/detective pra rerun destrutivo controlado. W-01.
9. **Hook git instalado opcionalmente** no `aegis install` (com prompt). Sem hook, queue só recebe via `git diff`. K-09, X-08.

### Tier 3 — DX/automation

10. **Modo `--auto-approve`** pro migration team. M-02.
11. **Validação AST** opcional em keeper pra detectar contradição código↔spec (e.g. regex string match). K-03.
12. **Reconciliador entre extrações**: skill `aegis-sync` que pega diff de specs vs state.json e propõe merge. Não existe.
13. **Naming convention única** em config files. X-12.
14. **Mostrar onboarding pós-install**: usuário acaba `aegis install`, recebe checklist "próximo passo: rodar `/aegis` (descoberta) ou `/aegis-requirements` (nova feature)". Hoje o setup termina mudo.

---

## Lista de tarefas (atacáveis em ordem)

Severidade + dependência considerada. IDs ligados aos issues acima.

### Sprint 1 — CLI funcional (bloqueadores) — STATUS: parcial

- [x] **T01** [X-02, K-02] Publish npm: workflow OIDC criado (`.github/workflows/publish.yml`). Aguarda primeiro publish manual (OTP).
- [x] ~~**T02**~~ Cancelado — falso positivo (single-bin auto-resolution).
- [x] **T03** [X-06] Hint adicionado no fim do installer ("Run `aegis graph build` once..."). Não auto-roda pra não travar install em repos grandes.
- [x] **T04** [X-04, X-05, F-01] `lib/paths.js` ganha `FORWARD_DIR` + `ACTIVE_REQUIREMENTS_JSON`. `writer.js` cria diretório forward + bootstrap json `{active:null,paused-features:[]}`. 330 tests verdes.

### Sprint 2 — Reconciliação de estado — STATUS: concluído (39cb646)

- [x] **T05** [X-03] `reconcileState()` + `pruneStaleCheckpoints()` em `lib/state/reconcile.js`. CLI `aegis state reconcile [--prune] [--json]`. 8 unit tests.
- [x] **T06** [O-04] `agents/aegis/SKILL.md` instrui orquestrador a espelhar `state.json.completed` em `plan.md` após cada checkpoint.
- [x] **T07** [X-12, X-10] `templates/forward/setup.json` migrado kebab→snake_case. `migrateSetupJson()` roda em install e update (idempotente). 4 unit tests.
- [x] **T08** [X-11] Confirmado: `buildManifest/saveManifest` já estava wired em install/update/uninstall. Gap era state de projeto específico, não código.

### Sprint 3 — Keeper robustez

- [x] **T09** [K-04, K-07] Keeper SKILL.md expande read path: `domain.md` (cruza RN-XX por linha), `state-machines.md`, `permissions.md`, `architecture/*.md` sempre lidos quando relevantes.
- [ ] **T10** [K-03] Optional AST/regex matcher em keeper pra detectar mudança de string-literal/regex/número entre código e spec.
- [ ] **T11** [K-05] Mapeamento de arquivo novo→spec menos frágil: usar graph reverse-deps quando matrix não tem match.
- [ ] **T12** [K-06] Arquivo deletado: keeper remove referências ao arquivo dentro das specs impactadas (não só matrix).
- [x] **T13** [K-09, X-08] Pre-commit hook opt-in no installer: `installGitHook()` wired em `install.js`, prompt `install_git_hook` em `prompts.js`. Roda `aegis policy-check --severity medium` no staged diff.

### Sprint 4 — Writer/Architect/Detective non-destructive controlado

- [ ] **T14** [W-01, AR-01] Flag `--force` ou `--regenerate <arquivo>` em writer/architect/detective. Documentar.
- [ ] **T15** [W-02] Salvar `redator_progress` em state.json a cada arquivo gerado. Resume usa.
- [ ] **T16** [W-04] Schema linter pra confidence markers (🟢🟡🔴) — opcional.
- [ ] **T17** [R-02] `confidence-report.md` histórico (não overwrite) — anexar nova run ao final.

### Sprint 5 — Forward bootstrap

- [ ] **T18** [F-02] Verificar paths em aegis-coding contra v2 layout (`aegis/architecture/architecture.md` vs `aegis/architecture.md`).
- [ ] **T19** [F-03, F-04, F-05, F-06] Padronizar paths das saídas forward (`feature-dir/audit/`, `feature-dir/quality/`, etc).
- [ ] **T20** [F-04] Audit `aegis-doubt` patch behavior contra `requirements.md` editado manualmente.

### Sprint 6 — UX/DX

- [ ] **T21** [O-01] Documentar comportamento de `/aegis` com `phase=completo` (re-extração? force? noop?).
- [ ] **T22** [O-02] Version check fallback para git tag local ou skip silencioso.
- [ ] **T23** [P-01] Mecanismo de propagation de princípios pros templates (linker explícito vs prompt).
- [ ] **T24** [DM-01, DS-01, V-01] Pattern uniform pra skills "any-phase": doc claro de quando rodar, como evitar overwrite.
- [ ] **T25** [M-02] Flag `--auto-approve` no migration team.
- [ ] **T26** [S-01] Expandir lista de exclusões do scout (`.next`, `.turbo`, `target`, `vendor`, etc).
- [ ] **T27** [H-01] aegis-agents-help texto gerado dinamicamente vs hard-coded.

### Sprint 7 — Validação fim-a-fim

- [ ] **T28** Setup de smoke test: repo fixture mínimo + script que roda `aegis install`, sim mudanças, invoca cada skill, valida deltas em artefatos.
- [ ] **T29** Métricas de cobertura keeper: % arquivos do projeto com entry em `code-spec-matrix.md`, % specs com `last_synced` recente.

---

## Apêndice — comportamento simulado por agente vs SIM-1/2/3

| Agente | SIM-1 (mod regex) | SIM-2 (add helper) | SIM-3 (del test) |
|--------|-------------------|--------------------|--------------------|
| aegis (orquestrador) | noop (phase=completo) | noop | noop |
| scout | rerun overwrite surface.json? non-destructive não claro | mesmo | mesmo |
| archaeologist | rerun não detecta — manual | manual | manual |
| detective | RN-01 invalidada — não detecta sem rerun manual | n/a | n/a |
| architect | C4 não muda (sem novos containers) | adicionaria componente — não detecta | n/a |
| writer | non-destructive — specs/sdd/search/* intactas | mesma — nova spec NÃO criada automaticamente | mesma |
| reviewer | confidence pode estar stale — não rerun | mesmo | mesmo |
| keeper after | **detecta via git diff**, atualiza spec/sdd/search se LLM nota regex; **não atualiza domain.md/RN-01 automaticamente** | matrix entry via heurística "dir pai" → search/. Spec NÃO criada. | matrix marca `~~deletado~~`; spec NÃO removida das referências |
| data-master | n/a (sem DDL) | n/a | n/a |
| design-system | n/a (sem CSS) | n/a | n/a |
| visor | n/a (sem screenshots) | n/a | n/a |
| migrate team | bloqueado sem brief | bloqueado | bloqueado |
| forward team | bloqueado sem active-requirements | bloqueado | bloqueado |
| reconstructor | n/a | n/a | n/a |
| n8n | n/a | n/a | n/a |
| principles | n/a (sem mudança de princípio) | n/a | n/a |

**Tradução**: dos 28 agentes, **apenas Keeper reage** ao diff simulado — e em modo degradado. Tudo mais é manual ou bloqueado.

---

## Apêndice 2 — Inventário de gaps no poc-frame-ai

Estado inicial após instalação (gaps esperados a fechar quando T1-T4 prontos):

- [ ] `aegis/runtime/context/graph.json` — gerar via `aegis graph build`
- [ ] `aegis/config/active-requirements.json` — template null
- [ ] `aegis/forward/` — diretório
- [ ] `aegis/reports/drift.md` — primeiro run do keeper bootstrap
- [ ] `aegis/changelog/` — primeiro run do keeper bootstrap
- [ ] `aegis/config/files-manifest.json` — re-gerar (está deleted no git status)
- [ ] `aegis/runtime/session-summaries/` — popula em runs do orquestrador
- [ ] state.json checkpoints reconciliados (ADRs com nomes reais)
- [ ] plan.md checkboxes alinhados a state.json.completed

---

> Próximo passo: priorizar T01-T04 (Sprint 1) e validar com smoke test (T28).
