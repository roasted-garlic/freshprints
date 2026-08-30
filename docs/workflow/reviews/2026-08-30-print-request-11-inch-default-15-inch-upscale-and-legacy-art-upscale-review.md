# Formal Review: Print Request 11″ Default + 15″ Upscale + Legacy Art Upscale

| Field | Value |
|-------|-------|
| Date | 2026-08-30 |
| Plan | `docs/workflow/plans/2026-08-30-print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale-plan.md` |
| Verdict | **approved_with_changes** |
| Production | **NOT AUTHORIZED** |

---

## Summary

Plan correctly separates **request default width** (11″), **import upscale target** (15″ forward-only), and **staff-triggered legacy enhance** (manual second pass). Repo inspection confirms current defaults (10″ / 12″), gang-sheet two-up math, and the initialization bug where `Math.min(sourceWidth, cap)` prevents 11″ for ~10″ normalized catalog art. Scope is bounded; Smart Profiling explicitly excluded.

**Implementation may proceed after owner confirms `[NEEDS OWNER DECISION]` items below.**

---

## Review checklist

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Scope clear and bounded | **pass** |
| 2 | Architecture alignment | **pass** — callable + shared math; no UI→Storage shortcuts |
| 3 | Security impact addressed | **pass_with_notes** — rate limit/idempotency must be in implement |
| 4 | Data model + migrations noted | **pass** — forward-only; provenance fields proposed |
| 5 | Backend impact documented | **pass** |
| 6 | Test strategy adequate | **pass** |
| 7 | Human checkpoints identified | **pass** |
| 8 | Roadmap alignment | **pass** — before Smart Profiling per owner |
| 9 | No silent scope expansion | **pass** |

---

## Formal Review challenges (28)

| # | Question | Finding |
|---|----------|---------|
| 1 | 11″ two-up under actual constants? | **Yes** — `DEFAULT_GANG_SHEET_WIDTH_INCHES=23`, margins 0.25 each, gutter 0.5 → usable 22.5″; 11+0.5+11=22.5 |
| 2 | Init truly uses 11″ for eligible art? | **Requires code change** — not constant-only; plan documents baseline fix |
| 3 | Legacy ~10″ normalized art? | Stays 10″ today; fixed by baseline logic; DPI at 11″ ≈ 273–286 for 3000px — **good** tier, saveable |
| 4 | Auto upscale at init? | **No** — correct; manual enhance only for legacy |
| 5 | Canonical vs derivative? | **Recommend canonical enhance (V1)** with catalog confirmation |
| 6 | Studio vs Portal? | **Recommend Studio staff-only V1** — `[NEEDS OWNER DECISION]` |
| 7 | Roles for enhance? | Staff with PR access; catalog enhance needs `importDesigns` or owner |
| 8 | Cost / rate limits? | Plan requires idempotency + staff auth; implement must add per-item job guard |
| 9 | Max upscale multiplier? | **6×** (`MAX_UPSCALE_FACTOR`) — verified `printSize.constants.ts` |
| 10 | 15″ target vs low-res art? | Capped at 6×; `TARGET_NOT_REACHED_UPSCALE_CAPPED` pattern exists |
| 11 | Transparency preserved? | Reuse sharp PNG pipeline from import/upload; must add regression test |
| 12 | Failures / retries? | Plan requires non-corrupting PR state; implement typed errors |
| 13 | Duplicate clicks? | Idempotent `already_sufficient` + in-flight job lock required |
| 14 | Physical width during upscale? | **Unchanged** unless user edits — correct |
| 15 | Standard Size presets? | Unaffected; separate code path |
| 16 | 200 DPI floor intact? | **Yes** — out of scope to weaken |
| 17 | 22″ cap intact? | **Yes** |
| 18 | Export uses requested width? | **Yes** — `downloadAndResizeExportImage` at 300 DPI |
| 19 | Floating-point two-up? | Add explicit px-level nesting test at EXPORT_DPI |
| 20 | 12″ fails two-up? | **Yes** — 12+0.5+12=24.5 > 22.5 |
| 21 | Existing catalog assets? | Unchanged until staff enhance; no silent 15″ migration |
| 22 | Bulk backfill necessary? | **No for V1** — on-demand enhance sufficient per owner |
| 23 | Provenance persisted? | Plan proposes fields; implement must update `DATA_MODEL.md` |
| 24 | Functions/Rules/Storage/index? | **Functions yes** (new callable); Rules likely unchanged; index unlikely |
| 25 | Migration required? | **No** — forward-only constants + optional manual enhance |
| 26 | Customer uploads vs catalog? | Same math; different Storage paths and permission gates |
| 27 | Smart Profiling interaction? | **None** — pixel pipeline only |
| 28 | Before Smart Profiling? | **Yes** — owner sequencing accepted |

---

## Required changes before / during implement

1. **Lock owner decisions** on Studio-only V1 and `upscalePassCount` semantics.
2. **ADR-FP-080 amendment** documenting 15″ automated target, 11″ request default, manual second pass.
3. **Implement idempotency** (in-flight guard + already-sufficient) on enhance callable.
4. **Catalog enhance confirmation** modal copy reviewed by owner (product).
5. **Do not** change `PREFERRED_PRINT_WIDTH_INCHES` unless import messaging audit shows user-facing inconsistency.

---

## Security perspective

- Staff-only callable with server-side permission checks — **acceptable**
- No client secrets; sharp server-side only — **pass**
- Catalog-wide mutation requires elevated permission + confirmation — **pass**

---

## Architecture perspective

- Reuses shared `imageQualitySizingPolicy` / `printRequestItemSizing` — **pass**
- Avoid request-item-only Storage fork in V1 — **pass**

---

## Verdict

**approved_with_changes** — Plan is implementable. Resolve three `[NEEDS OWNER DECISION]` items at implement kickoff. **STOP** — no implementation until owner acknowledges review.

---

## `[NEEDS OWNER DECISION]` summary

1. **Studio-only V1** for legacy enhance vs Portal/customer access (review recommends Studio-only).
2. **`upscalePassCount` semantics** — extend to 2 for manual pass vs separate counter.
3. **Auto-prompt enhance** when user picks large Standard Size preset below optimal DPI (optional V1.1).

---

## Next step

Owner approval → set `Review Status: approved_with_changes` → begin Implement phase (separate session).
