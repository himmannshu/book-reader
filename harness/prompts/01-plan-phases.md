# 01 Plan phases

Goal: turn the idea into PLANS.md and one build file per phase. No application code.

1. Read AGENTS.md, GOALS.md, and PLANS.md. If PLANS.md only has placeholders, expand the
   product summary first from the one to four sentence idea the user gave you. Be ambitious
   about scope. Stay on product behavior and high-level design. Do not specify granular
   technical details, because early mistakes there cascade into every later phase.
2. Propose a phase list (number, name, observable outcome, dependencies). Keep each phase
   small enough to implement and verify on its own. Phase 00 is always repository foundation
   (build runs, `scripts/verify.sh` works, CI skeleton).
3. Stop and show the list. Wait for approval.
4. After approval, create harness/build/phase-NN-<slug>.md for each phase from
   harness/build/phase-template.md, and add matching rows to harness/features.json with status
   `failing`.
5. Do not create contracts or context files yet. Those are created when a phase begins.
6. Report files created and any assumptions or open questions.
