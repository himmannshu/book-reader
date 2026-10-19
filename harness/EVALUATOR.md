# Evaluator rubric

Used by whichever agent reviews a phase (prompt: harness/prompts/03-evaluate.md).
Score each criterion 1 to 5. Every criterion has a hard threshold. If any one falls below its
threshold, the phase fails and the author gets specific feedback.

| Criterion | What it checks | Threshold |
|---|---|---|
| Contract fidelity | Every contract item works when exercised, not just when the code looks right | 5 (all items pass) |
| Functionality | Real user flows work end to end, including edge cases and bad input | 4 |
| Robustness | Errors handled, no silent failures, no stubbed features presented as done | 4 |
| Code quality | Readable, consistent with repo conventions, no dead code or hidden coupling | 3 |
| Test quality | Tests would actually fail if the feature broke. Not just happy path | 3 |
| Product depth (optional) | Feature is more than a display-only shell | 3 |
| Design (only if there is a UI) | Coherent look, not template or library defaults, usable layout | 3 |

## Reviewer rules

- Run the software. Do not grade from the diff alone.
- If you find a real problem, do not argue yourself into approving it.
- Be specific: file, line, how to reproduce, what you expected.
- Common misses to look for: features that exist in the UI but are not wired to the backend,
  stubbed buttons, routes that shadow each other, state that is lost on refresh.
- Calibrate: if the user disagrees with a verdict, add a short example here (a finding and the
  score it should have received) so future reviews match their judgment.

## When to bother

A full review costs real tokens. Use it for phases at the edge of what the author handles
reliably alone (new architecture, tricky integrations, anything user-facing). For small,
well-understood phases, `scripts/verify.sh` plus a quick self-check is enough.
