# Signoff: Cap A quota UI latency (optimistic remaining)

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-07-19-cap-a-quota-ui-latency-plan.md |
| Review | docs/workflow/reviews/2026-07-19-cap-a-quota-ui-latency-review.md |
| Test report | docs/workflow/reviews/2026-07-19-cap-a-quota-ui-latency-test-report.md |
| Final status | **approved** |

---

## Summary

Portal Cap A banner / exhausted UI now tracks Current Request quantity changes near cart latency via positive-only optimistic remaining (working-print deltas) plus detail-page `workingItems` patches before save. Owner soft-reload QA: **PASS**.

This polish is closed as a discrete goal. Cap B split allotment bug remains the active managed phase and is **not** closed by this PASS.

---

## Changes Delivered

### Behavior
- Optimistic Cap A remaining from working-print increases only (queue shrink does not inflate remaining)
- Detail qty save patches `workingItems` before awaiting the callable so cart + Cap A move together
- `notifyCapAQuotaChanged` still reconciles after successful save; server Cap A unchanged

### Files Modified (representative)
- `packages/shared/src/utils/printRequestDailyDesignLimit.ts` (+ tests)
- `apps/portal/features/print-requests/hooks/usePortalCapAQuotaState.ts`
- `apps/portal/features/print-requests/context/PortalPrintRequestContext.tsx`
- `apps/portal/features/print-requests/hooks/usePrintRequestDetail.ts`
- `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx`

### Documentation Updated
- Plan, review, test report, this signoff

---

## Tests

### Automated
- Shared unit: optimistic Cap A helpers (8 tests) — pass
- Portal typecheck — pass

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Soft-reload Portal: detail qty 25+25 → cart and Cap A banner/exhausted update together (not ~10s lag) | PASS | owner |

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | | |
| Database migration | not required | | |
| Design / UX | obtained | 2026-07-19 | Owner PASS on Cap A optimistic quota UI latency |
| Business / policy | not required | | |
| Secrets / env | not required | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Transient early exhausted until server reconcile | low | Expected; callables remain authoritative |

---

## Deferred Items (Roadmap)
- Cap B split UI allotment bug (active managed phase — still awaiting owner QA)
- Portal Review Request nav race + “Preparing request…” (parked — still awaiting owner manual QA; this PASS does not cover it)
- Other parked owner-QA items (unchanged)

---

## Open Blockers
- [x] None (for this polish)

---

## Verdict

**approved** — Owner PASS on Cap A latency polish only. Cap B remains active; overall workflow `DONE` stays **no**.

---

## Workflow Complete
- [x] Cap A latency polish closed in Decision Log + signoff
- [ ] Overall managed phase `DONE: yes` — **no** (Cap B still active)
- [ ] `references/project-chatgpt-handoff/` — **N/A** (package not present in repo)
- [ ] ROADMAP — N/A (polish; no roadmap entry)

**Recommended next action for user:** Soft-reload Portal and re-test Cap B 25+25 allotment (queue only 25 of design A; remainder Continuable). Separately confirm Review Request nav race when ready.
