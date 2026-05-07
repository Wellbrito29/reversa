# Passo 2 — Retomada de sessão

## 1. Leitura do estado

Leia `aegis/config/state.json` e `aegis/plan.md`.

## 2. Verificação de versão

Compare `aegis/config/version` com o npm registry. Se houver versão mais nova, informe discretamente:
> "💡 Nova versão disponível. Execute `npx aegis-spec update` quando quiser atualizar."

## 3. Saudação

Diga: "[Nome], bem-vindo de volta ao Aegis Spec! 🎼"

## 4. Resumo de progresso

### 4.1 Leitura do session summary (compressão de contexto)

Antes de apresentar o resumo, verifique se existe algum session summary em `aegis/runtime/session-summaries/`:

1. Liste os arquivos em `aegis/runtime/session-summaries/`
2. Se houver arquivos, leia o **mais recente** (ordene por timestamp no nome do arquivo)
3. Use o conteúdo do session summary como base para o resumo de progresso

O session summary contém as descobertas e decisões principais, permitindo uma retomada eficiente sem carregar todo o histórico da sessão anterior.

### 4.2 Apresentação do progresso

Mostre:
- ✅ Fases concluídas (campo `completed` do state.json)
- 🔄 Fase atual (campo `phase`) com a última tarefa registrada em `checkpoints`
- ⏳ Próximas fases (campo `pending`)
- 📄 **Resumo da última sessão** (do session summary mais recente, se existir)

Exemplo:
> "Progresso atual:
> ✅ Reconhecimento concluído
> 🔄 Escavação em andamento — módulos `auth` e `orders` analisados, `payments` e `users` pendentes
> ⏳ Interpretação, Geração, Revisão
>
> 📄 **Resumo da última sessão** (Scout, 07/05 14:30):
> - 12 módulos identificados em arquitetura monolito Next.js + PostgreSQL
> - Stack principal: Next.js 14, TypeScript 5, Prisma
> - Decisões: doc_level=completo, organização=por módulo"

## 5. Modo de resposta a lacunas

Se `answer_mode` for `"file"`:
> "Lembre-se: suas respostas às perguntas devem ser preenchidas em `aegis/reports/questions.md`. Me avise quando terminar."

Se `answer_mode` for `"chat"` (padrão):
> Continue normalmente — farei as perguntas aqui no chat.

## 6. Confirmação

Pergunte apenas: "Continuamos de onde paramos? (CONTINUAR para seguir)"

Após confirmação, retome a próxima tarefa pendente no plano (`aegis/plan.md`).

**🚫 Não ofereça `/clear` + `/aegis` neste momento.** O usuário acabou de retomar a sessão; pedir para limpar e reabrir agora é redundante. O prompt de pausa entre etapas (descrito em `SKILL.md`, seção "Checkpoint preventivo entre etapas") só vale **depois** que um agente concluir trabalho dentro desta sessão, nunca na própria saudação de retomada.

Consulte `references/checkpoint-guide.md` para as regras de escrita no state.json.
