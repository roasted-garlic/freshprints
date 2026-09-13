# Implementation Review: Portal Editing request parks current draft

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Reviewer | Implementation Review |
| Plan | `docs/workflow/plans/2026-09-02-portal-editing-request-parks-current-draft-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-02-portal-editing-request-parks-current-draft-review.md` |
| Owner decisions | `docs/workflow/reviews/2026-09-02-portal-editing-request-parks-current-draft-owner-decisions.md` |
| Verdict | **approved** (ready for DEV deploy checkpoint — **not deployed**) |

---

## Summary

Implemented Continuable parking: meaningful Portal drafts are parked when a customer PR enters Editing; empty drafts are archived in the same TX; Editing owns Current Request until re-queue/terminal exit; Clear items while Editing does not restore (OD-3). ADR-FP-158 Portal Editing tab preserved. Studio customer remove-from-show uses trusted callable `unqueueStudioCustomerPrintRequestFromShow`.

---

## Proof checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| ADR-FP-158 Portal Editing tab preserved | pass | Tabs unchanged; Editing stays Editing |
| Active Editing stays Editing lifecycle | pass | derive/queueTab unchanged |
| Parked draft stays draft / Working | pass | OD-1; inactive badge |
| One active editable request | pass | shared + Functions asserts |
| Studio Remove server-transactional | pass | `unqueueStudioCustomerPrintRequestFromShow` |
| Portal unqueue same park helper | pass | `portalContinuableParking.ts` |
| Park/restore atomicity | pass | TX reads-before-writes; heal fixed |
| Empty draft cleanup atomicity | pass | archive in park TX |
| Parked mutation rejection | pass | callables + Rules |
| Parked size Rules rejection | pass | `isPrintRequestParked` on item mutate/create |
| Catalog Add → Editing | pass | active Continuable resolver |
| Upload → Editing | pass | resolveOrCreate excludes parked |
| Queue restores parked draft | pass | queue TX restore |
| Clear does not restore if stays Editing | pass | OD-3; clear asserts active only |
| DNP requeue unchanged / release parks | pass | recovery wired |
| Show MOVE does not park | pass | no park calls in move |
| No Internal parking | pass | Studio callable skips park for internal |
| Limits unchanged | pass | active Continuable only |
| No production changes | pass | |

---

## Automated results (this session)

| Check | Result |
|-------|--------|
| Shared parking/unqueue/recovery unit | **66/66 PASS** |
| Functions `npm run build` | **PASS** |
| Studio staffGangSheet contract | **4/4 PASS** |
| Portal typecheck | pre-existing `interactiveEnhance*` only expected |
| Studio typecheck | pre-existing unrelated expected |

---

## DEV deploy checkpoint (STOP — do not deploy)

### Functions to deploy (`fresh-prints-dev`)

**New**

- `unqueueStudioCustomerPrintRequestFromShow`
- `onPrintRequestEditingExitRestoreParked`

**Changed (redeploy)**

- `unqueuePortalPrintRequestFromShow`
- `queuePortalPrintRequestToShow`
- `addPortalCatalogDesignToPrintRequest`
- `updatePortalPrintRequestItemQuantity`
- `duplicatePortalPrintRequestItem`
- `removePortalPrintRequestItem`
- `clearPortalWorkingPrintRequest`
- `confirmCustomerUploadsAndAttachToRequest` (via portalWorkingPrintRequest)
- `customerAddAssistedApprovedProofToPrintRequest` (via portalWorkingPrintRequest)
- `createPortalPrintRequest` (via portalWorkingPrintRequest)
- `previewShowProductionRecovery` / `applyShowProductionRecovery` (recovery park/restore)
- `convertCustomerPrintRequestToInternal`
- `deleteEligiblePrintRequest`
- Any other bundler that embeds `portalWorkingPrintRequest` / `portalContinuableParking`

### Firestore Rules

- Allowlist: `parkedByEditingRequestId`, `parkedAt`, `parksDraftPrintRequestId`
- `optionalFieldUnchanged` for staff/client
- `isPrintRequestParked` blocks customer item create/mutate/update when parked

### Clients

- Portal: hard refresh / restart `dev:portal` after deploy
- Studio: restart `dev:studio` after Functions deploy (callable)

### Indexes

**NONE**

### Migration / reconciliation

**NONE** expected. Optional DEV verify: no stranded `parkedByEditingRequestId` without matching Editing PR.

### Owner QA fixture

DEV customer with meaningful draft PR-A + queued PR-B; follow Owner QA A–P in goal prompt.

---

## Production

**NOT AUTHORIZED**
