# Signoff: Show Queue global allocation quota — apply to existing shows

| Field | Value |
|-------|-------|
| Date | 2026-09-15 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-09-15-show-queue-global-allocation-quota-apply-existing-shows-plan.md` |
| Review | `docs/workflow/reviews/2026-09-15-show-queue-global-allocation-quota-apply-existing-shows-formal-review.md` |
| Test report | `docs/workflow/reviews/2026-09-15-show-queue-global-allocation-quota-apply-existing-shows-test-report.md` |
| DEV QA prep | `docs/workflow/reviews/2026-09-15-show-queue-global-allocation-quota-apply-existing-shows-dev-qa-preparation.md` |
| Final status | **approved_with_notes** |

---

## Summary

Owner/admin Show Queue Settings can optionally apply a newly saved global default max quantity to eligible existing Upcoming Whatnot/DEV fixture shows via an ephemeral Toggle and trusted callable. Unchecked Save remains global-default-only. Owner DEV QA recorded **PASS**. Production, Portal publication, Studio release, Rules, and schema changes were not authorized and did not occur.

---

## Changes Delivered

### Behavior

- Toggle **Apply this quota to existing shows** (default off; resets on modal close / after successful save).
- Unchecked Save: existing client `settings/showQueue` write including `defaultMaxTotalQuantity`.
- Checked Save: client writes non-quota settings only; callable `applyShowQueueDefaultMaxToEligibleShows` is sole writer of `defaultMaxTotalQuantity` and updates eligible shows.
- Eligible: Upcoming + `open`/`full`/`printing` + `whatnot`/`dev_fixture`.
- Excluded: Past, Needs Attention, terminal, Internal Gang Sheets; skip when new finite max &lt; allocated.
- Bulk updates reset `maxQuantityOverridden` to false; no-limit clears `maxTotalQuantity`.
- Truthful success/partial-failure messaging with counts.

### Files Created

- `packages/shared/src/utils/showQueueDefaultMaxApplyEligibility.ts` (+ test)
- `packages/shared/src/types/upcomingShow/applyShowQueueDefaultMax.types.ts`
- `functions/src/applyShowQueueDefaultMaxToEligibleShows.ts` (+ contract test)
- `functions/src/lib/applyShowQueueDefaultMaxToEligibleShowsCore.ts` (+ test)
- `apps/studio/.../utils/planShowQueueSettingsSave.ts` (+ test)
- Plan / Formal Review / Test report / DEV QA prep / this Signoff

### Files Modified

- `UpcomingShowsPage.tsx`, `useShowQueueSettings.ts`, `showQueueSettingsService.ts`, `show-queue.css`
- `functions/src/index.ts`
- `docs/architecture/DATA_MODEL.md`, `BACKEND.md`, `docs/project/DECISIONS.md` (ADR-FP-160), `ROADMAP.md`

### Documentation Updated

- ADR-FP-160; DATA_MODEL / BACKEND / ROADMAP notes for apply-on-save behavior

---

## Tests

### Automated

- Focused suites **33/33 PASS** (eligibility, apply core, auth contract, save planner, ADR-FP-159 regression)
- Studio + Functions typecheck **PASS**
- Functions build **PASS**
- Targeted ESLint on touched TS **PASS**
- `git diff --check` **PASS** (LF/CRLF warnings only)
- Rules tests skipped (no Rules change)

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Owner DEV QA — Show Queue quota apply | **PASS** | Owner 2026-09-15 |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Formal Review acceptance + Implement | obtained | 2026-09-15 | Owner authorized Implement → Test |
| Owner DEV QA | obtained | 2026-09-15 | `OWNER DEV QA: SHOW QUEUE QUOTA APPLY — PASS` |
| Production deploy | not required / not authorized | | Separately gated |
| Database migration | N/A | | None |
| Design / UX | obtained via DEV QA | 2026-09-15 | Toggle + short copy accepted in PASS |
| Secrets / env | N/A | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Production / Studio release of callable + Studio UI | medium | Separate owner-authorized promotion |
| Working tree may still be uncommitted | low | Commit/push only if owner requests |
| Checked Save requires Function present in target env | low | DEV already QA’d; prod deploy must include callable |

---

## Deferred Items (Roadmap)

- Production Functions + Studio release promotion for this feature
- Unrelated Show Queue work

---

## Open Blockers

- [x] None for this DEV-scoped goal

---

## Verdict

**approved_with_notes** — Goal complete in DEV with Owner DEV QA PASS. Notes: production/Portal/Studio release remain separately unauthorized; commit/push not performed unless owner asks.

---

## Next Step

Goal closed. New work requires a new managed Plan. Optional: owner-directed commit/push and later production promotion of the callable + Studio build.
