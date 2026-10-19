# PROMPTS.md

The reusable prompts live in `harness/prompts/` so both agents read the same text.

| Step | File | Claude Code | Codex |
|---|---|---|---|
| Orient at session start | harness/prompts/00-orient.md | `/start-session` | "Follow harness/prompts/00-orient.md" |
| Break the plan into phase files | harness/prompts/01-plan-phases.md | plan mode, then paste | "Follow harness/prompts/01-plan-phases.md" |
| Run one approved phase | harness/prompts/02-run-phase.md | `/run-phase 03` | "Follow harness/prompts/02-run-phase.md for phase 03" |
| Review a finished phase | harness/prompts/03-evaluate.md | `/evaluate 03` | "Follow harness/prompts/03-evaluate.md for phase 03" |
| Hand off before stopping | harness/prompts/04-handoff.md | `/handoff` | "Follow harness/prompts/04-handoff.md" |
