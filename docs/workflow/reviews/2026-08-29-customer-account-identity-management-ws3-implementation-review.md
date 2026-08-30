# Implementation Review: Customer Account Identity WS3 Full Account Merge

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Goal | `customer-account-identity-management-ws3-full-account-merge` |
| Verdict | **approved_with_notes** |
| Production | **NOT AUTHORIZED** |

---

## Summary

WS3 **Merge Accounts** implemented on DEV source: owner-only preview/apply/status callables, resumable `customerMergeJobs` stage runner, Studio wizard + **Merged** directory tab, shared types, ADR-FP-154. Corrective during review: fixed `printRequestItems` count path (top-level collection, not subcollection) and continuable policy for source-meaningful + survivor-empty (owner Case 3).

---

## Critical-risk reconciliation (17-point)

| # | Area | Verdict | Notes |
|---|------|---------|-------|
| 1 | Ownership collections | pass | Matrix implemented via `MISC_COLLECTIONS` + batch helpers |
| 2 | Storage migration | pass_with_notes | Copy-verify-delete with job cursors; DEV QA must exercise UID-differing pair |
| 3 | Auth disable timing | pass | After storage stages; permanent disable; no delete |
| 4 | Source users tombstone | pass | `tombstoneSourceUser` retains inactive merge metadata |
| 5 | Source customers tombstone | pass | `isMerged`, linkage fields, `merged-src-*` placeholder |
| 6 | Working-request invariant | pass | Empty vs meaningful; Apply recheck; fixed item query path |
| 7 | Immutable PR fields | pass | Reassign `customerId` only; no name/snapshot rewrite |
| 8 | CR → IR links | pass_with_notes | No conversion field mutation; DEV QA with converted pair recommended |
| 9 | Show allocation snapshots | pass | `customerId` reassign; snapshots untouched |
| 10 | Username reservation txn | pass | Reuses merge txn + WS2 pattern; `merged-src-*` |
| 11 | Job resumability | pass | 19 stages, cursors, status polling |
| 12 | Identity locks | pass | Both customers; WS1/WS2 helper |
| 13 | Activity integrity | pass | Historical events unchanged; merge events append-only |
| 14 | Merged directory | pass | Distinct tab; survivor link |
| 15 | WS4 queryability | pass | `mergedSourceCustomerIds` on survivor |
| 16 | No WS4 scope creep | pass | No activity UI |
| 17 | No production changes | pass | DEV source only |

---

## Automated tests

| Command | Result |
|---------|--------|
| `cd functions && npm run build` | **pass** |
| `npx tsx --test functions/src/lib/customerAccountMerge.test.ts` | **11/11 pass** |
| `npx tsx --test apps/studio/.../customerDirectoryVisibility.test.ts` | **4/4 pass** |
| `npx tsx --test apps/studio/.../customerIdentityManagement.contract.test.ts` | **2/2 pass** (includes merge permission) |

Studio-wide `tsc` may still fail on unrelated branch debt — out of WS3 scope.

---

## DEV deployment (2026-08-29)

| Item | Result |
|------|--------|
| Project | `fresh-prints-dev` |
| Branch | `development` |
| Command | `firebase deploy --only functions:previewCustomerAccountMerge,functions:applyCustomerAccountMerge,functions:getCustomerAccountMergeStatus,firestore:rules --project fresh-prints-dev` |
| Exit code | **0** |
| Functions created | `previewCustomerAccountMerge`, `applyCustomerAccountMerge`, `getCustomerAccountMergeStatus` (all `us-central1`, v2 callable) |
| Firestore Rules | `customerMergeJobs` deny client read/write — released |
| Indexes | **not deployed** (none required at deploy time) |
| Storage Rules | **not deployed** |
| Production | **unchanged** |

Verified via `firebase functions:list --project fresh-prints-dev`.

---

## WS3 corrective redeploy (2026-08-29, owner authorized)

**Root cause:** Merge job ran `acquire_locks` before `validate_preview`. The validation step treated the job’s own locks as a blocking identity operation and failed with “Another identity operation is in progress for this customer.” Failed jobs did not release acquired locks.

**Local corrective (accepted):**

1. Stage order: `validate_preview` → `acquire_locks` → remaining stages
2. `releaseMergeJobLocksIfHeld` on merge job failure after locks acquired
3. Studio: owner attestation UI + apply payload; duplicate result-step error copy removed

**DEV stale-lock cleanup (`fresh-prints-dev` only):**

| Customer | ID | Lock before | Result |
|----------|-----|-------------|--------|
| Source fixture | `7ytIzXU0eAQVc2B11aZt` | `merge` | `identityOperationLock` cleared |
| Survivor fixture | `gG1kGXfxmZ5ZUUTgCL3o` | `merge` | `identityOperationLock` cleared |

No other customer fields changed.

**Failed merge job:** `844d604e-177c-4644-bb36-dacf70f0b699` — **retained** for DEV audit/debug (not deleted).

**Redeploy (exact scope):**

| Item | Result |
|------|--------|
| Branch | `development` |
| Pre-deploy build | `cd functions && npm run build` — **pass** |
| Command | `firebase deploy --only functions:applyCustomerAccountMerge --project fresh-prints-dev` |
| Exit code | **0** |
| Function updated | `applyCustomerAccountMerge` (`us-central1`, v2 callable) — **Successful update operation** |
| Not deployed | `previewCustomerAccountMerge`, `getCustomerAccountMergeStatus`, Firestore Rules, indexes, Storage Rules, production |
| Unrelated Functions | **unchanged** (deploy targeted single callable only) |

**Pre-deploy verification:**

- Stage order in `CUSTOMER_ACCOUNT_MERGE_STAGES`: `validate_preview`, `acquire_locks`, …
- Failure path calls `releaseMergeJobLocksIfHeld` when `acquire_locks` completed
- Shared constant change bundled in apply deploy artifact only; no separate preview/status redeploy required for this bug fix

Production remains **NOT AUTHORIZED**. Owner DEV QA **PASS** — see Signoff.

---

## Final reconciliation (owner QA PASS, 2026-08-29)

| Area | Post-QA verdict |
|------|-----------------|
| Merge Apply (happy path) | **pass** — owner confirmed after corrective |
| Stage-order corrective | **pass** — regression test on stage order |
| Merged directory / tombstone | **pass** |
| Transfer Username (regression) | **pass** |
| Studio merge/transfer UX polish | **pass_with_notes** — success styling, audit events in modal, search clear (local; not redeployed) |
| Full matrix A–R row-by-row | **pass_with_notes** — owner holistic PASS; not every matrix row individually recorded |
| Production | **unchanged** |

**Final implementation review verdict:** **approved** (DEV acceptance).

---

## Follow-ups (non-blocking)

- Emulator integration tests for full merge job (deferred; unit policy covered)
- Portal gate for `isMerged` login rejection — verify existing auth path at DEV QA
- Converted CR→IR pair in DEV QA matrix

---

## Verdict

**approved_with_notes** — ready for owner DEV deploy authorization and QA. No production promotion.
