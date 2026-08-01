# Development Functions Deployment Checkpoint

| Field | Value |
|---|---|
| Date | 2026-07-31 |
| Project | `fresh-prints-dev` |
| Result | **deployed; backend inventory verified; UI E2E incomplete** |

## Allowlist and command

`getPortalPrintRequestShowSchedules`, `getPortalShowPrintProgress`, `updatePrintRequestLimitSettings`, `addPortalCatalogDesignToPrintRequest`, `confirmCustomerUploadsAndAttachToRequest`, `customerAddAssistedApprovedProofToPrintRequest`, `duplicatePortalPrintRequestItem`, `updatePortalPrintRequestItemQuantity`, `queuePortalPrintRequestToShow`.

```text
firebase deploy --only functions:getPortalPrintRequestShowSchedules,functions:getPortalShowPrintProgress,functions:updatePrintRequestLimitSettings,functions:addPortalCatalogDesignToPrintRequest,functions:confirmCustomerUploadsAndAttachToRequest,functions:customerAddAssistedApprovedProofToPrintRequest,functions:duplicatePortalPrintRequestItem,functions:updatePortalPrintRequestItemQuantity,functions:queuePortalPrintRequestToShow --project fresh-prints-dev
```

Exit 0: 9 deployed, 0 errored, 0 aborted. Postdeploy inventory: all nine ACTIVE with source hash `fa4555f063eb5668c5dea4a8950739ddc24bdeb5`; no non-target Function updated during the deployment window.

## Verification limits and finding

The authenticated development Portal browser session was unavailable, so no customer was impersonated and no private UID/request ID was accessed. Owner-request callable/UI verification is not claimed. Static postdeploy audit found an actual terminal/details schedule suppression defect; see Amendment 1 Plan and Formal Review. No production action occurred.
