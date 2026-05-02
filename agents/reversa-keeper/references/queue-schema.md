# Schema do `.reversa/keeper-queue.jsonl`

Arquivo de comunicação entre os hooks de engine e o agente Keeper. **Formato JSONL** (uma entrada JSON por linha) — append-only, atomic em filesystems POSIX.

- **Hooks escrevem** uma linha por evento de edição (modo append)
- **Keeper lê** todas as linhas no modo `after`, deduplica por arquivo, processa e limpa o arquivo

Modo manual (sem hooks instalados): este arquivo pode não existir. Keeper usa `git diff HEAD` como fonte alternativa.

> **Histórico:** versões anteriores (≤ v1.6) usavam `.reversa/keeper-queue.json` como snapshot único com locking. Trocado em v1.7 por JSONL append-only para reduzir overhead dos hooks de ~150-300ms por edit para ~10ms.

---

## Schema (uma linha JSON por entrada)

```jsonl
{"id":"uuid","ts":"2026-05-01T15:40:12.000Z","phase":"post","engine":"claude-code","tool":"Edit","files":["src/auth/login.js"]}
{"id":"uuid","ts":"2026-05-01T15:40:18.000Z","phase":"post","engine":"claude-code","tool":"Edit","files":["src/auth/mfa.js"]}
{"id":"uuid","ts":"2026-05-01T15:42:00.000Z","phase":"stop","engine":"claude-code","tool":"unknown","files":[]}
```

---

## Campos

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | string (UUID v4) | sim | Identificador único da entrada |
| `ts` | string ISO 8601 (UTC) | sim | Momento do evento |
| `phase` | `"post"` ou `"stop"` | sim | `post` = após edit; `stop` = fim de sessão (advisory only) |
| `engine` | string | sim | `claude-code` / `cursor` / `kimi-cli` / `codex` / `opencode` |
| `tool` | string | sim | Nome do tool/evento (`Edit`, `Write`, `MultiEdit`, `apply_patch`, `afterFileEdit`, etc.) |
| `files` | array de string | sim | Caminhos relativos ao project root. Vazio em entradas `phase: "stop"` |

> **Removido em v1.7+:**
> - `phase: "pre"` — pre-hooks foram retirados na Fase 1 do roadmap (oneravam o sistema). Retornam na Fase 4 com policy gate, mas via canal separado (não pela queue).
> - `diff_summary`, `affected_specs` — Keeper agora deriva ambos no batch end-of-task, não pelo hook.

---

## Concorrência

Append-only JSONL é seguro sem lockfile:

- Writes < `PIPE_BUF` (~4KB no Linux, 512B mínimo POSIX) são atomic
- Cada linha cabe folgada (~150 bytes média)
- Múltiplos processos podem escrever em paralelo sem corrupção

Hooks **não** precisam adquirir lock. Apenas `appendFileSync` direto.

Keeper, ao consumir, lê o arquivo inteiro, processa, depois trunca/deleta. Pode haver race com hooks ainda escrevendo durante o processamento — solução: rename `keeper-queue.jsonl` → `keeper-queue.processing.jsonl` (atomic), processa, deleta.

---

## Limpeza pelo Keeper

Após processar todas as entradas no modo `after`:

1. Rename `keeper-queue.jsonl` → `keeper-queue.processing.jsonl` (atomic)
2. Ler todas linhas do arquivo `processing`
3. Deduplicar por `files` (último entry por arquivo ganha)
4. Processar (atualizar specs, drift.md, changelog)
5. Deletar `keeper-processing.jsonl`
6. Salvar timestamp em `.reversa/state.json.checkpoints.keeper.last_run`

Se houver erro: deixar `processing.jsonl` no lugar e logar em `.reversa/keeper-errors.log`. Próxima invocação retoma.

---

## Deduplicação

Mesmo arquivo editado N vezes durante uma task → N linhas na queue. Keeper deduplica:

```js
const lastByFile = new Map();
for (const line of lines) {
  const entry = JSON.parse(line);
  if (entry.phase !== 'post') continue;
  for (const file of entry.files) lastByFile.set(file, entry);
}
const uniqueFiles = Array.from(lastByFile.keys());
```

Resultado: lista única de arquivos modificados, com timestamp do último edit.

---

## Limites operacionais

- Sem limite hard de tamanho — JSONL append é cheap. Tipicamente <1000 entradas em sessões longas.
- Entradas com `ts` > 30 dias podem ser purgadas pelo Keeper (assume usuário esqueceu).

---

## Exemplo realista (sessão de 5 edits + stop)

```jsonl
{"id":"9f8e7d6c-5b4a-4321-9876-543210fedcba","ts":"2026-05-01T20:25:14.123Z","phase":"post","engine":"claude-code","tool":"Edit","files":["lib/auth/login.js"]}
{"id":"8e7d6c5b-4a39-4210-8765-43210fedcba9","ts":"2026-05-01T20:25:18.456Z","phase":"post","engine":"claude-code","tool":"Edit","files":["lib/auth/login.js"]}
{"id":"7d6c5b4a-3928-4109-7654-3210fedcba98","ts":"2026-05-01T20:26:02.789Z","phase":"post","engine":"claude-code","tool":"Write","files":["lib/middleware/rate-limit.js"]}
{"id":"6c5b4a39-2817-4098-6543-210fedcba987","ts":"2026-05-01T20:27:15.012Z","phase":"post","engine":"claude-code","tool":"Edit","files":["lib/auth/login.js","lib/auth/handler.js"]}
{"id":"5b4a3928-1706-4987-5432-10fedcba9876","ts":"2026-05-01T20:30:00.000Z","phase":"stop","engine":"claude-code","tool":"unknown","files":[]}
```

Keeper deduplica → lista final: `["lib/auth/login.js", "lib/middleware/rate-limit.js", "lib/auth/handler.js"]` (3 arquivos únicos).
