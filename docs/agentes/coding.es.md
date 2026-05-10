# Coding

**Comando:** `/aegis-coding`
**Fase:** Forward — último skill del ciclo
**Estado:** Requerido para ejecutar la feature

---

## ⌨️ El ejecutor

Recorre `actions.md` y convierte cada checkbox abierto en código real, fase por fase, respetando paralelismo y dependencias. Al terminar, deja dos rastros de auditoría: `legacy-impact.md` (lo que cambió en el legado) y `regression-watch.md` (lo que debe permanecer verdadero en futuras extracciones).

---

## Qué hace

Coding lee la lista de acciones y ejecuta cada ítem de arriba a abajo: edita archivos, ejecuta comandos, crea módulos nuevos, actualiza tests. Marca cada acción terminada `[X]` y anexa un registro JSONL de progreso.

El skill respeta los marcadores de ejecución paralela del To-Do — acciones independientes pueden lotearse, dependientes corren en orden. Tras la ejecución, produce dos artefactos de auditoría que futuras extracciones y el Keeper consumen.

---

## Qué lee

- `aegis/config/state.json` — `output_folder`, `forward_folder`
- `aegis/config/active-requirements.json` — feature activa
- `<feature-dir>/actions.md` — la lista ejecutable
- `<feature-dir>/roadmap.md`, `data-delta.md`, `interfaces.md` — contexto para ejecución
- `aegis/runtime/hooks.yml` — ganchos `before-coding` y `after-coding`

---

## Qué produce

| Archivo | Contenido |
|---------|-----------|
| `<feature-dir>/actions.md` | Actualizado in situ — checkboxes pasan a `[X]` a medida que las acciones se completan |
| `<feature-dir>/progress.jsonl` | Log append-only de cada acción ejecutada (timestamp, ID, estado) |
| `<feature-dir>/legacy-impact.md` | Lo que cambió en el código legado (archivos, módulos, contratos) |
| `<feature-dir>/regression-watch.md` | Invariantes que deben mantenerse en futuras extracciones (input del Keeper) |

Más, claro, todos los cambios de código que las acciones describen.

---

## Cuándo usar

Después de que `/aegis-to-do` produzca `actions.md`. Opcionalmente después de `/aegis-audit` y/o `/aegis-quality` si quiere pase de revisión.

```
/aegis-coding
```

Invocación manual. Recorre la lista de acciones y solo se detiene a preguntar cuando una acción lo exige explícitamente.
