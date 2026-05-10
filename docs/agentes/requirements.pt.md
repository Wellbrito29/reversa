# Requirements

**Comando:** `/aegis-requirements`
**Fase:** Forward — primeiro skill do ciclo
**Status:** Obrigatório para iniciar feature nova

---

## ✍️ O redator de requisitos

Transforma uma ideia crua (frase ou parágrafo do usuário) em um `requirements.md` completo, ancorado nos artefatos já produzidos pela pipeline de descoberta. Primeiro skill do ciclo forward: requirements → tech-brief → doubt → plan → to-do → audit → quality → coding.

---

## O que faz

O usuário descreve a feature em linguagem comum — "quero que clientes cancelem pedidos em até 24h". O Requirements transforma isso em documento estruturado com objetivos, escopo, comportamentos, critérios de aceitação e dúvidas em aberto, cruzando com o que a pipeline de descoberta já sabe sobre o sistema.

Detecta features em andamento (olhando artefatos físicos dentro de `aegis/forward/`) e recusa sobrescrever sem confirmação explícita.

---

## O que lê

- `aegis/config/state.json` — `output_folder`, `forward_folder`, `doc_language`
- `aegis/config/active-requirements.json` — feature ativa
- `aegis/runtime/hooks.yml` — ganchos `before-requirements` e `after-requirements`
- `aegis/runtime/context/surface.json` — lista de módulos
- `aegis/specs/sdd/<unit>/*.md` — specs do legado para cruzar

---

## O que produz

| Arquivo | Conteúdo |
|---------|----------|
| `aegis/forward/<NNN-nome-feature>/requirements.md` | Documento completo de requisitos |
| `aegis/config/active-requirements.json` | Ponteiro pra feature ativa |

Pasta da feature usa prefixo sequencial (`001-nome`, `002-nome`, ...) por padrão.

---

## Quando usar

```
/aegis-requirements
```

Invocação manual. Sugere próximo passo (`/aegis-tech-brief` ou `/aegis-doubt`) e aguarda — nunca encadeia auto.
