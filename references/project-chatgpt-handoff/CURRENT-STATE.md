# Fresh Prints — Current State Snapshot

**Last updated:** 2026-08-31

---

## FreshForge workflow

| Item | Value |
|------|-------|
| Status | **IDLE** |
| DONE | **yes** |
| Active goal | — |
| Last completed goal | `print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale` |
| Owner DEV QA | **PASS** (2026-08-31) |
| Production | **NOT AUTHORIZED / NOT PROMOTED** |
| Smart Profiling | **NOT STARTED** (parked — next major candidate only) |
| Workflow state | `.cursor/workflow/state.md` |
| Signoff | `docs/workflow/reviews/2026-08-31-print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale-signoff.md` |

**No automatic next goal started.**

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

Await owner direction: **production promotion** (separate authorization) or **Smart Profiling** managed goal. FreshForge **IDLE**.
