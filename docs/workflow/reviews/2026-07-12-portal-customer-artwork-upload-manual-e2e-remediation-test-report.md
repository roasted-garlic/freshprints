# Test Report: Portal Customer Artwork Upload — Manual E2E Remediation

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Plan | `docs/workflow/plans/2026-07-12-portal-customer-artwork-upload-manual-e2e-remediation-plan.md` |
| Review | `docs/workflow/reviews/2026-07-12-portal-customer-artwork-upload-manual-e2e-remediation-review.md` (approved) |
| Environment | `fresh-prints-dev` |
| Automated result | **passed_with_notes** |
| Overall G / parent | **pending_manual_e2e_retest** |

---

## Root causes (issues 6–7)

| Issue | Root cause | Fix |
|-------|------------|-----|
| #6 Design Library | Studio `mapDesignDocument` threw on incomplete `ready` docs; one bad doc failed the whole list. Portal already skipped. | Skip + `console.warn` in `fetchDesignListPage` |
| #7 Show Queue | `listUpcomingShows` / allocation lists threw on incomplete docs; allocation **update** rules required `designId` equality (broke upload allocations). | Skip incomplete shows/allocations; source-identity update rules for upload vs catalog; staff/customer create rules for upload-backed print request items (duplicate) |

---

## Implementation summary

1. Dedicated `/customer-uploads` page + live pending badge; intake removed from Imports  
2. Intake action buttons `size="sm"` with consistent variants  
3. Portal Discover + Library workflow hint copy (approved text)  
4. Label → `Your uploaded design`  
5. Portal + Studio duplicate for upload-backed items (same `customerUploadId`; no Storage clone)  
6–7. Mapper resilience + Firestore rules deploy  

Docs: ADR-FP-009 clarification in `DECISIONS.md`; Studio workspaces note in `ARCHITECTURE.md`.

---

## Commands run

| Command | Exit | Notes |
|---------|------|-------|
| Targeted unit tests (source/asset/resilience/one-working/sizing) | 0 | 27/27 PASS |
| `npm run typecheck --workspace @fresh-prints/portal` | 0 | PASS |
| `npm run build:portal` | 0 | PASS |
| `npx vite build` (`apps/studio`) | 0 | PASS |
| `npx tsc --noEmit` (`apps/studio`) | 2 | Baseline failures remain (StaffInboxBell, audit trail, selection mode designId typing); **no** remediation-path errors after intake `replace` fix |
| `firebase deploy --only firestore:rules --project fresh-prints-dev` | 0 | PASS |
| `node functions/scripts/smoke-customer-upload-subphase-g.mjs` | 0 | 6/6 PASS (`mrhxs2vt`) |

---

## Sub-phase G linkage

Prior G automated evidence unchanged (`mrhwvzm8`). Manual E2E initially **FAIL** (7 issues). This remediation addresses those findings. Updated checkpoint:

`docs/workflow/reviews/2026-07-12-portal-customer-artwork-upload-manual-e2e-remediation-manual-checkpoint.md`

---

## Verdict (automated)

**passed_with_notes** — Studio full-repo `tsc` baseline failures outside remediation scope. **Stop for owner manual retest.** Do not sign off G or parent until PASS / PASS WITH NOTES.
