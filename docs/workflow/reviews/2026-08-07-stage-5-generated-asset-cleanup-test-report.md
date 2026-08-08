# Test Report: Stage 5 generated-asset cleanup (source Implement)

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Plan | `docs/workflow/plans/2026-08-07-stage-5-generated-asset-cleanup-plan.md` |
| Scope | Source Rules narrowing + ops script + unit tests — **no** live dry-run/delete/deploy |
| Overall | **passed_with_notes** |

---

## Commands run

| Check | Command | Result |
|-------|---------|--------|
| Stage 5 guard unit tests | `node --test functions/scripts/lib/stage5GeneratedAssetCleanupGuard.test.mjs` | **15/15 pass** |
| Portal containment | `npx tsx --test` Stage 4 + Phase 1a containment | **10/10 pass** |
| Functions typecheck/build | `npm --prefix functions run build` (`tsc`) | **exit 0** |
| Touched-file lint | `npx eslint` on Stage 5 `.mjs` + Rules test | **exit 0** |
| Whitespace | `git diff --check` | **exit 0** (CRLF warnings only) |
| Firebase Rules suite | `npm run test:rules` | **not run** — emulator failed: `Could not spawn java -version` (Java not on PATH) |

---

## Discriminating guard coverage (A–K)

| ID | Assertion | Result |
|----|-----------|--------|
| A | `generated/portal-catalog/...` accepted | pass |
| B | `generated/catalog-reference/...` accepted | pass |
| C–G | artwork / customer-upload roots rejected | pass |
| H | `generated/other/...` rejected | pass |
| I | wrong project rejected | pass |
| J | dry-run record `destructiveActionsPerformed: false` | pass |
| K | only `snapshotPublicationState` for Firestore | pass |

Also: prefix lookalikes + `..` traversal rejected.

---

## Notes

1. **Rules emulator blocked locally** — no Java runtime available (`where java` empty; `winget` unavailable). Rules source + `catalogSnapshot.rules.test.ts` were updated for Stage 5 deny semantics; suite must be re-run when Java is available (`npm run test:rules`).
2. **No live dry-run** — ops script was not executed against `fresh-prints-dev`.
3. **No Storage/Firestore deletes; no Rules deploy.**

---

## Totals

| Suite | Pass | Fail | Notes |
|-------|------|------|-------|
| Stage 5 guard | 15 | 0 | |
| Portal containment | 10 | 0 | |
| Rules suite | — | — | blocked (no Java) |
| Functions `tsc` | ok | | |
| eslint (touched) | ok | | |
