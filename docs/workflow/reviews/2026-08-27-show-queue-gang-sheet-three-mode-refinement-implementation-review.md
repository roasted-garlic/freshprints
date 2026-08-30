# Implementation Review — Show Queue gang-sheet three-mode refinement

| Field | Value |
|-------|-------|
| Date | 2026-08-27 |
| Managed goal | `show-queue-gang-sheet-three-mode-refinement` |
| Plan | `docs/workflow/plans/2026-08-27-show-queue-gang-sheet-three-mode-refinement-plan.md` |
| Formal review | `docs/workflow/reviews/2026-08-27-show-queue-gang-sheet-three-mode-refinement-review.md` |
| Verdict | **approved_with_changes** — conditions met in implementation |

---

## SHOW QUEUE GANG-SHEET THREE-MODE REFINEMENT — IMPLEMENTATION RESULT

### 1. Implementation Review verdict

**Approved for DEV QA** — scope matches approved plan and review conditions. Production not authorized.

### 2. Files changed (gang-sheet goal)

**Shared (`packages/shared`)**

- `src/types/export/gangSheetExportIpc.types.ts` — third enum value
- `src/utils/gangSheetCacheFingerprint.ts` — pairwise fingerprints
- `src/utils/gangSheetCacheFingerprint.test.ts`
- `src/utils/gangSheetProductionGroups.ts` — **new** shared grouping + sheet-per-customer count
- `src/utils/gangSheetGroupedLayout.ts` — sheet-per-customer planner refactor
- `src/utils/gangSheetContinuousCustomerGroupedLayout.ts` — **new** continuous planner
- `src/utils/gangSheetContinuousCustomerGroupedLayout.test.ts` — **new**
- `src/utils/showExportFilename.ts` — continuous base name
- `src/utils/showExportFilename.test.ts`

**Studio Electron**

- `electron/services/export/exportGangSheetPng.ts` — three-mode branch
- `electron/services/export/composeContinuousCustomerGroupedGangSheetSheets.ts` — **new**
- `electron/services/export/composeContinuousCustomerGroupedGangSheetSheets.test.ts` — **new** compositor integration
- `electron/ipc/export/exportRequestValidation.ts` — IPC validation
- `electron/ipc/export/exportRequestValidation.test.ts`

**Studio renderer**

- `features/upcoming-shows/hooks/useExportGangSheetPng.ts` — preview + cache for three modes
- `features/upcoming-shows/utils/gangSheetLayoutModeOptions.ts` — three UI options
- `features/upcoming-shows/components/ExportGangSheetConfirmModal.tsx` — estimated sheet mapping

**Docs**

- `docs/workflow/plans/2026-08-24-show-queue-gang-sheet-three-mode-refinement-queued-goal.md` — superseded note (prior session)
- `docs/project/DECISIONS.md` — ADR-FP-143 follow-up
- `docs/project/ROADMAP.md` — status update

### 3. Final enum mapping

| UI label | Enum | Wire / cache |
|----------|------|----------------|
| Standard | `efficiency` | `layoutMode` omitted (legacy stable fingerprint) |
| Sheet per Customer | `grouped_by_customer` | `layoutMode` in fingerprint + `whatnot_MM-DD-YYYY_grouped-gang-sheet` |
| Grouped by Customer | `customer_grouped_continuous` | `layoutMode` in fingerprint + `whatnot_MM-DD-YYYY_grouped-continuous-gang-sheet` |

### 4. Standard regression

`planEfficiencyGangSheetLayout` contract tests pass unchanged. Efficiency export branch untouched in `exportGangSheetPng.ts`.

### 5. Sheet per Customer preservation

`composeGroupedGangSheetSheets` unchanged. `planSheetPerCustomerGangSheetLayout` + `countSheetPerCustomerPhysicalSheets` match compositor pending-segment count (tested).

### 6. Grouped by Customer continuous behavior

`planContinuousCustomerGroupedGangSheetLayout` packs multiple customer sections per physical sheet when height allows. `composeContinuousCustomerGroupedGangSheetSheets` composites multiple section label bands per PNG.

### 7. Preview / export parity

- Standard: existing `planEfficiencyGangSheetLayout`
- Sheet per Customer: planner count = `countSheetPerCustomerPhysicalSheets` (compositor-equivalent)
- Grouped by Customer: compositor test asserts `composed.length === plannerCount`

### 8. Compositor-level multi-customer proof

`composeContinuousCustomerGroupedGangSheetSheets.test.ts` — two customers → one PNG taller than one-customer PNG; sheet-per-customer → two PNGs.

### 9. Heading / Continued behavior

Reuses `buildGroupedGangSheetSectionHeading` / `buildGroupedGangSheetSectionContinuedHeading`. Continued spill tested in `gangSheetContinuousCustomerGroupedLayout.test.ts`.

### 10. Cache / fingerprint behavior

All three modes pairwise distinct (`gangSheetCacheFingerprint.test.ts`). Efficiency omits `layoutMode`. Modal cache hydration checks all three modes without cross-mode fallback when switching tabs.

### 11. Filenames

- Standard: `whatnot_MM-DD-YYYY_gang-sheet`
- Sheet per Customer: `whatnot_MM-DD-YYYY_grouped-gang-sheet`
- Grouped by Customer: `whatnot_MM-DD-YYYY_grouped-continuous-gang-sheet`

### 12. Max-length behavior

Uses request `maxSheetLengthInches` (staff setting; default 300″). Test: continuous mode splits customers when `maxSheetHeightPx = 2500`.

### 13. Automated tests

Command:

```bash
npx tsx --test \
  packages/shared/src/utils/gangSheetContinuousCustomerGroupedLayout.test.ts \
  packages/shared/src/utils/gangSheetGroupedLayout.test.ts \
  packages/shared/src/utils/gangSheetCacheFingerprint.test.ts \
  packages/shared/src/utils/showExportFilename.test.ts \
  packages/shared/src/utils/gangSheetEfficiencyLayout.test.ts \
  apps/studio/electron/ipc/export/exportRequestValidation.test.ts \
  apps/studio/electron/services/export/composeContinuousCustomerGroupedGangSheetSheets.test.ts
```

Result: **50 tests, 0 failures** (2026-08-27).

### 14. Studio typecheck / lint

`npx tsc --noEmit` in `apps/studio`: **pre-existing failures** (unrelated files: `useAiReviewInbox.ts`, `companionSetHelpers.ts`, staff-inbox). **No new diagnostics in gang-sheet touched files.**

`git diff --check`: no conflict markers; CRLF warnings only.

Lint: not run globally; no new lint issues reported in touched files.

### 15. Functions / Firebase involvement

**None.** Studio Electron + shared packages only.

### 16. Owner DEV QA checklist

## Manual Test Checkpoint

**Feature / area:** Show Queue gang-sheet three-mode export  
**Environment:** local Studio DEV  
**Prerequisites:** Show with ≥2 customers, multiple allocations; gang-sheet settings known (width, max length)

### Steps

1. Open Generate gang sheets → confirm three options: Standard, Grouped by Customer, Sheet per Customer.
2. **Grouped by Customer** with two small customers → preview ~1 sheet; generate → one PNG with two customer section headings under one show heading.
3. **Sheet per Customer** same show → preview ~2 sheets; generate → two PNGs (customers never share).
4. Switch modes → cache hydrates per mode; no wrong-mode export label.
5. Customer with multiple CRs → comma-separated heading; force spill → `-Continued` on spill sheet.
6. Standard → unchanged behavior vs prior baseline.

### Pass criteria

- [ ] Three modes visible with helper copy
- [ ] Continuous vs sheet-per-customer sheet counts differ as expected
- [ ] Headings and filenames match mode
- [ ] Standard unchanged

### Please reply with

`PASS` · `FAIL: …` · `PASS WITH NOTES: …`

### 17. Remaining limitations

- Owner DEV QA not yet recorded.
- Signoff doc not yet approved.
- No production Studio publish.

### 18. Production untouched confirmation

No deploy, no Functions, no Rules/indexes, no Portal changes, no production secrets.

---

## Formal review conditions

| Condition | Status |
|-----------|--------|
| Supersede queued brief | Done — `2026-08-24-…-queued-goal.md` marked superseded |
| Preview / compositor parity | Done — planner + compositor tests |
| Compositor-level continuous test | Done — `composeContinuousCustomerGroupedGangSheetSheets.test.ts` |
