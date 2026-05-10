# Requirements

**Comando:** `/aegis-requirements`
**Fase:** Forward — primer skill del ciclo
**Estado:** Requerido para iniciar nueva feature

---

## ✍️ El redactor de requisitos

Convierte una idea cruda (frase o párrafo del usuario) en un `requirements.md` completo, anclado en los artefactos ya producidos por el pipeline de descubrimiento. Primer skill del ciclo forward: requirements → tech-brief → doubt → plan → to-do → audit → quality → coding.

---

## Qué hace

El usuario describe una feature en lenguaje común — "quiero que los clientes cancelen pedidos hasta 24h". Requirements lo transforma en documento estructurado con objetivos, alcance, comportamientos, criterios de aceptación y dudas abiertas, cruzando con lo que el pipeline de descubrimiento ya sabe del sistema.

Detecta features en curso (observando artefactos físicos dentro de `aegis/forward/`) y rechaza sobrescribir sin confirmación explícita.

---

## Qué lee

- `aegis/config/state.json` — `output_folder`, `forward_folder`, `doc_language`
- `aegis/config/active-requirements.json` — feature activa
- `aegis/runtime/hooks.yml` — ganchos `before-requirements` y `after-requirements`
- `aegis/runtime/context/surface.json` — lista de módulos
- `aegis/specs/sdd/<unit>/*.md` — specs del legado para cruzar

---

## Qué produce

| Archivo | Contenido |
|---------|-----------|
| `aegis/forward/<NNN-nombre-feature>/requirements.md` | Documento completo de requisitos |
| `aegis/config/active-requirements.json` | Puntero a la feature activa |

La carpeta de la feature usa prefijo secuencial (`001-nombre`, `002-nombre`, ...) por defecto.

---

## Cuándo usar

```
/aegis-requirements
```

Invocación manual. Sugiere siguiente paso (`/aegis-tech-brief` o `/aegis-doubt`) y espera — nunca encadena automáticamente.
