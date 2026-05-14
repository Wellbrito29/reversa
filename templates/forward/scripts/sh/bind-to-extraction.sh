#!/usr/bin/env bash
#
# bind-to-extraction.sh
# Helper que lê aegis/ e devolve um JSON com as fontes canônicas que os skills forward devem consultar como contexto.
# Diferencial AEGIS: skills forward jamais partem do zero, sempre amarram raciocínio nos artefatos da pipeline de extração.
#
# Uso:
#   bind-to-extraction.sh [--json] [--for <comando>]
#
# Argumentos:
#   --for requirements   Lista architecture, domain, inventory, principles
#   --for plan           Lista architecture, c4-context, state-machines, dependencies, code-analysis, principles
#   --for to-do          Lista architecture, code-analysis
#   --for audit          Lista architecture, domain
#   --for coding         Lista architecture, domain, code-analysis (para gerar legacy-impact)
#   sem --for            Lista todos os arquivos canônicos em aegis/
#
# Códigos de saída:
#   0 = sucesso
#   1 = aegis/ ausente
#   2 = uso inválido

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
AEGIS_DIR="$PROJECT_ROOT/aegis"

JSON_MODE=0
TARGET=""

while [ $# -gt 0 ]; do
  case "$1" in
    --json) JSON_MODE=1; shift ;;
    --for) shift; TARGET="${1:-}"; shift ;;
    *) echo "uso invalido: $1" >&2; exit 2 ;;
  esac
done

if [ ! -d "$AEGIS_DIR" ]; then
  echo "erro: $AEGIS_DIR nao existe. rode a pipeline de extração antes." >&2
  exit 1
fi

declare -a wanted

case "$TARGET" in
  requirements) wanted=("architecture/architecture.md" "reports/domain.md" "reports/inventory.md") ;;
  plan)         wanted=("architecture/architecture.md" "architecture/c4-context.md" "reports/state-machines.md" "reports/dependencies.md" "reports/code-analysis.md") ;;
  to-do|todo)   wanted=("architecture/architecture.md" "reports/code-analysis.md") ;;
  audit)        wanted=("architecture/architecture.md" "reports/domain.md") ;;
  coding)       wanted=("architecture/architecture.md" "reports/domain.md" "reports/code-analysis.md") ;;
  *)            wanted=("architecture/architecture.md" "architecture/c4-context.md" "reports/code-analysis.md" "reports/confidence-report.md" "reports/dependencies.md" "reports/domain.md" "reports/inventory.md" "reports/questions.md" "reports/state-machines.md") ;;
esac

declare -a present
declare -a absent

for f in "${wanted[@]}"; do
  if [ -f "$AEGIS_DIR/$f" ]; then
    present+=("$f")
  else
    absent+=("$f")
  fi
done

emit_json() {
  printf '{'
  printf '"aegis-dir":"%s",' "$AEGIS_DIR"
  printf '"target":"%s",' "$TARGET"
  printf '"present":['
  local first=1
  for f in "${present[@]:-}"; do
    [ -z "$f" ] && continue
    if [ $first -eq 1 ]; then first=0; else printf ','; fi
    printf '"%s/%s"' "$AEGIS_DIR" "$f"
  done
  printf '],'
  printf '"absent":['
  first=1
  for f in "${absent[@]:-}"; do
    [ -z "$f" ] && continue
    if [ $first -eq 1 ]; then first=0; else printf ','; fi
    printf '"%s"' "$f"
  done
  printf ']'
  printf '}\n'
}

if [ $JSON_MODE -eq 1 ]; then
  emit_json
else
  echo "presentes:"
  for f in "${present[@]:-}"; do
    [ -n "$f" ] && echo "  $AEGIS_DIR/$f"
  done
  echo "ausentes:"
  for f in "${absent[@]:-}"; do
    [ -n "$f" ] && echo "  $f"
  done
fi

exit 0
