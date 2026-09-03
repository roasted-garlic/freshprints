# Review: Interactive Upscale DPI rehydration + `<250` initiation eligibility

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-09-03-interactive-upscale-dpi-rehydration-and-eligibility-plan.md |
| Parent goal | `firestore-rules-print-request-item-resize-expression-budget` (Signoff **blocked**) |
| Verdict | **approved** |

---

## Summary

Independent source audit confirms a **cross-app hydration defect**: effective DPI after remount uses baseline pixels because enhanced dimensions live on design/upload documents and in ephemeral card state (`enhanceResultPixels`), while parents patch only `artworkEnhanceMode` and Portal’s `catalogDesignByIdCache` can serve pre-enhance designs for five minutes. OFF→ON works because the callable returns `widthPx`/`heightPx` into local state again. Eligibility currently offers first-time generation below ~**285** DPI despite unused `INTERACTIVE_UPSCALE_OFFER_MIN_DPI = 250`. Plan’s shared-threshold + summary/cache hydrate fix is the correct layer. **No implementation in this review.**

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Rehydrate + eligibility; Rules untouched |
| Architecture alignment | pass | Shared helper + client hydrate of persisted asset metadata |
| Security impact addressed | pass | No permission broadening |
| Data model impact addressed | pass | No new fields |
| Backend impact addressed | pass | Shared offer gate may tighten Functions generation |
| Test strategy adequate | pass | Shared + Portal + Studio + manual matrix |
| Human checkpoints identified | pass | Blocks Rules Signoff; DEV QA after implement |
| Roadmap alignment | pass | Owner-blocking corrective |
| Documentation plan | pass | TD-033 amended; optional ADR-FP-080 note |
| No silent scope expansion | pass | Explicit no Rules / no Signoff / no commit |

---

## FR1–FR36

### FR1. Exact component displaying badge

- Portal: `PortalPrintRequestItemCard` (`sizeAssessment.effectiveDpi`)
- Studio: `PrintRequestItemCard` (same pattern)

### FR2. Exact immediate DPI data source

`assessPrintRequestItemSize` with pixels from `resolveActiveArtworkPixelDimensions`, where enhanced dims come primarily from **local `enhanceResultPixels`** set from callable `widthPx`/`heightPx` right after Upscale ON.

### FR3. Exact reload / remount DPI data source

Same helpers, but `enhanceResultPixels` is null; enhanced dims from `design.interactiveEnhancedWidthPx/HeightPx` or `upload.interactiveEnhancedWidthPx/HeightPx`. If missing/stale → **baseline** `design.width/height` or `upload.widthPx/heightPx`.

### FR4. Persistence fields

- Item: `artworkEnhanceMode`, `preEnhancePrintWidthInches`, `preEnhancePrintHeightInches`
- Design / upload: `interactiveEnhancedWidthPx`, `interactiveEnhancedHeightPx`, path, `interactiveEnhanceGeneratedAt`

### FR5. Why Studio can be correct while Portal is wrong

Studio often reloads designs via `getDesignById` without Portal’s 5‑minute by-id cache. Portal `getReadyDesignsByIds` → `loadCatalogDesignByIdCached` commonly returns a **pre-enhance** design. Same logical bug exists in Studio when upload/design props are stale (owner upload case).

### FR6. Library items alone?

**No.** Strongest Portal signal is Library (cache). Upload path is also affected.

### FR7. Customer-upload

**Affected** (Studio owner evidence; Portal maps same fields). Same hydrate pattern.

### FR8. Other sources

Only `catalog_design` and `customer_upload` for Interactive Upscale on Print Request items.

### FR9. Most-recent / multi-item

Local `enhanceResultPixels` is per-card; remount clears it. Shared Portal design cache can poison all items sharing a design id. Adding another artwork remounts/reloads siblings → triggers failure. Full multi-item live matrix remains for Test phase.

### FR10. Exact DPI reload root cause

**Missing client hydration of persisted enhanced pixel dimensions into the card’s active-pixel inputs after remount**, amplified by **Portal catalog design by-id cache** and **parent handlers that update mode only**.

### FR11. Canonical fix architecture

Persisted asset `interactiveEnhanced*` + item mode → (invalidate cache / patch summaries with callable pixels) → `resolveActiveArtworkPixelDimensions` → `assessPrintRequestItemSize`. No cosmetic 300; no mount-time toggle.

### FR12. Exact current eligibility predicate

`isInteractiveUpscaleGenerationOfferedAtPrintSize`: baseline effective DPI `< 300 × 0.95` (**~285**). Used by `resolveInteractiveUpscaleToggleEligibility` for first-time offer and for some selection gating.

### FR13. Exact new `<250` predicate

`effectiveDpi < INTERACTIVE_UPSCALE_OFFER_MIN_DPI` where that constant is **250** (`EFFECTIVE_DPI_GOOD_MIN`). Use for OFF→ON **new generation** offer. Align `resolveInteractiveEnhanceTargetPixels` early exit with the same floor so Functions cannot generate at ≥250.

### FR14. Behavior at boundaries

| DPI | New OFF→ON | Notes |
|-----|------------|-------|
| 249.x | allow | if capacity/target allow |
| 250 | deny | `>= INTERACTIVE_UPSCALE_OFFER_MIN_DPI` |
| 251–299 | deny new; warning band for size badge | |
| ≥300 | deny new; optimal badge | |

### FR15. Existing ON-state semantics

Keep: derivative present + `mode === "enhanced"` → toggle remains usable to switch OFF even if baseline (or enhanced) DPI ≥250. Do **not** auto-clear enhanced mode.

### FR16. Exact files proposed

Per Plan table: shared `interactiveArtworkEnhance.ts` + tests; Portal card + `usePrintRequestDetail` (+ view wiring); Studio card + `PrintRequestsPage` (+ details hook if needed).

### FR17. Tests proposed

Shared T9–T16 eligibility; unit tests that enhanced mode without enhanced px falls back (document current bug) and with enhanced px computes ~300; parent patch / invalidate coverage where practical; manual T1–T8 remount matrix.

### FR18. Functions

**YES conditional** — if shared offer/target helpers are used in Functions bundle, rebuild/deploy Functions so server matches UI. No new callable. Prefer **YES** for DEV Functions after implement if shared package is consumed.

### FR19. Firestore Rules

**NO**

### FR20. Schema / migration

**NO**

### FR21. Studio change

**YES**

### FR22. Portal deployment

**YES** (DEV App Hosting after implement + owner QA)

### FR23. Security

No broadening. Tighter client/server initiation gate. Callable remains authority for mutation.

### FR24. Rollback

Revert shared + client patches; redeploy Portal/Studio/(Functions). Rules untouched.

### FR25. ADR

**NO new ADR required** if treated as aligning code to existing `INTERACTIVE_UPSCALE_OFFER_MIN_DPI` + ADR-FP-080 interactive amendment. Optional one-line ADR-FP-080 amendment noting initiation floor is **250** (not ~285 near-300 tolerance) — **optional**, not blocking.

### FR26. [NEEDS OWNER DECISION]

None for implementation start after this approval. Optional: whether DEV Functions must ship in same wave as Portal/Studio (recommend **yes** if shared gate is in Functions).

### FR27. Studio reproduction

Owner: uploaded item, Upscale ON, wrong DPI after return; OFF→ON corrects. **Accepted.**

### FR28. Studio uploaded-artwork

**Reproduced by owner** — in scope.

### FR29. Portal Library

**Reproduced by owner** — in scope.

### FR30. Cross-app commonality

**YES** — shared pixel helper + parallel card local-state pattern; Portal cache is an additional amplifier.

### FR31. State difference before vs after OFF→ON

Before: mode enhanced, enhanced px missing in props → baseline DPI. After: callable returns enhanced `widthPx`/`heightPx` → `setEnhanceResultPixels` → correct DPI. Mode already enhanced; selection reuse path.

### FR32. Shared helper involvement

**YES** — `resolveActiveArtworkPixelDimensions`, `resolveInteractiveUpscaleToggleEligibility`, `assessPrintRequestItemSize`. Defect is primarily **inputs** (missing enhanced px), plus wrong offer threshold in shared eligibility.

### FR33. Canonical fix layer

Shared eligibility constant wiring + **client hydration of persisted enhanced dimensions** (and Portal cache invalidate). Not Rules; not new schema.

### FR34. One fix vs app-specific

**One shared eligibility fix + both apps’ parent/summary hydrate** (Portal also invalidate cache).

### FR35. `<250` predicate shared or duplicated?

**Should be shared only** via `isInteractiveUpscaleGenerationOfferedAtPrintSize` / target resolver. Apps must not hardcode 250.

### FR36. App × source regression matrix

| | Catalog | Customer upload |
|--|---------|-----------------|
| Portal | hydrate + cache invalidate + eligibility | hydrate summaries + eligibility |
| Studio | hydrate design props + eligibility | hydrate upload props + eligibility |

States: not upscaled / session-upscaled / rehydrated ON. Transitions: load, navigate, add item, remount, reload, OFF→ON.

---

## Architecture Review

**Findings:** Plan correctly avoids faking DPI and avoids mount-time toggle. Aligns unused constant with behavior.

**Required changes:** None.

---

## Security Review

**Findings:** No Rules change. Server generation should share the same 250 floor when Functions bundle updates.

**Required changes:** None.

**Human approval before production:** Yes (later).

---

## Data Model Review

**Findings:** Fields already exist; no migration.

**Required changes:** None.

---

## Backend Review

**Findings:** Functions already persist enhanced dims; client fails to consume them after remount.

**Required changes:** None beyond shared gate + optional Functions redeploy.

---

## Testing Review

**Findings:** Existing shared test explicitly asserts wrong ~285 offer — must be rewritten.

**Required changes:** None beyond Plan.

---

## Documentation Review

**Findings:** Amend TD-033; optional ADR-FP-080 note.

---

## Required Changes

None.

## Blockers

None for Plan approval. **Rules Signoff remains blocked** until this corrective is implemented and owner-QA’d.

---

## Verdict Rationale

Root cause explains owner’s OFF→ON clue, Portal Library + Studio upload evidence, and unused 250 constant. Fix is narrow and architectural.

## Next Step

Await owner authorization to **Implement** this Plan. Do **not** Signoff Rules goal. Do **not** commit/push. Do **not** deploy until Implement + Test authorize.
