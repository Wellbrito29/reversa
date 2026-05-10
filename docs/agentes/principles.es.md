# Principles

**Comando:** `/aegis-principles`
**Fase:** Forward — fuera del ciclo, corre en cualquier momento
**Estado:** Opcional, raro

---

## 📜 El guardián de los principios

Crea o actualiza los principios duraderos del proyecto y propaga sugerencias de ajuste a templates dependientes. Los principios son raros, cambian poco e influyen en todos los demás artefactos.

Este skill **no** es parte del pipeline `requirements → plan → to-do → coding`. Corre standalone, incluso antes de la primera feature.

---

## Qué hace

Principles es la capa lenta del proyecto. Captura reglas que deben mantenerse en todas las features — invariantes de estilo de código, restricciones arquitecturales, baseline de seguridad, convenciones de nomenclatura, políticas de despliegue. Cuando un principio se agrega, cambia o retira, el skill sugiere dónde templates dependientes (requirements, roadmap, actions) necesitan alinearse.

Cadencia típica: menos de una vez al mes.

---

## Qué lee

- `aegis/config/state.json` — `output_folder`, `forward_folder`
- `aegis/config/principles.md` — principios actuales (crea si falta)
- `aegis/runtime/hooks.yml` — ganchos `before-principles` y `after-principles`

---

## Qué produce

| Archivo | Contenido |
|---------|-----------|
| `aegis/config/principles.md` | Principios duraderos del proyecto, versionados y append-only |
| Lista de sugerencias | Templates y features activas que pueden necesitar alinearse al principio nuevo/cambiado |

---

## Cuándo usar

- Antes de la primera feature, para plantar principios fundamentales
- Cuando el equipo acuerda nueva regla arquitectural
- Al retirar o revisar principio existente

```
/aegis-principles
```

Invocación manual. Standalone — no encadena en el ciclo forward.
