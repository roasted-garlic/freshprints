# Corrective Implementation Review: Portal Editing Continuable parking

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Goal | `portal-editing-request-parks-current-draft` |
| Prior Owner QA | `docs/workflow/reviews/2026-09-02-portal-editing-request-parks-current-draft-owner-qa.md` — **FAIL** (preserved) |
| Verdict | **approved** — ready for corrective DEV deploy checkpoint (**not deployed**) |

---

## Answers (required)

1. **Wrong-design behavior — UI-only or data corruption?**  
   **UI-only.** DEV integrity scan of live parked pair:
   - Editing `nHVb6wOEYQ698dLrhNUV` (CR004): 6 items / distinct design ids  
   - Parked `r0TbN4B84gRLzHA6mF9T` (CR005): 5 items / different design ids (qty 2 each = 10 prints)  
   No shared item ids; Firestore did not copy PR-A items into PR-B.

2. **Exact root cause of wrong item display**  
   On active Continuable ID switch (A→B), `useWorkingCurrentRequestItems` kept prior cart state and `mergeServerWorkingItemsWithLocal` **preserved A’s local rows** into B’s merge. Detail view mirrors `workingItems` while viewing Current Request, so Editing B temporarily rendered A’s designs.

3. **Exact fix for request-scoped rebinding**  
   - Clear cart immediately when `workingRequest.id` changes.  
   - Scope merge with `printRequestId` so foreign local rows are dropped.  
   - Unqueue sets `selectedWorkingRequestId` to the Editing PR and uses `from=editing`.

4. **Exact root cause of `from=working`**  
   `PrintRequestDetailView.applySuccessfulUnqueue` hard-coded `buildRequestDetailHref(..., { from: 'working' })`.

5. **Exact route fix**  
   Unqueue success now uses `{ from: 'editing' }` and selects the Editing request as Current Request.

6. **Why parked draft remained editable**  
   Soft alert only was insufficient **and** `mapPrintRequest` **dropped** `parkedByEditingRequestId` / `parksDraftPrintRequestId` / `parkedAt`, so every `isPortalParkedDraft` / active-editable check stayed false client-side. `usePrintRequestDetail` also gated on Continuable-only `isPortalEditablePrintRequest`.

7. **Exact overlay / editability fix**  
   Map parking fields in `portalPrintRequestService.mapPrintRequest`; use `isPortalActiveEditablePrintRequest` in `usePrintRequestDetail`; `PortalParkedDraftOverlay` over dimmed editor; Working card inactive marker.

8. **Why Add picker included parked draft**  
   Branch/picker used all Continuables **and** missing mapped parking fields meant parked drafts could not be filtered as inactive.

9. **Exact picker-removal behavior**  
   Map parking fields; branch uses **active editable only**. Unique Editing auto-targeted. Multiple actives without unique Editing → `conflict` (fail closed, no picker). Parked never candidates.

10. **Site-wide banner location**  
    `PortalSiteWideEditingModeBanner` in `PortalAppShell` sticky top (authenticated shell only).

11. **How banner knows Editing is active**  
    `workingRequest.status === 'editing'` via `isEditingModeActive` from `selectPortalActiveEditablePrintRequest`.

12. **How banner clears after restore**  
    After successful queue/restore, active editable becomes the unparked draft (or empty) → `isEditingModeActive` false → banner unmounts.

13. **Every Add surface targets active Editing?**  
    Yes — all surfaces use `useAddDesignToRequestFlow`, which now resolves active-editable-only / Editing preference.

14. **Uploads target active Editing?**  
    Upload attach uses Current Request / `ensureWorkingPrintRequestId` → same active editable resolver (parked excluded).

15. **Parked stale mutations still fail server-side?**  
    Yes — existing Rules `isPrintRequestParked` + callable `assertPortalActiveEditableRequestData` unchanged this pass.

16. **ADR-FP-158 intact?**  
    Yes — Editing tab membership unchanged; Continuable parking does not move Editing into Working.

### Additional Owner-reported bug (requeue TX)

**Root cause:** `queuePortalPrintRequestToShow` called `applyRestoreParkedDraftInTransaction` **after** allocation writes; that helper `transaction.get`s the parked draft → Firestore “all reads before all writes”.

**Fix:** Split restore into read/write phases; queue (and convert / recovery requeue) read parked draft before any writes; merge parking field clears into the status update.

---

## Tests

| Check | Result |
|-------|--------|
| Focused shared + Portal branch/merge/contract | **58/58 PASS** |
| Functions `npm run build` | **PASS** |
| Portal typecheck | Pre-existing `interactiveEnhance*` only |
| Studio typecheck | No Studio client corrective changes this pass |
| Rules tests | Not re-run (Java missing locally; Rules **unchanged**) |

---

## Corrective DEV deploy checkpoint (STOP — do not deploy yet)

### Functions (`fresh-prints-dev`) — redeploy only if authorized

**Required (runtime TX / restore ordering):**

- `queuePortalPrintRequestToShow` (**must** — requeue FIX)
- `convertCustomerPrintRequestToInternal`
- `applyShowProductionRecovery` (embeds requeue restore read/write split)

**Optional / unchanged entry behavior but shares helper:**

- `onPrintRequestEditingExitRestoreParked` (still uses combined helper safely alone in TX — redeploy only if shipping rebuilt bundle with helper changes)
- `deleteEligiblePrintRequest` (restore still first-read-safe)

**Minimum recommended corrective Functions set:**

1. `queuePortalPrintRequestToShow`  
2. `convertCustomerPrintRequestToInternal`  
3. `applyShowProductionRecovery`  
4. `onPrintRequestEditingExitRestoreParked` (helper export surface changed)  
5. `deleteEligiblePrintRequest` (imports same module)

### Firestore Rules

**NONE** (no corrective Rules diff)

### Portal

Local `dev:portal` restart/hard reload only — **no production hosting**

### Studio

No client source change this corrective; restart optional after Functions redeploy for unrelated caching. Trusted unqueue path unchanged.

### Indexes / Migration / Storage / Production

**NONE** / **NOT AUTHORIZED**
