# Customer Identity WS1 QA Corrective #4 — DEV Deploy Record

**Date:** 2026-08-28  
**Project:** `fresh-prints-dev`  
**Branch:** `development`  
**Production:** NOT touched  
**Firestore Rules / Storage / App Hosting:** NOT deployed  
**Studio publish / Portal hosting:** NOT deployed  

## Pre-deploy verification

| Check | Result |
|-------|--------|
| Branch `development` | PASS |
| Firebase project `fresh-prints-dev` | PASS |
| Functions build | PASS |
| Implementation review approved | PASS — `2026-08-28-customer-identity-ws1-qa-corrective-4-implementation-review.md` |
| Function allowlist reconciled from source | PASS — 3 callables (see below) |
| Index deploy scope | PASS — `printRequests` composite `status` + `isInternal` only (new entry in `firestore.indexes.json`) |
| Firestore Rules change required | NO |
| Storage Rules change | NO |
| Production targeted | NO |
| WS2/WS3/WS4 runtime | NOT included |

## Import-graph reconciliation (source of truth)

Only these exported callables import `functions/src/lib/portalWorkingPrintRequest.ts`:

| Function export | Imports changed helper? | Runtime behavior affected? | Deploy required? | Reason |
|-----------------|-------------------------|----------------------------|------------------|--------|
| `createPortalPrintRequest` | Yes — `createWorkingPrintRequestInTransaction` | Yes — portal-editable continuable guard; legacy `studio_customer` drafts no longer block create | **Yes** | Direct consumer of modified module |
| `confirmCustomerUploadsAndAttachToRequest` | Yes — `resolveOrCreateWorkingPrintRequestInTransaction` | Yes — resolves/creates portal-editable working request only | **Yes** | Direct consumer of modified module |
| `customerAddAssistedApprovedProofToPrintRequest` | Yes — `resolveOrCreateWorkingPrintRequestInTransaction` | Yes — same resolver semantics | **Yes** | Direct consumer of modified module |
| `addPortalCatalogDesignToPrintRequest` | No | No (unchanged in corrective #4) | **No** | No import of `portalWorkingPrintRequest.ts`; inline origin guard only |
| `updatePortalPrintRequestItemQuantity` | No | No | **No** | No import; inline origin guard only |
| `removePortalPrintRequestItem` | No | No | **No** | No import; inline origin guard only |
| `duplicatePortalPrintRequestItem` | No | No | **No** | No import; inline origin guard only |

`createRemainderWorkingPrintRequestInTransaction` is exported from the module but has **no callable consumers** in the current bundle.

**Review discrepancy resolved:** Implementation review suggested `addPortalCatalogDesignToPrintRequest` as a minimum deploy candidate; current source has **no** import edge to the changed module — correctly **excluded**.

## Functions deploy

```bash
firebase deploy --project fresh-prints-dev --only "functions:createPortalPrintRequest,functions:confirmCustomerUploadsAndAttachToRequest,functions:customerAddAssistedApprovedProofToPrintRequest"
```

**Result:** Deploy complete (exit 0).

### Deployed functions (ACTIVE)

| Function | Generation | Region | Runtime | Revision | updateTime (UTC) | State |
|----------|------------|--------|---------|----------|------------------|-------|
| `createPortalPrintRequest` | 2 | us-central1 | nodejs20 | `createportalprintrequest-00018-vow` | 2026-08-28T22:51:42.109676207Z | ACTIVE |
| `confirmCustomerUploadsAndAttachToRequest` | 2 | us-central1 | nodejs20 | `confirmcustomeruploadsandattachtorequest-00020-gux` | 2026-08-28T22:51:42.425298955Z | ACTIVE |
| `customerAddAssistedApprovedProofToPrintRequest` | 2 | us-central1 | nodejs20 | `customeraddassistedapprovedprooftoprintrequest-00022-huf` | 2026-08-28T22:51:42.466944069Z | ACTIVE |

Cloud Run service generations: create **18**, confirm **20**, assisted proof **22**.

### Post-deploy runtime (deployed bundle includes)

- Portal-editable request filtering via `isPortalEditablePrintRequest` in `portalWorkingPrintRequest.ts`
- Continuable status handling (`draft` / `editing`) scoped to portal-editable docs
- `requestOrigin` / `isInternal` contract on create (`portal_customer`, `isInternal: false`)
- Legacy `studio_customer` drafts do not block Portal working-request create/resolve
- No new duplicate Portal working request when legacy Studio draft exists alone

## Indexes deploy

```bash
firebase deploy --project fresh-prints-dev --only firestore:indexes
```

**Result:** Deploy complete. Firebase CLI warned **1 index in project not in file** — **not deleted** (no `--force`).

### New composite index (corrective #4)

**File definition** (`firestore.indexes.json`):

```json
{
  "collectionGroup": "printRequests",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "isInternal", "order": "ASCENDING" }
  ]
}
```

**Serves Studio query** (`listCustomerIdsWithContinuableCustomerRequests`):

- `where("status", "in", ["draft", "editing"])`
- `where("isInternal", "==", false)`

**GCP canonical index** (auto `__name__` suffix):

| Field | Order |
|-------|-------|
| `status` | ASCENDING |
| `isInternal` | ASCENDING |
| `__name__` | ASCENDING |

**Index ID:** `CICAgNi6rIIK`  
**State at deploy verification (2026-08-28 ~23:00 UTC):** `CREATING` — poll before Studio customer-picker QA (#4).

```bash
gcloud firestore indexes composite describe CICAgNi6rIIK --project=fresh-prints-dev --format="value(state)"
```

## Not deployed

- `firestore:rules`
- `storage`
- `apphosting`
- Production (`fresh-prints` or other prod project)
- Portal App Hosting (corrective #3 client changes still local reload)
- Studio publish

## Owner re-QA

**STOP** — await owner re-QA per corrective #4 prompt. Defer **Studio customer request picker** test until index `CICAgNi6rIIK` reports `READY`.
