# Principles

**Comando:** `/aegis-principles`
**Fase:** Forward — fora do ciclo, roda a qualquer hora
**Status:** Opcional, raro

---

## 📜 O guardião dos princípios

Cria ou atualiza os princípios duradouros do projeto e propaga sugestões de ajuste para templates dependentes. Princípios são raros, mudam pouco e influenciam todos os outros artefatos.

Esse skill **não** faz parte do pipeline `requirements → plan → to-do → coding`. Roda sozinho, mesmo antes da primeira feature.

---

## O que faz

O Principles é a camada lenta do projeto. Captura regras que devem se manter em todas as features — invariantes de estilo de código, restrições arquiteturais, baseline de segurança, convenções de nomenclatura, políticas de deploy. Quando um princípio é adicionado, mudado ou aposentado, o skill sugere onde templates dependentes (requirements, roadmap, actions) precisam se alinhar.

Cadência típica: menos de uma vez por mês.

---

## O que lê

- `aegis/config/state.json` — `output_folder`, `forward_folder`
- `aegis/config/principles.md` — princípios atuais (cria se faltar)
- `aegis/runtime/hooks.yml` — ganchos `before-principles` e `after-principles`

---

## O que produz

| Arquivo | Conteúdo |
|---------|----------|
| `aegis/config/principles.md` | Princípios duradouros do projeto, versionados e append-only |
| Lista de sugestões | Templates e features ativas que podem precisar se alinhar ao princípio novo/alterado |

---

## Quando usar

- Antes da primeira feature, pra plantar princípios fundamentais
- Quando o time concorda em nova regra arquitetural
- Ao aposentar ou revisar princípio existente

```
/aegis-principles
```

Invocação manual. Standalone — não encadeia no ciclo forward.
