# Plan: Standard Size preset + Add to Request default recalibration

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Author | Planning Agent |
| Status | ready_for_review → **approved** (owner 2026-09-05) |
| Workflow | managed-phase |
| Related | ADR-FP-080 (presets/default only; do not reopen automated 15″ image-processing target) |
| Parent parked | TD-034 `catalog-enrich-v35` (source ready; awaiting owner DEV deploy auth — unchanged by this goal) |

---

## Goal

Recalibrate Fresh Prints **Standard Size** Full Back Adult/Youth preset widths and the **global Print Request / Add to Request system fallback** to **10.5″**, reducing unnecessary gangsheet space while keeping attractive customer-facing sizes. Existing saved request-item dimensions and production Firestore data must not be rewritten.

---

## Background

Completed DEV work under ADR-FP-080 introduced Standard Size presets (`settings/standardPrintSizes`) and a configurable Print Request default with code fallback `STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES` (currently **11″**). Full Back Adult presets currently run larger than Full Front (e.g. M 11.5″, L 12″, XL 12.5″, through 5XL 17″). Owner wants a focused preset/default recalibration only — **not** changes to the automated 15″ image-processing / interactive enhance targets.

Handoff docs read: `CURRENT-STATE.md`, `03`–`06`, `08`–`09`, `11`–`12`, `14` under `references/project-chatgpt-handoff/`. Authoritative paths confirmed via repo inspection + `08-tech-stack-repo-map.md` (not invented).

---

## Scope

### In Scope

1. Confirm Full Front Adult seed widths (keep if already matching approved table).
2. Update Full Back Adult seed widths to the approved table.
3. Confirm Full Front Youth seed widths (keep if already matching).
4. Update Full Back Youth Y2XL **11.5 → 11** (other youth back rows already match).
5. Change system fallback `STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES` **11 → 10.5**.
6. Update/add unit tests for every Adult/Youth Full Front and Full Back preset listed in acceptance criteria.
7. Search and update **stale** product/docs/test assertions that still describe old back widths or old **11″** (or historical **10″**) system fallback for Print Request init — without rewriting historical workflow archives unless they are still treated as current truth.
8. Record ADR/docs amendments for the new fallback and preset table.
9. Run checks listed in `references/project-chatgpt-handoff/11-testing-commands.md` / `docs/standards/TESTING.md` relevant to this change.
10. Produce an implementation report (files changed, tests run, no production resources touched).

### Out of Scope

- Automated **15″** image-processing / upscale target (`AUTOMATED_UPSCALE_TARGET_WIDTH_INCHES`)
- Interactive enhancement behavior / cumulative upscale limits
- Catalog import sizing (`PREFERRED_PRINT_WIDTH_INCHES` / `DEFAULT_PRINT_REQUEST_WIDTH_INCHES` remain **10″**)
- Toddler / Infant / Left Chest / Sleeve / Back Collar / Pocket / Hat presets
- Migration or rewrite of existing `printRequestItems` dimensions
- Production (or DEV) Firestore writes / deploys / settings console edits by the agent
- Renaming Youth key `yxs` / label `YXS` → `YXXS` (see Open Questions)
- Reopening TD-034 / Autonomous / WS6

---

## Current vs proposed values (repo inspection 2026-09-05)

### Authoritative sources

| Concern | Path | Symbol / notes |
|---------|------|----------------|
| Preset seed tables | `packages/shared/src/constants/printSize/standardPrintSizesSettings.constants.ts` | `ADULT_GARMENT_ROWS`, `ADULT_FULL_BACK_ROWS`, `YOUTH_GARMENT_ROWS`, `YOUTH_FULL_BACK_ROWS`; `buildDefaultStandardPrintSizesSettings()` |
| Canonical defaults export | same | `DEFAULT_STANDARD_PRINT_SIZES_SETTINGS` |
| Settings resolve / overlay | same | `resolveStandardPrintSizesSettings` — **saved Firestore widths override code defaults by key** |
| Global PR system fallback | `packages/shared/src/utils/printRequestItemSizing.ts` | `STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES` (**11** today) |
| Runtime operational default | `settings/standardPrintSizes.defaultPrintRequestWidthInches` | Snapshot-at-create; resolver falls back to constant above when absent/invalid |
| Studio Settings UI | `apps/studio/.../settings/components/StandardPrintSizesSettingsSection.tsx` | Displays fallback constant; owner-writable default width |
| Studio Add Designs / sizing | `apps/studio/.../print-requests/services/printRequestService.ts` + shared sizing utils | Uses resolved default / presets |
| Portal Add to Request | `apps/portal/.../useAddDesignToRequestFlow.ts`, Functions `addPortalCatalogDesignToPrintRequest.ts` | `resolvePrintRequestDefaultWidthInches(settings)` |
| Preset apply + aspect lock | `packages/shared/src/utils/applyStandardPrintSizePreset.ts` | Unchanged; height from width |
| Preset tests | `packages/shared/src/constants/printSize/standardPrintSizesSettings.constants.test.ts` | Must expand to full Adult/Youth front/back tables |
| Fallback tests | `packages/shared/src/utils/printRequestItemSizing.test.ts`, `interactiveArtworkEnhance.test.ts`, `apps/portal/.../portalCatalogAddInitialSizing.test.ts`, `functions/src/addPortalCatalogDesignToPrintRequest.test.ts` | Assert `=== 11` today |

`[NEEDS REPO CHECK]` resolved: no separate duplicate preset tables found under Portal/Studio; both consume shared defaults + Firestore overlay.

### Full Front Adult (`ADULT_GARMENT_ROWS`) — **already matches; keep**

| Size | Current | Proposed | Action |
|------|---------|----------|--------|
| XS | 9 | 9 | keep |
| S | 9.5 | 9.5 | keep |
| M | 10 | 10 | keep |
| L | 10.5 | 10.5 | keep |
| XL | 11 | 11 | keep |
| 2XL | 12 | 12 | keep |
| 3XL | 13 | 13 | keep |
| 4XL | 14 | 14 | keep |
| 5XL | 15 | 15 | keep |

### Full Back Adult (`ADULT_FULL_BACK_ROWS`) — **update**

| Size | Current | Proposed | Action |
|------|---------|----------|--------|
| XS | 10 | 10 | keep |
| S | 10.5 | 10.5 | keep |
| M | **11.5** | **11** | update |
| L | **12** | **11** | update |
| XL | **12.5** | **11** | update |
| 2XL | **13.5** | **12** | update |
| 3XL | **14.5** | **13** | update |
| 4XL | **16** | **14** | update |
| 5XL | **17** | **15** | update |

### Full Front Youth (`YOUTH_GARMENT_ROWS`) — **widths already match; keep**

| Label in repo | Key | Current | Proposed | Action |
|---------------|-----|---------|----------|--------|
| **YXS** (not YXXS) | `yxs` | 7.5 | 7.5 | keep |
| YS | `ys` | 8.5 | 8.5 | keep |
| YM | `ym` | 9.5 | 9.5 | keep |
| YL | `yl` | 10 | 10 | keep |
| YXL | `yxl` | 10.5 | 10.5 | keep |
| Y2XL | `y2xl` | 11 | 11 | keep |

### Full Back Youth (`YOUTH_FULL_BACK_ROWS`) — **Y2XL only**

| Label | Current | Proposed | Action |
|-------|---------|----------|--------|
| YXS | 7.5 | 7.5 | keep |
| YS | 8.5 | 8.5 | keep |
| YM | 9.5 | 9.5 | keep |
| YL | 10.5 | 10.5 | keep |
| YXL | 11 | 11 | keep |
| Y2XL | **11.5** | **11** | update |

### Global Add to Request / Print Request fallback

| Constant / setting | Current | Proposed |
|--------------------|---------|----------|
| `STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES` | **11** | **10.5** |
| Import messaging `PREFERRED_PRINT_WIDTH_INCHES` / `DEFAULT_PRINT_REQUEST_WIDTH_INCHES` | 10 | **unchanged** (out of scope) |
| Persisted `defaultPrintRequestWidthInches` in Firestore | environment-specific | **not rewritten by this goal** (see Migration / Human checkpoint) |

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/constants/printSize/standardPrintSizesSettings.constants.ts`
- `packages/shared/src/constants/printSize/standardPrintSizesSettings.constants.test.ts`
- `packages/shared/src/utils/printRequestItemSizing.ts`
- `packages/shared/src/utils/printRequestItemSizing.test.ts`
- `packages/shared/src/utils/interactiveArtworkEnhance.test.ts` (fallback assertion)
- `apps/portal/features/print-requests/utils/portalCatalogAddInitialSizing.test.ts`
- `functions/src/addPortalCatalogDesignToPrintRequest.test.ts`
- `docs/project/DECISIONS.md` (ADR-FP-080 amendment / new short ADR for preset recalibration)
- `docs/architecture/DATA_MODEL.md` (fallback 11″ → 10.5″ wording)
- Stale current-truth docs/comments found by search (implementation pass)

### Architecture Impact

- [x] None (constants + docs + tests only; shared sizing architecture unchanged)

### Security Impact

- [x] None

### Data Model Impact

- [x] Details: Document-only — default **code** values for `settings/standardPrintSizes` seeds and PR initializer fallback change. No schema change. No item field migration. Persisted settings docs continue to overlay by key until owner Reset / re-save.

### Backend Impact

- [x] Details: Functions that call `resolvePrintRequestDefaultWidthInches` pick up new fallback via shared package after Functions rebuild/deploy. **No Functions logic changes expected** beyond consuming shared constant. Agent must not deploy.

### UI / UX Impact

- [x] Details: Studio/Portal Standard Size pickers and Settings “Reset to defaults” will show new seed widths once code defaults apply (or after owner reset overlays). Add to Request / new items use 10.5″ when settings default absent/invalid, or when owner sets runtime default to 10.5″. Manual UI smoke optional after DEV deploy (separate checkpoint).

### Migration Impact

- [x] Details:
- **Forward:** Code defaults change only. Existing `printRequestItems` keep saved `printWidthInches` / `printHeightInches` / `standardSizePresetKey`.
- **Settings overlay caveat:** If DEV/PROD already saved Full Back widths in `settings/standardPrintSizes`, those **override** new code seeds until owner uses **Reset to defaults** (or manually edits widths) in Studio Settings. Same for `defaultPrintRequestWidthInches` if already persisted (e.g. 11″).
- **Rollback:** Revert constant/PR; optionally Reset settings again. No data migration to undo.
- **Production data:** Explicitly **not** modified by this goal.

---

## Approach

1. Update `ADULT_FULL_BACK_ROWS` and `YOUTH_FULL_BACK_ROWS` seed widths only.
2. Leave `ADULT_GARMENT_ROWS` / `YOUTH_GARMENT_ROWS` unchanged after confirmation.
3. Set `STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES = 10.5`.
4. Expand preset tests to assert full Adult/Youth Full Front and Full Back tables; replace obsolete “3XL 14.5 / 5XL 17” test.
5. Update all tests asserting fallback `=== 11` for the system initializer to `10.5`.
6. Grep for stale labels (old back sizes, “fallback 11″”, etc.) in live docs/constants/comments; update current-truth docs; leave historical workflow archives intact unless they are the active source of truth.
7. Amend ADR-FP-080 / DECISIONS + DATA_MODEL fallback wording; note preset table recalibration date.
8. Do **not** write Firestore, deploy, or change production.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit — presets | `npx tsx --test packages/shared/src/constants/printSize/standardPrintSizesSettings.constants.test.ts` | yes |
| Unit — sizing / fallback | `npx tsx --test packages/shared/src/utils/printRequestItemSizing.test.ts packages/shared/src/utils/interactiveArtworkEnhance.test.ts` | yes |
| Unit — Portal optimistic sizing | `npx tsx --test apps/portal/features/print-requests/utils/portalCatalogAddInitialSizing.test.ts` | yes |
| Unit — Functions add-to-request | `npx tsx --test functions/src/addPortalCatalogDesignToPrintRequest.test.ts` | yes |
| Related DPI / 22″ safeguards | Existing tests in `printRequestItemSizing*.test.ts` (must continue pass) | yes |
| Lint | `npm run lint` | yes |
| Studio typecheck | `npm --prefix apps/studio exec tsc -- --noEmit` | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Functions build | `npm --prefix functions run build` | yes |
| Rules | `npm run test:rules` | no (no rules change) |
| Full shared sweep (optional extra) | `npx tsx --test packages/shared/src/**/*.test.ts` | preferred if Windows-friendly |

Per `11-testing-commands.md` / `TESTING.md`: never claim pass without running.

### Manual

- [ ] Optional after DEV deploy (separate human checkpoint): Add to Request new item → 10.5″ when settings default is 10.5 or unset; existing items unchanged; Full Back M/L/XL apply 11″ after settings use new defaults; aspect lock + DPI warn/block unchanged.

---

## Human Checkpoints Anticipated

- [x] **Plan approval** before implementation (owner request)
- [ ] Business confirmation of Youth label **YXS vs YXXS** (see Open Questions) — non-blocking if keep YXS
- [ ] After code lands on DEV: owner may need Studio **Reset Standard Size defaults** and set **Print Request default = 10.5″** if Firestore overlays old values (agent will not touch Firebase)
- [ ] Production deploy / production settings — **not** this phase
- [ ] TD-034 DEV deploy auth remains a separate parked checkpoint

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Firestore overlay keeps old Full Back widths after code ship | Medium | Document Reset-to-defaults / manual settings edit; acceptance for “display/apply” assumes resolved settings (defaults or reset) |
| Runtime `defaultPrintRequestWidthInches` still 11″ in env | Medium | Code fallback → 10.5; owner updates Studio setting when ready; tests cover both setting and fallback paths |
| Confusing import 10″ vs PR fallback 10.5″ | Low | Keep import constants untouched; docs call out distinction |
| Accidental reopen of 15″ upscale work | Low | Explicit out of scope; no edits to `AUTOMATED_UPSCALE_TARGET_WIDTH_INCHES` / enhance policy |

---

## Rollback Plan

Revert the shared constant and seed-row PR. No Firestore rollback required if settings were not rewritten. If owner Reset-to-defaults after ship, re-save prior widths or redeploy previous code and reset again.

---

## Documentation Updates Required

- [x] DECISIONS.md (ADR-FP-080 amendment or short ADR for preset + 10.5″ fallback)
- [x] DATA_MODEL.md (fallback wording 11″ → 10.5″)
- [ ] Other: search-driven stale current-truth references; handoff `CURRENT-STATE.md` at signoff only
- [ ] PROJECT_BRIEF / ARCHITECTURE / BACKEND / TESTING / DEPLOYMENT / STYLE_GUIDE — only if search finds live contradictions

---

## Open Questions

- [x] **Youth smallest size label:** Goal text says **YXXS**; repository uses key `yxs` / label **YXS** with width 7.5″ already. **Plan recommendation:** keep `YXS` / `yxs` (no key rename — would orphan saved `standardSizePresetKey` values). Confirm at plan approval if rename is desired as a separate follow-up.
- [x] **DEV settings overlay:** Confirm owner will manually Reset / set 10.5″ on DEV after code deploy when validating acceptance criteria against live Studio/Portal (agent will not write settings).

---

## Approval

- Review doc: `docs/workflow/reviews/2026-09-05-standard-size-preset-and-add-to-request-default-recalibration-review.md`
- Verdict: **approved** (owner 2026-09-05; keep YXS; no Firestore writes)
