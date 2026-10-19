# 02 Run one phase

Input: the phase number NN. Work on that phase only.

## A. Preflight (read-only)

1. Do the orientation steps in harness/prompts/00-orient.md.
2. Read harness/build/phase-NN-*.md. If the status is Complete, stop and say so.
3. Confirm you are on branch `phase-NN-<slug>`. Create it from main if it does not exist.

## B. Plan and contract (needs approval)

4. Post a short plan: scope, non-goals, files likely touched, tests to write first, risks.
5. Draft harness/contracts/phase-NN-contract.md from harness/contracts/contract-template.md.
   Each item must be a behavior someone could check by running the software. Aim for specific
   and testable, not vague.
6. Stop. Wait for the user (or the reviewing agent) to approve the plan and contract.
   After approval, do not ask again for routine edits.

## C. Build

7. Create harness/context/phase-NN-<slug>-context.md only if there is a material decision to
   record. Material means omitting it could change scope, interfaces, verification, or a later
   phase. No narration, no transcripts, no secrets.
8. For each contract item: write the failing test or check, see it fail, write the minimum
   code, see it pass, refactor only if behavior stays identical.
9. After each green step: commit (`phase NN: <what>` or `wip: <what>`), append an entry to
   harness/build-log.md, and update harness/HANDOFF.md. Run `scripts/handoff.sh --write`.
   Do this as you go. You can be cut off at any time.

## D. Verify and close

10. Run `scripts/verify.sh`. Run the app and exercise each contract item the way a user would.
11. Record observed commands and results in harness/build-log.md. Never record a planned
    command as if it passed. Record skipped or unavailable checks with the reason.
12. Update harness/features.json statuses only for items you saw pass.
13. Set the phase status to Complete only if every contract item has observed evidence.
    Otherwise leave it In progress or Blocked and say why in HANDOFF.md.
14. Stop. Do not start the next phase. Do not push or deploy without being asked.
