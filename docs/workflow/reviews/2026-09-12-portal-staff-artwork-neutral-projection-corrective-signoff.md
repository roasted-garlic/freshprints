# Signoff: Portal Staff Artwork Neutral Projection Corrective

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Signoff by | Signoff Agent |
| Goal | `portal-staff-artwork-neutral-projection-corrective` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Base Plan | `docs/workflow/plans/2026-09-12-portal-staff-artwork-neutral-projection-corrective-plan.md` |
| Population Amendment | `docs/workflow/plans/2026-09-12-portal-staff-artwork-neutral-projection-corrective-population-amendment-plan.md` |
| Visibility Corrective Plan | `docs/workflow/plans/2026-09-12-portal-staff-artwork-neutral-projection-corrective-visibility-plan.md` |
| Image/Title/DPI Amendment | `docs/workflow/plans/2026-09-12-portal-staff-artwork-image-title-dpi-projection-amendment-plan.md` |
| Formal Review (final contract) | `docs/workflow/reviews/2026-09-12-portal-staff-artwork-image-title-dpi-projection-amendment-review.md` (`approved_with_changes`, owner-accepted) |
| Implementation Review | `docs/workflow/reviews/2026-09-12-portal-staff-artwork-image-title-dpi-projection-implementation-review.md` |
| Test Report | `docs/workflow/reviews/2026-09-12-portal-staff-artwork-image-title-dpi-projection-test-report.md` |
| DEV deployment | `docs/workflow/reviews/2026-09-12-portal-staff-artwork-image-title-dpi-projection-dev-deployment.md` |
| Population APPLY | `docs/workflow/reviews/2026-09-12-portal-staff-artwork-image-title-dpi-projection-population-dev-apply.md` |
| Population VERIFY | `docs/workflow/reviews/2026-09-12-portal-staff-artwork-image-title-dpi-projection-population-dev-verify.md` |
| Owner DEV QA checklist | `docs/workflow/reviews/2026-09-12-portal-staff-artwork-image-title-dpi-projection-owner-dev-qa-checklist.md` |
| Final status | **approved_with_notes** |

## Owner DEV QA

The owner explicitly reported:

> **OWNER DEV QA: portal-staff-artwork-neutral-projection-corrective - PASS**

## Corrective stage completion

| Stage | Status |
|---|---|
| Plan (base + population + visibility + image/title/DPI amendments) | complete |
| Formal Review | complete (final amendment `approved_with_changes`, owner-accepted) |
| Implement | complete |
| Test | complete (`passed_with_notes`) |
| DEV population (APPLY + VERIFY) | complete (`actualWrites: 6` → `alreadyCorrect: 114`) |
| DEV cutover (Functions + Storage Rules; Firestore `staffArtworks` customer deny retained) | complete |
| Owner DEV QA PASS | recorded |
| Signoff | **this artifact** |

## Summary

Portal Staff Artwork request items are customer-visible through Admin-authored `portalPrintRequestItems` projections with preview image, real artwork title, DPI from projected pixels, and a `Staff-added` source badge. Architecture remains:

`printRequestItems` → trusted Admin projection → `portalPrintRequestItems` → Portal

Portal does not read `staffArtworks` documents. Staff Artwork rows do not require `designId`. Catalog Design and Customer Upload behavior remain source-specific. Studio/production workflows were not changed by this corrective’s Portal boundary work.

## Notes (`approved_with_notes`)

1. **Customer-visible contract supersedes neutral-only.** The earlier no-image/no-title/no-DPI Portal contract is superseded by the owner-accepted image/title/DPI projection amendment. Neutral blank Staff Artwork cards are no longer the intended product behavior.
2. **`staffArtworkId` on projection.** May exist on the customer-safe projection for identity/refresh; it is **not** displayed as the title. Display title is `titleSnapshot`.
3. **Firestore `staffArtworks` remains customer-denied** (`get`/`list` staff-only; client writes denied).
4. **Storage customer access** is limited to `preview.webp` / `thumbnail.webp` under `/staff-artwork/{id}/`. Production/source objects remain inaccessible to customers.
5. **Accepted residual risk:** a signed-in customer who learns another Staff Artwork ID could potentially fetch that preview/thumb. Owner accepted for the current product direction.
6. **Upscale / enhancement Portal controls remain deferred** and were not restored.
7. **Portal production-build EPERM baseline** (Windows `.next/trace`) was **not** claimed resolved.
8. **Production remains untouched.** No staging, commit, push, freeze, App Hosting publish, or parent M0 occurred in this corrective’s closure.

## Evidence highlights

- Focused projection/mapper/refresh/population contracts: **31/31 passed**
- Storage Rules emulator + security contracts: **3/3 passed**
- Functions build / Portal typecheck / targeted ESLint / `git diff --check`: **PASS**
- Enriched population APPLY on `fresh-prints-dev`: **actualWrites 6**; VERIFY: **alreadyCorrect 114**
- DEV Functions: `onPrintRequestItemPortalProjectionWritten`, `onStaffArtworkPortalProjectionRefreshWritten`
- DEV Storage Rules released for preview/thumb customer reads

## Workflow closure

- [x] Owner DEV QA PASS recorded
- [x] Plan → Review → Implement → Test → DEV population → DEV cutover → Owner QA → Signoff complete
- [x] Signoff recorded as `approved_with_notes`
- [x] Production remains untouched
- [x] No staging / commit / push / freeze / parent M0 this turn

## Remaining pre-freeze children (parent still blocked)

1. `portal-assisted-final-artwork-add-retention-sentinel-corrective` — complete outstanding QA gaps → Signoff
2. `assisted-creation-multi-proof-selection` — apply minor Plan amendment → Implement → Test → Owner DEV QA → Signoff

Exact next checkpoint after this Signoff:

> **OWNER DEV QA: portal-assisted-final-artwork-add-retention-sentinel-corrective**
