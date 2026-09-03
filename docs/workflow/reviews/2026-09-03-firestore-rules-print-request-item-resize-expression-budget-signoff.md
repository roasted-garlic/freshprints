# Signoff: Firestore Rules Print Request item resize expression budget (+ Interactive Upscale corrective)

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Signoff by | Signoff Agent |
| Parent goal | `firestore-rules-print-request-item-resize-expression-budget` |
| Blocking corrective | `interactive-upscale-dpi-rehydration-and-eligibility` (TD-033) |
| Rules Plan | `docs/workflow/plans/2026-09-03-firestore-rules-print-request-item-resize-expression-budget-plan.md` |
| Rules Formal Review | `docs/workflow/reviews/2026-09-03-firestore-rules-print-request-item-resize-expression-budget-review.md` |
| Rules IR | `docs/workflow/reviews/2026-09-03-firestore-rules-print-request-item-resize-expression-budget-implementation-review.md` |
| Rules Test report | `docs/workflow/reviews/2026-09-03-firestore-rules-print-request-item-resize-expression-budget-test-report.md` |
| Corrective Plan | `docs/workflow/plans/2026-09-03-interactive-upscale-dpi-rehydration-and-eligibility-plan.md` |
| Corrective Formal Review | `docs/workflow/reviews/2026-09-03-interactive-upscale-dpi-rehydration-and-eligibility-review.md` |
| Corrective IR | `docs/workflow/reviews/2026-09-03-interactive-upscale-dpi-rehydration-and-eligibility-implementation-review.md` |
| Corrective DEV QA checkpoint | `docs/workflow/reviews/2026-09-03-interactive-upscale-dpi-rehydration-and-eligibility-dev-qa-checkpoint.md` |
| Final status | **approved_with_notes** |

---

## Summary

Closed the parent Firestore Rules expression-budget defect for customer Print Request item resize when Interactive Upscale metadata is present and unchanged, and closed the owner-blocking Interactive Upscale DPI rehydration + `<250` initiation corrective (TD-033) discovered during DEV Rules smoke. DEV Rules and corrective Functions are live on `fresh-prints-dev`. Owner Rules QA and full cross-app Interactive Upscale DEV QA both passed. Production remains separate and unauthorized.

---

## Chronology (preserve history)

1. Prior global Rules baseline was **158/159**.
2. Failure isolated to `tests/firebase/printRequestItemResize.rules.test.ts` — `allows customer size update when interactive upscale fields are present and unchanged` (1000-expression ALLOW-path).
3. Plan + Formal Review completed for Rules corrective.
4. Rules implementation introduced reduced-cost `customerPrintRequestItemPortalEditableUpdate` customer path.
5. Security/parity coverage expanded in resize Rules tests + alignment tests.
6. Focused Rules reached **22/22**.
7. Full Rules reached **169/169**.
8. Rules Implementation Review **approved_with_notes**.
9. DEV Firestore Rules deploy succeeded (`firebase deploy --only firestore:rules --project fresh-prints-dev`).
10. Owner Rules smoke confirmed resize persisted with Upscale ON and no permission error (**PASS WITH NOTE**).
11. During smoke, incorrect DPI rehydration after navigate/remount was discovered.
12. Defect initially appeared Portal/Library-specific (TD-033 opened).
13. Owner later reproduced equivalent problem in Studio customer-upload artwork (OFF→ON repaired DPI).
14. TD-033 scope expanded to Portal + Studio and Library + customer-upload + eligibility.
15. Corrective Plan + Formal Review completed (**approved**).
16. Root cause: ephemeral `enhanceResultPixels` + stale parent design/upload summary / Portal `catalogDesignByIdCache`.
17. Corrective implementation patches normalized design/upload summaries via `mergeInteractiveEnhanceResultIntoAssetSummary`.
18. Portal affected-design cache invalidation added.
19. Studio parent-state design/upload patching added.
20. Interactive Upscale initiation threshold aligned to rounded effective DPI `< 250` (`INTERACTIVE_UPSCALE_OFFER_MIN_DPI`).
21. Focused shared / Portal / Studio tests passed; Functions build; Portal typecheck; touched lint.
22. Affected DEV Functions deployed: `setPrintRequestItemArtworkEnhanceMode`, `enhancePrintRequestArtwork`.
23. Owner full cross-app / cross-source QA **PASS**.
24. Navigation / remount / full reload / multi-item checks **PASS**.
25. 249.x / 250 / >250 boundary behavior **PASS**.
26. OFF→ON repair no longer required (**NO**).
27. Final parent goal approved for closeout (**approved_with_notes**).

---

## Changes Delivered

### Behavior — Rules

Customer Portal-editable Print Request item updates use the reviewed reduced-cost customer path with writable keys only: `printWidthInches`, `printHeightInches`, `sizeLabel`, `standardSizePresetKey`, `sortOrder`, `notes`, `updatedAt`. Ownership, lifecycle, identity, readiness, quantity, interactive-upscale metadata immutability, server-maintained fields, and unknown-field denial preserved. Staff authorization chain unchanged.

### Behavior — Interactive Upscale corrective

Callable enhance success patches parent design/upload summaries with enhanced dimensions; Portal invalidates that design cache entry; Studio patches design/upload parent state. DPI derives from `resolveActiveArtworkPixelDimensions` → `assessPrintRequestItemSize`. New OFF→ON only when displayed/canonical effective DPI `< 250`. Existing ON remains ON at ≥250. Save floor 200 and optimal 300 unchanged. No cosmetic DPI override.

### Files (categories A–H)

See commit inventory. Representative paths:

- Rules: `firestore.rules`; `tests/firebase/printRequestItemResize.rules.test.ts`; `packages/shared/src/constants/printRequest/printRequestLimitSettingsRulesAlignment.test.ts`
- Shared: `packages/shared/src/utils/interactiveArtworkEnhance.ts` (+ tests); `resolveShowExportProductionAsset.ts` (+ tests); `printRequestItemArtworkEnhanceFields.test.ts`
- Portal: `PortalPrintRequestItemCard.tsx`; `usePrintRequestDetail.ts`; hydration test; `portalPrintRequestService.ts`; `catalogService.ts`
- Studio: `PrintRequestItemCard.tsx`; `PrintRequestsPage.tsx`; `usePrintRequestDetails.ts`; `useReadyDesignsForSelection.ts`; `printRequestService.ts`; hydration test
- Docs/workflow/handoff/TD-033/ROADMAP/state

### Documentation Updated

Plans, reviews, IR, DEV smoke/QA checkpoints, this Signoff, `TECH_DEBT.md`, `ROADMAP.md`, ChatGPT handoff package.

---

## Tests

### Automated (preserve known results — no fabricated reruns)

| Check | Result |
|-------|--------|
| Focused Rules resize suite | **22/22 PASS** |
| Full `npm run test:rules` | **169/169 PASS** |
| Shared Interactive Upscale / export helpers | **PASS** |
| Portal focused / hydration | **PASS** |
| Studio focused / hydration | **PASS** |
| Functions build | **PASS** |
| Portal typecheck | **PASS** |
| Touched lint | **PASS** |

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Owner Rules DEV smoke (resize + Upscale ON persist) | **PASS WITH NOTE** (note = TD-033, now resolved) | Owner |
| Owner Interactive Upscale DEV QA (Portal+Studio; Library+upload; remount/nav/reload/multi-item; 249/250/>250; existing ON; 200/300) | **PASS** | Owner |
| OFF→ON repair still required | **NO** | Owner |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| DEV Rules deploy | obtained | 2026-09-03 | `firestore:rules` → `fresh-prints-dev` |
| DEV Functions deploy (corrective) | obtained | 2026-09-03 | two callables only |
| Owner Rules QA | obtained | 2026-09-03 | PASS WITH NOTE → corrective closed |
| Owner Interactive Upscale QA | obtained | 2026-09-03 | PASS |
| Final Signoff + commit/push to `origin/development` | obtained | 2026-09-03 | this closeout |
| Production deploy | **not authorized** | | |
| Database migration | N/A | | none |
| Secrets / env | N/A | | none |

---

## Risks & Known Issues

### Accepted Rules residual (`approved_with_notes`)

Optimized customer fast path does not fully re-run every expensive validator against exotic unchanged Admin-only malformed legacy field types. Verified deny/ownership/quantity/unknown-key/protected-field behavior remains. **Not a Signoff blocker.**

### Production

Rules + corrective Functions + Portal/Studio App Hosting / Studio release **not** promoted. Separate future authorization required.

---

## Follow-ups

| Item | Owner | Priority |
|------|-------|----------|
| Production promotion inventory (Rules + Functions + Portal + Studio as needed) | Owner | when authorized |
| Smart Profiling | — | **PARKED** |
| `show-queue-batch-allocation-performance` | — | **DEFERRED** |

---

## Final Status

**approved_with_notes**

TD-033 is **RESOLVED ON DEV** and is **not** an open Signoff blocker.

Production **NOT AUTHORIZED**. FreshForge returns **IDLE**.
