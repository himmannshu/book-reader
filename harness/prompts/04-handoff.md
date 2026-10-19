# 04 Handoff (use before stopping or switching agents)

Do this when you finish a phase, hit a limit warning, or the user says they are switching agents.
Keep it fast. A good handoff takes a minute.

1. Commit everything that is in a coherent state. If the tree is mid-change, commit it as
   `wip: <what is half done>` so nothing is lost. Never leave work uncommitted.
2. Run `scripts/verify.sh` and note the result, even if it fails.
3. Edit the top section of harness/HANDOFF.md (everything above the AUTO block):
   - Current phase and branch
   - Done this session (short bullets, each with evidence like a test name or commit)
   - In flight: exactly what is half done and where the code for it lives
   - Next action: one concrete step the next agent should take first
   - Decisions made and why (only the ones that would be expensive to rediscover)
   - Known failures, blockers, and anything you are unsure about
4. Run `scripts/handoff.sh --write` to refresh the auto snapshot.
5. Append a short entry to harness/build-log.md.
6. Commit the handoff files: `handoff: <agent> <date>`.
7. Tell the user the handoff is done and which prompt the next agent should start with
   (usually harness/prompts/00-orient.md).
