#!/usr/bin/env bash
# The one command that counts as evidence. Both agents run this.
# Order of preference:
#   1. scripts/verify.local.sh  (your own commands, create it when the stack exists)
#   2. `make verify`            (if the Makefile has a verify target)
#   3. light autodetect         (npm, pytest, cargo, go)
# Writes the result to harness/.last-verify (gitignored) and exits nonzero on failure.
set -u
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

status=0
ran=0

run() {
  echo "==> $*"
  ran=1
  "$@" || status=1
}

if [ -x scripts/verify.local.sh ]; then
  run scripts/verify.local.sh
elif [ -f Makefile ] && grep -qE '^verify:' Makefile; then
  run make verify
else
  if [ -f package.json ]; then
    if grep -q '"lint"' package.json; then run npm run lint --silent; fi
    if grep -q '"typecheck"' package.json; then run npm run typecheck --silent; fi
    if grep -q '"test"' package.json; then run npm test --silent; fi
  fi
  if [ -f pyproject.toml ] || [ -f pytest.ini ] || [ -d tests ]; then
    if command -v pytest >/dev/null 2>&1; then run pytest -q; fi
  fi
  if [ -f Cargo.toml ]; then run cargo test --quiet; fi
  if [ -f go.mod ]; then run go test ./...; fi
fi

if [ "$ran" -eq 0 ]; then
  echo "verify.sh: no checks configured yet."
  echo "Create scripts/verify.local.sh (or a Makefile verify target) with your real commands."
  status=2
fi

mkdir -p harness
{
  echo "time: $(date '+%Y-%m-%d %H:%M %Z')"
  echo "commit: $(git rev-parse --short HEAD 2>/dev/null || echo none)"
  case "$status" in
    0) echo "result: PASS" ;;
    2) echo "result: NOT CONFIGURED" ;;
    *) echo "result: FAIL" ;;
  esac
} > harness/.last-verify

echo "--- $(sed -n 's/^result: //p' harness/.last-verify)"
exit "$status"
