# Test Report: Firestore Usage Efficiency

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-07-22-firestore-usage-efficiency-plan.md |
| Review | docs/workflow/reviews/2026-07-22-firestore-usage-efficiency-review.md |
| Implementation | Wave A + B1–B3 + M1 (B4 deferred) |
| Overall | **passed_with_notes** (manual: **PASS**) |

---

## Summary

Focused unit tests for new tracer, shared listener helper, catalog hydrate gate, and AI Review query shapes all passed (27/27). Portal `tsc --noEmit` passed. Studio Vite production build passed. Studio `tsc --noEmit` failed with pre-existing **TS5103** (`ignoreDeprecations`). Root `npm run lint` still fails on many pre-existing issues; the only new lint error introduced was fixed (`firestoreUsageTrace.test.ts` unused import). Portal `next build` could not complete in this session due to **EPERM** locking `apps/portal/.next/trace` (likely concurrent Next/dev process) — documented, not claimed passed.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Unit tests | `npx tsx --test packages/shared/src/utils/firestoreUsageTrace.test.ts apps/studio/.../createSharedFirestoreSubscription.test.ts apps/studio/.../aiReviewTabCountQuery.test.ts apps/studio/.../aiReviewInbox.test.ts apps/portal/.../catalogNeedsFullClientHydrate.test.ts` | 0 | pass | 27 tests |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | pass | |
| Studio typecheck | `npx tsc --noEmit` (apps/studio) | 2 | fail documented | Pre-existing TS5103; parked |
| Studio Vite build | `npx vite build` (apps/studio) | 0 | pass | |
| Portal build | `npm run build:portal` | 1 / hung | fail documented | EPERM on `.next/trace`; retry hung |
| Lint | `npm run lint` | 1 | fail documented | Pre-existing repo lint debt; fixed our unused import |
| Functions build | — | — | skip | No Functions code changed |
| Integration / E2E / rules | — | — | skip | Not required for this scope |

---

## Failures (if any)

### Studio tsc TS5103
- **Command:** `npx tsc --noEmit` from `apps/studio`
- **Output excerpt:** `tsconfig.json(22,27): error TS5103: Invalid value for '--ignoreDeprecations'.`
- **In scope to fix:** no (parked prior goal)
- **Action taken:** Documented; Vite build used as Studio compile gate

### Portal next build EPERM
- **Command:** `npm run build:portal`
- **Output excerpt:** `EPERM: operation not permitted, open '.../apps/portal/.next/trace'`
- **In scope to fix:** no (environment lock)
- **Action taken:** Documented; Portal typecheck passed as primary static check

### Lint (repo-wide)
- **Command:** `npm run lint`
- **In scope to fix:** only new findings
- **Action taken:** Removed unused import in `firestoreUsageTrace.test.ts`; left pre-existing errors alone

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Functions build | No Functions changes in Wave A/B |
| Emulator Firestore logs | Optional secondary; client DEV tracer used instead |

---

## A5 index verification

Confirmed existing composite in `firestore.indexes.json`:

`designs`: `aiReviewStatus` ASC + `status` ASC + `updatedAt` DESC + `__name__` DESC

No new index added or deployed. Processing tab server filter (`aiReviewStatus == pending` with status imported/processing) proceeds under this coverage.

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Full manual QA + tracer before/after | **PASS** | Owner 2026-07-22 |

Manual test instructions: `docs/workflow/reviews/2026-07-22-firestore-usage-efficiency-manual-checkpoint.md`

---

## Recommendations

- Re-run `npm run build:portal` when no other Next process holds `.next`.
- Consider Wave C Staff Inbox bounding in a follow-up phase after ops review.

---

## Signoff Readiness
- [x] Automated checks run; failures documented honestly
- [x] Manual tests complete (PASS)
- [x] Ready for signoff phase

**Next step:** signoff
