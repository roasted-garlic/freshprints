# Signoff: Portal Customer Show Selection

| Field | Value |
|-------|-------|
| Date | 2026-07-08 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-07-08-portal-customer-show-selection-plan.md` |
| Review | `docs/workflow/reviews/2026-07-08-portal-customer-show-selection-review.md` |
| Test report | `docs/workflow/reviews/2026-07-08-portal-customer-show-selection-test-report.md` |
| Final status | **approved** |

---

## Summary

Portal customers can **add their own print request to a show's print run** using the shared `@fresh-prints/show-picker` calendar (same UX as Studio Add to Show). Two new callables (`listPortalAllocatableShows`, `queuePortalPrintRequestToShow`) expose customer-safe show data and perform transactional allocations via Admin SDK — no Firestore rules relaxation for client writes.

User confirmed **functions deploy** and **manual QA PASS** 2026-07-08, including follow-up Portal UX polish (request list refresh, tab guidance, mobile header centering, show print-run copy).

---

## Changes Delivered

### Behavior

**Customer show selection**
- Callable `listPortalAllocatableShows` — non-archived, non-past upcoming shows as customer-safe DTOs
- Callable `queuePortalPrintRequestToShow` — single show, full request, no capacity override, no re-queue
- `PortalQueueToShowModal` with `ShowPicker`; **Add to show** on request detail when editable with items and no allocations
- Success navigates to **Queued** tab; request becomes read-only per existing allocation rules

**Shared infrastructure**
- `showScheduleGrouping` moved to `@fresh-prints/shared` (Studio + Portal + Functions aligned)
- `portalShowQueueCapacity` shared utils for customer capacity checks

**Portal UX polish (same phase, QA'd)**
- Requests list/dashboard refresh without hard refresh after queueing
- Tab explainers and empty-state copy (show's print run wording)
- Mobile app header brand centered
- Studio Show Queue attached requests sorted newest first (related fix)

### Key packages / files

- `functions/src/listPortalAllocatableShows.ts`, `queuePortalPrintRequestToShow.ts`, `lib/portalShowAllocation*.ts`
- `packages/shared/src/utils/showScheduleGrouping.ts`, `portalShowQueueCapacity.ts`
- `packages/shared/src/types/portal/*.types.ts`
- `apps/portal/features/print-requests/` — service, hooks, `PortalQueueToShowModal`, detail view
- `docs/project/DECISIONS.md` (ADR-FP-066)

### Documentation

- ADR-FP-066, `DATA_MODEL.md`, `BACKEND.md`, `packages/show-picker/README.md` updated during implementation

---

## Tests

### Automated

See test report — targeted suites (40/40), typecheck, lint, Studio build PASS.

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Functions deploy (`fresh-prints-dev`) | Deployed | User 2026-07-08 |
| Add to show → calendar → Queued tab | PASS | User 2026-07-08 |
| Capacity / past show / re-queue guards | PASS | User 2026-07-08 |
| Studio Add to Show regression | PASS | User 2026-07-08 |
| Portal UX polish (copy, header, list refresh) | PASS | User 2026-07-08 |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Functions deploy to dev | obtained | 2026-07-08 | Required for QA |
| Manual Portal QA | obtained | 2026-07-08 | User: "Everything looks great and passes" |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Allocation logic drift vs Studio | Low | Shared schedule + capacity utils; callable mirrors staff allocation fields |
| Customer cannot change show after queue | Low | By design; staff Studio flow for changes |
| Production Portal App Hosting deploy | Medium | Separate human checkpoint when ready for live customers |

---

## Deferred Items (Roadmap)

- Customer split across multiple shows (staff only)
- Customer cancel/remove from show (staff only)
- Catalog "Save & add to show" shortcut
- Production App Hosting deploy
- Phase 8 closeout doc pass / `apps/studio` monorepo normalization (optional next phase)

---

## Open Blockers

- [x] None

---

## Verdict

**approved** — Plan scope delivered; automated checks passed; user manual QA PASS; dev functions deployed.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] `project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `project-chatgpt-handoff/13-recent-completed-work.md` updated
- [x] `project-chatgpt-handoff/03-roadmap-and-phases.md` updated
- [x] `project-chatgpt-handoff/04-features-inventory.md` updated

**Recommended next action for user:** Phase 8 closeout (mark Portal MVP complete in docs) or production Portal deploy when ready; optional `apps/studio` monorepo normalization as a dedicated refactor phase.
