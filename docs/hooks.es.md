# Hooks (Keeper automático)

Instala hooks en tu engine de IA para que el Keeper corra automáticamente cuando edites un archivo.

`/aegis-keeper after` manual siempre funciona como fallback.

---

## Quick start

```bash
npx aegis-spec add-hooks --engine claude-code   # o cursor, kimi-cli, codex, opencode
```

Verás un preview antes de escribir. Confirma para instalar.

Para desinstalar:

```bash
npx aegis-spec remove-hooks --engine claude-code
npx aegis-spec remove-hooks --all
```

---

## Qué hace el hook

Cuando la engine dispara un tool que edita archivos, el hook invoca el runner en `aegis/runtime/hooks/runner.js`. El runner:

1. Append en `aegis/runtime/queue/keeper-queue.jsonl` (con lock para concurrencia)
2. Stub en `aegis/changelog/YYYY-MM-DD.md`
3. Marca specs afectadas como `🔴 pending` en `aegis/reports/drift.md`
4. Warning en stderr si se afectó spec de alta confianza

Nunca bloquea la engine. Nunca modifica tu código. Errores en `aegis/runtime/audit/keeper-errors.log`.

---

## Engines soportadas

| Engine | Archivo | Eventos |
|---|---|---|
| Claude Code | `.claude/settings.json` | PreToolUse + PostToolUse |
| Cursor | `.cursor/hooks.json` | afterFileEdit |
| Kimi CLI | `.kimi/config.toml` o `~/.kimi/config.toml` (con backup) | PreToolUse + PostToolUse |
| Codex | `.codex/hooks.toml` | PreToolUse + PostToolUse (apply_patch) |
| Opencode | `.opencode/plugins/aegis-keeper.js` | tool.execute.before/after |

---

## Garantías

- Preview antes de escribir
- Sin overwrite ciego — preserva otras entradas
- Backup automático para configs globales (Kimi)
- Install idempotente
- Uninstall limpio

---

## Integración CI

Combina con [`npx aegis-spec drift-check`](drift-check.es.md):

```yaml
- name: Aegis Spec drift gate
  run: npx aegis-spec drift-check --severity high
```
