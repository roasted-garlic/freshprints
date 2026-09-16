# Test Report: Studio staff show-capacity allocation override

| Field | Value |
|-------|-------|
| Date | 2026-09-15 |
| Tester | Test Agent |
| Plan | `docs/workflow/plans/2026-09-15-studio-staff-show-capacity-allocation-override-plan.md` |
| Review | `docs/workflow/reviews/2026-09-15-studio-staff-show-capacity-allocation-override-formal-review.md` |
| Implementation | Local working tree (uncommitted); Implement complete for reviewed scope |
| Overall | **passed_with_notes** — automated focused gate passed; Owner DEV QA **PASS**; production promotion deferred |


---

## Summary

Focused automated validation for eligibility/override helpers, callable parse (`overrideShowCapacity` boolean-true only), Studio Allocate Anyway contracts, Portal capacity-strict regression, over-capacity display, and ADR-FP-160 skip-below-allocated all **passed (79/79)**. Studio and Functions typechecks passed. Functions build succeeded. Targeted ESLint on touched TS/TSX passed. `git diff --check` passed (LF/CRLF warnings only). Firestore Rules tests skipped (no Rules change). Owner DEV QA recorded **PASS**.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Unit / contract | `npx tsx --test` on eligibility, capacity display, ADR-FP-160 eligibility, allocate callable, Portal queue, AddToShowModal contracts | 0 | **pass 79/79** | Includes already-full overflow helpers + Portal no-override |
| Studio typecheck | `npx tsc -p apps/studio/tsconfig.json --noEmit --pretty false` | 0 | pass | |
| Functions typecheck | `npx tsc -p functions/tsconfig.json --noEmit --pretty false` | 0 | pass | |
| Functions build | `npm run build --prefix functions` | 0 | pass | |
| Targeted lint | `npx eslint` on touched `.ts/.tsx` only | 0 | pass | |
| Diff hygiene | `git diff --check` on touched paths | 0 | pass | LF/CRLF warnings only |
| Rules tests | — | — | skip | No Rules change |
| Portal typecheck | — | — | skip | Portal untouched |
| Whole-repo lint | — | — | skip | Out of scope |

---

## Failures (if any)

None in the final focused gate.

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Firestore Rules emulator | No Rules change authorized or made |
| Production / E2E | Not in scope |
| DEV Function deploy | Required before live override QA against deployed Functions; not authorized as production |

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Owner DEV QA | **PASS** | Owner 2026-09-15: `OWNER DEV QA: SHOW CAPACITY OVERRIDE — PASS` |


---

## Risks / Residual

- Live DEV QA needs Functions deploy of `allocateStudioPrintRequestToShow` to `fresh-prints-dev` if Studio is pointed at cloud callables.
- Transfer/move capacity override remains out of v1.
- Production / Portal publication / Studio release remain unauthorized.

---

## Signoff Readiness

**Ready** — Owner DEV QA PASS recorded; see Signoff artifact.
