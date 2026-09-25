# Plan: Orientation-aware gang-sheet shelf packing efficiency

| Field | Value |
|---|---|
| Date | 2026-09-24 |
| Status | ready_for_review |
| Workflow | Managed Phase: Plan → Formal Review → Implement → Test → Implementation Review → Owner DEV QA → Signoff |
| Managed goal | `gang-sheet-orientation-aware-shelf-packing-efficiency` |
| Phase alignment | Narrow Phase 7 Show Queue / production-efficiency corrective |
| Production actions | None; no commit, push, merge, deploy, publish, Firebase mutation, or production data action |

## Goal

Allow the automatic deterministic shelf-row packer to choose either cardinal orientation for an
artwork when that choice produces a measurable packing benefit, while preserving straight row
boundaries, all three existing gang-sheet modes, quantity/interleaving behavior, and Electron PNG
composition semantics.

## Investigation result

The current working tree is on `development` with unrelated pre-existing user changes. Those
changes are outside this goal and will be preserved.

The current Standard path is:

`UpcomingShowsPage` → `useExportGangSheetPng.buildLayoutRequest` → typed preload
`generateGangSheetPng` → `apps/studio/electron/services/export/exportGangSheetPng.ts` →
`interleaveGroups` + `nestBoxesIntoShelvesWithHeightCap` → Sharp compositing → local
fingerprint-keyed Electron cache.

The two grouped paths enter the same shared `nestBoxesIntoShelvesWithHeightCap` utility from
`composeGroupedGangSheetSheets.ts` and
`composeContinuousCustomerGroupedGangSheetSheets.ts`. Both compositors already inspect
`placement.rotated` and rotate the PNG bytes with Sharp, so the missing behavior is in shared
orientation/membership selection, not in PNG composition. The renderer and IPC layout-mode contract
already preserves Standard, Sheet per Customer, and Grouped by Customer.

### Proven current root cause

In `packages/shared/src/utils/gangSheetNesting.ts`:

1. A box is admitted/skipped using only `box.widthPx` against usable width.
2. Stable height sorting and row membership use only original widths.
3. `resolveRowRotations` runs only after a row is closed.
4. `resolveRowRotations` considers only `originalHeightPx > originalWidthPx`, so landscape boxes
   cannot rotate into a narrower row width.

This means a 13.00 × 9.35 artwork and a 12.00 × 8.09 artwork are each treated as one-up on a
22.5-inch usable row even though both rotated widths fit together.

### Baseline reproduction

Using 300 DPI, 23-inch sheet width, 0.25-inch side margins, 0.5-inch top/bottom margins, and a
0.5-inch gutter:

| Input | Result |
|---|---:|
| A: 3900 × 2805 px, quantity 10 | 10 one-up rows |
| B: 3600 × 2427 px, quantity 5 | 5 one-up rows |
| Total rows | 15 |
| Current nested feed height | **42,585 px = 141.95 in** |
| Rotated A+B row width | 2805 + 150 + 2427 = 5382 px ≤ 6750 px |

The reproduction was run directly against the current shared utility before implementation. No
application code was changed during investigation.

## Approved scope

### In scope

- Refactor the shared shelf nesting utility so orientation candidates are evaluated before a box is
  committed to a row.
- Keep the existing stable sorted input order and `interleaveGroups` quantity semantics.
- Permit only original or 90-degree-swapped dimensions.
- Keep all row boundaries horizontal and all within-row boundaries vertical.
- Use the same orientation result for uncapped and height-capped nesting.
- Preserve side margins, top/bottom margins, gutters, usable width, maximum sheet length, skipped
  item behavior, deterministic placement order, and exact quantity.
- Extend focused nesting/efficiency/grouped regression coverage.
- Version the shared nesting algorithm in the existing cache fingerprint so old layouts cannot be
  silently reused.

### Out of scope

- Manual Gang Sheet Builder or freeform 2D nesting.
- Staggered/interlocking/skyline/MaxRects/guillotine/genetic packing.
- Arbitrary-angle rotation.
- New user-facing settings or data-model fields.
- Firebase schema, Rules, Storage Rules, Functions, indexes, migrations, secrets, Portal, or
  production actions.
- Pricing, labels, headings, filenames, requested print dimensions, or source-aware asset
  resolution.

## Technical approach

### 1. Shared deterministic shelf candidate evaluation

Keep a stable original-dimension row candidate as the compatibility baseline. Add an
orientation-aware candidate packer that:

- admits a box when either its original width or rotated width fits the usable width;
- preserves the current stable height-first ordering;
- buffers the current row and evaluates the next box using original and rotated dimensions before
  row membership is committed;
- evaluates this exact bounded candidate set for each pending row, in this order: (1) all original,
  (2) all individually valid rotations, (3) one flip from the all-original pattern for each row
  box in stable row order, (4) one flip back from the all-rotated pattern for each row box, then
  (5) two flips from the all-original pattern in lexicographic pair order until the fixed
  `MAX_ORIENTATION_CANDIDATES = 32` candidate limit is reached. Duplicate patterns (squares and
  non-rotatable boxes) are removed while preserving first occurrence. This is a fixed per-row
  candidate list, not exponential search; candidates beyond the cap are intentionally not explored;
- when original membership is valid, keeps original orientation unless a valid alternative reduces
  the closed row height without a width/row-membership penalty;
- when original membership is invalid but a rotated candidate keeps the item in the same row,
  allows that candidate to preserve a cuttable row; the deterministic tie rule prefers original
  orientation and then fewer rotations;
- computes row x positions only after the row orientation plan is final, centered within usable
  width as today;
- uses the selected orientation plan's actual row height for height-cap decisions.

Run the compatibility baseline and the orientation-aware bounded candidate through the same
height-cap accounting, then select the complete layout deterministically. The compatibility replay
retains original-width admission, original-height stable sorting with original input order as the
final tie-break, original-width row membership, and the existing portrait-only post-row resolution.
The orientation-aware replay retains the same stable sort (never sorting by selected orientation)
and admits a box when either orientation fits; its row candidates are resolved before membership is
committed. Its fixed candidate ordering is only a deterministic enumeration aid; final selection
uses the declared score, not incidental iteration order.

The complete-layout score is:

1. fewer skipped boxes wins;
2. lower total nested sheet feed height wins;
3. when skipped copies and total feed height are exactly tied, retain the compatibility baseline
   immediately (this is the explicit exact-efficiency-tie rule, even if an alternative happens to
   use fewer rows);
4. otherwise, fewer physical sheets wins;
5. fewer shelf rows wins;
6. fewer rotations wins;
7. exact structural/orientation ties retain the compatibility baseline, minimizing unnecessary
   layout churn.

The orientation-aware replay may replace the compatibility replay only when this score is strictly
better. Label bands are excluded from this shared score; they remain compositor-level geometry and
retain existing semantics.

This whole-layout comparison is important: a landscape rotation that creates a taller row or loses
future packing must not be selected merely because it is geometrically possible. The acceptance
fixture selects the rotated two-up arrangement because it materially reduces total feed height;
landscape cases where rotation is worse remain in the baseline orientation.

The placement contract remains `{ id, x, y, rotated }`; no image bytes or requested print
dimensions are changed in shared code.

### 2. Height-cap behavior

The height-capped implementation will use the same finalized row plan for both placement and cap
peeking. A pending row plus the next row is measured with resolved orientation heights before
deciding whether to commit the current sheet. A single row that itself exceeds the configured cap
retains the existing behavior of being emitted rather than silently dropped.

### 3. Cache invalidation

Add a shared `GANG_SHEET_NESTING_ALGORITHM_VERSION` constant and include it in
`buildGangSheetCacheFingerprint`. Bump it for this algorithm change and add a fingerprint test.
The existing cache directory remains untouched; old folders simply have a different fingerprint and
will not satisfy the renderer's requested cache lookup. The existing disk-peek path will report
stale rather than apply a pre-change folder when no current-version fingerprint matches.

## Expected changed files

Expected minimal implementation set:

- `packages/shared/src/utils/gangSheetNesting.ts`
- `packages/shared/src/utils/gangSheetNesting.test.ts`
- `packages/shared/src/utils/gangSheetEfficiencyLayout.test.ts`
- `packages/shared/src/utils/gangSheetGroupedLayout.test.ts` and/or
  `packages/shared/src/utils/gangSheetContinuousCustomerGroupedLayout.test.ts` only if needed to
  prove shared nesting behavior through grouped planners
- `packages/shared/src/utils/gangSheetCacheFingerprint.ts`
- `packages/shared/src/utils/gangSheetCacheFingerprint.test.ts`

Electron compositor source is not expected to change because it already rotates PNG bytes from the
shared placement flag. Compositor tests may be extended only if the focused test run shows the
orientation contract is not covered.

No new package or dependency is needed.

## Regression matrix

At minimum add or update tests for:

- exact 13.00 × 9.35 plus 12.00 × 8.09 fixture at 300 DPI;
- ten A copies plus five B copies, exact count and interleaved input order;
- two landscape items that benefit from rotating together;
- landscape rotation that increases total feed height, retaining original orientation;
- portrait lone/row behavior and a portrait item whose useful existing rotation remains intact;
- square artwork with no rotation churn;
- mixed portrait/landscape rows;
- orientation exceeding usable width rejected;
- a height-cap boundary where resolved rotation changes whether the next row fits;
- exact efficiency tie retaining the baseline orientation deterministically;
- duplicate quantities with no missing/duplicated placements;
- Standard, Sheet per Customer, and Grouped by Customer planner/compositor contracts;
- cache fingerprint changes when the nesting algorithm version changes;
- no placement outside usable width and no shelf overlap through coordinate assertions.

## Verification plan

Run and record exact commands, exit codes, and test counts:

1. Focused shared nesting, efficiency, grouped, continuous-grouped, and cache fingerprint suites.
2. Existing Electron grouped compositor suite(s), including PNG rotation/metadata contract if
   applicable.
3. Studio typecheck from `apps/studio`.
4. Targeted lint for changed TypeScript files (and repository lint if required by the current
   workflow tooling).
5. Studio Vite build if the affected shared/Electron path requires it.
6. `git diff --check`.

Report the exact fixture before/after nested feed height, inches saved, and percentage reduction.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Rotation creates more width pressure than it saves | Compare complete bounded layouts; preserve baseline on worse/tied cost |
| Height-cap split differs from preview/export | Use one shared height-capped utility and test planner consumers |
| PNG dimensions disagree with placement dimensions | Keep existing `placement.rotated` compositor path and add contract coverage |
| Old local cache silently survives | Include explicit nesting algorithm version in fingerprint |
| Search cost grows with row size | Fixed candidate cap/local search; no exponential enumeration |
| Grouped labels/headings/pricing drift | Do not alter grouped metadata, labels, pricing, or requested print dimensions |

## Human checkpoint

No human checkpoint is required before Plan/Formal Review because this is a narrow code-only DEV
change. After automated Test and independent Implementation Review, stop at:

`OWNER DEV QA: gang-sheet-orientation-aware-shelf-packing-efficiency`

Do not sign off until the owner supplies QA.
