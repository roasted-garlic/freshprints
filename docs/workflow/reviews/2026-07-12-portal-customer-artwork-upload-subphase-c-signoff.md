# Signoff: Portal Customer Artwork Upload — Sub-phase C

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-07-12-portal-customer-artwork-upload-subphase-c-plan.md` |
| Review | `docs/workflow/reviews/2026-07-12-portal-customer-artwork-upload-subphase-c-review.md` (approved, round 2) |
| Test report | `docs/workflow/reviews/2026-07-12-portal-customer-artwork-upload-subphase-c-test-report.md` |
| Final status | **approved_with_notes** |

---

## Summary

Delivered Portal customer artwork upload UI and trusted attach-to-request flow on `fresh-prints-dev`. Customers can upload PNG/WebP/folder/ZIP via Sub-phase B callables, confirm ownership/catalog acknowledgements, and attach ready uploads to the single working print request. Upload-backed items omit `designId`. Queue-to-show is fail-closed for upload items until Sub-phase D.

---

## Changes Delivered

### Behavior

- Portal **Upload artwork** panel on request detail (images, folder, ZIP, drag-drop)
- Per-file progress / ready / failed; remove before confirm; retry failed; concurrency ≤ 3
- Required confirmation checkboxes (provisional parent-plan copy) + `customer-upload-terms-v1`
- Callable `confirmCustomerUploadsAndAttachToRequest` (Admin transaction, ADR-FP-071 resolve/create, idempotent by `customerUploadId`)
- Shared working-request helper reused by `createPortalPrintRequest`
- Firestore rules: client create remains catalog-only; customer may update qty/size on upload-backed items
- Server + UI queue guard until D
- Minimal upload item cards (titleSnapshot, preview, qty/size)

### Files Created (high level)

- `functions/src/confirmCustomerUploadsAndAttachToRequest.ts`
- `functions/src/lib/portalWorkingPrintRequest.ts`, `confirmCustomerUploadValidation.ts` (+ tests)
- `apps/portal/features/customer-uploads/**`
- `apps/portal/styles/customer-uploads.css`
- `functions/scripts/smoke-customer-upload-subphase-c.mjs`
- Shared attach DTOs

### Documentation Updated

- `BACKEND.md`, `DATA_MODEL.md`, `TESTING.md`, `ROADMAP.md`

---

## Tests

| Suite | Result |
|-------|--------|
| Unit (attach validation) | PASS |
| Functions build | PASS |
| Portal typecheck + build | PASS |
| Deploy `fresh-prints-dev` | PASS |
| Smoke C `mrhv9rw9` | **13/13 PASS** |

---

## Manual / Human

- Owner visual acceptance deferred to feature-end (Sub-phase G) per Continue Workflow instructions
- Standing `fresh-prints-dev` deploy authorization used; **no production deploy**
- Wipe goal remains parked

---

## Risks / Follow-ups

- Show/gang/export still not source-aware → **Sub-phase D**
- Studio intake / promote / cleanup → E/F/G
- Browser multi/folder/ZIP UX polish verified in G owner checkpoint

---

## Final Status

**approved_with_notes** — Sub-phase C complete on `fresh-prints-dev`. Parent feature continues with Sub-phase D.
