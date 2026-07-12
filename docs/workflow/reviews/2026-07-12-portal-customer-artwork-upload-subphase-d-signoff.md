# Signoff: Portal Customer Artwork Upload — Sub-phase D

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-07-12-portal-customer-artwork-upload-subphase-d-plan.md` |
| Review | `docs/workflow/reviews/2026-07-12-portal-customer-artwork-upload-subphase-d-review.md` (approved, round 2) |
| Test report | `docs/workflow/reviews/2026-07-12-portal-customer-artwork-upload-subphase-d-test-report.md` |
| Final status | **approved_with_notes** |

---

## Summary

Made request → show → gang sheet → export source-aware for customer-upload items. Portal queue-to-show now allocates upload-backed items with the same field invariants as Studio. Temporary C queue block removed after smoke PASS.

---

## Changes Delivered

### Behavior

- Shared asset resolution + allocation source field builder
- `queuePortalPrintRequestToShow` queues upload/mixed/catalog requests
- Studio mappers/allocate/gang place/export resolve upload production PNGs
- Firestore rules allow upload allocations and gang items with production paths
- `onPrintRequestItemCreated` skips `requestCount` for uploads
- Portal UI “Add to show” re-enabled for upload-backed requests

### Documentation

- Plan/review/test/signoff under `docs/workflow/`
- ROADMAP / TESTING / DATA_MODEL updates as needed in follow-through

---

## Tests

| Suite | Result |
|-------|--------|
| Unit | 5/5 PASS |
| Functions build | PASS |
| Portal typecheck + build | PASS |
| Deploy `fresh-prints-dev` | PASS |
| Smoke D `mrhvok6m` | **7/7 PASS** |

---

## Manual / Human

- Owner visual / full Studio export UI deferred to G
- No production deploy
- Wipe remains parked

---

## Risks / Follow-ups

- Studio `/imports` intake (E)
- Promote / AI lifecycle (F)
- Cleanup + wipe target + E2E owner checklist (G)

---

## Final Status

**approved_with_notes** — Sub-phase D complete on `fresh-prints-dev`. Continue to Sub-phase E.
