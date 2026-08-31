# Final Implementation Review: Print Request Sizing + Interactive Upscale

| Field | Value |
|-------|-------|
| Date | 2026-08-31 |
| Goal | `print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale` |
| Verdict | **approved** |
| Production | **NOT AUTHORIZED / NOT PROMOTED** |
| Owner DEV QA | **PASS** |
| Supersedes | `2026-08-30-print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale-implementation-review.md` (approved_with_notes), `2026-08-31-ws-toggle-production-export-parity-implementation-review.md` (approved_with_changes), `2026-08-31-ws-toggle-interactive-original-storage-read-fix-implementation-review.md` (approved_with_changes), `2026-08-31-ws-toggle-size-edit-preserve-enhanced-mode-implementation-review.md` |

---

## Final checklist (20)

| # | Criterion | Result |
|---|-----------|--------|
| 1 | **10″ system fallback** (`STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES`) | **pass** |
| 2 | **Runtime configurable default** (`defaultPrintRequestWidthInches`) | **pass** |
| 3 | **No existing-item resizing** / snapshot-at-create | **pass** |
| 4 | **15″ automated** import/upload target (`image-quality-v3`) | **pass** |
| 5 | **Interactive request-driven** enhancement (~300 DPI at selected size) | **pass** |
| 6 | **One valid derivative** per artwork lineage | **pass** |
| 7 | **Cumulative ≤6×** from native/original | **pass** |
| 8 | **Baseline preserved** (non-destructive derivative model) | **pass** |
| 9 | **Enhanced mode persists** through ordinary size edits | **pass** |
| 10 | **Reset to Default** (OFF + default size; derivative retained) | **pass** |
| 11 | **`catalog_design` + `customer_upload`** support | **pass** |
| 12 | **Studio + Portal** support | **pass** |
| 13 | **No regeneration** on later larger sizing | **pass** |
| 14 | **Export/gang-sheet/ZIP** active-variant parity | **pass** |
| 15 | **Cache identity** parity (production asset in fingerprint) | **pass** |
| 16 | **Missing enhanced asset** fails closed in production | **pass** |
| 17 | **Stale derivative recovery** safe (Storage existence check) | **pass** |
| 18 | **Firestore/Storage** security boundaries | **pass** |
| 19 | **No migration/backfill** | **pass** |
| 20 | **Production untouched** | **pass** |

---

## DPI policy (preserved)

- **<200** effective DPI → block save / production sizing
- **200–299** → allowed with warning
- **300+** → optimal
- Max Print Request dimension **22″**; physical inches separate from pixel resolution

---

## DEV deploy evidence

| Date | Scope | Project | Record |
|------|-------|---------|--------|
| 2026-08-30 | `enhancePrintRequestArtwork`, customer-upload finalize/retry | `fresh-prints-dev` | `2026-08-30-print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale-dev-deploy-record.md` |
| 2026-08-30 | `addPortalCatalogDesignToPrintRequest`, `setPrintRequestItemArtworkEnhanceMode` | `fresh-prints-dev` | `2026-08-30-ws-toggle-state-machine-corrective-dev-deploy-record.md` |
| 2026-08-31 | Firestore rules (gang sheet interactive snapshots) | `fresh-prints-dev` | export parity deploy record |
| 2026-08-31 | Storage rules + `setPrintRequestItemArtworkEnhanceMode` | `fresh-prints-dev` | `2026-08-31-ws-toggle-interactive-storage-access-dev-deploy-record.md` |

Production: **not deployed**.

---

## Superseded / removed language

The following are **not** part of the final contract:

- Permanent **11″** system fallback (replaced by configurable default + **10″** fallback)
- Regeneration when user increases print size after derivative exists
- Auto-baseline on DPI eligibility during ordinary edits
- Destructive canonical-original replacement for interactive enhance
- Studio-only or catalog-only interactive enhancement

---

## Verdict

**approved** — all required changes from prior `approved_with_changes` reviews completed; owner DEV QA **PASS**; ready for signoff on `development` only.
