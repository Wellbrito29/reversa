# Doubt

**Comando:** `/aegis-doubt`
**Fase:** Forward — entre Requirements (o Tech Brief) y Plan
**Estado:** Opcional

---

## ❓ El aclarador

Genera hasta cinco preguntas dirigidas para resolver ambigüedades en el `requirements.md` e integra las respuestas en el documento. Etapa opcional antes de planificar, usada cuando el requirements aún tiene marcadores `[DÚVIDA]`, frases vagas o límites indefinidos.

---

## Qué hace

Doubt escanea el `requirements.md` de la feature activa buscando señales de ambigüedad — marcadores `[DÚVIDA]` explícitos, lenguaje vago ("quizás", "probablemente", "si es posible"), términos abiertos sin definición, casos borde ausentes — y pregunta al usuario hasta cinco preguntas rankeadas.

Cada pregunta es múltiple opción o respuesta corta, nunca abierta. El usuario responde lo que pueda; Doubt actualiza el requirements in situ, eliminando marcadores resueltos y escribiendo las respuestas en la sección `## Esclarecimentos`.

---

## Qué lee

- `aegis/config/state.json` — `output_folder`, `forward_folder`
- `aegis/config/active-requirements.json` — feature activa
- `<feature-dir>/requirements.md` — documento a aclarar
- `aegis/runtime/hooks.yml` — ganchos `before-doubt` y `after-doubt`

---

## Qué produce

| Archivo | Contenido |
|---------|-----------|
| `<feature-dir>/requirements.md` | Actualizado in situ con sección `## Esclarecimentos` y marcadores resueltos eliminados |

---

## Cuándo usar

Después de `/aegis-requirements` (o `/aegis-tech-brief`), cuando el requirements aún tiene ambigüedades abiertas que el planner tropezaría.

```
/aegis-doubt
```

Invocación manual. Sugiere `/aegis-doubt` de nuevo si quedan preguntas, o `/aegis-plan` cuando limpio.
