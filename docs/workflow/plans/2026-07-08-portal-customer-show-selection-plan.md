# Plan: Portal Customer Show Selection

| Field | Value |
|-------|-------|
| Date | 2026-07-08 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | `docs/workflow/reviews/2026-07-08-portal-customer-show-selection-review.md` |

---

## Goal

Let Portal customers **queue their own print request to an upcoming Whatnot show** using the shared `@fresh-prints/show-picker` calendar UI — the same month grid + capacity slot cards as Studio **Add to Show**. Completes the promise in `PrintRequestDetailGuide` (“queue this request to a Whatnot show for printing”) without exposing staff-only Firestore paths.

**Exit criteria:** Customer with a draft/editing request (designs + quantities set) opens **Queue to show**, picks a date/slot on the calendar, confirms, and the request appears under **Queued** (or **Printing** when staff starts the show).

---

## Background

- `@fresh-prints/show-picker` ships in Studio `AddToShowModal`; Portal has dependency + `transpilePackages` only (ADR-FP-065).
- Phase 8 Slice 3 built browse → create → edit → track; **show allocation was explicitly out of scope** (staff-only via Studio).
- User confirmed Slice 3 live QA is done and chose **Managed Phase B** for customer show-selection.
- Today: customers cannot read `upcomingShows` (rules: staff-only) or write `showAllocations` (staff-only). Customers cannot set `printRequest.status` client-side. **Callable(s) required** — same pattern as `createPortalPrintRequest`.

---

## Scope

### In Scope

**Product rules (customer queue — simpler than Studio)**

1. **Single show, full request** — allocate every item’s full quantity to one show in one action (no split-across-shows, no per-item partial qty).
2. **No staff capacity override** — if total print count exceeds remaining show capacity, block with a clear error; full/over-capacity shows remain visible in picker (same UX as Studio) but confirm is disabled when selected show cannot fit the request.
3. **Editable requests only** — `status` is `draft` or `editing`; at least one `printRequestItem`.
4. **No re-queue** — if the request already has any non-canceled `showAllocations`, block (customer must contact staff to change show).
5. **Past shows excluded** — same rule as Studio (`filterShowsAvailableForAllocation` / `canAllocatePrintRequestToShow`).
6. **Archived shows excluded** — not offered in customer list (staff list comment says non-archived; enforce in callable).
7. **Ownership** — `requestOrigin: portal_customer`, linked `customerId` only.

**Backend — Cloud Functions**

8. Callable `listPortalAllocatableShows` (authenticated customer):
   - Query non-archived `upcomingShows` server-side (Admin SDK).
   - Filter past scheduled (shared util), map to customer-safe DTO: `id`, `scheduledStartAt` (ISO), `productionStatus`, `maxTotalQuantity`, `allocatedQuantity`.
   - No staff fields (notes, import metadata, sync fields).

9. Callable `queuePortalPrintRequestToShow` (authenticated customer):
   - Input: `{ printRequestId, upcomingShowId }`.
   - Validate ownership, editable status, zero existing allocations, show allocatable + capacity for **sum of all item quantities**.
   - Transaction: create one `showAllocations` doc per item (full item quantity, `status: pending`), increment show `allocatedQuantity`, set request `status: active` (mirrors `upcomingShowService.allocatePrintRequestItem` outcome).
   - Reuse shared validation helpers; extract shared allocation math to `functions/src/lib/portalShowAllocation.ts` to avoid drift.

**Shared package**

10. Move `filterShowsAvailableForAllocation`, `canAllocatePrintRequestToShow`, `isPastScheduledShow`, `PAST_SHOW_READ_ONLY_MESSAGE` from Studio renderer utils → `packages/shared/src/utils/showScheduleGrouping.ts` (types use minimal `ShowWithScheduledStart` interface + existing `UpcomingShow` where convenient).
11. Update Studio imports; add/move unit tests to `packages/shared`.

**Shared types**

12. `listPortalAllocatableShows.types.ts`, `queuePortalPrintRequestToShow.types.ts` under `packages/shared/src/types/portal/`.

**Portal UI**

13. `apps/portal/features/print-requests/services/portalShowSelectionService.ts` — wraps both callables.
14. Hooks: `usePortalAllocatableShows`, `useQueuePrintRequestToShow`.
15. `PortalQueueToShowModal.tsx` — `ShowPicker` + `buildShowPickerOptions`; import `@fresh-prints/show-picker/show-picker.css`.
16. `PrintRequestDetailView.tsx` — **Queue to show** primary action when `isEditable && items.length > 0 && !hasAllocations`; success refreshes detail + navigates to `/requests?tab=queued` (or refreshes in place).
17. Confirm modal copy: shows request total qty + selected show date/time; disabled confirm when show cannot fit.

**Docs**

18. ADR-FP-066 in `DECISIONS.md`; update `DATA_MODEL.md` / `BACKEND.md` (customer queue path); brief `packages/show-picker/README.md` Portal section marked implemented.

### Out of Scope

- Split request across multiple shows (Studio staff flow only).
- Staff capacity override for customers.
- Customer cancel/remove from show (staff Studio flow).
- Customer read of raw `upcomingShows` collection (callables only).
- Firestore rules relaxation for direct client allocation writes.
- Catalog “Save & queue” shortcut (detail page only in v1).
- Payments, Custom Requests, gang sheet, import, AI.
- Production App Hosting deploy without human approval.

---

## Affected Areas

### Files / Modules (expected)

| Area | Paths |
|------|-------|
| Functions | `functions/src/listPortalAllocatableShows.ts`, `queuePortalPrintRequestToShow.ts`, `functions/src/lib/portalShowAllocation.ts`, `functions/src/lib/portalShowAllocationValidation.ts`, `functions/src/index.ts` |
| Shared | `packages/shared/src/utils/showScheduleGrouping.ts`, tests; portal callable types |
| Studio import path | `src/renderer/.../groupShowsByUpcomingPast.ts` → re-export or delete after move; `AddToShowModal.tsx`, `upcomingShowService.ts` imports |
| Portal | `apps/portal/features/print-requests/**` (service, hooks, modal, detail view, styles) |
| Portal layout | `apps/portal/app/(app)/layout.tsx` or modal — ensure `show-picker.css` loaded |
| Docs | `docs/project/DECISIONS.md`, `DATA_MODEL.md`, `BACKEND.md`, `ROADMAP.md` |

### Architecture Impact

- [x] Portal feature module gains show-selection service layer; UI uses `@fresh-prints/show-picker` only via props mapping — no Studio/Electron imports.
- [x] Show schedule filter utils move to `@fresh-prints/shared` so Studio, Portal, and Functions share one definition.

### Security Impact

- [x] New callables: customer role + linked customer doc required.
- [x] Server-side only show list — no broad `upcomingShows` read rule for customers.
- [x] Allocation writes via Admin SDK inside callable; validates capacity without override.
- [x] **Security Agent review required** before Functions deploy to dev/prod.

### Data Model Impact

- [x] No new collections or fields. Uses existing `upcomingShows`, `showAllocations`, `printRequests`, `printRequestItems`.
- [x] Documents customer-initiated `draft`/`editing` → `active` transition (previously staff-only via allocation).

### Backend Impact

- [x] Two new callables; deploy to `fresh-prints-dev` (human checkpoint).
- [x] No new env vars.

### UI / UX Impact

- [x] New modal on request detail; mobile-first; manual QA on phone + desktop.

### Migration Impact

- [x] None — forward-only behavior for new customer actions.

---

## Approach

### 1. Shared show schedule utils

- Add `showScheduleGrouping.ts` in `@fresh-prints/shared` with `getShowScheduleTab`, `isPastScheduledShow`, `canAllocatePrintRequestToShow`, `filterShowsAvailableForAllocation`.
- Accept shows with `{ scheduledStartAt?: Timestamp | null }` or `Date | null` via small adapter for Portal/callable DTOs.
- Move tests from `groupShowsByUpcomingPast.test.ts`; Studio re-exports from shared or thin wrapper for `UpcomingShow`-typed imports.

### 2. Callable `listPortalAllocatableShows`

- Auth + customer role + linked customer (reuse `findCustomerByUserId` pattern from `createPortalPrintRequest.ts`).
- Load shows where `isArchived == false` (or missing/false).
- Filter with `filterShowsAvailableForAllocation`; return sorted DTO array.

### 3. Callable `queuePortalPrintRequestToShow`

- Load request, items, show, existing allocations for request.
- Guards: portal_customer, customerId match, editable status, items.length > 0, allocations.length === 0.
- `totalQty = sum(item.quantity)`; `remainingCapacity = maxTotalQuantity - allocatedQuantity` (if max set); reject if `totalQty > remainingCapacity`.
- Transaction per item: `setDoc` allocation + `updateDoc` show + `updateDoc` request status `active`.
- Return `{ allocationIds, upcomingShowId, totalAllocatedQuantity }`.

### 4. Portal UI

- Hook loads shows on modal open.
- Map DTO → `ShowPickerSource` → `buildShowPickerOptions`.
- Precompute `canFit = totalQty <= remainingCapacity` for selected show; disable confirm when false.
- On success: close modal, toast or inline success, refresh allocations hook on list/detail.

### 5. Verification + deploy

- Unit tests for validation + capacity math.
- Portal typecheck, root tsc, lint, targeted tests.
- Human: deploy functions, manual Portal QA.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Shared schedule tests | `npx tsx --test packages/shared/src/utils/showScheduleGrouping.test.ts` | yes |
| Functions validation tests | `npx tsx --test functions/src/lib/portalShowAllocationValidation.test.ts` | yes |
| Studio typecheck | `npx tsc --noEmit` | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Lint | `npm run lint` | yes |
| Studio build | `npx vite build` | yes |

### Manual

- [ ] Draft request with items → **Queue to show** → calendar → pick slot with enough capacity → confirm → request moves to **Queued** tab.
- [ ] Full show: slot visible but confirm disabled / error when capacity insufficient.
- [ ] Past show not listed.
- [ ] Request with existing allocation: **Queue to show** hidden or disabled with message.
- [ ] Studio Add to Show still works after shared util move.

---

## Human Checkpoints Anticipated

- [x] **Functions deploy** to `fresh-prints-dev` (`listPortalAllocatableShows`, `queuePortalPrintRequestToShow`) — human approval.
- [x] **Manual Portal QA** — mobile calendar modal + queue flow before signoff.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Allocation logic drifts from Studio | Medium | Shared capacity/split utils; callable mirrors `allocatePrintRequestItem` field list |
| Customer queues to wrong show | Low | Confirm modal shows date/time + total qty; read-only after queue |
| Race on show capacity | Medium | Transaction reads show doc inside transaction before write |
| Moving shared utils breaks Studio | Low | Move tests first; run full targeted suite |

---

## Rollback Plan

- Remove Portal UI + callables; customers return to staff-only queue (Slice 3 behavior). No data migration; existing allocations unchanged.

---

## Documentation Updates Required

- [x] `DECISIONS.md` — ADR-FP-066 Portal customer self-queue
- [x] `DATA_MODEL.md` — customer allocation path
- [x] `BACKEND.md` — new callables
- [x] `ROADMAP.md` — mark show selection in progress / complete at signoff

---

## Open Questions

- [x] **Single show only** — assumed yes (no customer split).
- [x] **No override** — assumed yes.
- [x] **Block if any prior allocation** — assumed yes.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-07-08-portal-customer-show-selection-review.md`
- Verdict: pending
