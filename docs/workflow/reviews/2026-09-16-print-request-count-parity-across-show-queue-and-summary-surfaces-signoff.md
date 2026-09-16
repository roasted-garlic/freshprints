# Signoff: Print Request Count Parity Across Show Queue and Summary Surfaces

| Field | Value |
|-------|-------|
| Date | 2026-09-16 |
| Signoff by | Owner DEV QA + Signoff Agent |
| Plan | `docs/workflow/plans/2026-09-16-print-request-count-parity-across-show-queue-and-summary-surfaces-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-16-print-request-count-parity-across-show-queue-and-summary-surfaces-formal-review.md` |
| Test report | `docs/workflow/reviews/2026-09-16-print-request-count-parity-across-show-queue-and-summary-surfaces-test-report.md` |
| Owner DEV QA | **PASS WITH NOTES** — remove → re-add historical-allocation scenario accepted in DEV; follow-up fixes closed |
| Final status | **approved_with_notes** |

## Summary

The managed goal is complete in the `development` checkout. Print Request full-request summaries
now use source-aware logical Designs and live item quantity, while selected-show operational
summaries use one active, non-canceled allocation set for Designs, Items, tiers, pricing,
capacity, and status. Portal, Studio, Staff Inbox, Portal Admin, Add-to-Show, queue planning, and
customer history surfaces now share the reviewed semantics.

The related follow-up is also closed: Portal queue/unqueue success clears both allocatable-show
cache layers, and Studio staff remove retains canceled allocation history instead of deleting it.

## Changes Delivered

### Behavior

- Full-request Designs are distinct source-aware identities across current `printRequestItems`;
  Items are the sum of current item quantities.
- Selected-show Designs and Items exclude `status === "canceled"`; tier, price, capacity, and
  status calculations use that same active allocation set.
- Canceled history remains available as History-only context and does not inflate current counts.
- The production-shaped regression remains locked to `19 Designs | 25 Items | Reg Full 19 ·
  Reg Oversize 6 | $56`.
- Portal request count displays and queue planning no longer use persisted `itemCount` or raw
  entry length as the canonical Designs value.

### Files Created

- Shared production-shaped fixture and source/allocation summary tests.
- Portal count-parity contract coverage and follow-up cache/cancel contract tests.
- Parent and follow-up Plan, Formal Review, Test Report, Owner DEV QA, and Signoff artifacts.

### Files Modified

- Shared Print Request identity, full-request summary, Staff Inbox, and Portal Admin metric
  adapters.
- Studio Show Queue, Add-to-Show, Staff Inbox, customer history, and query-planning consumers.
- Portal request list/detail, queue-to-show, continuable-request picker, and allocatable-show
  cache/service consumers.
- Existing Functions `getPortalAdminUpcomingShowQueueDashboard` adapter and
  `unqueueStudioCustomerPrintRequestFromShow` callable.

### Documentation Updated

- `docs/architecture/DATA_MODEL.md`
- `docs/WORKFLOWS.md`
- `docs/standards/TESTING.md`
- `docs/project/ROADMAP.md`
- Cumulative production promotion manifest and project handoff package.

## Tests

### Automated

- Focused parity and cross-surface suite: **115/115 PASS**.
- Portal, Studio, and Functions TypeScript checks: **PASS**.
- Changed-file ESLint: **PASS** with zero warnings allowed.
- `npm run build:studio`: **PASS**; existing non-fatal bundler/electron-builder warnings documented.
- Functions build: **PASS**.
- `git diff --check`: **PASS**.
- Portal build and full repository lint remain documented limitations: the Portal build encountered
  existing Windows/Next `_document`/trace environment failures, and full lint reports unrelated
  pre-existing violations; changed-file lint is clean.

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| DEV remove a Print Request from a show, re-add it, and verify current Show Queue Designs/Items remain aligned with active allocations despite canceled history | PASS WITH NOTES | Owner DEV QA, 2026-09-16 |
| Verify the corrected DEV behavior does not inflate from canceled historical allocation rows | PASS WITH NOTES | Owner DEV QA, 2026-09-16 |
| Production smoke of `sassymommasam-CR002` and one additional canceled/re-added request | DEFERRED — post-promotion read-only verification only | Owner authorization required |

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Owner DEV QA | obtained | 2026-09-16 | **PASS WITH NOTES** |
| Production deploy/release | not required for this Signoff | 2026-09-16 | Separately gated; not performed or authorized |
| Database migration/data repair | N/A | 2026-09-16 | None in scope |
| Design / UX | N/A | 2026-09-16 | No separate significant design checkpoint required |
| Business / policy | N/A | 2026-09-16 | Existing count/capacity semantics applied |
| Secrets / env | N/A | 2026-09-16 | No changes |

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| The exact historical production record cannot be live-validated with corrected runtime code until production promotion. | Medium | Run the manifest’s post-promotion read-only smoke against `sassymommasam-CR002`; no production smoke is performed in this closeout. |
| Portal build and whole-repository lint have documented environment/baseline limitations. | Low | Portal typecheck and changed-file lint pass; limitations remain recorded in the Test Report. |

## Deferred Items (Roadmap)

- Separately authorized production promotion, including the exact runtime delta in the cumulative
  manifest.
- Post-promotion read-only smoke of the originally affected request/show and one additional
  canceled/re-added request when available.

## Open Blockers

- [x] None for DEV Signoff; production promotion remains a separate human checkpoint.

## Verdict

**approved_with_notes**

The exact historical production record cannot be live-validated with corrected runtime code until
production promotion. Root cause was proven through read-only production evidence, automated
production-shaped regression coverage passed, and Owner DEV QA validated the remove/re-add
historical-allocation scenario in DEV. Production smoke must confirm the originally affected card
after promotion.

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] `RISK_REGISTER.md` reviewed; no new project risk entry required beyond this documented,
  promotion-gated verification note
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated
- [x] Other applicable handoff files updated

**Recommended next action for user:** separately authorize the production promotion checkpoint,
then run the manifest’s read-only smoke. No production action is authorized by this Signoff.
