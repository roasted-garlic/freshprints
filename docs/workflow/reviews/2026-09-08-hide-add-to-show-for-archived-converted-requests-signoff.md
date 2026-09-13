# Signoff: Hide Add to Show for archived / converted print requests

| Field | Value |
|-------|-------|
| Date | 2026-09-08 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-09-08-hide-add-to-show-for-archived-converted-requests-plan.md |
| Review | docs/workflow/reviews/2026-09-08-hide-add-to-show-for-archived-converted-requests-review.md |
| Test report | docs/workflow/reviews/2026-09-08-hide-add-to-show-for-archived-converted-requests-test-report.md |
| Final status | **approved** |

---

## Summary

Studio no longer allows allocating archived or converted-to-internal print requests to shows, and archived request detail no longer shows a misleading **Working** queue-state pill. Owner combined DEV QA **PASS**.

---

## Changes Delivered

### Behavior
- Hide **Add to Show** / **Add to Internal Gangsheet** when request is archived, completed, or `converted_to_internal`
- Reject allocation in `allocatePrintRequestItem` with the same rule
- Hide derived queue-state badge (**Working**, etc.) when `status === "archived"`

### Files Created
- `apps/studio/.../printRequestQueueBadge.test.ts`
- Plan, review, test report, signoff under `docs/workflow/`

### Files Modified
- `packages/shared/src/utils/printRequestConversion.ts` (+ tests)
- `apps/studio/.../PrintRequestsPage.tsx`
- `apps/studio/.../printRequestQueueBadge.ts`
- `apps/studio/.../upcomingShowService.ts` (+ contract tests)
- `.cursor/workflow/state.md`

### Documentation Updated
- Workflow plan/review/test/signoff artifacts

---

## Tests

### Automated
- Focused `npx tsx --test` suite: **16/16 pass**
- Studio full `tsc --noEmit`: pre-existing failures unrelated to this change (documented)

### Manual
| Test | Result |
|------|--------|
| Archived converted: no Add to Show | **PASS** |
| Internal request CTA unchanged when eligible | **PASS** |
| Working customer request Add to Show unchanged | **PASS** |
| Archived: no Working queue pill; ARCHIVED remains | **PASS** |
| Working request still shows queue pill | **PASS** |

### Human approvals
- Owner combined DEV QA: **PASS** (2026-09-08)
- Commit + push to `development` authorized by owner

---

## Risks and Follow-ups

| Item | Severity | Notes |
|------|----------|-------|
| Parked goal `print-request-direct-export-gangsheet-and-copy` | Low | Resume on owner request; export plan/review artifacts left untracked / out of this commit |
| Production Studio publish | Info | Not part of this signoff |

---

## Final Status

**approved** — workflow goal complete.
