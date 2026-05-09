# CLI

O Aegis Spec tem um CLI simples para gerenciar a instalação e o ciclo de vida dos agentes no seu projeto. Todos os comandos rodam com `npx aegis-spec` na raiz do projeto.

---

## Comandos disponíveis

### `install`

```bash
npx aegis-spec install
```

Instala o Aegis Spec no projeto legado atual. Detecta as engines presentes, pergunta suas preferências e cria toda a estrutura necessária.

Use uma vez, na raiz do projeto que você quer analisar.

---

### `status`

```bash
npx aegis-spec status
```

Mostra o estado atual da análise: qual fase está em andamento, quais agentes já rodaram, o que falta completar.

Útil para ter uma visão geral rápida antes de retomar uma sessão.

---

### `update`

```bash
npx aegis-spec update
```

Atualiza os agentes para a versão mais recente do Aegis Spec.

O comando é inteligente: ele verifica o manifesto SHA-256 de cada arquivo e nunca sobrescreve arquivos que você personalizou. Se você fez ajustes em algum agente, eles ficam intactos.

---

### `add-agent`

```bash
npx aegis-spec add-agent
```

Adiciona um agente específico ao projeto. Útil se você não instalou todos os agentes na instalação inicial e agora quer incluir, por exemplo, o Data Master ou o Design System.

---

### `add-engine`

```bash
npx aegis-spec add-engine
```

Adiciona suporte a uma engine de IA que não estava presente quando você instalou. Por exemplo: instalou só para Claude Code e agora quer adicionar Codex também.

---

### `uninstall`

```bash
npx aegis-spec uninstall
```

Remove o Aegis Spec do projeto: apaga os arquivos criados pela instalação (`aegis/`, `aegis/skills/aegis-*/`, os arquivos de entrada das engines).

!!! info "Seus arquivos continuam intactos"
    O `uninstall` remove **apenas** o que o Aegis Spec criou. Nenhum arquivo original do projeto é tocado. As especificações geradas em `aegis/` também são preservadas por padrão. Hooks instalados via `add-hooks` também são removidos.

---

### `add-hooks`

```bash
npx aegis-spec add-hooks --engine claude-code
```

Instala hooks do Keeper na config da engine pra ele rodar automaticamente após cada edição. Mostra preview, pede confirmação, escreve.

Engines suportadas: `claude-code`, `cursor`, `kimi-cli`, `codex`, `opencode`. Veja [Hooks](hooks.pt.md) pra referência completa.

---

### `remove-hooks`

```bash
npx aegis-spec remove-hooks --engine claude-code
npx aegis-spec remove-hooks --all
```

Remove os hooks do Keeper da config da engine. Outros hooks que você adicionou manualmente são preservados.

---

### `drift-check`

```bash
npx aegis-spec drift-check
npx aegis-spec drift-check --severity medium --format json
```

CI gate. Lê `aegis/reports/drift.md` e exit 1 se houver specs pendentes no severity escolhido. Engine-agnostic — não carrega código de agente. Veja [drift-check](drift-check.pt.md) pra referência completa.
