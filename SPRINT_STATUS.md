# Aegis — Sprint Status
Fonte: `AEGIS_AGENTS_EVAL.md` · 2026-05-18

---

## Sprint 1 — CLI funcional ✅

| # | Status | Problema | O que fez |
|---|--------|----------|-----------|
| T01 | ✅ | `aegis-spec` não publicado no npm — qualquer `npx aegis` quebrava em projeto cliente | Criou workflow GitHub Actions com OIDC para publicar automaticamente no npm a cada push na main |
| T02 | ~~cancelado~~ | Falso positivo — achou que `npx aegis-spec graph` estava errado | npm resolve single-bin automaticamente, não tinha bug |
| T03 | ✅ | Após `aegis install`, `graph.json` nunca era gerado — keeper ficava em modo degradado sem severity/blast_radius | Adicionou hint no fim do installer: "Run `aegis graph build` once to enable impact analysis" |
| T04 | ✅ | 8 skills do Forward team abortavam por falta de `active-requirements.json` e `aegis/forward/` não existia | `lib/paths.js` + constantes `FORWARD_DIR`/`ACTIVE_REQUIREMENTS_JSON`. Writer cria a pasta e o JSON `{active:null}` no install |

---

## Sprint 2 — Reconciliação de estado ✅ (commit 39cb646)

| # | Status | Problema | O que fez |
|---|--------|----------|-----------|
| T05 | ✅ | `state.json.checkpoints` listava ADRs (`ADR-001-busca-dual-engine`) que não existiam no FS — nenhum agente detectava o drift | Criou `reconcileState()` e `pruneStaleCheckpoints()`. CLI: `aegis state reconcile [--prune] [--json]`. 8 testes |
| T06 | ✅ | `plan.md` ficava com todos `[ ]` mesmo depois de checkpoints salvos em `state.json.completed` — duas fontes de verdade divergindo | Orquestrador SKILL.md agora instrui espelhar `state.json.completed` → checkboxes do `plan.md` após cada checkpoint |
| T07 | ✅ | `state.json` usava `snake_case`, `setup.json` usava `kebab-case` — config inconsistente, risco de divergência | Migrou `setup.json` template para snake_case. `migrateSetupJson()` converte projetos existentes no install/update. 4 testes |
| T08 | ✅ | `files-manifest.json` aparecia como `deleted` no git — suspeita que instalador não estava gravando | Confirmado que `buildManifest/saveManifest` já estava wired. Era problema de estado do projeto específico, não bug de código |

---

## Sprint 3 — Keeper robustez 🔄

| # | Status | Problema | O que fez / fará |
|---|--------|----------|-----------------|
| T09 | ✅ | Keeper só lia specs/sdd. Mudanças que invalidavam regras de negócio (`domain.md`), fluxos de estado ou permissões passavam invisíveis | SKILL.md expandido: lê `domain.md` cruzando RN-XX por número de linha, `state-machines.md` quando diff toca transições, `permissions.md` em mudanças de auth/RBAC, `architecture/*.md` quando envolve containers C4 |
| T10 | ✅ | Keeper detecta contradições só por leitura textual do LLM. SIM-1 (regex `{2,}` → `{3,}`) pode passar batido se o LLM não notar a string exata na spec | `lib/auto/literal-extractor.js`: extrai literais do diff, detecta valores removidos ainda presentes na spec, injeta hint explícito no prompt. 10 testes. |
| T11 | ✅ | Arquivo novo (`sortHelpers.ts`) mapeado para spec pelo heurístico "diretório pai" — falha pra utilitários cross-module que não têm spec de pai óbvio | `lib/auto/spec-resolver.js`: matrix direto primeiro, depois graph reverse-deps (1 nível) como fallback. keeper-auto usa quando `entry.spec_path` ausente. 6 testes. |
| T12 | ✅ | Arquivo deletado: matrix marca `~~deletado~~` mas specs que referenciam esse arquivo continuam intactas, apontando para código morto | `lib/auto/deleted-ref-cleaner.js`: varre `aegis/specs/**/*.md`, encontra menções ao arquivo morto, reescreve via LLM com instrução de remoção. 5 testes. |
| T13 | ✅ | `keeper-queue.jsonl` nunca recebia entradas — sem git hook, Keeper dependia só de `git diff HEAD` manual | Prompt opt-in no installer. `installGitHook()` wira `aegis policy-check --severity medium` no staged diff via `.git/hooks/pre-commit` |

---

## Sprint 4 — Writer/Architect/Detective non-destructive ✅ (commit 72e8e0d)

| # | Status | Problema | O que fez |
|---|--------|----------|-----------|
| T14 | ✅ | Writer/Architect são non-destructive estritos — único jeito de rerodar é deletar specs manualmente. Sem `--force` documentado | SKILLs documentam `--force` (all) e `--regenerate <file>` (single). Agentes interpretam via prompt, não precisa código CLI |
| T15 | ✅ | `state.json.redator_progress` citado no SKILL mas ausente no JSON real — Writer interrompido não tem como resumir onde parou | `templates/state.json` agora tem `redator_progress: null`. Writer salva `{"last_unit", "last_file"}` após cada arquivo. Resume oferece retomar vs restart |
| T16 | ⬜ | Confidence markers (🟢🟡🔴) são convenção textual — nada valida se estão presentes/corretos | Skipped — opcional, baixa prioridade |
| T17 | ✅ | `confidence-report.md` é regerado a cada run, sobrescrevendo histórico — impossível ver regressão de qualidade ao longo do tempo | Reviewer anexa runs com `---\n## Run [timestamp]` delimiter. Histórico preservado |

---

## Sprint 5 — Forward bootstrap ✅ (commit b29cc68)

| # | Status | Problema | O que fez |
|---|--------|----------|-----------|
| T18 | ✅ | `aegis-coding` exige `architecture.md` no path literal `aegis/` — v2 moveu para `aegis/architecture/architecture.md`, check pode falhar silenciosamente | Check line 40 corrigido: `aegis/architecture/architecture.md` (path completo). Compatível v2 |
| T19 | ✅ | Paths de saída do forward team (`audit/`, `quality/`, etc.) não padronizados no SKILL — inconsistência entre agentes | `aegis-quality` output movido para `feature-dir/quality/`. Demais agents já corretos (coding, audit, doubt, plan, to-do, resume) |
| T20 | ✅ | `aegis-doubt` integra respostas diretamente no `requirements.md` — se usuário editou o arquivo manualmente entre runs, integração pode quebrar markdown | Guards adicionados: se `[DÚVIDA]` ausente ou trecho editado >50%, pula patch e só registra em Esclarecimentos com warning |

---

## Sprint 6 — UX/DX ⬜

| # | Status | Problema | O que fará |
|---|--------|----------|-----------|
| T21 | ⬜ | `/aegis` com `phase=completo` tem comportamento não documentado — usuário não sabe se deve re-rodar agentes ou aceitar o estado | Documentar explicitamente: re-extração? force? noop? |
| T22 | ⬜ | Version check tenta `registry.npmjs.org/aegis-spec/latest` — falha enquanto pacote não está publicado, mensagem de erro silenciosa | Fallback para git tag local ou skip silencioso sem erro |
| T23 | ⬜ | `aegis-principles` "propaga sugestões nos templates" mas não há mecanismo real — só instrução pro LLM, frágil | Linker explícito: princípios referenciam templates, mudança em princípio dispara sugestão nos templates |
| T24 | ⬜ | Skills "any-phase" (data-master, design-system, visor) sem trigger automático — usuário precisa lembrar de invocar quando schema/tokens mudam | Documentar padrão: quando rodar, o que sobrescreve, o que é idempotente |
| T25 | ⬜ | Migration team tem 5 paradas obrigatórias de aprovação humana — inviável em pipelines automatizados | Flag `--auto-approve` para passar pelo pipeline sem interrupções |
| T26 | ⬜ | Scout não exclui `.next`, `.turbo`, `.vercel`, `target` (Rust), `vendor` (Go) — varre pastas irrelevantes | Expandir lista de exclusões hard-coded |
| T27 | ⬜ | `aegis-agents-help` lista agentes em texto estático — fica desatualizado quando agentes são adicionados/removidos | Gerar lista dinamicamente a partir dos SKILLs instalados |

---

## Sprint 7 — Validação fim-a-fim ⬜

| # | Status | Problema | O que fará |
|---|--------|----------|-----------|
| T28 | ⬜ | Sem smoke test automatizado — impossível saber se uma mudança quebrou o fluxo completo | Repo fixture mínimo + script: `aegis install` → simula mudanças → invoca cada skill → valida artefatos gerados |
| T29 | ⬜ | Sem métrica de cobertura do keeper — não há como saber se o projeto está bem documentado em specs | Calcular % arquivos com entry em `code-spec-matrix.md` e % specs com `last_synced` recente |
