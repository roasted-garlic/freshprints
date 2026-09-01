# Fresh Prints — Current State Snapshot

**Last updated:** 2026-09-01

---

## FreshForge workflow

| Item | Value |
|------|-------|
| Status | **ACTIVE** |
| DONE | **no** |
| Active goal | `pre-smart-profiling-print-request-and-gang-sheet-polish` |
| WS1 Owner QA | **PASS** |
| WS2 Owner QA | **PASS** |
| WS3 Owner QA | **PENDING / NEXT** |
| Production | **NOT AUTHORIZED / NOT PROMOTED** |
| Smart Profiling | **NOT STARTED** (parked) |
| Signoff | **NOT AUTHORIZED** (WS3 pending) |
| Workflow state | `.cursor/workflow/state.md` |

Standalone DEV corrective (not part of managed goal): **AI Review Approve/Reject Firestore Rules — PASS** on `fresh-prints-dev`. Production promotion inventory updated in `docs/standards/DEPLOYMENT.md`.

---

## Next workflow step

Owner WS3 gang-sheet price + weight QA (Tests A–H). Restart `npm run dev:studio` if needed. No Studio release. No managed-goal signoff until WS3 passes.

---

## Customer Identity program — COMPLETE on DEV

| Workstream | Status |
|------------|--------|
| WS1–WS4 | **DONE** on DEV; production **NOT AUTHORIZED** |

Signoff: `docs/workflow/reviews/2026-08-30-customer-account-identity-management-ws4-signoff.md`

---

## Recently completed — Print Request sizing + interactive upscale (DEV)

| Item | Shipped on `development` |
|------|--------------------------|
| Print Request default width | **Runtime Studio setting** `defaultPrintRequestWidthInches`; **10″** system fallback; new items only |
| Automated import/upload upscale | **15″** target (`image-quality-v3`); cumulative **≤6×** from native |
| Interactive upscale (WS-TOGGLE) | Studio + Portal; `catalog_design` + `customer_upload`; one derivative per lineage; `artworkEnhanceMode` toggle |
| Production export parity | Gang sheets (all modes), ZIP, manual builder honor active variant; cache fingerprints updated |
| Security | Firestore enhance fields; Storage staff read for `{designId}.interactive.png` |

**DEV Firebase:** Functions + Storage + Firestore rules deployed to `fresh-prints-dev` (2026-08-30 – 2026-08-31). **Production untouched.**

---

## Smart Profiling (truthful state)

- Smart Profiles exist on DEV; autonomous live approval **OFF**
- Legacy tag retirement **not complete**
- **No new Smart Profiling work** — parked until owner starts next managed goal

---

## Live production (unchanged)

| Item | Value |
|------|-------|
| Published Studio | **1.0.9** (last documented promote) |
| Canonical Portal | `https://myprintrequest.com` |

Recent DEV goals (identity, show queue recovery, sizing/upscale) are **not** on production.

---

## Next workflow step

Await explicit owner approval for WS1 corrective DEV deploy, then rerun owner QA. WS2 / WS3 QA remains pending. Production and Smart Profiling remain unauthorized.
