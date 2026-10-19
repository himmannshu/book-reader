#!/usr/bin/env bash
# Real checks for this repo. scripts/verify.sh runs this file when it is executable.
# Order: cheap static checks first, browser tests last. Stops at the first failure.
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

if [ ! -d node_modules ]; then
  echo "verify.local.sh: node_modules is missing."
  echo "Run: npm ci && npx playwright install chromium webkit"
  exit 1
fi

step() {
  echo "==> $1"
  shift
  "$@"
}

step "lint" npm run --silent lint
step "format check" npm run --silent format:check
step "typecheck" npm run --silent typecheck
step "unit tests" npm run --silent test:unit
step "browser tests (chromium, webkit)" npm run --silent test:e2e
step "performance budgets (chromium, webkit)" npm run --silent test:perf
