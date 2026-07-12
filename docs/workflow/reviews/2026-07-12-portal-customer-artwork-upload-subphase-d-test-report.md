# Test Report: Portal Customer Artwork Upload — Sub-phase D

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Plan | `docs/workflow/plans/2026-07-12-portal-customer-artwork-upload-subphase-d-plan.md` |
| Review | `docs/workflow/reviews/2026-07-12-portal-customer-artwork-upload-subphase-d-review.md` |
| Environment | local + `fresh-prints-dev` |
| Status | **passed_with_notes** |

---

## Commands Run

| Check | Command | Result |
|-------|---------|--------|
| Unit (resolver + allocation fields) | `npx tsx --test packages/shared/src/utils/printAssetResolution.test.ts` | PASS (5/5) |
| Functions build | `npm --prefix functions run build` | PASS |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | PASS |
| Portal build | `npm run build:portal` | PASS |
| Deploy (dev) | `firebase deploy --only functions:queuePortalPrintRequestToShow,functions:onPrintRequestItemCreated,firestore:rules --project fresh-prints-dev` | PASS |
| Backend smoke D | `node functions/scripts/smoke-customer-upload-subphase-d.mjs` | **7/7 PASS** (`mrhvok6m`) |

---

## Smoke checklist (D)

- [x] Upload-only Portal queue → allocation omits `designId`, has `customerUploadId` + `sourceType`
- [x] Mixed catalog + upload queue → both shapes correct
- [x] Catalog-only queue regression
- [x] Upload production paths present for ready uploads
- [x] Portal UI queue guard removed after smoke PASS
- [ ] Full Electron gang PNG / Studio Add-to-Show visual — deferred to G (code paths wired; harness covers allocation + resolver)

---

## Notes

1. Studio full-repo tsc baseline failures (e.g. unrelated inbox) remain out of scope; D-touched surfaces updated.
2. Gang sheet / ZIP / PNG export builders resolve upload production assets in Studio; Electron end-to-end export not run in this harness.
3. Wipe remains parked.

---

## Verdict

Sub-phase D acceptance criteria met for automated/backend smoke on `fresh-prints-dev`. Ready for signoff; proceed to Sub-phase E.
