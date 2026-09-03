# Formal Review: Portal Editing request parks current draft

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-02-portal-editing-request-parks-current-draft-plan.md` |
| Baseline | `development @ 868b7ecd40e263b94fc1376b982c37bf4d87474d` |
| Verdict | **approved_with_changes** |

---

## Summary

Plan is sound and necessary: park a meaningful Portal draft behind an active Editing Continuable instead of `continuable_request_conflict`, without a new lifecycle status and without reversing ADR-FP-158. Repo audit confirms Continuable/Current Request already treat `editing` as editable; the conflict is only the one-Continuable create/unqueue guard. **Required changes:** (1) bidirectional server-only parking fields named below; (2) Studio remove-from-show must enter a trusted TX for park+editing (client-only status write is insufficient); (3) empty drafts are archived in the park TX, not parked; (4) parked drafts stay on Working list but locked.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Parking only; ADR-FP-158 preserved |
| Architecture alignment | pass | Services/helpers own park; UI consumes resolver |
| Security impact addressed | pass | Server-only parking fields; mutation assert |
| Data Model impact addressed | pass | Exact fields below; no new status |
| Backend impact addressed | pass_with_changes | Studio TX callable required |
| Test strategy adequate | pass | Matrix in plan + goal |
| Human checkpoints identified | pass | Owner QA DEV; UX defaults below |
| Roadmap alignment | pass | Queued next after Editing tab |
| Documentation plan | pass | ADR-FP-071 amend; ADR-FP-158 keep |
| No silent scope expansion | pass | MOVE/DNP unchanged unless editing |

---

## Answers (repo-audited)

### 1. ADR-FP-071 current Continuable contract

**At most one** Portal Continuable per customer: `status ∈ {draft, editing}`.  
Create (`createWorkingPrintRequestInTransaction`) fails if any Portal-editable Continuable exists.  
Unqueue / `shouldTransitionActiveRequestToEditing` fails when `hasOtherContinuableRequest`.  
Source: `docs/project/DECISIONS.md` ADR-FP-071; `packages/shared/src/utils/portalOneWorkingPrintRequest.ts`; `functions/src/lib/portalWorkingPrintRequest.ts`.

### 2. ADR-FP-158 Portal Editing-tab contract

Portal list tabs = Working \| **Editing** \| Queued \| Printing \| Printed via shared derive (`status=editing` → Editing tab). Continuable semantics unchanged in that goal. **Must preserve** — do not fold Editing into Working.

### 3. Current Request resolver

`PortalPrintRequestContext`:  
`workingRequest = selectPortalWorkingPrintRequest(portalEditableContinuableRequests, selectedWorkingRequestId)`  
with `filterPortalEditableContinuablePrintRequests` over Continuable list.  
File: `apps/portal/features/print-requests/context/PortalPrintRequestContext.tsx` + `portalPrintRequestEditability.ts`.

### 4. Active / editable resolver (today)

Same as Current Request: any Portal-editable Continuable (`draft`|`editing`). No parking concept. Upload/Add use `resolveOrCreateWorkingPrintRequestInTransaction` (single Continuable or create).

### 5. Duplicate Continuable conflict path

| Path | Mechanism |
|------|-----------|
| Portal unqueue | `evaluatePortalPrintRequestUnqueue` → `continuable_request_conflict` when `hasOtherPortalEditableContinuableRequest` |
| Server unqueue | `unqueuePortalPrintRequestFromShow.ts` → `customerHasOtherPortalEditableContinuableRequest` |
| Recovery | `shouldTransitionActiveRequestToEditing(..., hasOtherContinuableRequest)` |
| Studio remove | `customerHasOtherContinuablePrintRequest` (any draft\|editing) |

### 6. Catalog Add target paths

All browse Adds → `useAddDesignToRequestFlow` → `resolvePortalWorkingRequestBranch` / `ensureWorkingPrintRequestId` / `addPortalCatalogDesignToPrintRequest`.  
Surfaces: Catalog home, Design Library, Share (`share/design/[id]`), Favorites, Account artwork gallery, Show design gallery.  
Callable: `functions/src/addPortalCatalogDesignToPrintRequest.ts` (requires Continuable status).

### 7. Upload target path

`confirmCustomerUploadsAndAttachToRequest` → `resolveOrCreateWorkingPrintRequestInTransaction` (no client `printRequestId`). Assisted proof: `customerAddAssistedApprovedProofToPrintRequest` same resolve helper.

### 8. Item-mutation authorization

Continuable status `draft|editing` + owner (+ origin checks on most callables):  
`updatePortalPrintRequestItemQuantity`, `addPortalCatalogDesignToPrintRequest`, `duplicatePortalPrintRequestItem`, `removePortalPrintRequestItem`, `clearPortalWorkingPrintRequest`.  
Size: client `updateDoc` after Continuable precheck (Rules).  
**Gap today:** no parked rejection — implementers must add `assertPortalActiveEditablePrintRequest`.

### 9. Portal queue path

`queuePortalPrintRequestToShow` + `PortalQueueToShowModal` / detail CTA; drawer routes to detail then queue. Target = Continuable request id. Success → `status: active`, clears Current Request cart.

### 10. Studio unqueue paths

**No Studio unqueue callable today.**  
`upcomingShowService.removeShowAllocation` / `removeShowAllocationsForRequest` → delete allocations → `markPrintRequestEditingIfNoActiveAllocations` (client `updatePrintRequest({ status: "editing" })`) gated by `shouldTransitionActiveRequestToEditing`.  
UI: `PrintRequestsPage.handleRemoveSelectedRequestFromShowQueue`.

### 11. Editing entry paths (status → editing)

1. `unqueuePortalPrintRequestFromShow` (+ heal stuck active)  
2. Studio `markPrintRequestEditingIfNoActiveAllocations`  
3. `showProductionRecovery.reconcileRequestAfterRelease` (release / force paths) when guard allows  

**Not entry:** Show MOVE; DNP `requeue_unfulfilled`.

### 12. Editing exit paths

| Exit | Restores parked draft? |
|------|-------------------------|
| Portal `queuePortalPrintRequestToShow` → `active` | **YES** — primary restore |
| Studio first allocate on editing → `active` | **YES** |
| DNP requeue sets `draft|editing` → `active` | **YES** if was editing with park |
| `clearPortalWorkingPrintRequest` | **NO** — clear keeps Continuable; if clearing Editing while parked exists → **restore parked + clear editing items OR block clear of Editing** — **required change: restore parked when Editing Continuable is cleared/archived/deleted** |
| Archive Editing (`archiveStaleWorkingPrintRequests`, admin) | **YES** restore |
| `deleteEligiblePrintRequest` on Editing | **YES** restore |
| `convertCustomerPrintRequestToInternal` on Editing | **YES** restore |
| Completed while editing (rare) | **YES** restore if park present |

### 13–14. Proposed parking data model / exact new fields

**No new status.** Pattern matches existing optional relationship fields (`convertedTo*`, `needsStaffRequeue*`).

| Field | On document | Type | Purpose |
|-------|-------------|------|---------|
| `parkedByEditingRequestId` | Parked **draft** | `string` | Marks inactive; mutation reject; points at Editing PR |
| `parkedAt` | Parked **draft** | `Timestamp` | Audit |
| `parksDraftPrintRequestId` | Active **editing** PR | `string` | Deterministic restore + banner without scan |

Server (Admin SDK / callables) only. Same `customerId` required on both docs when parking.

**Rejected alternatives:** new `status: parked`; customer-level active pointer (architecture is query-first Continuable).

### 15. Parked draft Working-tab behavior

**Recommend: KEEP visible on Working** (`status=draft` still derives Working). Mark inactive (badge/copy). Do **not** hide — owner requirement is inactivity/mutation safety, and ADR-FP-158 already separates Editing tab membership from Working.

### 16. Locked parked-draft UX

Detail + any open route: non-editable controls; message that request is temporarily inactive while another request is being edited; primary CTA navigates to Editing PR (`parksDraft` reverse via `parkedByEditingRequestId` / list). No silent redirect.

### 17. Active Continuable resolution priority

1. Portal-editable Continuable with `status === "editing"` (at most one)  
2. Else Portal-editable `draft` **without** `parkedByEditingRequestId`  
3. Else create-on-demand (existing lazy create)  

Parked drafts excluded from Current Request, Add, upload resolve, queue target.

### 18–19. Park / restore atomicity

- **Park:** same Firestore transaction as `status → editing` (and Studio alloc cancel when using new callable). Never park then fail editing.  
- **Restore:** same transaction as successful Editing → `active` (or approved terminal cleanup). Never restore before authoritative queue/alloc success.

### 20. Restore triggers

See §12 table. Shared `restoreParkedDraftForEditingRequest(editingId)` called from every exit.

### 21. Empty-draft handling

Meaningful = `itemCount > 0` (merge convention in `customerMergeContinuablePrintRequests.ts`).  
**Recommend:** empty Portal-editable draft → **archive** in park TX (do not park). Aligns with `archiveStaleWorkingPrintRequests` / merge empty cleanup. Do not manufacture empty parked records.

### 22. Ownership validation

Park only when both requests share the same `customerId`, Editing is Portal-customer origin (or Studio customer PR with `customerId`), `isInternal !== true`, and draft is Portal-editable Continuable. Never park Internal / other customer.

### 23. Stale-session behavior

Server `assertPortalActiveEditablePrintRequest` on every mutation/Add/queue; parked → `failed-precondition`. Refresh → active Editing via resolver.

### 24. Concurrency

TX re-read Continuables; fail closed if >1 Editing or conflicting park; Studio + Portal unqueue both use same helper.

### 25. Editing UI parity gaps

Detail qty/size/duplicate/remove/queue already parity when Continuable. Gaps to close: banner; Current Request chrome labeling Editing mode; ensure Add/upload never create second draft while Editing active; parked Working card locked.

### 26. Banner strategy

- Persistent banner on **Current Request drawer** + **request detail** when active Continuable is Editing.  
- Optional thin strip near existing `PortalWorkingRequestLimitBanner` (not every catalog page).  
- Parked draft: locked-state message only.  
Copy: Editing removed-from-show; previous Current Request saved/inactive; re-queue Editing to restore.

### 27. Show-move impact

**None.** MOVE does not set `editing`. Do not call park. Regression required.

### 28. DNP impact

`requeue_unfulfilled` does not set editing. `release_unfulfilled` may set editing via `shouldTransitionActiveRequestToEditing` → **must park** when that path succeeds. Do not change DNP product semantics beyond shared park helper.

### 29. Internal exclusion

Internal `status=editing` for Studio tabs only — no park, no Portal Current Request semantics.

### 30. Limits / caps

`maxQuantityPerPrintRequest` stays on active Continuable items only. Parked draft not a second active cart. Create blocked only when active Continuable exists (Editing or unparked draft). Cap A legacy field remains non-gating.

### 31–32. ADR amendments

- **Amend ADR-FP-071:** Continuable statuses still `draft|editing`; add **active editable Continuable** + parking relationship; conflict replaced by park for meaningful draft.  
- **Preserve ADR-FP-158:** Portal Editing tab remains; Editing may own Current Request while listed under Editing.

### 33. Functions impact

YES — unqueue, queue, working resolve/create, mutations, upload/assisted attach, recovery release, **new/extended Studio remove-from-show TX**, merge Continuable policy, clear/archive/delete/convert restore hooks.

### 34. Firestore Rules impact

YES — allowlist `parkedByEditingRequestId`, `parkedAt`, `parksDraftPrintRequestId` in `printRequestRequiredFieldsValid`; `optionalFieldUnchanged` in staff general updates (Admin SDK writes only).

### 35. Storage Rules

**NO** expected.

### 36. Indexes

**NO** new index required if bidirectional fields used. Continuable query still `customerId + status in [draft,editing]`; filter parked in code.

### 37. Migration / backfill

**None expected.** Verify no DEV/prod pairs of draft+editing. If found → `[NEEDS OWNER DECISION]` before inventing backfill. Do not run production reconcile.

### 38. Exact files expected

See Plan “Affected Areas”. Highest-risk new surface: Studio trusted remove/park callable + Portal banner/locked UX.

### 39. Tests

Goal matrix §§1–49 + Studio Editing tab regression + Portal Editing tab regression (ADR-FP-158).

### 40. DEV deploy scope

- Firestore Rules (parking fields)  
- Functions: unqueue, queue, working resolve consumers, mutations, recovery, **Studio remove/park callable**, related  
- Portal + Studio clients  
- No Storage; no indexes expected  

Production **NOT AUTHORIZED**.

### 41. Owner QA

Per goal A–M on `fresh-prints-dev`.

### 42. Production inventory

Shared + Portal + Studio + Functions + Rules; optional DEV-only verify script; no Storage/indexes; no prod backfill unless audit finds pairs.

### 43. [NEEDS OWNER DECISION]

| ID | Topic | Default if owner silent at implement gate |
|----|-------|-------------------------------------------|
| OD-1 | Parked draft on Working list vs hide | **Keep visible + locked** |
| OD-2 | Empty draft archive vs hard-delete | **Archive** |
| OD-3 | Clear Editing request while parked exists | **Restore parked, then clear Editing items / or block clear with copy** — recommend **restore then keep Editing doc cleared as empty Continuable OR restore and archive empty Editing** — implement default: **restore parked as active; clear items on Editing then archive Editing** so one Continuable remains |

Non-blocking for Plan approval if defaults accepted as `approved_with_changes`.

---

## Architecture Review

**Findings:** Query-first Continuable stays; parking is relationship metadata; Studio must stop relying on client-only `status: editing` for park atomicity.

**Required changes:**

1. Introduce trusted Studio path for customer remove-from-show → editing + park in one TX (callable preferred).  
2. Centralize `parkDraftForEditingRequest` / `restoreParkedDraft` / `assertPortalActiveEditablePrintRequest`.  
3. Do not invent a customer document pointer.

---

## Security Review

**Findings:** Parking fields must be server-only; staff Rules updates must not mutate them; mutation/queue fail closed on parked.

**Required changes:** Rules allowlist + `optionalFieldUnchanged`.

**Human approval needed before production:** Rules + Functions promote later — not now.

---

## Data Model Review

**Findings:** Bidirectional optional fields; no status change; empty → archive.

**Required changes:** Types + DATA_MODEL + Rules keys list.

---

## Backend Review

**Findings:** Portal unqueue already TX-capable; Studio is the gap; queue is primary restore; recovery release must park.

**Required changes:** Studio TX; wire restore on all exits in §12.

---

## Testing Review

**Findings:** Matrix adequate; emphasize MOVE non-regression and stale-tab parked reject.

**Required changes:** None beyond executing matrix.

---

## Documentation Review

Amend ADR-FP-071; note ADR-FP-158 preservation; DATA_MODEL parking fields; BACKEND if new callable.

---

## Required Changes (approved_with_changes)

1. Exact fields: `parkedByEditingRequestId`, `parkedAt`, `parksDraftPrintRequestId` (server-only).  
2. Studio customer remove-from-show → trusted TX for editing + park (not client-only status write).  
3. Empty Continuable draft → archive in park TX (not park).  
4. Parked draft remains on Working list with locked UX (default).  
5. Restore helper on every Editing exit in §12 (including clear/archive/delete/convert).  
6. Amend ADR-FP-071; preserve ADR-FP-158 Portal Editing tab.  
7. Show MOVE must not park; DNP release-only parks only when status becomes editing.

---

## Blockers

- [ ] None for implementation start after owner accepts defaults OD-1…OD-3 (or replies).

---

## Verdict Rationale

**approved_with_changes** — Goal and approach approved; implementation must follow the required changes above. No production work.

---

## Next Step

Owner may accept OD defaults and authorize **Implement**, or reply with OD overrides. Do not implement until explicitly started.
