# Test report — Studio 1.0.12 corrective

Date: 2026-09-14

## Automated results

- Clean DEV restart preflight: **PASS**. The stale Vite HMR incident was reproduced only in the
  prior long-lived process; after terminating the old Studio/Vite/Electron chain and starting a
  fresh chain with `ELECTRON_RUN_AS_NODE` cleared, the Studio window and renderer remained alive,
  Vite entrypoints returned HTTP 200, and a fresh headless renderer check reported no uncaught
  `AiReviewPage` export/runtime errors. No source workaround was required.
- Current changed-file corrective rerun: **34/34 PASS**; current release workflow and publish
  contract rerun: **50/50 PASS**.
- Focused AI Review, tracked-return, bulk, reconciliation, observer, multi-select, and modal suites: **67/67
  PASS**.
- Studio TypeScript: `npx tsc --noEmit -p apps/studio/tsconfig.json` **PASS**.
- Targeted ESLint for all changed renderer/utility/test files: **PASS**.
- `git diff --check`: **PASS**.
- `npm run build:studio`: TypeScript and all Vite renderer/electron/preload builds **PASS**. The
  overall command timed out during existing electron-builder Windows packaging after reaching
  signing/installer work; logs show the known `release/1.0.11/win-unpacked` EPERM rename fallback
  and packaging environment issue. No release was published or mutated.

## Coverage added/updated

- Cached pre-reset and missing-baseline terminal snapshots fail closed.
- Three rapid tracked reprocesses do not reinsert stale rows.
- Serial dedupe and partial bulk failure.
- Synchronous whole-run guard and no selected-index closure regression.
- Existing local reconciliation/stay-on-tab/no-reload contracts.
- Portal/direct-child modal semantics, viewport-centering CSS contract, focus containment, exact
  clipboard phrase, timed feedback, no autofill, and exact enable guard.

No backend, Rules, index, migration, or production validation was required for this renderer-only
phase.
