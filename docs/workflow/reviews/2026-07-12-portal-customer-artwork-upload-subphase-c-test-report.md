# Test Report: Portal Customer Artwork Upload — Sub-phase C

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Plan | `docs/workflow/plans/2026-07-12-portal-customer-artwork-upload-subphase-c-plan.md` |
| Review | `docs/workflow/reviews/2026-07-12-portal-customer-artwork-upload-subphase-c-review.md` |
| Environment | local + `fresh-prints-dev` |
| Status | **passed_with_notes** |

---

## Commands Run

| Check | Command | Result |
|-------|---------|--------|
| Attach validation unit | `npx tsx --test functions/src/lib/confirmCustomerUploadValidation.test.ts` | PASS (3/3) |
| Functions build | `npm --prefix functions run build` | PASS |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | PASS |
| Portal build | `npm run build:portal` | PASS |
| Deploy (dev) | `firebase deploy --only functions:confirmCustomerUploadsAndAttachToRequest,functions:queuePortalPrintRequestToShow,functions:createPortalPrintRequest,firestore:rules,firestore:indexes --project fresh-prints-dev` | PASS |
| Corrective redeploy | `firebase deploy --only functions:queuePortalPrintRequestToShow --project fresh-prints-dev` | PASS (upload guard before show lookup) |
| Backend smoke C | `node functions/scripts/smoke-customer-upload-subphase-c.mjs` | **13/13 PASS** (`mrhv9rw9`) |

---

## Smoke checklist (C)

- [x] Transparent PNG → ready → confirm → attached item (no `designId`)
- [x] Idempotent re-attach (reusedItemIds; no duplicate items)
- [x] Confirmations required server-side
- [x] Creates/reuses single working request (ADR-FP-071)
- [x] Cross-customer attach denied
- [x] Queue-to-show rejected for upload items (server message)
- [x] Confirmation fields + `pending_staff_review` persisted
- [ ] Multi / folder / ZIP UI paths — covered by B backend + C UI wiring; full browser E2E deferred to G owner checkpoint
- [ ] Mobile viewport visual — deferred to G

---

## Notes

1. First attach smoke failures (`unauthenticated`) were transient on a brand-new 2nd-gen callable; subsequent runs after IAM settle + auth probe passed.
2. Initial queue smoke saw “Show not found” because show existence was checked before the upload guard; fixed and redeployed.
3. Studio full-repo lint/tsc baseline issues remain out of scope.
4. Wipe workflow remains parked.

---

## Verdict

Sub-phase C acceptance criteria met for automated/backend smoke on `fresh-prints-dev`. Ready for signoff; proceed to Sub-phase D.
