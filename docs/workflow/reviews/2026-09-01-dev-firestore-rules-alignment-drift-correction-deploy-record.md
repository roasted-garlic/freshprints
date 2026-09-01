# DEV Deploy Record — Firestore Rules Alignment / Drift Correction

**Date:** 2026-09-01  
**Type:** **DEV RULES ALIGNMENT / DRIFT CORRECTION** — not a new product feature  
**Goal context:** `pre-smart-profiling-print-request-and-gang-sheet-polish` (WS3 owner QA continues after alignment)  
**Owner authorization:** Redeploy current committed `development` `firestore.rules` to `fresh-prints-dev`  
**Production:** **NOT AUTHORIZED / untouched**

---

## Background (does not rewrite earlier deploy history)

An earlier DEV Firestore Rules deploy (during the standalone AI Review Approve/Reject corrective session) was executed from a **full local working-tree** `firestore.rules` that unintentionally included an unrelated **`showAllocations` customer-read expansion** (`customerOwnsCustomerDoc` via `resource.data.customerId`). That expansion was **not** part of the approved AI Review corrective and was **reverted before** the scoped git commit (`bea7f18b`).

Owner decision: **do not** leave that unintended DEV Rules behavior live. Redeploy **committed** `development` rules to restore DEV/Git alignment.

Prior AI Review deploy record (unchanged): `docs/workflow/reviews/2026-09-01-ai-review-artwork-background-source-rules-dev-deploy-record.md`

---

## Pre-deploy verification

| Check | Result |
|-------|--------|
| Branch | `development` |
| `git rev-parse HEAD` | `56717c53d94ac1fdd384551ad758b8422f7da61c` |
| `git rev-parse origin/development` | `56717c53d94ac1fdd384551ad758b8422f7da61c` |
| Local == origin | **PASS** |
| Working tree `firestore.rules` vs HEAD | **clean** (deploy from committed source only) |
| AI Review corrective present | **PASS** — `artworkBackgroundSource` on `catalogMetadataOnlyUpdate` |
| Unintended `showAllocations` expansion in committed rules | **ABSENT** — read allows staff **or** `customerOwnsPrintRequestById(printRequestId)` only |
| Other unrelated local rules edits in commit | **none** beyond approved AI Review delta at `bea7f18b` |

### Committed `showAllocations` read (authoritative)

```
allow read: if isStaff()
  || (isCustomer() && customerOwnsPrintRequestById(resource.data.printRequestId));
```

No `customerOwnsCustomerDoc(resource.data.customerId)` clause.

---

## Firebase deploy — `fresh-prints-dev`

| Field | Value |
|-------|-------|
| Project | `fresh-prints-dev` |
| Resource | Firestore Rules only (`firestore.rules` @ `56717c53`) |
| Command | `firebase deploy --only firestore:rules --project fresh-prints-dev` |
| Exit code | **0** |
| Result | **Deploy complete** — rules released to cloud.firestore |

### Post-deploy intent

| Item | Status |
|------|--------|
| Unintended `showAllocations` customer-read expansion removed from live DEV | **yes** (redeploy from committed source) |
| AI Review `artworkBackgroundSource` corrective remains | **yes** |
| Production | **untouched** |

### Not deployed

- Functions
- Storage Rules
- Firestore indexes
- Hosting / App Hosting
- Production (`fresh-prints`)

---

## Managed goal status (unchanged)

| WS | Owner DEV QA |
|----|--------------|
| WS1 | **PASS** |
| WS2 | **PASS** |
| WS3 | **PENDING** — gang-sheet price + weight owner QA continues |

Signoff: **NOT AUTHORIZED**

---

## Production promotion (future — not performed)

| Item | Status |
|------|--------|
| DEV realigned to committed `firestore.rules` @ `56717c53` | **done** (this alignment redeploy) |
| Unintended live `showAllocations` customer-read expansion | **removed from DEV** |
| AI Review `artworkBackgroundSource` corrective | **remains live on DEV** (source `bea7f18b`, in `56717c53`) |
| Production (`fresh-prints`) | **NOT received** these Rules changes |
| Future promotion checklist | Use **current committed** `development` `firestore.rules` — **not** the earlier drifted DEV-only version that briefly included the uncommitted `showAllocations` expansion |

Inventory reference: `docs/standards/DEPLOYMENT.md` → DEV-only pending production promotion inventory (AI Review Rules row).
