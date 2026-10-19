#!/usr/bin/env bash
# Prints a snapshot of repo state for the next agent.
#   scripts/handoff.sh          full snapshot to stdout
#   scripts/handoff.sh --brief  short version (used by the Claude Code SessionStart hook)
#   scripts/handoff.sh --write  refresh the AUTO block inside harness/HANDOFF.md
set -u
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

mode="${1:-}"

snapshot() {
  echo "Snapshot $(date '+%Y-%m-%d %H:%M %Z')"
  echo "- Branch: $(git branch --show-current 2>/dev/null || echo unknown)"
  echo "- HEAD: $(git log -1 --format='%h %s' 2>/dev/null || echo 'no commits')"
  dirty=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  echo "- Uncommitted files: ${dirty}"
  if [ -f harness/.last-verify ]; then
    echo "- Last verify: $(sed -n 's/^result: //p' harness/.last-verify) at $(sed -n 's/^time: //p' harness/.last-verify) (commit $(sed -n 's/^commit: //p' harness/.last-verify))"
  else
    echo "- Last verify: never run in this checkout"
  fi
  echo "- Recent commits:"
  git log --oneline -5 2>/dev/null | sed 's/^/    /'
  if [ "$dirty" != "0" ]; then
    echo "- Changed files:"
    git status --short 2>/dev/null | head -15 | sed 's/^/    /'
  fi
}

case "$mode" in
  --brief)
    echo "Agent harness: read harness/HANDOFF.md first, then follow AGENTS.md session start."
    snapshot
    ;;
  --write)
    f=harness/HANDOFF.md
    if [ ! -f "$f" ]; then echo "missing $f" >&2; exit 1; fi
    if ! grep -q 'AUTO:BEGIN' "$f" || ! grep -q 'AUTO:END' "$f"; then
      echo "$f has no AUTO:BEGIN / AUTO:END markers" >&2; exit 1
    fi
    tmp="$(mktemp)"
    snapshot > "$tmp"
    awk -v snap="$tmp" '
      /<!-- AUTO:BEGIN -->/ { print; while ((getline line < snap) > 0) print line; skip=1; next }
      /<!-- AUTO:END -->/   { skip=0 }
      !skip { print }
    ' "$f" > "$f.new" && mv "$f.new" "$f"
    rm -f "$tmp"
    echo "updated AUTO block in $f"
    ;;
  *)
    snapshot
    ;;
esac
