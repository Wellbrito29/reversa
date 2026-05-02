# Keeper × Graph integración

Desde v1.8.0, el Keeper consulta el graph de dependencias L0 (`.reversa/context/graph.json`) además del `code-spec-matrix.md` para ampliar el blast radius y clasificar la severidad del drift.

## Qué cambió en `/reversa-keeper after`

**Paso 2** (mapear specs impactadas) ahora usa dos fuentes, en este orden:

1. **Matrix** (`_reversa_sdd/traceability/code-spec-matrix.md`) — mapeo primario `archivo → spec`.
2. **Graph** — para archivos **sin** entrada en la matrix, ejecuta `npx reversa graph impact <archivo>`. Cualquier archivo del resultado que **sí** tenga entrada en la matrix aporta su spec a la lista a revisar.

Una edición en un archivo sin spec aún dispara actualizaciones de spec aguas abajo — Keeper las encuentra vía import graph en lugar de rendirse.

**Paso 7** (actualizar `drift.md`) registra dos campos nuevos por spec:

- `blast_radius`: archivos afectados por cambios en los archivos de esta spec (top 20, luego `+N more`).
- `severity`: clasificación según [drift-rules.md](../agents/reversa-keeper/references/drift-rules.md):
  - `LOW` — 0–1 reverse-deps directas
  - `MEDIUM` — 2–4
  - `HIGH` — 5+ (Keeper sugiere `/reversa-reviewer`)

## Qué cambió en los hooks

El hook `Stop` (Claude Code) y `session.end` (Opencode) hacen **update incremental del graph** de los archivos dirty al final de cada sesión, antes del próximo `/reversa-keeper after`. Otras engines (Cursor, Kimi, Codex) actualizan el graph en el commit vía git pre-commit fallback (Fase 1).

Si `.reversa/context/graph.json` no existe, el update se omite silenciosamente. Ejecuta `npx reversa graph build` una vez para inicializar.

## Qué cambió en `drift-check`

`reversa drift-check --format=json` ahora incluye un array `affected_files` por spec bloqueante, calculado como unión de los impacts vía graph de los archivos mapeados a esa spec.

```json
{
  "severity": "high",
  "blocking": [
    {
      "spec": "_reversa_sdd/sdd/auth.md",
      "status": "🔴 pending",
      "action": "Ejecutar /reversa-keeper after",
      "affected_files": [
        "src/api/handler.js",
        "src/middleware/auth.js",
        "+12 more"
      ]
    }
  ]
}
```

Bots de comentario de PR en CI pueden subir esto al cuerpo del PR para que los reviewers vean el blast radius de inmediato.

Si el graph no existe o la matrix falta, `affected_files` se vuelve `null` — drift-check sigue funcionando en modo degradado.

## Bootstrap en proyecto existente

```bash
npx reversa graph build
npx reversa policy-index build   # opcional, Fase 4
/reversa-keeper after            # en tu engine
```

Después de eso, el hook Stop mantiene el graph actualizado en cada sesión.
