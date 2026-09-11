# DEV Deployment Checkpoint — Studio intake hold/release (Workstream D)

| Field | Value |
|-------|-------|
| Date | 2026-09-11 |
| Workflow | managed-phase / Implement pause / `customer-upload-studio-deferral-personal-library-portal-inline-remove` |
| Reason | Redeploy DEV Functions so `studioIntakeHoldUntilShow` is written on Don’t-allow attach and cleared on Add to Show |
| Status | **complete** (owner `DEV DEPLOY DON` accepted as `DEV DEPLOY DONE` 2026-09-11) |
| Resolution | Owner confirmed DEV Functions deploy; Implement continues C1 → C2 |
| Environment | `fresh-prints-dev` only |
| Production | **forbidden** |

---

## What We Need From You

Authorize (or run) the explicit DEV Functions allowlist below, then reply **`DEV DEPLOY DONE`** (or `FAIL: …`) so Implement continues into **C1 → C2**.

---

## Context

Workstream D sets `studioIntakeHoldUntilShow: true` on Don’t-allow print-request attach and releases it when the request is queued / allocated to a show. Studio client filters already hide held rows; **cloud Functions must be redeployed** for new uploads and Add-to-Show to write/clear the flag.

Portal Confirm-remove polish and Workstream A (audible settle) are client-side and do not require this Functions allowlist.

C2 product lock (same message): reuse dashboard **Your designs** for personal vs library tabs — no new section.

---

## Exact DEV Functions allowlist

Build Functions first, then deploy **only** these (no broad Functions deploy, no `--force`, no Rules/Storage/scheduler changes):

```text
firebase deploy --project fresh-prints-dev --only functions:confirmCustomerUploadsAndAttachToRequest,functions:queuePortalPrintRequestToShow,functions:onShowAllocationCreated,functions:customerAddAssistedApprovedProofToPrintRequest,functions:requestCustomerUploadCatalogPermissionFollowUp,functions:respondToCustomerUploadCatalogPermissionFollowUp,functions:restoreCustomerUploadCatalogEligibility,functions:getCustomerUploadCatalogPermissionFollowUp,functions:clearCustomerNotificationHistory
```

| Function | Why |
|----------|-----|
| `confirmCustomerUploadsAndAttachToRequest` | Writes hold on Don’t-allow attach; stamps initial permission activity |
| `queuePortalPrintRequestToShow` | Releases hold + staff-review transition on Portal Add to Show |
| `onShowAllocationCreated` | Allocation path release / staff-review transition |
| `customerAddAssistedApprovedProofToPrintRequest` | Shares confirmation patch (hold semantics for assisted attach) |
| `requestCustomerUploadCatalogPermissionFollowUp` | Two Ask Again sends + activity log |
| `respondToCustomerUploadCatalogPermissionFollowUp` | Allow/Decline activity; sticky Alert clear; Pending sort on Allow |
| `restoreCustomerUploadCatalogEligibility` | Staff Restore also bumps Pending sort |
| `getCustomerUploadCatalogPermissionFollowUp` | Faster permission modal load (path only; client resolves preview URL) |
| `clearCustomerNotificationHistory` | Soft-clears Notification history while preserving unanswered permission requests |

**Not in this allowlist:** retention purge / scheduler (C1), donate confirm (donate stays immediate Pending by default), Firestore/Storage Rules, production.

> If you already started the 4-function hold/release deploy, finish it, then run a **follow-up** deploy of:
> `functions:respondToCustomerUploadCatalogPermissionFollowUp,functions:restoreCustomerUploadCatalogEligibility,functions:getCustomerUploadCatalogPermissionFollowUp,functions:clearCustomerNotificationHistory`
> (Studio client sort is local; sticky Alert clear + history clear need the cloud path.)

---

## Post-deploy smoke (Owner optional before C1)

1. Portal: upload + Don’t allow on a draft → Firestore upload has `studioIntakeHoldUntilShow: true`; Studio Pending/Denied empty for that upload.
2. Add to Show → flag cleared / released; Studio intake shows per Allow vs Don’t-allow rules.
3. Portal Confirm remove still stays gone (client fix already verified).

---

## Reply format

- `DEV DEPLOY DONE` — continue Implement C1 → C2 (Your designs reuse)
- `FAIL: [description]` — stop and fix before C1
- `PASS WITH NOTES: [notes]` — continue with noted follow-ups

---

## Agent record (fill after deploy)

| Item | Value |
|------|-------|
| Command exit | _pending_ |
| Revisions / ACTIVE | _pending_ |
| Notes | _pending_ |
