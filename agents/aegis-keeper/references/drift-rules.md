# Regras de detecção e classificação de drift

Drift = divergência entre o que a spec descreve e o que o código realmente faz.

Use este guia ao processar mudanças no modo `after` para decidir como atualizar a spec e como reclassificar a confiança das afirmações.

---

## Categorias de drift

### 1. Drift trivial — atualização direta da spec

Mudança no código que **substitui** comportamento descrito sem mudar contrato:

- Refatoração interna (mesmo input/output, lógica diferente)
- Renomeação de variável local / função privada
- Otimização de performance sem mudança de comportamento
- Correção de bug que alinha o código com o que a spec já dizia

**Ação:** atualize a spec mantendo a confiança original (🟢 segue 🟢). Se a spec descrevia o comportamento errado anterior, atualize sem downgrade.

### 2. Drift incremental — adição

Código novo adiciona comportamento que a spec não cobre:

- Nova função / método / endpoint
- Novo branch lógico (if/else, novo case)
- Nova validação / guard clause

**Ação:** adicione seção nova na spec descrevendo o comportamento. Marque como 🟢 se evidência direta no diff, 🟡 se inferido de contexto.

### 3. Drift estrutural — quebra de contrato

Mudança que viola o que a spec descrevia como invariante:

- Assinatura de função mudou (parâmetros adicionados/removidos/reordenados)
- Tipo de retorno mudou
- Comportamento documentado como 🟢 não é mais verdade
- Status code de API mudou

**Ação:**
1. Atualize a spec com o novo contrato
2. Mantenha 🟢 se a evidência continua direta
3. Adicione nota de "breaking change" referenciando o changelog: `> ⚠️ Breaking change em YYYY-MM-DD HH:MM — ver changelog`
4. Force questão sobre quebra de compatibilidade na pergunta #2 do modo after

### 4. Drift semântico — código diverge de regra de negócio

Código viola regra documentada em `_reversa_sdd/domain.md`:

- Validação de regra de negócio removida ou afrouxada
- Estado permitido que não deveria ser (state machine quebrada)
- Cálculo financeiro / fiscal / regulatório alterado

**Ação:**
1. **Não atualize a regra silenciosamente.** Pergunte ao usuário: "A regra de negócio em `domain.md` mudou intencionalmente, ou o código está com bug?"
2. Se intencional: atualize `domain.md` + spec, marque entrada de changelog com `**Impacto:** Mudança de regra de negócio — revisar com stakeholders`
3. Se bug: NÃO atualize a spec. Adicione entrada em `_reversa_sdd/drift.md` como `pending` com `suggested_action: "Reverter mudança ou alinhar regra"`

### 5. Drift por deleção

Código removido que tinha spec:

- Função / endpoint / módulo deletado

**Ação:**
1. Marque a seção da spec como `~~deprecated~~` em vez de deletar
2. Adicione nota: `> Removido em YYYY-MM-DD — ver changelog`
3. Em `code-spec-matrix.md`, riscar a linha do arquivo

---

## Reclassificação de confiança após drift

Use as regras de `agents/aegis-reviewer/references/confidence-rules.md` como base. Adições específicas para o Keeper:

### Pós-mudança — quando manter 🟢

- O diff confirma diretamente a nova afirmação (linha visível, lógica clara)
- Teste automatizado novo cobre o comportamento

### Pós-mudança — quando rebaixar 🟢 → 🟡

- Mudança parcial — uma parte do contrato confirmada pelo diff, outra inferida
- Spec descreve módulo grande, diff só toca uma fatia
- Comentário no diff sugere comportamento mas código não está totalmente visível

### Pós-mudança — quando criar 🔴 novo

- Diff remove implementação mas spec ainda referencia funcionalidade
- Diff cita configuração externa (env var, feature flag) que não dá pra inspecionar
- Mudança contradiz state machine sem caminho de transição claro

---

## Quando NÃO atualizar a spec

- Mudança em arquivo de teste apenas (não afeta contrato — registre no changelog mas não toque spec)
- Mudança em comentário / formatação / lint
- Mudança em arquivo de build / CI / config sem impacto em runtime
- Mudança em dependência sem impacto observável (atualização patch interna)

Para esses casos: registre entrada de changelog mas com `**Specs afetadas:** Nenhuma — alteração interna sem impacto em contrato`.

---

## Sinais de alerta — escalar pro Reviewer ou Archaeologist

Se durante o modo `after` você encontrar:

- Mudança que afeta **>5 specs** ao mesmo tempo → sugira rodar `/aegis-reviewer` depois
- Refatoração arquitetural (move múltiplos módulos) → sugira rodar `/aegis-archaeologist` no(s) módulo(s) afetado(s)
- Mudança em entry point ou DI container → sugira `/aegis-architect`
- Mudança em schema de banco → sugira `/aegis-data-master`

Adicione essas sugestões na mensagem final ao usuário.

---

## Severidade por blast radius (v1.8.0+)

Quando o graph L0 (`.reversa/context/graph.json`) está disponível, classifique a severidade de cada drift pela contagem de **reverse-deps diretas** do arquivo modificado:

| Reverse-deps diretas | Severidade | Ação |
|---|---|---|
| 0-1 | `LOW` | Atualizar spec normalmente; sem alerta |
| 2-4 | `MEDIUM` | Atualizar spec; mencionar blast radius no changelog |
| **5+** | **`HIGH`** | Atualizar spec; **sugerir `/aegis-reviewer`** + listar arquivos afetados em `drift.md` (campo `blast_radius`) |

Comandos de referência:

```bash
npx reversa graph reverse-deps <arquivo> --json    # 1 nível (severity)
npx reversa graph impact <arquivo> --json          # transitivo BFS (blast_radius)
```

A severidade vai para o campo `severity` no `drift.md`. Os arquivos afetados (top 20) vão para `blast_radius`. Acima de 20, anotar `+N more`.

> **Por quê 5:** abaixo disso, mudanças costumam ser refatorações localizadas. A partir de 5 reverse-deps, o risco de propagação cresce não-linearmente — cada arquivo afetado pode ter seus próprios reverse-deps.

Se o graph não existir, sugira ao usuário rodar `npx reversa graph build` antes do próximo `/aegis-keeper after`. Modo degradado: classifique tudo como `MEDIUM` por padrão.
