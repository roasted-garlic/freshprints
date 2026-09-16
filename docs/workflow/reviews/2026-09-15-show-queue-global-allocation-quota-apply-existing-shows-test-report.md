# Test Report: Show Queue global allocation quota — apply to existing shows

| Field | Value |
|-------|-------|
| Date | 2026-09-15 |
| Tester | Test Agent |
| Plan | `docs/workflow/plans/2026-09-15-show-queue-global-allocation-quota-apply-existing-shows-plan.md` |
| Review | `docs/workflow/reviews/2026-09-15-show-queue-global-allocation-quota-apply-existing-shows-formal-review.md` |
| Implementation | Local working tree (uncommitted); Implement complete for reviewed scope |
| Overall | **passed_with_notes** — automated focused gate passed; Owner DEV QA **PASS**; production promotion deferred |

---

## Summary

Focused automated validation for eligibility, save planner (unchecked vs checked / no double-write), callable core (update/skip/clear/partial failure), auth contract, and ADR-FP-159 regression all **passed (33/33)**. Studio and Functions typechecks passed. Functions build produced the new callable artifact. Targeted ESLint on touched TS files passed. Firestore Rules tests skipped (no Rules change). Owner DEV QA is required before Signoff; checked Save needs the new DEV Function deployed.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Unit / contract | `npx tsx --test` on eligibility, quota-override, apply core, apply auth contract, planShowQueueSettingsSave | 0 | **pass 33/33** | Includes ADR-FP-159 regression |
| Studio typecheck | `npx tsc -p apps/studio/tsconfig.json --noEmit --pretty false` | 0 | pass | |
| Functions typecheck | `npx tsc -p functions/tsconfig.json --noEmit --pretty false` | 0 | pass | Combined with Studio in same shell |
| Functions build | `npm run build --prefix functions` | 0 | pass | `applyShowQueueDefaultMaxToEligibleShows.js` present |
| Targeted lint | `npx eslint` on touched `.ts/.tsx` only | 0 | pass | CSS intentionally excluded from ESLint |
| Diff hygiene | `git diff --check` on touched paths | 0 | pass | LF/CRLF warnings only |
| Rules tests | — | — | skip | No Rules change |
| Portal typecheck | — | — | skip | Portal untouched |
| Whole-repo lint | — | — | skip | Out of scope; known baseline noise |

---

## Failures (if any)

None in the final focused gate. An intermediate core-test fixture asserted a `full` show with `allocatedQuantity` above the new max (correctly skipped); fixture corrected and re-run green.

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Firestore Rules emulator | No Rules change authorized or made |
| Production / E2E | Not in scope |
| DEV Function deploy | Not authorized in Implement→Test; required before live checked-Save QA |

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Owner DEV QA | **PASS** | Owner 2026-09-15: `OWNER DEV QA: SHOW QUEUE QUOTA APPLY — PASS` |

Manual test instructions: `docs/workflow/reviews/2026-09-15-show-queue-global-allocation-quota-apply-existing-shows-dev-qa-preparation.md`

---

## Risks / Residual

- Production / Studio release remain separately unauthorized.
- Commit/push not part of this Signoff unless owner requests.

---

## Signoff Readiness

**Ready** — Owner DEV QA PASS recorded; see Signoff artifact.
