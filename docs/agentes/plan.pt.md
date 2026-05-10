# Plan

**Comando:** `/aegis-plan`
**Fase:** Forward — terceiro skill do ciclo
**Status:** Obrigatório para avançar pra coding

---

## 🏗️ O arquiteto de evolução

Traduz o `requirements.md` da feature ativa numa proposta técnica concreta expressa como delta sobre o legado existente. Gera roadmap, notas de investigação, delta de dados, guia de onboarding e specs de interfaces que o To-Do vai decompor em ações.

---

## O que faz

O Plan lê o requirements (e qualquer esclarecimento do `/aegis-doubt`) e produz um design técnico multi-arquivo focado no que muda — não uma redescrição completa do legado. Saída foca em delta arquitetural, delta de dados, delta de contratos, plano de migração, riscos e definição de pronto.

Se sobrarem marcadores `[DÚVIDA]` não resolvidos, Plan pergunta ao usuário se quer prosseguir (transformando cada marcador em premissa explícita com aviso visível) ou voltar pro `/aegis-doubt`.

---

## O que lê

- `aegis/config/state.json` — `output_folder`, `forward_folder`
- `aegis/config/active-requirements.json` — feature ativa
- `<feature-dir>/requirements.md` — requirements de origem
- `<feature-dir>/tech-brief.md` — se existir, brief técnico do tech lead
- `aegis/runtime/hooks.yml` — ganchos `before-plan` e `after-plan`
- `aegis/architecture/*.md`, `aegis/specs/sdd/<unit>/*.md` — contexto do legado

---

## O que produz

| Arquivo | Conteúdo |
|---------|----------|
| `<feature-dir>/roadmap.md` | Resumo da abordagem, princípios aplicados, decisões técnicas, deltas arquitetural/dados/contratos, plano de migração, riscos, critério de pronto |
| `<feature-dir>/investigation.md` | Pesquisa de fundo, alternativas avaliadas, links para fontes externas, padrões aplicáveis |
| `<feature-dir>/data-delta.md` | Diff conceitual sobre o modelo extraído — novos campos, campos removidos, migrações necessárias |
| `<feature-dir>/onboarding.md` | Passo a passo executável para humano testar a feature pela primeira vez |
| `<feature-dir>/interfaces.md` | Contratos que vão mudar |

---

## Quando usar

```
/aegis-plan
```

Invocação manual. Sugere `/aegis-to-do` (ou `/aegis-audit` se confiança baixa).
