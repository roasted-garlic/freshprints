# Signoff: Studio/Portal perf + show-queue gates

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-07-14-studio-portal-perf-queue-gates-plan.md |
| Review | docs/workflow/reviews/2026-07-14-studio-portal-perf-queue-gates-review.md |
| Test report | docs/workflow/reviews/2026-07-14-studio-portal-perf-queue-gates-test-report.md |
| Final status | **approved** |

---

## Summary

Closed owner-reported Studio/Portal performance and show-queue gating issues: promote-to-AI returns without waiting on the enrichment pipeline; Portal nav no longer fights catalog URL prefetch; allocatable-shows calendar is date-bounded + session-cached; inbox alert sound coalesced; hard block adds when a show is full, done, or past; inbox Done attribution; Portal Stash clears after queue-to-show. Manual QA PASS after follow-up fixes (cart race, prefetch removal, Firestore rules for Done-by fields).

---

## Changes Delivered

### Behavior
- Studio **Send to AI Review** returns after design/asset promote; AI runs via existing background enqueue
- Portal catalog: background URL prefetch disabled; on-demand URL memo only
- Portal show calendar: bounded query + short session cache
- Studio inbox: one alert sound when queue-add also fills a show; Done rows show who marked them
- Shared eligibility: no new allocations when show is capacity-full, `completed` / `fully_printed`, or past schedule
- Portal Stash empties immediately after queue-to-show (no re-hydrate of the queued request)
- Firestore rules allow `acknowledgedByUserId` / `acknowledgedByDisplayName` on `staffInboxAcks`

### Files Created
- `packages/shared/src/utils/showAllocationEligibility.ts` (+ unit tests)
- Plan / review / test report / this signoff under `docs/workflow/`

### Files Modified (high level)
- `functions/src/promoteCustomerUploadToAiReview.ts` and related Studio intake handoff
- Portal catalog storage service + catalog pages (prefetch removed)
- Portal allocatable shows hook / list callable path
- Studio `StaffInboxProvider.tsx`, ack service/types, inbox row Done-by UI
- Portal print-request context / working items / detail `handleQueuedToShow`
- Studio/Portal show picker gates; shared eligibility consumers
- `firestore.rules`, `docs/standards/SECURITY.md`

### Documentation Updated
- `docs/standards/SECURITY.md` (staff inbox ack Done attribution fields)
- `docs/project/ROADMAP.md` (this completion)
- Workflow plan / review / test report

---

## Tests

### Automated
- `showAllocationEligibility` unit tests — exit 0
- `functions` build — exit 0
- Portal typecheck (including after cart/prefetch fixes) — exit 0
- Deployed to `fresh-prints-dev`: promote / list / queue callables; firestore rules

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Studio promote → background AI | PASS | human (owner) |
| Portal nav snappiness (post-prefetch removal) | PASS | human (owner) |
| Portal calendar open speed | PASS | human (owner) |
| Single alert sound on fill | PASS | human (owner) |
| Full / done / past add blocks | PASS | human (owner) |
| Inbox Done attribution + save | PASS | human (owner) |
| Portal Stash clears after queue | PASS | human (owner) |

Owner replied 2026-07-14: call the phase **PASSED**.

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | | Dev-only function/rules deploys |
| Database migration | N/A | | |
| Design / UX | obtained | 2026-07-14 | Manual PASS |
| Business / policy | obtained | 2026-07-14 | Hard block full/done; one sound on fill |
| Secrets / env | N/A | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Catalog thumbs may flash longer without prefetch | low | Acceptable; prefetch made nav sticky |
| Production rules/functions not deployed in this phase | medium | Deploy with normal release process when promoting |

---

## Deferred Items (Roadmap)
- Production deploy of callables + Firestore rules
- Further AI pipeline / Cloud Tasks architecture (out of scope)

---

## Open Blockers
- [x] None

---

## Verdict

**approved** — Automated checks passed; owner manual PASS after follow-up fixes for Stash clear, prefetch, and inbox Done rules.

---

## Workflow Complete
- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] `RISK_REGISTER.md` updated if needed (no new lasting risk)
- [x] **`references/project-chatgpt-handoff/CURRENT-STATE.md` updated** — N/A (handoff package not present)
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated — N/A
- [x] Other handoff files — N/A

**Recommended next action for user:** Pick the next managed-phase goal when ready (`Managed Phase` / `Continue Workflow`).
