# Keeper modo auto

Triagem de drift via LLM no Aegis Spec Keeper. O modo auto substitui as três
perguntas HITL por uma árvore de decisão determinística, caindo no Claude
Haiku só quando a policy não cobre o caso. Reescritas de spec usam Claude
Sonnet, e apenas no caminho que auto-resolve.

```bash
npx aegis-spec keeper auto --dry-run
```

## Arquivo de policy

`aegis/config/auto-policy.yaml` é lido a cada execução. Auto mode é **off**
por padrão — exige `auto_resolve.enabled: true`.

```yaml
auto_resolve:
  enabled: true
  confidence_threshold: 0.85
  max_specs_per_pr: 5
  whitelist:
    paths: ["**/*.test.*", "docs/**"]
    change_types: [test_only, format_only]
  blacklist:
    paths: ["**/contracts/**"]
    change_types: [public_api_change]
  escalate_on:
    - "spec_deletion"
  llm:
    model: claude-haiku-4-5
    fallback: claude-sonnet-4-6
```

Template comentado em `templates/auto-policy.example.yaml`.

## Fluxo de decisão

```
entry da fila  ─┬─ blacklist match? ────────► escalate_block
                ├─ whitelist match? ────────► auto_resolve
                ├─ escalate_on rule? ───────► escalate_block
                └─ classifier (Haiku) ───┬─ confidence ≥ threshold ──► auto_resolve
                                         └─ caso contrário ──────────► needs_review
```

## CLI

```
npx aegis-spec keeper auto [--dry-run] [--max-specs N] [--cwd <path>]
                        [--format text|json]
```

| Flag | Padrão | Significado |
|---|---|---|
| `--dry-run` | off | Pula calls LLM; só decisões determinísticas |
| `--max-specs` | da policy | Cap de entradas processadas por run |
| `--cwd` | dir atual | Roda contra outro projeto |
| `--format` | text | `json` pra CI |

## Audit log

Toda decisão vai em `aegis/runtime/audit/YYYY-MM-DD.jsonl`. Schema em
`lib/audit/schema.md`. Configure redação via
`aegis/config/audit-policy.json`:

```json
{ "redact": ["diff", "commit_message"] }
```

## Bot GitHub

`bot/keeper-bot/` traz um handler agnóstico de webhook. Setup em
`bot/keeper-bot/install.md`. O bot é restrito a commits sob
`aegis/**` — qualquer alteração fora desse prefixo aborta o push.
