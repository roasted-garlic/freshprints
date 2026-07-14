# Signoff: Portal Persistent Current Request

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-07-12-portal-persistent-current-request-plan.md |
| Review | docs/workflow/reviews/2026-07-12-portal-persistent-current-request-review.md |
| Test report | docs/workflow/reviews/2026-07-12-portal-persistent-current-request-test-report.md |
| Load regression | docs/workflow/reviews/2026-07-12-portal-persistent-current-request-load-regression-test-report.md |
| Manual checkpoint | docs/workflow/reviews/2026-07-12-portal-persistent-current-request-manual-checkpoint.md |
| Final status | **approved_with_notes** |

---

## Summary

Portal cart-style **Current Request** flow is complete on `fresh-prints-dev` (ADR-FP-076): lazy virtual-empty working request, header Upload Designs + basket, drawer summary, catalog direct-add with primary-variant increment, dedicated `/requests/artwork`, and Review Request detail/queue. Subsequent donate (ADR-FP-078) and triage/clear (ADR-FP-079) phases already built on this contract. Owner accepted workflow signoff on 2026-07-13, closing the outstanding manual checkpoint for managed-phase purposes.

---

## Changes Delivered

### Behavior
- Authenticated Portal always surfaces a **Current Request** (virtual empty until first persistent action)
- Catalog Discover / Library **direct-add** (no selection-mode navigation on normal browse); steppers when design is in request
- Header **Upload Designs** + basket badge (total print qty); responsive Current Request drawer
- Dedicated `/requests/artwork` attach path (print / Current Request only — not donations)
- Review Request detail preserves qty / size / duplicate / DPI / Add Request to Show; queue clears Current Request
- Load-regression fix: drawer mounts from shell (breaks context ↔ drawer circular import); safe `createdAt` millis

### Files Created (representative)
- `packages/shared/src/utils/currentRequestAggregates.ts` (+ tests)
- `apps/portal/features/print-requests/components/CurrentRequestDrawer.tsx`
- `apps/portal/app/(app)/requests/artwork/page.tsx`
- `apps/portal/features/print-requests/context/PortalPrintRequestContext.boundary.test.ts`
- Workflow plan / review / test / manual checkpoint artifacts under `docs/workflow/`

### Files Modified (representative)
- `PortalPrintRequestContext.tsx`, `PortalAppShell.tsx`, catalog cards/pages, add-design flow, navigation header/actions
- `portalPrintRequestService.ts`, working-items hook
- `docs/project/DECISIONS.md` (ADR-FP-076)

### Documentation Updated
- ADR-FP-076 accepted
- ROADMAP Phase 8 fast-follow line marked complete at this signoff

---

## Tests

### Automated
From test reports (`passed_with_notes`):
- Aggregates / one-working / add-branch / boundary unit tests — **15/15 pass**
- Portal typecheck — **pass**
- Portal lint (`apps/portal`) — **pass**
- Portal build — **pass** (`/requests/artwork` routed)
- HTTP smoke after load fix — **200** on `/`, `/login`, `/catalog`, `/catalog/library`, `/requests`, `/requests/artwork`
- Functions unchanged this phase — not re-run

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Load gate + cart-style UX checkpoint (24-step + mid-checkpoint UX fixes) | PASS (owner acceptance at signoff) | owner 2026-07-13 |

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | 2026-07-13 | Dev-env feature closeout |
| Design / UX | obtained | 2026-07-13 | Owner closed manual gate via signoff request |
| Business / policy | obtained | 2026-07-12 | Cart-style / no checkout / donate separation in ADR-FP-076 |
| Database migration | N/A | | No new required fields |
| Secrets / env | N/A | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Legacy `?mode=request-selection` helpers still present (Part G retention) | low | Safe dual path; delete only in a dedicated cleanup when no deep links remain |
| ARCHITECTURE.md may lack Current Request surface notes | low | Docs follow-up when next touching Portal architecture |
| Monorepo lint `--max-warnings 0` may still fail on pre-existing Studio warnings | low | Portal-scoped lint green; Studio debt separate |

---

## Deferred Items (Roadmap)
- Full selection-mode code retirement (Part G cleanup)
- Production Portal App Hosting deploy (separate checkpoint)
- ARCHITECTURE.md Current Request surface polish

---

## Open Blockers
- [x] None

---

## Verdict

**approved_with_notes** — implementation and automated tests complete; load regression remediated; ADR-FP-076 accepted; owner closed the manual checkpoint for workflow signoff on 2026-07-13. Selection-mode dual path retained intentionally.

---

## Workflow Complete
- [x] Signoff document written
- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] Manual checkpoint marked closed by owner acceptance
- [ ] `references/project-chatgpt-handoff/` — **not present in repo**; handoff refresh N/A

**Recommended next action for user:** Continue with Phase 9 planning, production Portal deploy, or monorepo normalization — pick explicitly.
