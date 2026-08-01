# Production Functions Deployment Checkpoint: Customer show schedule and dual limits

| Field | Value |
|---|---|
| Date | 2026-08-01 |
| Production source | `11960852f45f948e37a1a5aeb3b09699882cd1fd` |
| Firebase project | `fresh-prints-prod` |
| Result | **passed** |

## Predeployment verification

- `origin/production`, local `production`, and required PR #17 merge commit matched exactly.
- Working tree clean; Amendment 1 introduced zero Functions changes beyond PR #16.
- Focused schedule/dual-limit suite: exit 0, 50/50 pass.
- Functions TypeScript build: exit 0.
- Applicable eslint: exit 0.
- `git diff --check`: exit 0.

## Exact allowlist and command

`getPortalPrintRequestShowSchedules`, `getPortalShowPrintProgress`, `updatePrintRequestLimitSettings`, `addPortalCatalogDesignToPrintRequest`, `confirmCustomerUploadsAndAttachToRequest`, `customerAddAssistedApprovedProofToPrintRequest`, `duplicatePortalPrintRequestItem`, `updatePortalPrintRequestItemQuantity`, `queuePortalPrintRequestToShow`.

```text
firebase deploy --only functions:getPortalPrintRequestShowSchedules,functions:getPortalShowPrintProgress,functions:updatePrintRequestLimitSettings,functions:addPortalCatalogDesignToPrintRequest,functions:confirmCustomerUploadsAndAttachToRequest,functions:customerAddAssistedApprovedProofToPrintRequest,functions:duplicatePortalPrintRequestItem,functions:updatePortalPrintRequestItemQuantity,functions:queuePortalPrintRequestToShow --project fresh-prints-prod
```

The first attempt exited 1 before remote mutation because Firebase source discovery exceeded its default 10-second timeout. Remote inventory remained unchanged (8 target Functions, old hash). The same exact command was retried with local process environment `FUNCTIONS_DISCOVERY_TIMEOUT=30000`; exit 0, 9 deployed, 0 errored, 0 aborted.

## Postdeployment inventory

All nine are ACTIVE in `us-central1` with source hash `7eedfc2475a356e21eb4aeac8e9cd45ea232fbed`.

| Function | Revision | Update time (UTC) |
|---|---|---|
| `addPortalCatalogDesignToPrintRequest` | `addportalcatalogdesigntoprintrequest-00002-sul` | `2026-08-01T14:45:29.529914124Z` |
| `confirmCustomerUploadsAndAttachToRequest` | `confirmcustomeruploadsandattachtorequest-00002-mub` | `2026-08-01T14:45:29.061836684Z` |
| `customerAddAssistedApprovedProofToPrintRequest` | `customeraddassistedapprovedprooftoprintrequest-00002-wuz` | `2026-08-01T14:45:25.889776079Z` |
| `duplicatePortalPrintRequestItem` | `duplicateportalprintrequestitem-00002-tak` | `2026-08-01T14:45:29.736407281Z` |
| `getPortalPrintRequestShowSchedules` | `getportalprintrequestshowschedules-00001-juc` | `2026-08-01T14:45:25.448366175Z` |
| `getPortalShowPrintProgress` | `getportalshowprintprogress-00002-yud` | `2026-08-01T14:45:29.925737134Z` |
| `queuePortalPrintRequestToShow` | `queueportalprintrequesttoshow-00002-kuc` | `2026-08-01T14:45:29.511919279Z` |
| `updatePortalPrintRequestItemQuantity` | `updateportalprintrequestitemquantity-00002-qid` | `2026-08-01T14:45:29.066954885Z` |
| `updatePrintRequestLimitSettings` | `updateprintrequestlimitsettings-00002-hox` | `2026-08-01T14:45:29.848600554Z` |

No non-target Function updated in the deployment window. Inventory increased from 100 to 101 solely because the approved new schedule callable was created.

## Security and behavior verification

- Schedule callable requires Firebase Auth, resolves the portal customer, checks every request's `customerId`, derives shows from server-side allocations, and caps input at 50 unique request IDs.
- Response mapping contains only request/show join identifiers, scheduled timestamps, and missing-show state; no show title, Whatnot data, allocation ID, capacity, notes, or other-customer data is returned. Customer-visible formatters never render join identifiers.
- Request-building enforcement uses `maxQuantityPerPrintRequest`; cumulative customer/show enforcement uses `maxQuantityPerShowPerCustomer`; missing new fields retain linked legacy behavior; `maxTotalQuantity` remains independent show-wide capacity.
- No Rules change or deployment is required.

## Scope confirmation and warnings

No Portal App Hosting, Rules, indexes, Auth, secrets, settings values, production data, Studio, DNS/domain, analytics, Stage 2, or catalog snapshot action occurred.

Warnings: Node.js 20 is deprecated and scheduled for decommission on 2026-10-30; `firebase-functions` is behind the latest release. Neither warning blocked this deployment. No authenticated customer E2E or callable mutation was performed.
