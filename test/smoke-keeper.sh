#!/bin/bash
set -e

echo "==> Smoke test: keeper literal-extractor + spec-resolver"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# T10 literal-extractor
echo "  [T10] literal-extractor extracts stale literals"
node --test test/unit/auto/literal-extractor.test.js 2>&1 | grep -q "pass 10" || { echo "FAIL T10"; exit 1; }

# T11 spec-resolver
echo "  [T11] spec-resolver uses graph fallback"
node --test test/unit/auto/spec-resolver.test.js 2>&1 | grep -q "pass 6" || { echo "FAIL T11"; exit 1; }

# T12 deleted-ref-cleaner
echo "  [T12] deleted-ref-cleaner finds stale refs"
node --test test/unit/auto/deleted-ref-cleaner.test.js 2>&1 | grep -q "pass 5" || { echo "FAIL T12"; exit 1; }

echo "==> SUCCESS: all keeper enhancements pass"
