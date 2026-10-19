@AGENTS.md

# Claude Code specifics

Everything shared lives in AGENTS.md. Only add things here that apply to Claude Code alone.

- Slash commands (in .claude/commands/): `/start-session`, `/run-phase NN`, `/verify`,
  `/evaluate NN`, `/handoff`. Each one is a thin wrapper around a file in harness/prompts/,
  so Codex can follow the same workflow by reading that file.
- Use plan mode when planning a phase, before any edits.
- For review, use the `evaluator` subagent (.claude/agents/evaluator.md). It runs in a fresh
  context and has not seen the generator's reasoning, which is the point.
- A SessionStart hook prints a short state snapshot (see .claude/settings.json).
