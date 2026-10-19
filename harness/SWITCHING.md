# Switching between Claude Code and Codex

Both agents read AGENTS.md and the same harness files, so a switch is just a handoff.
The key idea: all state lives in git and in harness/, never in either tool's chat history.

## Switching out (you are about to hit a limit, or want to change agents)

- Claude Code: run `/handoff`
- Codex: say "Follow harness/prompts/04-handoff.md"

Check that `git status` is clean afterwards.

## Switching in

- Claude Code: `/start-session`, then `/run-phase NN` when you are ready
- Codex: say "Follow harness/prompts/00-orient.md", then
  "Follow harness/prompts/02-run-phase.md for phase NN"

## If you got cut off with no warning

This will happen. The next agent should:

1. Run orient (it reads HANDOFF.md, the log, git state, and runs verify).
2. Treat uncommitted changes as unverified. If verify is green, commit them as `wip:`.
   If verify is red, look at `git diff` and decide whether to keep or discard.
3. Rebuild the missing context from `git log` and the build log, then update HANDOFF.md.

Frequent small commits and a fresh HANDOFF.md are what make this painless.

## Review across agents

Have the agent that did not write the phase review it (prompt 03). A different model is a
better skeptic than the author, and this also spreads usage across both plans.
Use full reviews only for risky phases.

## Practical notes

- Never run both agents on the same working tree at once. If you want parallel work, use
  `git worktree add ../proj-phase-NN phase-NN-<slug>` and give each agent its own tree.
- Put agent-neutral rules in AGENTS.md. Put tool-specific tips in CLAUDE.md only.
- Each agent has its own approval and sandbox settings. Configure Codex's separately in its
  own config. The rules in AGENTS.md apply to both regardless.
- Revisit the harness every so often. If a component (like a full review) no longer catches
  anything, remove it. Add complexity only where you see real failures.
