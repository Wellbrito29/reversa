# Keeper

El agente que impide que el código nuevo se vuelva legado.

## Qué hace

El Keeper cierra el ciclo de feedback entre las specs generadas por Aegis Spec y los cambios diarios de código. Funciona en dos modos — antes de un cambio (briefing solo lectura) y después (actualiza specs, changelog y el dashboard de drift).

## Por qué existe

Aegis Spec genera specs a partir del código legado existente. Pero el código sigue cambiando, y las specs envejecen en semanas. Sin un guardián, las specs se desincronizan y se vuelven tan inútiles como la documentación ausente que Aegis Spec vino a resolver.

El Keeper es ese guardián. Trata las specs como **fuentes de verdad activas**, no snapshots.

---

## Dos modos

### `before <descripción-o-archivos>`

Briefing solo lectura. Úsalo **antes** del cambio.

```
/aegis-keeper before lib/auth/login.js
/aegis-keeper before "voy a agregar rate limiting al login"
```

El agente:
1. Lee `aegis/traceability/code-spec-matrix.md` para identificar specs que cubren los archivos afectados
2. Lee solo esas specs (consciente de tokens)
3. Presenta contratos, invariantes y reglas de negocio que el cambio debe respetar
4. Pregunta si tu cambio planeado los respeta
5. No escribe nada — puramente informativo

### `after`

Modo predeterminado si hay cambios sin commitear o eventos en cola. Úsalo **después** del cambio.

```
/aegis-keeper after
/aegis-keeper
```

El agente:
1. Recolecta archivos modificados de `git diff HEAD` y (si hay hooks) `aegis/runtime/queue/keeper-queue.jsonl`
2. Mapea archivos a specs impactadas vía `code-spec-matrix.md`
3. Hace 3 preguntas: **Por qué** el cambio, **breaking change**, **contexto extra**
4. Actualiza cada spec impactada in-place, reclasifica confianza (🟢/🟡/🔴)
5. Append en `<output_folder>/changelog/YYYY-MM-DD.md`
6. Actualiza `<output_folder>/reports/drift.md`
7. Limpia entradas procesadas de la cola

---

## Salidas

| Archivo | Cuándo |
|---|---|
| `aegis/changelog/YYYY-MM-DD.md` | Modo `after`, siempre |
| `aegis/specs/sdd/[componente].md` | Modo `after`, in-place si impactado |
| `aegis/traceability/code-spec-matrix.md` | Modo `after`, con archivos nuevos/eliminados |
| `aegis/reports/drift.md` | Modo `after`, siempre (dashboard) |
| `aegis/config/state.json` | Modo `after`, checkpoint |

---

## Trigger manual vs automatizado

Manual: `/aegis-keeper` funciona en cualquier engine sin setup.

Automatizado: instala hooks vía [`npx aegis-spec add-hooks`](../hooks.es.md). Los hooks encolan eventos para que el agente los procese después.

---

## Cuándo NO ejecutar

- Sin `aegis/`: corre `/aegis` primero
- Sin `code-spec-matrix.md`: corre `/aegis-architect` primero
- Sin cambios de código: nada que hacer

---

## Integración

El Keeper complementa al Reviewer (validación inicial), Archaeologist (análisis profundo) y Architect (síntesis). Cuando detecta cambios que afectan más de 5 specs o tocan entry points / schemas, sugiere escalar a esos agentes.
