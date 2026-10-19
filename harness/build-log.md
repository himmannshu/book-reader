# Build log

Source of truth for what actually happened and what was actually observed. Append only.
Never write a planned command as if it passed. Record skipped checks and why.
If an earlier entry is wrong, append a correction that names it.

## Phase summary

| Phase | Status | Branch | Evidence | Blockers |
|---|---|---|---|---|
| 00 | Not started | | | |

## Entries

Template:

### <YYYY-MM-DD HH:MM TZ> | Phase NN | <agent> | <event>
- Changes: <files or behavior>
- Red: <check and the failure you saw, or n/a>
- Green: <check and result>
- Verification: <exact commands run and results>
- Limitations: <untested or skipped, with reason>
- Next: <next action, not authorized implicitly>

### 2026-10-18 22:30 EDT | Planning | Claude Code (Opus 5.5) | Architecture decisions and phase roadmap
- Changes: Created harness/context/architecture-decisions.md (D1–D6). Filled in the Project,
  Commands (planned names) and Conventions sections of AGENTS.md. Updated GOALS.md (scope,
  non-goals, resolved open questions) and PLANS.md (summary, phases 00–13). Created
  harness/build/phase-00…13-*.md. Added F-001…F-015 to harness/features.json, all failing.
- Decisions (with the user): installable web app (PWA); PDF.js behind an engine interface in a
  worker; TypeScript strict + React + Vite + Vitest + Playwright + ESLint/Prettier; local-first
  storage (OPFS + IndexedDB) with Cloudflare (R2, D1, Workers, Pages, Access) as the cloud;
  continuous scroll first; PDF only. Post-core order: comfort, library, export, search.
- Conflict recorded: GOALS.md already said "Platform: a web app" while the user's request
  said the platform was undecided. Treated as open, discussed, and the user chose web app.
  GOALS.md now matches.
- Red: n/a (no code)
- Green: n/a (no code)
- Verification: `scripts/verify.sh` → "verify.sh: no checks configured yet", result
  NOT CONFIGURED, exit 2. Expected before phase 00; not a pass.
  `python3 -m json.tool harness/features.json` parses; 16 rows, all failing; F-000 unchanged.
- Limitations: no application code written. Free-tier numbers come from third-party sources
  (cited in the decisions file); confirm them on official pricing pages before phase 08.
- Next: plan phase 00 (repository foundation) and wait for the user's approval.

### 2026-10-18 23:05 EDT | Phase 00 | Claude Code (Opus 5.5) | App shell with browser test
- Changes: package.json (exact pins; typescript 6.0.3, see context file), .nvmrc, .gitignore,
  playwright.config.ts (production build via `vite build` + `vite preview`, Chromium + WebKit),
  e2e/app-shell.spec.ts, index.html, vite.config.ts, tsconfig.json, src/main.tsx, src/ui/App.tsx.
  Branch phase-00-repository-foundation created from main (main fast-forwarded to planning, local only).
- Red: `npx playwright test` → webServer build failed "Cannot resolve entry module index.html" (no app yet).
- Green: `npx playwright test` → 2 passed (chromium, webkit).
- Verification: browsers installed with `npx playwright install chromium webkit`.
- Limitations: lint/format/unit/verify wiring not done yet.
- Next: unit test, lint, format, typecheck.
