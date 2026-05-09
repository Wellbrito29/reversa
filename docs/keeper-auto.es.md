# Keeper modo auto

Triaje de drift vía LLM en el Aegis Spec Keeper. El modo auto reemplaza las
tres preguntas HITL por un árbol de decisión determinístico, recurriendo
a Claude Haiku sólo cuando la policy no cubre el caso. La reescritura de
specs usa Claude Sonnet, y sólo en el camino que auto-resuelve.

```bash
npx aegis-spec keeper auto --dry-run
```

## Archivo de policy

`aegis/config/auto-policy.yaml` se lee en cada ejecución. Auto está **off**
por defecto — requiere `auto_resolve.enabled: true`.

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

Plantilla comentada en `templates/auto-policy.example.yaml`.

## Flujo de decisión

```
entrada de cola ─┬─ blacklist match? ────────► escalate_block
                 ├─ whitelist match? ────────► auto_resolve
                 ├─ escalate_on rule? ───────► escalate_block
                 └─ classifier (Haiku) ──┬─ confidence ≥ threshold ─► auto_resolve
                                         └─ si no ─────────────────► needs_review
```

## CLI

```
npx aegis-spec keeper auto [--dry-run] [--max-specs N] [--cwd <path>]
                        [--format text|json]
```

| Flag | Default | Significado |
|---|---|---|
| `--dry-run` | off | Sin LLM; sólo decisiones determinísticas |
| `--max-specs` | de la policy | Tope de entradas por corrida |
| `--cwd` | dir actual | Operar contra otro proyecto |
| `--format` | text | `json` para CI |

## Audit log

Toda decisión va a `aegis/runtime/audit/YYYY-MM-DD.jsonl`. Esquema en
`lib/audit/schema.md`. Configure redacción vía
`aegis/config/audit-policy.json`:

```json
{ "redact": ["diff", "commit_message"] }
```

## Bot de GitHub

`bot/keeper-bot/` trae un handler agnóstico de webhook. Setup en
`bot/keeper-bot/install.md`. El bot está restringido a commits bajo
`aegis/**` — cualquier cambio fuera de ese prefijo aborta el push.
