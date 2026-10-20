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

# VERIFY_BROWSER=chromium|webkit runs the browser checks for one engine only (CI runs the two in
# parallel jobs; the static checks and unit tests run in the chromium job). Unset: everything.
browser="${VERIFY_BROWSER:-}"
case "$browser" in
  "" | chromium | webkit) ;;
  *)
    echo "verify.local.sh: VERIFY_BROWSER must be chromium or webkit, not '$browser'."
    exit 1
    ;;
esac
engines="${browser:-chromium, webkit}"
only() { if [ -n "$browser" ]; then echo "--project=$1$browser"; fi; }

if [ "$browser" != webkit ]; then
  step "lint" npm run --silent lint
  step "format check" npm run --silent format:check
  step "typecheck" npm run --silent typecheck
  step "unit tests" npm run --silent test:unit
fi
# shellcheck disable=SC2046 # `only` prints one word or nothing.
step "browser tests ($engines)" npx playwright test $(only '')
# shellcheck disable=SC2046
step "sync tests, two devices ($engines)" npx playwright test -c playwright.sync.config.ts $(only sync-)
perf() {
  local status=0
  # shellcheck disable=SC2046
  npx playwright test -c playwright.perf.config.ts $(only perf-) || status=$?
  node scripts/perf-report.mjs
  return "$status"
}
step "performance budgets ($engines)" perf
