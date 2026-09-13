# Implementation Review — DEV Fixture Needs Attention Lifecycle Corrective

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Goal | `show-queue-dev-override-and-allocation-permission-repair` (corrective slice) |
| Parent plan | `docs/workflow/plans/2026-08-29-show-queue-dev-override-and-allocation-permission-repair-plan.md` |
| Verdict | **approved_for_owner_re_qa** |

---

## Root cause

`getWhatnotShowQueueTab()` and `isUnresolvedPastWhatnotShow()` in `packages/shared/src/utils/showProductionRecovery.ts` gated lifecycle classification on `show.source === "whatnot"`. `dev_fixture` shows fell through to `getShowScheduleTabFallback()`, which only distinguishes **upcoming** vs **past** — never **needs_attention**.

Recovery preview/apply in Functions used the same narrow `show.source === "whatnot"` check via `resolveProductionRecoveryPreviewOutcome`.

Studio Show Detail treated any past-scheduled show as read-only via `isPastScheduledShow()`, even when the show belonged in **Needs Attention**.

**Impact evidence:** confirmed **dev_fixture-only** for the owner-reported failure. Imported/manual Whatnot shows still use the existing `whatnot` path; no regression reproduced in source or tests.

---

## Files changed

| Path | Change |
|------|--------|
| `packages/shared/src/utils/showProductionRecovery.ts` | Queue-surface lifecycle helpers; dev_fixture participates in Needs Attention + recovery preview |
| `packages/shared/src/utils/showProductionRecovery.test.ts` | Regression cases (7 owner scenarios) |
| `functions/src/lib/showProductionRecovery.ts` | Recovery preview uses queue-surface eligibility |
| `apps/studio/.../UpcomingShowsPage.tsx` | Read-only uses `isShowQueuePastReadOnlyShow`; Needs Attention copy |

---

## Needs Attention classification contract (unchanged semantics, widened eligibility)

For Show Queue surface shows (`whatnot` + `dev_fixture` via `isWhatnotQueueSurfaceShow`):

1. `scheduledStartAt > now` → **Upcoming**
2. `scheduledStartAt <= now` && non-terminal `productionStatus` → **Needs Attention**
3. Terminal production (`completed`, `fully_printed`, `archived`, `canceled`) → **Past** (read-only)

Time passing alone does **not** complete production. ADR-FP-149 remediation remains authoritative for unresolved past work.

---

## Callable eligibility

`previewShowProductionRecovery` / `applyShowProductionRecovery` now accept `dev_fixture` through shared `isShowQueueProductionRecoveryEligible()`. Whatnot import/sync validation unchanged.

---

## Automated test evidence

| Suite | Command | Result |
|-------|---------|--------|
| Shared + Functions contract | `npx tsx --test packages/shared/src/utils/showProductionRecovery.test.ts functions/src/showProductionRecovery.contract.test.ts` | **27 pass / 0 fail** |

---

## Firebase DEV deploy required

**Yes** — recovery callables bundle shared preview logic.

**Scope (only):**

```bash
firebase deploy --only functions:previewShowProductionRecovery,functions:applyShowProductionRecovery --project fresh-prints-dev
```

**Not required:** Firestore rules, indexes, `upsertDevFixtureShow`, production.

Studio classification fix is client-side (shared package); owner should restart/reload Studio after pull. Deploy recovery callables before owner tests **apply** recovery actions on DEV fixtures.

---

## Corrective DEV deploy (executed 2026-08-29)

```bash
firebase deploy --only functions:previewShowProductionRecovery,functions:applyShowProductionRecovery --project fresh-prints-dev
```

| Check | Result |
|-------|--------|
| Exit code | **0** |
| `previewShowProductionRecovery` | **Successful update operation** (us-central1, v2 callable) |
| `applyShowProductionRecovery` | **Successful update operation** (us-central1, v2 callable) |
| Pre-deploy branch | `development` |
| Pre-deploy Functions build | **pass** |
| Pre-deploy tests | **27 pass / 0 fail** |
| Rules / indexes / storage | **not deployed** |
| `upsertDevFixtureShow` | **not redeployed** |
| Production | **untouched** |

`firebase functions:list --project fresh-prints-dev` confirms both callables present as v2 callables in `us-central1`.

---

## Owner fixture reuse

**No data repair expected.** Tab classification is derived. Owner's existing `DELETE THIS SHOW` fixture should appear under **Needs Attention** after Studio reload once this corrective is running locally. If it does not, report show id + persisted `productionStatus` for investigation.

---

## Verdict

**approved_for_owner_re_qa** — signoff remains blocked until owner confirms Needs Attention lifecycle for DEV-OVERRIDE fixtures.
