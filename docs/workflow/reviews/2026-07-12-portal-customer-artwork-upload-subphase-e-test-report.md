# Test Report: Portal Customer Artwork Upload — Sub-phase E

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Plan | `docs/workflow/plans/2026-07-12-portal-customer-artwork-upload-subphase-e-plan.md` |
| Environment | `fresh-prints-dev` |
| Result | **passed_with_notes** |

---

## Commands Run

| Command | Exit | Notes |
|---------|------|-------|
| `npx tsx --test src/lib/customerUploadStaffAuth.test.ts` (in `functions/`) | 0 | 3/3 PASS |
| `npm run build` (in `functions/`) | 0 | tsc clean |
| `firebase deploy --only functions:promoteCustomerUploadToAiReview,functions:excludeCustomerUploadFromCatalog,functions:retryCustomerUploadProcessing,functions:restoreCustomerUploadCatalogEligibility --project fresh-prints-dev` | 0 | All 4 create ops succeeded |
| `node functions/scripts/smoke-customer-upload-subphase-e.mjs` | 0 | **16/16 PASS** (`mrhw5tao`) |

Studio full-repo typecheck not run (known baseline failures outside E scope). E-touched Studio files use existing patterns; no new deps.

---

## Smoke summary (`mrhw5tao`)

1. Create/finalize/attach → pending staff review  
2. Pending list query contains upload  
3. Helper promote → permission-denied  
4. Exclude → status excluded; production Storage preserved; printRequestItem `customerUploadId` preserved  
5. Restore → pending again  
6. Promote → design `imported` + `sourceCustomerUploadId` + original copied + AI enqueue queued  
7. Re-promote → same `designId`, `alreadyPromoted: true`  
8. Retry: fixture-limited (auth/unit covered; no failed-upload fixture)

---

## Notes

- Smoke uses a separate Firebase app instance for staff auth (avoids token loss after customer→staff switches).
- Promote successfully ran full AI enrich to `needs_review` in this run (beyond E minimum; F will verify library path).
- Retry technical path not end-to-end smoked (documented fixture-limited).

---

## Verdict

**passed_with_notes** — ready for signoff.
