# Reversa Roadmap — Control Plane v2.0

Roadmap discriminado pra evoluir Reversa de framework de spec generation pra **control plane completo** pra agentes de IA.

## Visão geral

3 pilares (Foundation):

| Pilar | Função |
|---|---|
| **Reversa** | Spec authority — features, contratos, invariantes, ADRs |
| **Keeper** | Drift gate — sync entre spec e código |
| **Graph** (próprio, MIT) | Codebase oracle — knowledge graph do código real |

Decisão arquitetural: **construir graph próprio**, não usar GitNexus (license PolyForm Noncommercial + scope mismatch). Mantém Reversa MIT puro.

## Pipeline (4 estágios)

```
Stage 1 — Discovery     →  Scout, Archaeologist, Detective, Architect, Writer, Reviewer
                            código legado → _reversa_sdd/ specs

Stage 2 — Migração      →  Paradigm Advisor, Curator, Strategist, Designer, Inspector
                            _reversa_sdd/ → _reversa_sdd/migration/ plan + parity tests

Stage 3 — Build         →  agente codificador do user (Claude / Codex / Cursor / Gemini / Kimi)
                            migration plan → código novo

Stage 4 — Control plane →  Keeper + Graph + Policy gate (file-level + signature diff)
                            código novo → guardado contra drift, signature break, blast-radius edits
```

Stage 1 e 2 são produto upstream (Discovery v1.x, Migração v1.2.17). **Este roadmap cobre Stage 4** — o control plane que mantém código sob controle de AI agents continuamente.

## Linguagens suportadas (full scope)

L0 (file imports via regex) + L1 (AST symbols/calls via tree-sitter) pra:
- JavaScript
- TypeScript (cobre TSX/JSX)
- Python
- Go
- Java

## Modos de operação

| Modo | Quem decide | Quando usar |
|---|---|---|
| **HITL** | Humano responde 3 Qs no Keeper | Specs críticas, contratos públicos |
| **Auto** | LLM classifica + escreve via Claude API | Whitelist paths, mudanças triviais |
| **Hybrid** (recomendado) | Auto whitelist + HITL blacklist | Default produção |

---

## Fase 1 — Hooks leves → v1.7.0 (1-2 dias) ✅ shipped (PR #11)

**Objetivo:** parar de onerar sistema. Hook só anota, processa em batch.

### Deliverables

| Item | Arquivo | O que muda |
|---|---|---|
| 1.1 | `lib/installer/hooks/runner.js` | Refactor: append-only JSONL em vez de full processing inline |
| 1.2 | `lib/installer/hooks/claude.js` | Remove PreToolUse matcher; adiciona Stop hook |
| 1.3 | `lib/installer/hooks/opencode.js` | Remove tool.execute.before pesado; mantém after leve + session.end |
| 1.4 | `lib/installer/hooks/cursor.js` | afterFileEdit só append + debounce 30s timer no runner |
| 1.5 | `lib/installer/hooks/kimi.js` | Pre→remove; Post leve; instala git pre-commit fallback |
| 1.6 | `lib/installer/hooks/codex.js` | Mesmo padrão Kimi |
| 1.7 | `agents/reversa-keeper/SKILL.md` | Lê `.reversa/keeper-queue.jsonl` em vez de `.json` snapshot; dedup por arquivo |
| 1.8 | `agents/reversa-keeper/references/queue-schema.md` | Schema JSONL |

### Exit criteria

- [ ] Task com 30 edits gera 30 linhas JSONL, ~300ms total (antes: ~9s)
- [ ] Stop hook em Claude Code dispara batch Keeper
- [ ] Cursor debounce funcional (30s sem edit → batch)
- [ ] Pre-commit fallback instalado em engines sem Stop

---

## Fase 2 — Graph L0 universal → v1.8.0-alpha.1 (3-4 dias) ✅ shipped (PR #17)

**Objetivo:** blast radius file-level pra **todas** linguagens via regex.

### Deliverables

| Item | Arquivo | O que faz |
|---|---|---|
| 2.1 | `lib/graph/parsers-l0/javascript.js` | Detecta `import ... from 'X'`, `require('X')`, `import('X')` (dynamic) |
| 2.2 | `lib/graph/parsers-l0/typescript.js` | Mesmo + `import type` |
| 2.3 | `lib/graph/parsers-l0/python.js` | `import X`, `from X import`, `__import__('X')` |
| 2.4 | `lib/graph/parsers-l0/go.js` | `import "X"`, `import (...)`, package decl |
| 2.5 | `lib/graph/parsers-l0/java.js` | `import X.Y.Z;`, package qualifier |
| 2.6 | `lib/graph/parsers-l0/index.js` | Registry + ext-to-parser mapping |
| 2.7 | `lib/graph/builder.js` | Walk repo → call parsers → produce nodes/edges |
| 2.8 | `lib/graph/resolve.js` | Path resolution (relative imports, package roots, tsconfig paths, go.mod) |

### Schema do graph

```json
{
  "version": 1,
  "level": "L0",
  "built_at": "2026-05-01T16:00:00Z",
  "languages_detected": ["javascript", "typescript"],
  "nodes": [
    { "id": "src/auth/login.js", "type": "file", "lang": "javascript" }
  ],
  "edges": [
    { "from": "src/auth/login.js", "to": "src/db/users.js", "kind": "imports" }
  ]
}
```

### Exit criteria

- [ ] Roda em repo Reversa próprio (TS/JS) → graph com >50 nodes
- [ ] Roda em repo Python sample → resolve imports relativos + absolutos
- [ ] Resolve tsconfig paths
- [ ] Performance: 1000-file repo em <2s

---

## Fase 3 — Storage + queries L0 + CLI → v1.8.0-alpha.2 (2-3 dias) ✅ shipped (PR #18)

**Objetivo:** persistir graph + expor queries básicas via CLI.

### Deliverables

| Item | Arquivo | O que faz |
|---|---|---|
| 3.1 | `lib/graph/store.js` | Read/write `.reversa/context/graph.json`. Atomic writes. |
| 3.2 | `lib/graph/queries/impact.js` | BFS: file → todos arquivos que dependem (transitive) |
| 3.3 | `lib/graph/queries/deps.js` | Diretas: arquivos que `file` importa |
| 3.4 | `lib/graph/queries/reverse-deps.js` | Inverse: quem importa `file` (1 nível) |
| 3.5 | `lib/graph/incremental.js` | Update incremental: re-parse só `dirty_files` |
| 3.6 | `lib/commands/graph.js` | CLI: `reversa graph build|impact|deps|stats` |
| 3.7 | `bin/reversa.js` | Registra comando `graph` |

### CLI exemplos

```bash
npx reversa graph build           # construct full graph
npx reversa graph build --since HEAD~10  # incremental from N commits ago
npx reversa graph impact src/auth/login.js
npx reversa graph deps src/auth/login.js
npx reversa graph stats
```

### Exit criteria

- [ ] `graph build` cria graph.json
- [ ] `graph impact` retorna BFS correto
- [ ] Incremental update <500ms pra 5 arquivos dirty
- [ ] CLI tem help + exit codes consistentes

---

## Fase 4 — Basic policy gate (file-level) → v1.8.0-alpha.3 (3-4 dias) ✅ shipped (PR #19)

**Objetivo:** Keeper barra pre-edit baseado em path + spec metadata. Sem parsing diff.

### Deliverables

| Item | Arquivo | O que faz |
|---|---|---|
| 4.1 | `lib/policy/index-builder.js` | Lê specs em `_reversa_sdd/sdd/`, extrai frontmatter `protected:` + `contracts:`, gera `.reversa/context/policy-index.json` |
| 4.2 | `lib/policy/check.js` | Decision engine: file path → spec → protected? + auto-policy.yaml blacklist |
| 4.3 | `lib/policy/decisions.js` | 3 níveis: approve / approve+advisory / block |
| 4.4 | `lib/policy/adapters/claude.js` | Output `{ "decision": "block", "reason": "..." }` |
| 4.5 | `lib/policy/adapters/codex.js` | Mesmo formato |
| 4.6 | `lib/policy/adapters/kimi.js` | Mesmo formato |
| 4.7 | `lib/policy/adapters/cursor.js` | Auto-revert + comment file (sem pre-block) |
| 4.8 | `lib/policy/adapters/opencode.js` | Throw com message |
| 4.9 | `lib/policy/overrides.js` | Detecta override: ADR existe, commit msg flag, CLI unprotect |
| 4.10 | `lib/installer/hooks/runner.js` | Adiciona policy-check ANTES do queue append; se block, retorna decision |
| 4.11 | `lib/commands/policy-index.js` | CLI: `reversa policy-index build` |

### Spec frontmatter usado

```markdown
---
contracts:
  - name: login
    file: src/auth/login.js
    protected: true
    reason: "public API"
protected_files:
  - "src/api/public/**"
---
```

### Exit criteria

- [ ] Edit em `src/api/public/foo.js` retorna block JSON com reason
- [ ] Edit em arquivo sem spec → approve silent
- [ ] Override via ADR funciona (cria ADR → próximo edit passa)
- [ ] Latência pre-hook <30ms

---

## Fase 5 — Keeper integra L0 graph → v1.8.0 (2-3 dias) ✅ shipped (PR #20)

**Objetivo:** Step 2 do Keeper usa graph em vez de só matrix.

### Deliverables

| Item | Arquivo | O que muda |
|---|---|---|
| 5.1 | `agents/reversa-keeper/SKILL.md` | Step 2 atualizado: usa `reversa graph impact <file>` pra blast radius |
| 5.2 | `agents/reversa-keeper/references/drift-rules.md` | Nova regra: "Mudança em arquivo com 5+ reverse-deps = severidade HIGH" |
| 5.3 | `lib/commands/drift-check.js` | Adiciona campo `affected_files` no output JSON usando graph |
| 5.4 | `lib/installer/hooks/runner.js` | Stop hook chama graph incremental update antes de Keeper |
| 5.5 | `docs/keeper-graph-integration.{md,pt.md,es.md}` | Doc 3 langs |

### Exit criteria

- [ ] Edit em arquivo SEM entrada na matrix → graph encontra spec via reverse-deps
- [ ] drift.md mostra blast radius por spec
- [ ] PR comment lista arquivos afetados

---

## Fase 6 — Graph L1 JS/TS → v1.9.0-alpha.1 (4-5 dias) ✅ shipped (PR #21)

**Objetivo:** AST symbols + calls + signatures pra JS/TS. Base pra smart policy.

### Deliverables

| Item | Arquivo | O que faz |
|---|---|---|
| 6.1 | `lib/graph/parsers-l1/javascript.js` | Wrap tree-sitter-javascript |
| 6.2 | `lib/graph/parsers-l1/typescript.js` | Wrap tree-sitter-typescript (cobre TSX) |
| 6.3 | `lib/graph/extractors/functions.js` | AST → function declarations + signatures |
| 6.4 | `lib/graph/extractors/classes.js` | AST → class + methods |
| 6.5 | `lib/graph/extractors/calls.js` | AST → call sites |
| 6.6 | `lib/graph/extractors/exports.js` | AST → exports + module shape |
| 6.7 | `lib/graph/store.js` extension | Schema v2 com `symbols` + `calls` arrays |
| 6.8 | `lib/graph/queries/context.js` | symbol → declaration + callers + spec link |
| 6.9 | `lib/graph/queries/signature.js` | symbol → signature string normalizado |
| 6.10 | `lib/graph/queries/diff-symbols.js` | Compara before/after AST → lista mudanças |

### Schema graph v2

```json
{
  "version": 2,
  "level": "L1",
  "nodes": [
    {
      "id": "src/auth/login.js#login",
      "type": "function",
      "file": "src/auth/login.js",
      "name": "login",
      "signature": "(email: string, password: string) => string | null",
      "line": 12,
      "exported": true
    }
  ],
  "edges": [
    { "from": "src/auth/login.js#login", "to": "src/db/users.js#findUser", "kind": "calls", "line": 14 }
  ]
}
```

### Exit criteria

- [ ] Parse Reversa próprio (TS) → graph tem >100 symbols
- [ ] `reversa graph context login` retorna assinatura + callers
- [ ] Performance: 1000-file repo em <8s

---

## Fase 7 — Graph L1 Python → v1.9.0-alpha.2 (3-4 dias) ✅ shipped (PR #22)

**Implementado:** `tree-sitter-python` via `optionalDependencies` (lazy load + fallback graceful pra L0 quando native binary ausente). Extractor produz mesmo schema canonical de JS/TS (`{ symbols, calls, exports }`). Captura type hints, async, decorators (staticmethod/property/classmethod), `__all__` para exports explícitos, `_prefix` pra nomes privados, superclasses para `extends`. Bonus: Python extractor já popula `from` (caller symbol) em cada call — JS/TS extractor receberá retrofit em follow-up.

| Item | Arquivo |
|---|---|
| 7.1 | `lib/graph/parsers-l1/python.js` (tree-sitter-python wrapper) |
| 7.2 | `lib/graph/extractors/python-functions.js` (def/class/method, type hints opcionais) |
| 7.3 | `lib/graph/extractors/python-calls.js` |
| 7.4 | Tests com sample repos Python |

---

## Fase 8 — Graph L1 Go → v1.9.0-alpha.3 (3-4 dias) ✅ shipped

**Implementado:** `tree-sitter-go` via `optionalDependencies` (lazy load + fallback graceful pra L0 quando native binary ausente). Extractor produz mesmo schema canonical (`{ symbols, calls, exports }`). Captura func declarations top-level, receivers (pointer e value) mapeados como `method` com id `file#Type.method`, type declarations (struct/interface/alias) com `goKind`, embedded fields como `extends`, call expressions com `from`-symbol resolvido (selector_expression incluso, ex. `fmt.Sprintf`), package decl, e exported flag via PascalCase rune. Suporta variadic params e multi-return signatures.

| Item | Arquivo |
|---|---|
| 8.1 | `lib/graph/parsers-l1/go.js` (tree-sitter-go wrapper) |
| 8.2 | `lib/graph/extractors/go.js` (func + receivers + interfaces + calls + exports) |
| 8.3 | `lib/graph/parsers-l1/index.js` (registry) |
| 8.4 | Resolve module via go.mod (deferido — L0 já cobre import path resolution) |

---

## Fase 9 — Graph L1 Java → v1.9.0-alpha.4 (4-5 dias) ✅ shipped

**Implementado:** `tree-sitter-java` via `optionalDependencies` (lazy load + fallback graceful pra L0). Extractor produz mesmo schema canonical (`{ symbols, calls, exports }`). Captura class/interface/record/enum (top-level e nested via prefixo `Outer.Inner`), métodos e construtores (id `file#Type.method`), modifiers via tokens anônimos do nó `modifiers` (public → exported), `extends`/`implements` como string em `extends`, `method_invocation` com receiver concatenado e `object_creation_expression` registrado como `new TypeName`. Maven/Gradle path resolution permanece em L0 — não bloqueia signature diff.

| Item | Arquivo |
|---|---|
| 9.1 | `lib/graph/parsers-l1/java.js` (tree-sitter-java wrapper) |
| 9.2 | `lib/graph/extractors/java.js` (class/interface/record/enum + methods + nested + calls + exports) |
| 9.3 | `lib/graph/parsers-l1/index.js` (registry) |
| 9.4 | Maven/Gradle path resolution (deferido — L0 cobre `import x.y.Z`) |

---

## Fase 10 — Smart policy gate (signature diff) → v1.9.0 (4-5 dias) ✅ shipped

**Implementado:** `lib/policy/diff-detector.js` parse before/after via L1 (qualquer das 5 langs já registradas) e devolve `{ added, removed, changed }` por id canonical. `check.js` agora distingue body-only vs signature-relevant edits em arquivos protegidos: quando `ctx.before` e `ctx.after` chegam, body-only é APPROVE; mudança de signature/exported/extends é BLOCK com `details` ricos (alternativas + callers extraídos do graph se `ctx.graph` for fornecido). Sem before/after, fallback ao comportamento conservador da Fase 4. `decisions.js` ganha categorias (`signature_change`, `deleted_symbol`, `new_export`, etc.) consumidas pelo CLI da Fase 11.

| Item | Arquivo |
|---|---|
| 10.1 | `lib/policy/diff-detector.js` (parse before/after via L1, indexa por id canonical) |
| 10.2 | `lib/policy/check.js` (smart resolve para protected_files / protected_globs) |
| 10.3 | `lib/policy/decisions.js` (categorias) |
| 10.4 | `lib/policy/reason-builder.js` (headline + details + alternatives) |
| 10.5 | `lib/policy/alternatives.js` (heurísticas: optional-param, overload, internal-export, spec-first) |
| 10.6 | Smoke test cross-lang (JS verificado; mesmo path roda Python/Go/Java/TS sem código adicional) |

Bump pra `1.9.0`.

---

## Fase 11 — policy-check CLI (CI gate) → v1.10.0 (3-4 dias) ✅ shipped

**Implementado:** CLI standalone que roda smart gate em git diff. Lê `git diff base...head`, materializa conteúdo via `git show ref:path` e alimenta `checkFile` com `ctx.before`/`ctx.after` — então signature/export/extends mudanças disparam BLOCK; body-only é APPROVE. Severidade `high` (default) bloqueia só `signature_change`/`deleted_symbol`; `medium` adiciona `protected_*` e `new_export`; `low` inclui blacklist. Exit 0/1/2 usável em qualquer CI. Templates pra GitHub Actions e GitLab CI prontos pra colar.

| Item | Arquivo |
|---|---|
| 11.1 | `lib/commands/policy-check.js` |
| 11.2 | `bin/reversa.js` (registra `policy-check`) |
| 11.3 | `--format=text` (default) e `--format=json` |
| 11.4 | `--severity` flag (high/medium/low) |
| 11.5 | `templates/ci/github-actions.yml` |
| 11.6 | `templates/ci/gitlab-ci.yml` |
| 11.7 | `docs/policy-check.{md,pt.md,es.md}` |

Bump pra `1.10.0`.

### CLI exemplo

```bash
npx reversa policy-check --base origin/main --head HEAD --severity high
# Comparing origin/main...HEAD (severity=high)
#   ✗ src/auth/login.js: Signature change to protected `login` ...
#       kind: signature_change
#       old:  (email, password)
#       new:  (email, password, mfaCode)
#       → Make the new parameter optional
#       → Update the spec first
# Results: 0 approved · 0 advisory · 1 blocked (1 at gate)
# FAIL — exit 1
```

---

## Fase 12 — Auto Keeper mode → v2.0.0-alpha.1 (5-7 dias) ✅ shipped

**Implementado:** Pipeline de decisão completo, com LLM opt-in. Decision tree puro JS roda whitelist/blacklist/escalate antes de qualquer call à API; só quando nada cobre o caso, o classifier (Haiku) é chamado. Spec rewriter (Sonnet) só roda em ROUTE_AUTO. CLI `reversa keeper auto --dry-run` valida policy + queue sem rede — útil em CI. Anthropic SDK declarado em `optionalDependencies` + lazy load via createRequire (offline / dry-run não exige instalação). Prompt caching via system blocks: instrução estável + spec context separados, breakpoint no segundo bloco, diff per-PR no user turn (segue prefix-match invariant). Audit writer append-only em `.reversa/audit/YYYY-MM-DD.jsonl`.

| Item | Arquivo |
|---|---|
| 12.1 | `lib/auto/policy-schema.js` (parser YAML específico — 2-space + listas) |
| 12.2 | `lib/auto/classifier.js` (Haiku, lazy load, JSON-only response, fallback graceful) |
| 12.3 | `lib/auto/spec-writer.js` (Sonnet, full-spec rewrite com cache no spec content) |
| 12.4 | `lib/auto/decision-tree.js` (paths/change_types/escalate_on antes do LLM) |
| 12.5 | `lib/auto/prompt-cache.js` (system blocks com cache_control no contexto estável) |
| 12.6 | `lib/commands/keeper-auto.js` (`--dry-run`, `--max-specs`, audit append) |
| 12.7 | `templates/auto-policy.example.yaml` |
| 12.8 | `lib/audit/writer.js` (mínimo — Phase 13 expande) |

Bump pra `2.0.0-alpha.1`. Doc do agente e SKILL.md auto-mode ficam para Phase 14 final docs.

### auto-policy.yaml exemplo

```yaml
auto_resolve:
  enabled: true
  confidence_threshold: 0.85
  max_specs_per_pr: 5

  whitelist:
    paths: ["**/*.test.*", "**/*.spec.*", "docs/**"]
    change_types: [add_logging, format_only, comment_only, dep_bump_minor, test_only]

  blacklist:
    paths: ["**/contracts/**", "**/api/public/**", "**/migrations/**"]
    change_types: [public_api_change, business_rule_change, schema_migration, adr_required]

  escalate_on:
    - "🟢 → 🟡 downgrade"
    - "spec_deletion"
    - "new_adr_required"
    - "cross_cluster_change"

  llm:
    model: claude-haiku-4-5-20251001
    fallback: claude-sonnet-4-6
```

### Exit criteria

- [ ] `reversa keeper auto --dry-run` mostra decisões sem aplicar
- [ ] Whitelist de paths funciona (test files auto-resolved)
- [ ] Confidence threshold escalations funciona
- [ ] LLM cost <$0.10 por PR médio (cache hit ratio >70%)

---

## Fase 13 — Audit log + bot → v2.0.0-beta (4-5 dias)

**Objetivo:** Toda decisão automática auditada. Bot commita specs.

### Deliverables

| Item | Arquivo | O que faz |
|---|---|---|
| 13.1 | `lib/audit/writer.js` | Append-only `.reversa/audit/YYYY-MM-DD.jsonl` |
| 13.2 | `lib/audit/schema.md` | Doc do formato JSONL |
| 13.3 | `lib/audit/redact.js` | Redação opcional (não logar diffs sensíveis) |
| 13.4 | `bot/keeper-bot/` | GitHub App scaffolding (Probot ou Octokit) |
| 13.5 | `bot/keeper-bot/handlers/pr.js` | Handler PR: roda keeper auto, commita specs com `[skip ci]` |
| 13.6 | `bot/keeper-bot/install.md` | Setup guide |
| 13.7 | `lib/auto/labels.js` | Aplica labels: `keeper:auto-resolved`, `keeper:needs-review`, `keeper:escalated` |

### Exit criteria

- [ ] Bot scaffold deployado (manifest + permissions)
- [ ] Bot commita só em `_reversa_sdd/**` (path-restricted)
- [ ] Audit log persiste todas decisões
- [ ] PR labels aplicados corretamente

---

## Fase 14 — CI templates + docs final → v2.0.0 (2-3 dias)

**Objetivo:** Out-of-the-box pra qualquer time.

### Deliverables

| Item | Arquivo | O que faz |
|---|---|---|
| 14.1 | `templates/ci/github-actions-full.yml` | Workflow completo: drift-check + policy-check + graph cache + keeper auto opcional |
| 14.2 | `templates/ci/gitlab-ci-full.yml` | Equivalente GitLab |
| 14.3 | `templates/ci/circleci-full.yml` | CircleCI |
| 14.4 | `lib/installer/git-hooks.js` | Instala pre-commit hook local |
| 14.5 | `docs/control-plane.{md,pt.md,es.md}` | Doc completa do conceito |
| 14.6 | `docs/migration-1.x-to-2.0.md` | Guide |
| 14.7 | `README.md` | Update final com 2.0 features |

### Exit criteria

- [ ] CI template clonável funciona em repo limpo
- [ ] Docs 3 langs completas
- [ ] Migration guide testado

---

## Resumo total

| Fase | Item | Dias | Versão |
|---|---|---|---|
| 1 | Hooks leves | 2 | 1.7.0 |
| 2 | Graph L0 5 langs | 4 | 1.8.0-α.1 |
| 3 | Storage + queries L0 + CLI | 3 | 1.8.0-α.2 |
| 4 | Basic policy gate | 4 | 1.8.0-α.3 |
| 5 | Keeper integra L0 | 3 | 1.8.0 |
| 6 | Graph L1 JS/TS | 5 | 1.9.0-α.1 |
| 7 | Graph L1 Python | 4 | 1.9.0-α.2 |
| 8 | Graph L1 Go | 4 | 1.9.0-α.3 |
| 9 | Graph L1 Java | 5 | 1.9.0-α.4 |
| 10 | Smart policy gate | 5 | 1.9.0 |
| 11 | policy-check CLI | 4 | 1.10.0 |
| 12 | Auto Keeper mode | 7 | 2.0.0-α |
| 13 | Audit + bot | 5 | 2.0.0-β |
| 14 | CI templates + docs | 3 | 2.0.0 |

**Total: ~58 dias úteis (~12 semanas).** Solo dev. Paralelizável a 8 semanas com 2 devs.

---

## Critical path

```
Fase 1 → Fase 2 → Fase 3 → Fase 5 (libera Keeper L0)
                       └→ Fase 4 (libera basic policy)
Fase 6 → Fase 10 → Fase 11 (libera smart policy + CI)
       ↓ paralelo
Fase 7,8,9 (langs adicionais)
Fase 12 → Fase 13 → Fase 14 (auto mode end-to-end)
```

Pode mergear em main por fase (cada fase = PR independente).

**Versão produção early:** v1.8.0 já vale (Keeper + L0 + basic policy).

---

## Decisões arquiteturais já tomadas

| Decisão | Razão |
|---|---|
| **Não usar GitNexus** | License PolyForm Noncommercial bloqueia users comerciais; scope 80% sobrando |
| **Build graph próprio MIT** | Controle total, tailored ao Reversa, license limpa |
| **Tree-sitter como dep** | MIT, mature, multi-lang |
| **L0 + L1 layered** | L0 cobre todas langs raso (regex); L1 deep per-lang (AST) |
| **Hooks leves + batch** | Onerar sistema na ordem de 9s/task → 300ms/task |
| **HITL default + Auto opt-in** | Não quebra users existentes; auto via flag |
| **JSONL append-only** | Atomic writes POSIX, rápido, persiste crash |
| **Spec frontmatter pra contracts** | Mecanismo declarativo de proteção |
| **Override via ADR** | Força fluxo correto: spec antes de código |

---

## Modos de uso target

| Perfil | Como usa Reversa 2.0 |
|---|---|
| Time legado | Reversa extrai spec + Keeper mantém atualizada |
| Time com agent farm | Auto mode + auto-policy.yaml + audit |
| Empresa regulada | HITL mode + audit log persistente |
| Open source maintainer | drift-check + policy-check em CI bloqueia PR ruim |
