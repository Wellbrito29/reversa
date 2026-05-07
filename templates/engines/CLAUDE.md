# Aegis Spec

> Framework de Engenharia Aegis Spec instalado neste projeto.

## Como usar

Digite `/aegis` para ativar o Aegis Spec e iniciar ou retomar a análise do projeto.

## Comportamento ao ativar

Quando o usuário digitar `/aegis` ou a palavra `aegis` sozinha em uma mensagem:

1. Ative o skill `aegis` disponível em `aegis/skills/aegis/SKILL.md`
2. Se não encontrar em `aegis/skills/`, tente `aegis/skills/aegis/SKILL.md`
3. Leia o SKILL.md na íntegra e siga exatamente as instruções do Aegis Spec

## Regra não-negociável

Nunca apague, modifique ou sobrescreva arquivos pré-existentes do projeto legado.
O Aegis Spec escreve **apenas** em `aegis/` e `aegis/`.
