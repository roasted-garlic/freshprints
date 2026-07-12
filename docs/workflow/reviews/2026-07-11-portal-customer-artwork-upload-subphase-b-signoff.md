# Signoff: Portal Customer Artwork Upload — Sub-phase B

| Field | Value |
|-------|-------|
| Date | 2026-07-11 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-07-11-portal-customer-artwork-upload-subphase-b-plan.md` |
| Review | `docs/workflow/reviews/2026-07-11-portal-customer-artwork-upload-subphase-b-review.md` |
| Test report | `docs/workflow/reviews/2026-07-11-portal-customer-artwork-upload-subphase-b-test-report.md` |
| Final status | **approved_with_notes** |

---

## Summary

Sub-phase B trusted backend is **implemented, deployed to `fresh-prints-dev`, and backend-smoke verified**. Portal upload UI remains out of scope (Sub-phase C). Production was not deployed. Parked wipe was not touched.

---

## Changes Delivered

### Behavior

- `createCustomerUploadBatch`, `finalizeCustomerUpload`, `finalizeCustomerUploadZip` live on `fresh-prints-dev`
- Daily caps 10/50/5 + concurrency leases; `catalogReviewStatus` stays `not_eligible`
- Client Firestore writes denied; Storage customer writes limited to `source` / `archive.zip`
- Post-smoke fix: Firestore transaction read-before-write on finalize success/fail batch counters

### Files Created / Modified

- Functions callables + `customerUpload*` libs/tests
- `firestore.rules`, `storage.rules`, `firestore.indexes.json`
- Temporary harness: `functions/scripts/smoke-customer-upload-subphase-b.mjs`
- Docs: BACKEND, FIREBASE, DATA_MODEL, SECURITY, TESTING, ROADMAP

---

## Tests

### Automated (pre-deploy)

- 25/25 unit tests PASS; Functions build PASS; Portal tsc PASS
- Full-repo lint FAIL (pre-existing Portal/Studio only)

### Backend smoke (post-deploy)

- Harness run `mrhb5zwp`: **15/15 PASS** (see test report table)
- No Portal UI manual test (none exists; checklist item 13 = repo scan)

### Human approvals

- `yauzl` / `@types/yauzl` — approved
- Deploy Sub-phase B to `fresh-prints-dev` (+ corrective redeploys) — approved and executed

---

## Risks / Known Issues / Notes

- Node 20 Functions runtime deprecation warning from Firebase CLI (upgrade later; out of B scope)
- Temporary smoke harness left under `functions/scripts/` for reruns; does not weaken rules or commit secrets
- Pre-existing Studio tsc / repo lint noise unchanged

---

## Follow-ups

1. Plan Sub-phase C (Portal upload UI) — only now that B deploy + smoke passed
2. Do not enable Portal upload UI until C is implemented and reviewed
3. Keep wipe parked

---

## Final Status

**approved_with_notes** — Sub-phase B complete on `fresh-prints-dev`. Parent feature still not DONE (C+ remain).
