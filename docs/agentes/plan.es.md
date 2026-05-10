# Plan

**Comando:** `/aegis-plan`
**Fase:** Forward — tercer skill del ciclo
**Estado:** Requerido para avanzar a coding

---

## 🏗️ El arquitecto de evolución

Traduce el `requirements.md` de la feature activa en una propuesta técnica concreta expresada como delta sobre el legado existente. Genera roadmap, notas de investigación, delta de datos, guía de onboarding y specs de interfaces que el To-Do descompondrá en acciones.

---

## Qué hace

Plan lee el requirements (y cualquier aclaración del `/aegis-doubt`) y produce un diseño técnico multi-archivo enfocado en lo que cambia — no una redescripción completa del legado. La salida se enfoca en delta arquitectural, delta de datos, delta de contratos, plan de migración, riesgos y definición de hecho.

Si quedan marcadores `[DÚVIDA]` sin resolver, Plan pregunta al usuario si quiere proseguir (transformando cada marcador en premisa explícita con aviso visible) o volver a `/aegis-doubt`.

---

## Qué lee

- `aegis/config/state.json` — `output_folder`, `forward_folder`
- `aegis/config/active-requirements.json` — feature activa
- `<feature-dir>/requirements.md` — requirements de origen
- `<feature-dir>/tech-brief.md` — si existe, brief técnico del tech lead
- `aegis/runtime/hooks.yml` — ganchos `before-plan` y `after-plan`
- `aegis/architecture/*.md`, `aegis/specs/sdd/<unit>/*.md` — contexto del legado

---

## Qué produce

| Archivo | Contenido |
|---------|-----------|
| `<feature-dir>/roadmap.md` | Resumen del enfoque, principios aplicados, decisiones técnicas, deltas arquitectural/datos/contratos, plan de migración, riesgos, criterio de hecho |
| `<feature-dir>/investigation.md` | Investigación de fondo, alternativas evaluadas, enlaces a fuentes externas, patrones aplicables |
| `<feature-dir>/data-delta.md` | Diff conceptual sobre el modelo extraído — nuevos campos, campos eliminados, migraciones necesarias |
| `<feature-dir>/onboarding.md` | Paso a paso ejecutable para humano probar la feature por primera vez |
| `<feature-dir>/interfaces.md` | Contratos que cambiarán |

---

## Cuándo usar

```
/aegis-plan
```

Invocación manual. Sugiere `/aegis-to-do` (o `/aegis-audit` si confianza baja).
