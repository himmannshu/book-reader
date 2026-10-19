# Phase 00 context: repository foundation

Material decisions only.

## TypeScript pinned to 6.0.x, not 7.0

- Fact (checked 2026-10-18 with `npm view`): `typescript` latest is 7.0.2, but
  `typescript-eslint@8.71.2` declares peer `typescript: >=4.8.4 <6.1.0`.
- Decision: pin `typescript@6.0.3` exactly. Linting with type-aware rules matters more than
  TypeScript 7's faster compiler for a codebase this size.
- Revisit when: typescript-eslint's peer range includes 7.x. Bump both together and run
  `scripts/verify.sh`.

## Browser tests run on the production build, in Chromium and WebKit

- Playwright's webServer runs `vite build` + `vite preview`, not the dev server, so tests see
  what users get, and the phase 02 speed benchmarks measure real bundles.
- WebKit is included because iPad and iPhone run Safari's engine. Their limits (canvas memory,
  storage) are the ones D2 in architecture-decisions.md designs around.
- Cost: about 15 s added to verify for the build. Acceptable.

## Two TypeScript projects

- `tsconfig.app.json` covers `src/` with browser types only. `tsconfig.node.json` covers
  config files and `e2e/` with Node types. This keeps Node globals such as `process` out of
  app code. `npm run typecheck` checks both.
