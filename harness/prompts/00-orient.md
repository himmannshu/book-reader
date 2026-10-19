# 00 Orient (start of every session)

Read-only. Do not edit files in this step.

1. Read AGENTS.md, then harness/HANDOFF.md, then the last 30 lines of harness/build-log.md.
2. Run `git status`, `git branch --show-current`, and `git log --oneline -8`.
3. Run `scripts/verify.sh` and report the result as observed.
4. Read the current phase file in harness/build/ and its contract in harness/contracts/.
5. Report back in under 150 words:
   - Current phase and branch
   - What the previous agent finished and what it left half done
   - Whether the baseline is green
   - Any uncommitted changes you did not make, and whether they look safe to keep
   - The single next action you propose

Then stop and wait. Do not begin implementation.
