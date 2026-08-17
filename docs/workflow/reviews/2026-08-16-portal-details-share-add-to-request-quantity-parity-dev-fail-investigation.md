# Investigation: DEV TD-030 QA FAIL — “cannot be edited from the portal” / empty after refresh

| Field | Value |
|-------|-------|
| Date | 2026-08-16 |
| Goal | `portal-details-share-add-to-request-quantity-parity` |
| Owner QA | `DEV TD-030 QA: FAIL` |
| Status | investigation complete — **no code change yet** |
| Production | untouched; cutover CLOSED |

---

## Verdict (short)

| Question | Answer |
|----------|--------|
| Root cause of the **message** | Cloud Function `failedPrecondition` when the targeted `printRequests` doc is **not** Portal-editable: `requestOrigin !== "portal_customer"` **or** `isInternal === true`. |
| Root cause of **qty + warning together** | Optimistic Working Request patch succeeds in memory; persist then fails; share page (TD-030) now treats membership as “in request” so qty controls render; `actionError` shows the callable message. Silent reload **keeps** the optimistic stub (`mergeServerWorkingItemsWithLocal`). |
| Root cause of **empty after refresh** | The add **did not persist**. Full reload reconstructs from Firestore. There is no item. |
| Did TD-030 change the mutation path? | **No.** Share uses the same `useAddDesignToRequestFlow` → `addOrIncrementCatalogDesign` / `setPrimaryCatalogDesignQuantity` / `removeCatalogDesignFromRequest` as Discover/Details. |
| Did TD-030 cause the persist failure? | **No.** That check existed in Functions before this goal. |
| Did TD-030 change what you see on a failed add? | **Yes.** Share previously ignored membership and kept “Add to request”. It now shows qty controls off optimistic state, so a failed persist looks like a Working Request regression. |
| Production | Add succeeds there (Wave 4). Production customers’ working requests are `portal_customer`. This DEV failure is **not** the known production TD-030 defect. |
| Backend/rules/data repair | **No Rules/Functions/index/schema change** unless a later plan explicitly changes Portal’s continuable-request definition. Likely **DEV request document** is Studio/legacy/internal (or missing `requestOrigin`). |

Classification: **B + C + D**, with a **TD-030 visibility change (A UI-only)**.

- **A (TD-030 code):** only the share CTA now follows optimistic membership. It did not introduce a second add API.
- **B (DEV data/config):** the callable only emits this exact string for origin/internal. Production does not.
- **C (in-memory vs persisted):** optimistic add, failed flush, merge keeps stub; refresh drops it.
- **D (ownership/status/source):** trigger is **`requestOrigin` / `isInternal`**, not draft/editing status (status would be “This print request can no longer be edited.”).

---

## Exact condition that produces the message

Thrown in all three Portal item callables:

```175:177:functions/src/addPortalCatalogDesignToPrintRequest.ts
        if (requestData.requestOrigin !== "portal_customer" || requestData.isInternal === true) {
          throw failedPrecondition("This request cannot be edited from the portal.");
        }
```

Same check:

- `functions/src/updatePortalPrintRequestItemQuantity.ts` (qty +/-)
- `functions/src/removePortalPrintRequestItem.ts` (remove)

**Fields:**

| Field | Rejects when |
|-------|----------------|
| `requestOrigin` | missing, `studio_customer`, `studio_internal`, or any value other than `"portal_customer"` |
| `isInternal` | `true` (even if origin were portal) |

**Not this message:**

| Condition | Message |
|-----------|---------|
| `customerId` mismatch | permission denied — “You do not own this print request.” |
| status not `draft`/`editing` | “This print request can no longer be edited.” |
| already has a continuable and create is attempted | “You already have a request in progress…” |

The share page does **not** compute this string. It renders `addDesignFlow.actionError` from the callable.

---

## Path comparison (same customer, same hook)

| Surface | Add | Qty | Remove | Membership source |
|---------|-----|-----|--------|-------------------|
| Discover/catalog cards | `addDesignFlow.addDesign` | `setQuantity` | `removeDesign` | `currentRequestAggregates` |
| Design Details | same, via modal props | same | same | same |
| `/share/design/{id}` **after TD-030** | **same** `addDesign` | **same** `setQuantity` | **same** `removeDesign` | **same** aggregates |

Share does **not** pass a different `printRequestId`. `resolveAddDesignToRequestBranch(continuableRequests)` + `ensureWorkingPrintRequestId()` pick `continuableRequests[0]` (chrome list: customerId + status `draft`/`editing` only). **Origin is not filtered.**

Portal-created working requests are written with `requestOrigin: "portal_customer"`, `isInternal: false` (`functions/src/lib/portalWorkingPrintRequest.ts`). Studio customer drafts are `studio_customer`.

If the DEV account’s only continuable doc is Studio/legacy/internal:

1. Portal treats it as the Working Request (status-only).
2. Optimistic add patches items → qty controls (share, now).
3. Callable refuses origin/internal.
4. Portal cannot create a replacement (`PORTAL_ONE_WORKING_REQUEST_MESSAGE` if create is attempted while that draft exists).
5. Refresh: empty cart on that still-continuable request.

That deadlock is **account/data**, not share-specific wiring. Discover add would fail the same callable. Discover **reads** can still show qty controls for items already on that request; **+/- persist** would hit the same origin check.

---

## Why qty stays until refresh

1. `adjustQuantity` / `queuePrimaryQuantity` patches an `optimistic:{designId}` row immediately.
2. TD-030 share CTA: `isInCurrentRequest` → `CatalogRequestQuantityControls`.
3. Flush calls `addOrIncrementCatalogDesign`; Function throws.
4. Catch sets `actionError` and `reloadWorkingItems({ silent: true })`.
5. `mergeServerWorkingItemsWithLocal` **keeps** optimistic stubs when the server list does not yet have that design (by design, for in-flight success). On **failure**, that preserves a false in-request state.
6. Full page refresh drops memory; Firestore never had the item.

---

## Did the add persist?

**No**, for this FAIL. A successful add would not throw this message, and refresh would reload the item from `printRequestItems`.

Working Request **id** after refresh is still whatever chrome lists as continuable `[0]` (same Studio/legacy doc if that is the only draft). It is not a different successful portal request that “lost” the item.

---

## Discriminator (needed before any code)

Same customer, same DEV project, **Discover/catalog Add** (not just looking at existing steppers):

| Result | Meaning |
|--------|---------|
| Discover Add also shows this message / does not persist | DEV Working Request is not `portal_customer` (or `isInternal`). Repair data; do not change Functions for TD-030. |
| Discover Add persists and qty works | Then share is doing something extra (e.g. a follow-up qty write). Re-open investigation before coding. **Code comparison currently finds no second path.** |

Please also note the Current Request **name/id** in the drawer and, in Studio or Firestore, that doc’s `requestOrigin` and `isInternal`.

---

## Smallest safe correction

**Do not implement until this discriminator is answered and, if product/architecture, Formal Review is updated.**

| If | Smallest correction |
|----|---------------------|
| Discover fails the same way | **DEV data:** finish/queue/abandon the Studio/legacy continuable request, or use an account whose working request is `portal_customer`. No production deploy. No TD-030 share revert required for persist. |
| We want Portal to ignore non-portal continuable docs | **Scope expansion:** filter working/continuable to `requestOrigin === "portal_customer" && !isInternal`, then allow create. Touches chrome list, one-working-request invariant, possibly Functions. **Stop — new plan/review.** |
| We only want to stop false qty after failed add | Narrow add-flow rollback: on flush **failure**, drop optimistic stubs for that design before merge/reload. Shared hook; affects Discover/Details/share. **Plan amendment** (file not in original TD-030 list). Does **not** make the DEV add persist. |

**Backend/Rules:** none for TD-030. Do not relax the Function origin check to make Studio drafts Portal-editable.

---

## Tests needed (after a chosen fix)

- Flush **failure** must not leave `optimistic:` membership (false “in request” / false qty).
- Failed add must not appear after full reload (already true if persist fails).
- Branch must not treat `studio_customer` / `isInternal` as a Portal-editable working request **if** that product rule is approved.
- Guest share unchanged.
- No new listeners.

---

## Files involved (read-only this pass)

| File | Role |
|------|------|
| `apps/portal/features/catalog/pages/ShareDesignPortalPageContent.tsx` | TD-030 qty CTA; displays `actionError` |
| `apps/portal/features/print-requests/hooks/useAddDesignToRequestFlow.ts` | Optimistic patch + flush + error |
| `apps/portal/features/print-requests/context/PortalPrintRequestContext.tsx` | `workingRequest = continuableRequests[0]` |
| `apps/portal/features/print-requests/hooks/useMyPrintRequests.ts` | Continuable = status only |
| `apps/portal/features/print-requests/services/portalPrintRequestService.ts` | Chrome list; callables |
| `apps/portal/features/print-requests/utils/mergeServerWorkingItemsWithLocal.ts` | Keeps optimistic stubs on empty server list |
| `functions/src/addPortalCatalogDesignToPrintRequest.ts` | Origin/internal throw on add |
| `functions/src/updatePortalPrintRequestItemQuantity.ts` | Same throw on qty |
| `functions/src/removePortalPrintRequestItem.ts` | Same throw on remove |
| `functions/src/lib/portalWorkingPrintRequest.ts` | Portal create writes `portal_customer` |

---

## Explicitly not done

- No Signoff
- TD-030 remains open
- No production App Hosting
- Cutover not reopened
- No implementation until discriminator + any required plan/review update
