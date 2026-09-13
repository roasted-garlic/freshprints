# Owner DEV QA — WS3 Configurable Gang-Sheet Pricing & Weight PASS

**Date:** 2026-09-01  
**Goal:** `pre-smart-profiling-print-request-and-gang-sheet-polish`  
**Workstream:** WS3 — Configurable gang-sheet pricing & weight tiers  
**Environment:** `fresh-prints-dev` + local Studio (`npm run dev:studio`)  
**Result:** **WS3 OWNER DEV QA: PASS**

---

## Reference SHAs

| Artifact | SHA |
|----------|-----|
| WS3 implementation (Show Queue configurable pricing) | `40fe7fd075058a0ccfc60ceafd997e6b64f23890` |
| Internal Gang Sheet Rules git alignment | `fe5009756c47f88a9887a0a5fa393f13e0a27b0b` |

---

## Owner verification (confirmed)

### Show Queue Settings → Pricing & Weight

- Editable size cutoff
- Editable small-tier price
- Editable small-tier weight
- Editable large-tier price
- Editable large-tier weight
- Settings persist successfully on DEV after Firestore Rules deploy

### Defaults (when unset)

| Tier | Size rule | Price | Weight |
|------|-----------|-------|--------|
| Small | 5″ and under | $1.00 | 0.40 oz |
| Large | over 5″ | $2.00 | 0.75 oz |

**Cutoff:** 5″

### Classification (owner-accepted contract)

- Both dimensions ≤ cutoff → **Small**
- Either dimension > cutoff → **Large**
- Exactly at cutoff → **Small**

### Gang sheet export behavior

- **Grouped by Customer** — pricing/weight summary correct
- **Sheet per Customer** — pricing/weight summary correct
- **Standard / efficiency** — no price/weight summary line
- Tier-specific weight calculations (not flat 0.75 oz × all)
- Custom settings changes update calculations after regenerate
- Continuation segments remain segment-local where applicable

### Internal Gang Sheet settings (DEV)

- Internal Gang Sheet settings permission issue resolved on DEV after Rules deploy + git alignment
- Separate Internal Gang Sheet settings surface accepted in owner QA

---

## Backend / deploy scope (no production)

| Item | Status |
|------|--------|
| DEV Firestore Rules (`settings/showQueue` pricing fields) | **deployed** — record: `2026-09-01-pre-smart-profiling-ws3-configurable-gang-sheet-pricing-dev-rules-deploy-record.md` |
| DEV Firestore Rules (`settings/internalGangSheet`) | **deployed + git aligned** — record: `2026-09-01-pre-smart-profiling-internal-gang-sheet-settings-dev-rules-deploy-record.md` |
| Production deploy | **NOT performed** |
| Migration | **NONE** |
| Functions / Storage / Hosting for configurable pricing | **NOT deployed** |
| Post-implementation tier value edits | **No redeploy required** (Firestore settings only) |

---

## Automated test evidence (prior to owner QA)

| Command | Result |
|---------|--------|
| `npx tsx --test packages/shared/src/constants/gangSheetSectionPricingSettings.constants.test.ts packages/shared/src/utils/gangSheetCustomerSectionSummary.test.ts packages/shared/src/utils/gangSheetCacheFingerprint.test.ts` | **23/23 PASS** |
| `npm --prefix functions run build` | **PASS** |

Report: `docs/workflow/reviews/2026-09-01-pre-smart-profiling-ws3-configurable-gang-sheet-pricing-test-report.md`

Implementation review: **approved** — `docs/workflow/reviews/2026-09-01-pre-smart-profiling-ws3-configurable-gang-sheet-pricing-implementation-review.md`

---

## Managed goal workstream status

| WS | Scope | Owner DEV QA |
|----|-------|--------------|
| WS1 | Remove from Show & Edit | **PASS** |
| WS2 | Custom Request Final Artwork | **PASS** |
| WS3 | Configurable gang-sheet pricing & weight | **PASS** |

Standalone correctives (not WS4): AI Review Firestore Rules corrective — owner QA **PASS** (separate record).

---

## Not authorized by this PASS

- Managed goal final signoff
- Production deploy / promotion
- Smart Profiling implementation

**Next:** Final signoff phase after remaining goal-scoped source is committed and signoff checklist is complete.
