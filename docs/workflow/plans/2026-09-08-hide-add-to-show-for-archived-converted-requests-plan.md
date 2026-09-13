# Plan: Hide Add to Show for archived / converted print requests

| Field | Value |
|-------|-------|
| Date | 2026-09-08 |
| Author | Agent |
| Status | approved (amended 2026-09-08: hide Working queue badge when archived) |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-09-08-hide-add-to-show-for-archived-converted-requests-review.md |

---

## Goal

When Studio opens a historical customer print request that was converted to an internal request (status `archived`, `closureKind: converted_to_internal`), staff must not be able to add that request to a show or Internal Gangsheet. The archived record remains viewable for history only.

## Background

Owner reproduced: deep-link / open the archived converted customer request (`roasted_garlic-CR001` style). The detail banner correctly explains conversion and status shows **ARCHIVED**, but the top **Add to Show** action still renders because visibility is gated only by queue-lock / fully-printed (`isSelectedRequestDetailLocked`), not by archived or converted closure.

`upcomingShowService.allocatePrintRequestItem` also does not reject archived or converted requests, so UI-only hiding is insufficient.

Parked prior in-progress goal: `print-request-direct-export-gangsheet-and-copy` (investigation → plan only; no implementation authorized).

## Scope

### In Scope

- Shared eligibility helper: print request cannot be allocated when `status === "archived"` **or** `closureKind === "converted_to_internal"` (and preferably also `status === "completed"` for defense-in-depth consistency with closed requests).
- Studio Print Requests detail: hide **Add to Show** / **Add to Internal Gangsheet** when ineligible.
- Guard `openAddToShow` so the modal cannot open via stale handlers.
- Service-layer reject in `allocatePrintRequestItem` with a clear error.
- Unit/contract tests for helper + UI presence of the gate.
- **Amendment (owner 2026-09-08):** On archived requests, do not show the derived queue-state pill (**Working** / Queued / etc.). **ARCHIVED** status badge remains; origin badge remains.

### Out of Scope

- Changing convert-to-internal behavior or archive semantics.
- Hiding **Add designs**, edit/save detail, or other historical actions beyond allocation.
- Portal Add to Show changes (Portal should not surface these archived converted carts as working; not reported).
- Production deploy / Functions publish (Studio client + shared util only unless a cloud path also allocates without this service — none identified for this flow).
- The parked direct-export-gangsheet goal.

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/utils/printRequestConversion.ts` (or adjacent small util) — eligibility helper + tests
- `apps/studio/.../print-requests/pages/PrintRequestsPage.tsx` — hide actions + open guard
- `apps/studio/.../upcoming-shows/services/upcomingShowService.ts` — allocate reject
- Optional contract test under print-requests components/pages

### Architecture Impact

- [x] Details: Keep business rule in shared util; UI reflects; Studio service enforces. No new modules.

### Security Impact

- [x] Details: Fail closed on closed/converted requests at service boundary (client hide is UX only).

### Data Model Impact

- [x] None — uses existing `status` / `closureKind`.

### Backend Impact

- [x] Details: Client Firestore service path only (`upcomingShowService`); no Cloud Function change required for Studio Add to Show.

### UI / UX Impact

- [x] Details: On archived/converted customer request detail, top allocation CTA is absent. Conversion banner and historical detail remain.

### Migration Impact

- [x] None

---

## Approach

1. Add `getPrintRequestAllocationBlockReason({ status, closureKind })` (name flexible) returning `null` when allocatable, else a staff-safe reason string covering archived, converted_to_internal, and completed.
2. Export/use from `@fresh-prints/shared` next to existing conversion helpers.
3. In `PrintRequestsPage`, compute `allocationBlockReason` for `visibleSelectedRequest`; only render the page-actions allocation buttons when reason is null (still also respect existing detail-lock).
4. Early-return in `openAddToShow` if blocked.
5. In `allocatePrintRequestItem`, after loading `printRequest`, throw if blocked.
6. Tests: shared unit cases; light source/contract assertion that the page gates on the helper or archived/converted checks.
7. Hide detail queue-state badge when `status === "archived"` (helper on `printRequestQueueBadge` + conditional render).

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit (shared helper) | package test for shared util | yes |
| Contract / page gate | existing node:test style contract if cheap | yes if file pattern exists |
| Typecheck / lint / full suite | project scripts as applicable to touched packages | preferred; document if skipped |

### Manual

- [x] Details: Open archived converted customer request → **Add to Show** absent; open internal request → Add to Internal Gangsheet still available when otherwise eligible; open normal working customer request → Add to Show unchanged.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review — brief owner DEV check on archived converted deep link
- [ ] Design approval
- [ ] Business logic decision — rule confirmed by owner request (archived historical = not allocatable)
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Hide CTA but service still allocates | Medium | Enforce same helper in `allocatePrintRequestItem` |
| Over-block completed requests unexpectedly | Low | Completed already largely locked via fully-printed; document completed as closed |
| Parked export goal forgotten | Low | Record in workflow state Decision Log |

---

## Rollback Plan

Revert the shared helper usage and service guard commit; no data migration.

---

## Open Questions

- None blocking. Prefer hide (not disabled) for archived/converted CTAs.

---

## FreshForge Impact Classification

| Area | Impact? |
|------|---------|
| Starter Surface | No |
| Development Tooling | No |
| Distribution/Installer | No |
| Documentation | Workflow artifacts only |
| Development History | No |
