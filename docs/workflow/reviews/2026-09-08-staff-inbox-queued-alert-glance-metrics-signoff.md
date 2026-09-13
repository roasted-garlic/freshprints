# Signoff: Staff Inbox queued alert glance metrics

| Field | Value |
|-------|-------|
| Date | 2026-09-08 |
| Signoff by | Signoff Agent |
| Goal | `staff-inbox-queued-alert-glance-metrics` |
| Plan | `docs/workflow/plans/2026-09-08-staff-inbox-queued-alert-glance-metrics-plan.md` |
| Review | `docs/workflow/reviews/2026-09-08-staff-inbox-queued-alert-glance-metrics-review.md` |
| Test report | Focused shared unit evidence below |
| Owner visual QA | **PASS** (2026-09-08) |
| Final status | **approved** |

---

## Summary

Studio Staff Inbox `portal_queued` alert cards now show design qty, print qty, and total price at a glance. Metrics are allocation-scoped for the request+show alert, priced from global Gang Sheet Settings, and appear on the Inbox page and compact bell list. Owner visual QA passed.

---

## Changes Delivered

### Behavior
- Expand portal allocation snapshots with quantity, identity, and print size fields already on `showAllocations`.
- Derive glance metrics for `portal_queued` items from active allocations for that request+show.
- Render design count, print qty, and total price pills beside the QUEUED badge.
- Enrich Done-tab queued items from live allocations when still present (no ack schema change).
- Price via existing `calculateGangSheetCustomerSectionSummary` + provider-loaded section pricing.

### Files Created
- `packages/shared/src/staffInbox/staffInboxQueuedGlanceMetrics.ts`
- `packages/shared/src/staffInbox/staffInboxQueuedGlanceMetrics.test.ts`
- Plan / review / this signoff under `docs/workflow/`

### Files Modified
- `packages/shared/src/staffInbox/staffInbox.types.ts`
- `packages/shared/src/staffInbox/deriveStaffInboxItems.ts` (+ test)
- `apps/studio/.../staff-inbox/services/staffInboxSubscriptionService.ts`
- `apps/studio/.../staff-inbox/components/StaffInboxItemRow.tsx`
- `apps/studio/.../staff-inbox/components/StaffInboxProvider.tsx`
- `apps/studio/.../staff-inbox/context/staffInboxContext.ts`
- `apps/studio/.../styles/components/staff-inbox.css`

### Documentation Updated
- Workflow plan, review, signoff, state

---

## Tests

### Automated
| Check | Result |
|-------|--------|
| `npx tsx --test packages/shared/src/staffInbox/staffInboxQueuedGlanceMetrics.test.ts packages/shared/src/staffInbox/deriveStaffInboxItems.test.ts` | **PASS** — 14/14 |

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Inbox Open queued cards show designs / print qty / price | **PASS** | Owner |
| Compact bell / non-queued kinds acceptable | **PASS** | Owner |

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Design / UX visual QA | obtained | 2026-09-08 | Owner `PASS` |
| Production deploy | not required | | Untouched |
| Database migration | not required | | None |
| Secrets / env | not required | | None |
| Commit / push | not obtained | | Remains gated |
| Studio publish | not obtained | | Remains gated |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Metrics are allocation-scoped, not full multi-show request totals | low | Intentional; full-request hydration deferred |
| Allocation subscription limit may undercount rare large sets | low | Existing inbox limit; no new listener |
| Done-tab metrics need live allocations still present | low | Acceptable without ack persistence |

---

## Deferred Items (Roadmap)
- Full-request (all items) glance metrics if owner wants non-allocation scope later.
- Persist glance snapshots on `staffInboxAcks` (would need Rules allowlist) — out of scope.
- Commit/push for this goal and any remaining prior closed-goal publish gates.

---

## Open Blockers
- [x] None for this goal’s DEV signoff

---

## Verdict

**approved** — owner visual QA PASS; focused automated tests passed; no deploy/Rules/production action in scope.

---

## Signoff Checklist
- [x] Tests passed or failures documented
- [x] Manual / human QA recorded
- [x] Workflow state updated to DONE
- [x] ChatGPT handoff package absent in this checkout (`references/project-chatgpt-handoff/` not present)
