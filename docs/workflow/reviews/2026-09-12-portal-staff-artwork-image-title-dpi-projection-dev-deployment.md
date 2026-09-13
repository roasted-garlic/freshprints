# DEV Deployment Evidence — Staff Artwork image/title/DPI projection amendment

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `portal-staff-artwork-neutral-projection-corrective` |
| Environment | `fresh-prints-dev` only |
| Disposition | Functions + Storage Rules deployed; Firestore customer deny on `staffArtworks` unchanged; no App Hosting; no APPLY |

## Deploy command

```powershell
firebase deploy --project fresh-prints-dev --only functions:onPrintRequestItemPortalProjectionWritten,functions:onStaffArtworkPortalProjectionRefreshWritten,storage
```

## Results

| Target | Result |
|---|---|
| `onPrintRequestItemPortalProjectionWritten` | Updated on DEV (Admin enrichment path) |
| `onStaffArtworkPortalProjectionRefreshWritten` | Created ACTIVE on DEV |
| Storage Rules | Released to DEV — customer read limited to `preview.webp` / `thumbnail.webp` under `/staff-artwork/{id}/` |
| Firestore Rules | **Not redeployed** this turn; existing customer deny on `staffArtworks` retained |
| Additive index | **None required** — existing `printRequestItems.staffArtworkId` COLLECTION ASCENDING fieldOverride already present |
| Portal App Hosting | **Not deployed** (localhost-only for DEV QA) |
| Production | **Untouched** |

## Confirmations

- No `--force` index operations
- No production project targeted
- No population APPLY
- No commit / push / freeze / staging
