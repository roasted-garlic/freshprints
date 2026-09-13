# Implementation Review: WS3 Configurable Gang-Sheet Pricing / Weight

| Field | Value |
|-------|-------|
| Date | 2026-09-01 |
| Plan amendment | `docs/workflow/plans/2026-09-01-pre-smart-profiling-ws3-configurable-gang-sheet-pricing-amendment.md` |
| Formal review | `docs/workflow/reviews/2026-09-01-pre-smart-profiling-ws3-configurable-gang-sheet-pricing-review.md` (**approved**) |
| Verdict | **approved** |
| Production | **NOT AUTHORIZED** |

---

## Scope delivered

| Requirement | Status |
|-------------|--------|
| Configurable cutoff + tier price/weight on `settings/showQueue` | **pass** |
| Defaults 5″ / $1·0.40 / $2·0.75 | **pass** |
| Classification: both ≤ cutoff → small; either > cutoff → large | **pass** |
| Tier-specific weight lines (no flat 0.75×all) | **pass** |
| Show Queue Settings **Pricing & Weight** section | **pass** (section, not tab — no tab architecture in modal) |
| Renderer → IPC → compositor propagation | **pass** |
| Cache fingerprint v2 + full pricing config | **pass** |
| Standard mode unaffected | **pass** |
| Segment-local continuation behavior preserved | **pass** (compositor unchanged structurally) |
| Firestore rules allowlist | **pass** (code); **requires DEV deploy** |

---

## Files changed

| File | Change |
|------|--------|
| `packages/shared/src/constants/gangSheetSectionPricingSettings.constants.ts` | New defaults, resolver, validation |
| `packages/shared/src/constants/gangSheetSectionPricingSettings.constants.test.ts` | New |
| `packages/shared/src/utils/gangSheetCustomerSectionSummary.ts` | Config-driven tiers + mixed weight |
| `packages/shared/src/utils/gangSheetCustomerSectionSummary.test.ts` | Updated for 5″ model |
| `packages/shared/src/utils/gangSheetCacheFingerprint.ts` | `sectionSummaryVersion: 2` + pricing |
| `packages/shared/src/utils/gangSheetCacheFingerprint.test.ts` | Pricing invalidation tests |
| `packages/shared/src/types/export/gangSheetExportIpc.types.ts` | `sectionPricing` field |
| `apps/studio/.../showQueueSettingsService.ts` | Persist + validate new fields |
| `apps/studio/.../useShowQueueSettings.ts` | Update input types |
| `apps/studio/.../UpcomingShowsPage.tsx` | Pricing & Weight settings UI |
| `apps/studio/.../useExportGangSheetPng.ts` | Pass `sectionPricing` on grouped IPC |
| `apps/studio/electron/.../composeGroupedGangSheetSheets.ts` | Use request pricing |
| `apps/studio/electron/.../composeContinuousCustomerGroupedGangSheetSheets.ts` | Use request pricing |
| `firestore.rules` | Allowlist 5 new optional fields |

---

## DEV deploy / restart scope (STOP — not executed)

| Step | Required |
|------|----------|
| `firebase deploy --only firestore:rules --project fresh-prints-dev` | **Yes** — new settings fields |
| Restart `npm run dev:studio` | **Yes** — renderer + Electron main |
| Functions deploy | **No** |
| Storage / Hosting | **No** |
| Production | **NOT AUTHORIZED** |

After initial deploy, **changing tier values requires no redeploy** — Firestore settings only.

---

## Owner DEV QA checklist

1. Open Studio → Show Queue → Settings → **Pricing & Weight**
2. Confirm defaults: cutoff 5″, small $1 / 0.40 oz, large $2 / 0.75 oz
3. Generate **Grouped by Customer** — verify mixed/single-tier lines
4. Generate **Sheet per Customer** — same
5. Generate **Standard** — no price/weight line
6. Change settings (e.g. cutoff 6″, large $3 / 0.90 oz, small $1.50 / 0.45 oz) → Save
7. Regenerate grouped sheet — new math without code redeploy
8. Continuation segments — only placements on that segment counted

Reply: `WS3 PASS` / `WS3 PASS WITH NOTES` / `WS3 FAIL`

---

## Test report

`docs/workflow/reviews/2026-09-01-pre-smart-profiling-ws3-configurable-gang-sheet-pricing-test-report.md`
