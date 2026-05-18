#!/bin/bash
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FIXTURE="$REPO_ROOT/test/fixtures/smoke-minimal"
cd "$FIXTURE"

echo "==> Cleaning aegis/ if exists"
rm -rf aegis .aegis 2>/dev/null || true

echo "==> Running aegis install"
node "$REPO_ROOT/bin/aegis.js" install --non-interactive --cwd "$PWD" <<ANSWERS
test-project
Wellington
pt-br
Português
chat
completo
por módulo
aegis
ANSWERS

echo "==> Validating install artifacts"
test -d aegis || { echo "FAIL: aegis/ not created"; exit 1; }
test -f aegis/config/state.json || { echo "FAIL: state.json missing"; exit 1; }
test -f aegis/config/setup.json || { echo "FAIL: setup.json missing"; exit 1; }

echo "==> Checking state.json phase"
PHASE=$(node -pe "JSON.parse(require('fs').readFileSync('aegis/config/state.json')).phase")
test "$PHASE" = "null" || { echo "FAIL: phase not null after install, got $PHASE"; exit 1; }

echo "==> SUCCESS"
