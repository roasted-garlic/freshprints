# Fresh Prints — Current State Snapshot

**Last updated:** 2026-08-30

---

## FreshForge workflow

| Item | Value |
|------|-------|
| Status | **ACTIVE** |
| Active goal | `print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale` |
| Phase | **Amendment review — WS-CONFIG-DEFAULT + WS-TOGGLE** |
| Implementation | **not started** (WS-CONFIG-DEFAULT first) |
| Owner DEV QA | **FAIL** |
| Human checkpoint | **yes** — acknowledge review; then `APPROVE DEPLOY` after WS-CONFIG-DEFAULT |
| Workflow state | `.cursor/workflow/state.md` |

---

## Customer Identity program — COMPLETE on DEV

| Workstream | Status |
|------------|--------|
| WS1 Identity foundations | **DONE** |
| WS2 Transfer Username | **DONE** |
| WS3 Full Account Merge | **DONE** |
| WS4 Customer Activity + Deep Linking | **DONE** (Owner DEV QA **PASS** 2026-08-30) |

Signoff: `docs/workflow/reviews/2026-08-30-customer-account-identity-management-ws4-signoff.md`

**No production promotion** of identity work.

---

## Active goal — sizing / upscale (local implementation complete)

| Item | Shipped in repo (local `development`) |
|------|---------------------------------------|
| Print Request initial default width | **11″ fallback constant** → becoming **configurable** `settings/standardPrintSizes.defaultPrintRequestWidthInches` (snapshot-at-create) |
| Automated import/upload upscale target | **15″** (`AUTOMATED_UPSCALE_TARGET_WIDTH_INCHES`, policy `image-quality-v3`) |
| Legacy catalog enhance | **In flux** — current one-way staff callable overwrites baseline; owner direction: **per-asset toggle** (non-destructive), Studio + Portal, catalog + upload, **no customer quota** |
| Pass semantics | Automated max **1** pass; staff manual max **2** total; cumulative **≤6×** from native |
| Gang sheet two-up | Two **11″** @ 300 DPI fit on 23″ roll (tested) |

**DEV Firebase (2026-08-30):** `enhancePrintRequestArtwork` created; `finalizeCustomerUpload`, `finalizeCustomerUploadZip`, `retryCustomerUploadProcessing` updated on `fresh-prints-dev`. Assisted-creation proof Function **not** redeployed (out of scope).

**Studio/Electron:** restart `npm run dev:studio` before QA — catalog import 15″ runs in Electron main process.

**Portal:** Portal 11″ FAIL 1 — **hold deploy (Option B)** until WS-CONFIG-DEFAULT (runtime setting in callables). Toggle + configurable default — **not implemented**.

**Owner QA (2026-08-30):** **FAIL** — amendments complete; implementation not started.

Artifacts:

- Test report: `docs/workflow/reviews/2026-08-30-print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale-test-report.md`
- Implementation review: `docs/workflow/reviews/2026-08-30-print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale-implementation-review.md`

---

## Recently completed on DEV (not production)

### Show Queue — Did Not Print recovery

- Primary: **Move unprinted requests to another show**
- Secondary: **Release only** → **Needs Re-queue** Working triage
- Owner DEV QA **PASS**; signoff 2026-08-30

### Customer Identity WS1–WS4

- Complete on DEV; production **NOT AUTHORIZED**

### Print Request Standard Size presets

- Settings + modal (v1 defaults) on DEV — signoff 2026-08-29

---

## Roadmap sequencing (owner)

1. Customer Identity WS1–WS4 — **DONE (DEV)**
2. Show Queue recovery / DEV fixture — **DONE (DEV)**
3. **11″ default + 15″ upscale + legacy enhance** — **implement complete locally; DEV deploy + QA pending**
4. Smart Profiling completion / tag retirement — **AFTER sizing goal signs off**
5. Coordinated production promotion — **later**

**Do not start Smart Profiling** until sizing/upscale goal signs off on DEV.

---

## Smart Profiling (truthful state)

- Smart Profiles exist (`smart-profile-v1`); Algolia Smart Filters on DEV
- Shadow / reprocess control plane on DEV (Slice 4–6 work)
- **Autonomous live approval OFF**
- Legacy tag retirement **not complete**
- **No new Smart Profiling work** in sizing goal

---

## Live production (unchanged)

| Item | Value |
|------|-------|
| Published Studio | **1.0.9** (last documented promote) |
| Canonical Portal | `https://myprintrequest.com` |

Recent DEV goals are **not** on production.

---

## Next workflow step

Owner manual DEV QA on `fresh-prints-dev` → signoff on PASS. Restart Studio before catalog-import QA.
