# Coding

**Comando:** `/aegis-coding`
**Fase:** Forward — último skill do ciclo
**Status:** Obrigatório para executar a feature

---

## ⌨️ O executor

Anda no `actions.md` e transforma cada checkbox aberto em código real, fase por fase, respeitando paralelismo e dependências. Ao terminar, deixa dois rastros de auditoria: `legacy-impact.md` (o que mudou no legado) e `regression-watch.md` (o que precisa continuar verdadeiro nas próximas extrações).

---

## O que faz

O Coding lê a lista de ações e executa cada item de cima pra baixo: edita arquivos, roda comandos, cria módulos novos, atualiza testes. Marca cada ação concluída `[X]` e anexa um registro JSONL de progresso.

O skill respeita os marcadores de execução paralela do To-Do — ações independentes podem rodar em batch, dependentes rodam em ordem. Após execução, produz dois artefatos de auditoria que extrações futuras e o Keeper consomem.

---

## O que lê

- `aegis/config/state.json` — `output_folder`, `forward_folder`
- `aegis/config/active-requirements.json` — feature ativa
- `<feature-dir>/actions.md` — a lista executável
- `<feature-dir>/roadmap.md`, `data-delta.md`, `interfaces.md` — contexto pra execução
- `aegis/runtime/hooks.yml` — ganchos `before-coding` e `after-coding`

---

## O que produz

| Arquivo | Conteúdo |
|---------|----------|
| `<feature-dir>/actions.md` | Atualizado in-place — checkboxes viram `[X]` conforme ações completam |
| `<feature-dir>/progress.jsonl` | Log append-only de cada ação executada (timestamp, ID, status) |
| `<feature-dir>/legacy-impact.md` | O que mudou no código legado (arquivos, módulos, contratos) |
| `<feature-dir>/regression-watch.md` | Invariantes que devem se manter em extrações futuras (input do Keeper) |

Mais, claro, todas as mudanças de código que as ações descrevem.

---

## Quando usar

Depois do `/aegis-to-do` produzir `actions.md`. Opcionalmente depois de `/aegis-audit` e/ou `/aegis-quality` se quiser passe de revisão.

```
/aegis-coding
```

Invocação manual. Anda na lista de ações e só para pra perguntar quando explicitamente exigido por uma ação.
