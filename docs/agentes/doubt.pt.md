# Doubt

**Comando:** `/aegis-doubt`
**Fase:** Forward — entre Requirements (ou Tech Brief) e Plan
**Status:** Opcional

---

## ❓ O esclarecedor

Gera até cinco perguntas dirigidas para resolver ambiguidades no `requirements.md` e integra as respostas no documento. Etapa opcional antes do planejamento, usada quando o requirements ainda tem marcadores `[DÚVIDA]`, frases vagas ou limites indefinidos.

---

## O que faz

Doubt varre o `requirements.md` da feature ativa em busca de sinais de ambiguidade — marcadores `[DÚVIDA]` explícitos, linguagem vaga ("talvez", "provavelmente", "se possível"), termos abertos sem definição, casos de borda ausentes — e pergunta ao usuário até cinco perguntas ranqueadas.

Cada pergunta é múltipla escolha ou resposta curta, nunca aberta. O usuário responde o que conseguir; Doubt atualiza o requirements in-place, removendo marcadores resolvidos e escrevendo as respostas na seção `## Esclarecimentos`.

---

## O que lê

- `aegis/config/state.json` — `output_folder`, `forward_folder`
- `aegis/config/active-requirements.json` — feature ativa
- `<feature-dir>/requirements.md` — documento a esclarecer
- `aegis/runtime/hooks.yml` — ganchos `before-doubt` e `after-doubt`

---

## O que produz

| Arquivo | Conteúdo |
|---------|----------|
| `<feature-dir>/requirements.md` | Atualizado in-place com seção `## Esclarecimentos` e marcadores resolvidos removidos |

---

## Quando usar

Depois de `/aegis-requirements` (ou `/aegis-tech-brief`), quando o requirements ainda tem ambiguidades abertas que o planner tropeçaria.

```
/aegis-doubt
```

Invocação manual. Sugere `/aegis-doubt` de novo se sobrarem perguntas, ou `/aegis-plan` quando limpo.
