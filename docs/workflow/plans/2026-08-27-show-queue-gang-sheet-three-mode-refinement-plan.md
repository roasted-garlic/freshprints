# Plan: Show Queue gang-sheet three-mode refinement

| Field | Value |
|-------|-------|
| Date | 2026-08-27 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Managed goal id | `show-queue-gang-sheet-three-mode-refinement` |
| Phase alignment | Phase 7 — Show Queue / production workflow fast-follow |
| Baseline | ADR-FP-143; WS5 signoff `docs/workflow/reviews/2026-08-23-studio-workflow-organization-and-grouped-gang-sheet-signoff.md` |
| Prior queued brief | `docs/workflow/plans/2026-08-24-show-queue-gang-sheet-three-mode-refinement-queued-goal.md` (superseded for product semantics by this plan) |
| FreshForge impact | Studio + shared types/utils only; **no** Starter Surface workflow files unless state updated |

---

## Goal

Refine Show Queue gang-sheet generation into **three** explicit, collision-free modes:

1. **Standard** — preserve current efficiency packing exactly.
2. **Grouped by Customer** — **new** continuous multi-customer sheets with customer blocks and CR headings; customer boundary does **not** force a new physical sheet.
3. **Sheet per Customer** — preserve today’s working grouped export (one physical sheet/set per **customer**), renamed in UI only where possible.

---

## Background

Owner QA (2026-08-24, refined 2026-08-27) clarified product intent. Repo inspection confirms:

- Grouping identity uses **`customerId` first** (`resolveGangSheetProductionGroupKey`), so multiple Print Requests for one customer collapse into one production group with comma-separated CR names in the heading.
- Today’s shipped grouped export **does not** place multiple customers on one physical sheet.
- The queued brief incorrectly described today’s behavior as “per Print Request”; owner correction: **per customer** (with `printRequestId` fallback when no customer identity exists).

This plan is **Plan phase only** — no implementation in this workflow step.

---

## SHOW QUEUE GANG-SHEET THREE-MODE REFINEMENT — PLAN RESULT

### 1. Current behavior confirmed from source

| Mode (today) | `layoutMode` | Export path | Behavior |
|--------------|--------------|-------------|----------|
| **Standard** | omitted / `efficiency` | `exportGangSheetPng.ts` efficiency branch | `interleaveGroups` → single `nestBoxesIntoShelvesWithHeightCap` run; one show label per sheet; no CR section headings |
| **Grouped (UI: “Grouped by customer”)** | `grouped_by_customer` | `composeGroupedGangSheetSheets.ts` | Customer-grouped blocks; show label + section label per sheet; **one customer per physical sheet/set** (when `customerId` groups requests) |

**Standard details (unchanged):**

- Planner: `planEfficiencyGangSheetLayout` / inline nesting in `exportGangSheetPng.ts`
- Base filename: `whatnot_MM-DD-YYYY_gang-sheet` via `buildGangSheetBaseFileName(..., "efficiency")`
- Cache fingerprint: `layoutMode` **omitted** from fingerprint payload (legacy stability)
- Max length: `request.maxSheetLengthInches` from Show Queue settings (default **300** — `DEFAULT_GANG_SHEET_MAX_LENGTH_INCHES` in `showQueueSettingsService.ts`; max configurable cap also 300)

**Today’s grouped (“Sheet per Customer”) details:**

- Production groups built in `composeGroupedGangSheetSheets.buildProductionGroups` and `gangSheetGroupedLayout.buildProductionGroups` using `resolveGangSheetProductionGroupKey`
- Section heading: `buildGroupedGangSheetSectionHeading` — unique request names sorted, comma-separated (e.g. `ionsupplyllc-CR001, ionsupplyllc-CR002, ionsupplyllc-CR003`)
- Continued: `buildGroupedGangSheetSectionContinuedHeading` appends `-Continued` to the **full** heading string when a customer’s nest spans multiple sheets within their set
- Each physical PNG: show label band + one section label band + artwork
- Base filename: `whatnot_MM-DD-YYYY_grouped-gang-sheet`
- Cache fingerprint: includes `layoutMode: "grouped_by_customer"`

**Preview vs export:**

- Renderer sheet-count preview uses `planGroupedGangSheetLayout` (`useExportGangSheetPng.estimateSheetCountsFromRequests`)
- Actual PNG export uses `composeGroupedGangSheetSheets` (not the shared planner)
- Both enforce **customer-boundary sheet separation** today (see §2)

**Functions / Firebase:** **Not involved.** Gang-sheet generate/cache/export is Studio Electron main + renderer + shared utils only. No Cloud Functions, Firestore writes, or Rules changes.

---

### 2. Exact reason today’s grouped mode starts a new sheet per customer

**Compositor (runtime export) — primary behavior staff see:**

`composeGroupedGangSheetSheets.ts`:

```96:118:apps/studio/electron/services/export/composeGroupedGangSheetSheets.ts
  for (const group of productionGroups) {
    const nestResult = nestBoxesIntoShelvesWithHeightCap(...);
    for (const [groupSheetOffset, sheet] of nestResult.sheets.entries()) {
      const sectionHeading = ...;
      pendingSheets.push({ group, sectionHeading, sheet });
    }
  }
```

Each **customer production group** produces one or more `pendingSheets` entries. The compositor then renders **one physical PNG per `pendingSheets` entry**. There is **no** step that merges customer groups onto the same physical sheet. Result: **customer boundary ⇒ new physical sheet** (for each customer’s nest segment).

**Shared planner (preview / sheet-count estimate):**

`gangSheetGroupedLayout.ts` line 107: `commitSheetIfNeeded(true)` **before** placing each production-group nest segment forces a sheet commit when advancing to the next customer group, even if prior sheet had remaining capacity.

**Not per Print Request:** When `customerId` is present, `resolveGangSheetProductionGroupKey` returns `customer:${customerId}`, so CR001+CR002+CR003 for one customer are **one** group. Per-request isolation only occurs via fallback `request:${printRequestId}` when customer identity is missing.

---

### 3. Proposed three-mode type / enum contract

Extend `GangSheetLayoutMode` in `packages/shared/src/types/export/gangSheetExportIpc.types.ts`:

```ts
export type GangSheetLayoutMode =
  | "efficiency"                    // UI: Standard
  | "grouped_by_customer"           // UI: Sheet per Customer (preserved semantics)
  | "customer_grouped_continuous";  // UI: Grouped by Customer (NEW)
```

| UI label | Enum value | IPC `layoutMode` on wire | Notes |
|----------|------------|--------------------------|-------|
| Standard | `efficiency` | omitted (preferred) or `efficiency` | Unchanged |
| Grouped by Customer | `customer_grouped_continuous` | always set | New continuous mode |
| Sheet per Customer | `grouped_by_customer` | always set | Today’s behavior |

**Naming note:** `grouped_by_customer` enum string is retained for **Sheet per Customer** so existing cached fingerprints and validated IPC payloads remain semantically stable. The **new** continuous mode gets a distinct enum value.

---

### 4. Backward compatibility decision (recommended)

**Recommended: Option A — preserve `grouped_by_customer` as Sheet per Customer**

| Approach | Verdict |
|----------|---------|
| A. Keep `grouped_by_customer` = today’s sheet-per-customer; add `customer_grouped_continuous` for new Grouped by Customer | **Recommended** |
| B. Reassign `grouped_by_customer` to continuous grouped; add `sheet_per_customer` for old behavior | Rejected — would invalidate existing local caches and reinterpret persisted `layoutMode` |

**Migration:**

- **No Firestore migration** (layout mode is not persisted server-side).
- **Local Electron cache:** Existing folders keyed by fingerprints that include `layoutMode: "grouped_by_customer"` continue to represent **Sheet per Customer** output. New continuous mode uses a new fingerprint (new enum in payload). No silent reuse.
- **Optional:** On first run after upgrade, staff may regenerate caches for each mode; old grouped cache remains valid for Sheet per Customer.

**ADR:** Amend ADR-FP-143 or add ADR-FP-149 documenting three-mode contract and enum retention rationale.

---

### 5. Cache / fingerprint plan

**Current** (`gangSheetCacheFingerprint.ts`):

- Standard: `layoutMode` omitted from JSON payload
- Grouped: `layoutMode: "grouped_by_customer"` included

**Proposed:**

```ts
// Include layoutMode in fingerprint for ANY non-default grouped mode
...(request.layoutMode && request.layoutMode !== "efficiency"
  ? { layoutMode: request.layoutMode }
  : {}),
```

| Mode | Fingerprint includes | Collides with |
|------|---------------------|---------------|
| Standard | no `layoutMode` key | — |
| Sheet per Customer | `grouped_by_customer` | — (same as today) |
| Grouped by Customer | `customer_grouped_continuous` | — |

**Cache directory layout:** Unchanged — `userData/gang-sheet-cache/<showId>/<fingerprint>/`. Three distinct fingerprints ⇒ three coexistence folders (`clearGangSheetCacheForFingerprint` already per-fingerprint).

**Filename / base name** (`buildGangSheetBaseFileName`):

| Mode | Proposed base pattern |
|------|----------------------|
| Standard | `whatnot_MM-DD-YYYY_gang-sheet` (unchanged) |
| Sheet per Customer | `whatnot_MM-DD-YYYY_grouped-gang-sheet` (unchanged) |
| Grouped by Customer | `whatnot_MM-DD-YYYY_grouped-continuous-gang-sheet` (new; avoids filename collision in export folders) |

**Renderer cache helpers** (`useExportGangSheetPng.ts`):

- Extend `resolveLayoutModeForFingerprint`, `applyGangSheetCacheFromImageRequests`, `GangSheetSheetCountPreview`, and mode iteration arrays from 2 → 3 modes
- Tighten peek fallback so a cached Sheet per Customer fingerprint is not applied under Grouped by Customer tab (`allowFallbackToOtherMode: false` when switching tabs — partially exists)

---

### 6. Customer grouping key strategy

**Authoritative:** `resolveGangSheetProductionGroupKey` in `groupPrintRequestsByShow.ts`:

1. `customer:${customerId}` when `customerId` present
2. `customer-username:${normalized}` when username snapshot present
3. `internal-base:${normalized}` for internal requests with `internalBaseName`
4. `request:${printRequestId}` fallback

**Plan requirements:**

- **Grouped by Customer** and **Sheet per Customer** share the **same** customer-group construction and heading helpers
- **Display heading:** comma-separated unique `requestName` values (CR names), sorted — existing `buildGroupedGangSheetSectionHeading`
- **Do not** key groups from display name alone
- **Continued:** existing `buildGroupedGangSheetSectionContinuedHeading` (suffix on full heading string)

**Grouping metadata source:** `useExportGangSheetPng.buildGroupingMetadata` loads `PrintRequest` once per allocation batch — unchanged pattern.

**Owner decision recorded:** Grouping is by **customer** (stable id), not individual Print Request, except fallback path for legacy/internal records without customer id.

---

### 7. CR heading / Continued strategy

Reuse existing helpers — **do not invent new punctuation:**

| Element | Helper / behavior |
|---------|-------------------|
| Show heading | `buildGangSheetSheetLabel(baseFileName, sheetIndex, sheetTotal)` on every physical sheet |
| Customer block heading | `buildGroupedGangSheetSectionHeading(requestNames[])` |
| Continued | `buildGroupedGangSheetSectionContinuedHeading(baseHeading)` → `${heading}-Continued` |
| Label bands | `computeGangSheetLabelBandHeightPx` / `buildGangSheetLabelSvg` |

**Grouped by Customer rollover:** When a customer block spills mid-sheet to the next physical sheet:

1. New physical sheet begins with **show heading** (same as today)
2. Section label uses **Continued** heading for that customer block

**Sheet per Customer:** Preserve current compositor behavior for intra-customer multi-sheet (`groupSheetOffset > 0` → Continued).

---

### 8. Planner architecture

**Do not build three unrelated engines.**

| Layer | Standard | Sheet per Customer | Grouped by Customer (new) |
|-------|----------|-------------------|---------------------------|
| Customer group builder | — | `buildProductionGroups` (shared pattern) | Same |
| Nesting primitive | `nestBoxesIntoShelvesWithHeightCap` | per-customer nest | per-customer nest within shared sheet budget |
| Sheet boundary rule | capacity only | **force new physical sheet at customer boundary** | capacity only (like Standard) |
| Compositor | inline in `exportGangSheetPng` | `composeGroupedGangSheetSheets` (preserve) | **new** compositor or parameterized boundary mode |
| Preview planner | `planEfficiencyGangSheetLayout` | `planGroupedGangSheetLayout` (align with compositor) | **new** `planContinuousCustomerGroupedGangSheetLayout` |

**New continuous mode (conceptual algorithm):**

1. Build ordered `ProductionGroup[]` (same as today).
2. Walk groups in stable sort order.
3. Maintain current physical sheet vertical budget (`maxSheetHeightPx`), accounting for show label band + section label band(s).
4. For each customer group: nest boxes within group; place section heading + artwork on current sheet if fits; else commit sheet and continue group on next sheet with Continued heading.
5. After finishing a customer group, **do not** commit sheet — attempt next customer on same sheet if space remains.
6. Commit sheet only when capacity/max-length rules require.

**Sheet per Customer:** Keep `composeGroupedGangSheetSheets` logic path (one PNG per customer nest segment). Optionally rename function/file in implement phase for clarity (`composeSheetPerCustomerGangSheetSheets`) — **behavior-preserving refactor only if low risk**.

**Standard:** Touch only if shared label-band utilities are extracted; **prove** `gangSheetEfficiencyLayout.test.ts` fixtures unchanged.

---

### 9. Exact files to modify (implement phase)

**Shared (`packages/shared`)**

| File | Change |
|------|--------|
| `src/types/export/gangSheetExportIpc.types.ts` | Add `customer_grouped_continuous` to `GangSheetLayoutMode` |
| `src/utils/gangSheetCacheFingerprint.ts` | Fingerprint all non-efficiency modes distinctly |
| `src/utils/gangSheetCacheFingerprint.test.ts` | Collision tests for 3 modes |
| `src/utils/groupPrintRequestsByShow.ts` | Only if grouping key strategy changes (not expected) |
| `src/utils/gangSheetGroupedLayout.ts` | Align sheet-per-customer planner OR split: keep for sheet-per-customer preview |
| `src/utils/gangSheetContinuousCustomerGroupedLayout.ts` | **New** pure planner for continuous mode + tests |
| `src/utils/showExportFilename.ts` | Third base filename branch; extend `buildGangSheetBaseFileName` type union |
| `src/utils/showExportFilename.test.ts` | Filename tests if present / add |
| `src/utils/gangSheetGroupedLayout.test.ts` | Sheet-per-customer scenarios; move continuous tests to new file |

**Studio Electron**

| File | Change |
|------|--------|
| `electron/services/export/exportGangSheetPng.ts` | Branch: efficiency \| sheet-per-customer \| continuous grouped |
| `electron/services/export/composeGroupedGangSheetSheets.ts` | Preserve sheet-per-customer; no behavioral drift |
| `electron/services/export/composeContinuousCustomerGroupedGangSheetSheets.ts` | **New** compositor (or shared helper with boundary flag) |
| `electron/ipc/export/exportRequestValidation.ts` | Validate third `layoutMode`; grouping required for both grouped modes |
| `electron/ipc/export/exportRequestValidation.test.ts` | IPC preservation tests |

**Studio renderer**

| File | Change |
|------|--------|
| `features/upcoming-shows/utils/gangSheetLayoutModeOptions.ts` | Three options + helper copy |
| `features/upcoming-shows/components/ExportGangSheetConfirmModal.tsx` | Three tabs/options; sheet count for third mode |
| `features/upcoming-shows/components/GangSheetLayoutModeMenu.tsx` | Three menu entries |
| `features/upcoming-shows/hooks/useExportGangSheetPng.ts` | 3-mode fingerprints, previews, cache hydration |
| `features/upcoming-shows/pages/UpcomingShowsPage.tsx` | Wire third mode if needed |
| `styles` (catalog/show queue CSS) | Tab layout for three options if needed |

**Docs (implement + signoff)**

| File | Change |
|------|--------|
| `docs/project/DECISIONS.md` | ADR-FP-143 amendment or ADR-FP-149 |
| `docs/project/ROADMAP.md` | Move from QUEUED to in-progress when implement starts |
| `docs/workflow/plans/2026-08-24-show-queue-gang-sheet-three-mode-refinement-queued-goal.md` | Mark superseded; fix per-customer wording |

**Not expected:** `functions/`, Portal app code, Firestore rules, `DATA_MODEL.md` entity changes.

---

### 10. Automated test plan

| # | Test | Location / approach |
|---|------|---------------------|
| 1 | Standard regression fixture | Existing `gangSheetEfficiencyLayout.test.ts` — must pass unchanged |
| 2 | One customer, one CR | Continuous + sheet-per-customer planners |
| 3 | One customer, multiple CRs — combined heading, contiguous block | `buildGroupedGangSheetSectionHeading` + layout planners |
| 4 | Two small customers on one sheet (continuous) vs two sheets (sheet-per-customer) | **Critical** pure planner tests with fixed box sizes |
| 5 | Customer A nearly fills sheet; B fits in remainder (continuous) | Planner height budget assertions |
| 6 | Customer spills across sheets — Continued heading | Planner + heading helpers |
| 7 | Multi-CR customer spills — Continued on full comma heading | Match `buildGroupedGangSheetSectionContinuedHeading` |
| 8 | Quantity expansion — exact placement counts | Planner placement id counts |
| 9 | Max length — configurable cap respected | Use reduced `maxSheetHeightPx` in tests |
| 10 | Cache fingerprint collision | `gangSheetCacheFingerprint.test.ts` — all pairs distinct |
| 11 | Internal / legacy fallback grouping | `groupPrintRequestsByShow.test.ts` + planner with `request:` keys |
| 12 | IPC validation preserves all three `layoutMode` values | `exportRequestValidation.test.ts` |

**Commands (Studio / shared):**

```bash
npx tsx --test packages/shared/src/utils/gangSheetEfficiencyLayout.test.ts packages/shared/src/utils/gangSheetGroupedLayout.test.ts packages/shared/src/utils/gangSheetCacheFingerprint.test.ts packages/shared/src/utils/groupPrintRequestsByShow.test.ts
# + new continuous layout tests
npx tsx --test apps/studio/electron/ipc/export/exportRequestValidation.test.ts
```

Typecheck: `cd apps/studio && npx tsc --noEmit` (or monorepo script if documented).

---

### 11. Owner manual QA plan

**Environment:** Studio dev build against `fresh-prints-dev` show with multiple customers and multi-CR customers.

| Step | Action | Expected |
|------|--------|----------|
| A | Generate **Standard** on show with 3+ customers | No CR headings; packing matches pre-change Standard export |
| B | Generate **Sheet per Customer** | One customer per physical sheet/set; comma CR headings; matches pre-change grouped export |
| C | Generate **Grouped by Customer** with 2 small customers | **Both customers on same physical sheet** when space allows |
| D | Same show Sheet per Customer | **Separate** physical sheets per customer |
| E | One customer with CR001+CR002+CR003 | Single combined heading; contiguous block |
| F | Force spill (large qty or small max length in settings) | Next sheet: show heading + `-Continued` section heading |
| G | Regenerate each mode | Correct cache applies per tab; no cross-mode stale cache |
| H | Export filenames | Three distinct base name patterns in save folder |

Reply: `PASS` / `FAIL` / `PASS WITH NOTES`.

---

### 12. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Standard regression | High | Contract tests; avoid editing efficiency branch except shared label utils |
| Preview sheet count ≠ export for new mode | Medium | Align continuous planner with compositor; test same fixtures |
| Cache cross-mode confusion | Medium | Distinct enums + fingerprint; disable wrong-tab cache fallback |
| Enum naming confusion (`grouped_by_customer` = Sheet per Customer) | Low | UI labels explicit; ADR documents mapping |
| Continuous compositor complexity (multi-section per PNG) | Medium | Dedicated compositor; reuse label SVG helpers |
| Internal requests without `customerId` | Low | Document fallback per-request behavior; test `request:` key path |

---

### 13. Migrations

- **None** for Firestore / Portal.
- **Local cache:** No automatic migration; old `grouped_by_customer` caches remain valid for Sheet per Customer.

---

### 14. Functions / Firebase involvement

**No.** Confirmed: generate/export/cache IPC only; images from Firebase Storage URLs already validated in `exportRequestValidation.ts`.

---

### 15. Remaining owner decisions (non-blocking for plan approval)

| # | Decision | Recommendation |
|---|----------|----------------|
| 1 | Enum string for continuous mode | `customer_grouped_continuous` |
| 2 | Continuous mode filename suffix | `grouped-continuous-gang-sheet` |
| 3 | Rename `composeGroupedGangSheetSheets` for clarity | Optional in implement; not required |
| 4 | Studio release / production promote | Separate authorized goal after DEV QA |

---

## Scope

### In Scope

- Three layout modes, enum/type changes, planners, compositors, cache fingerprints, UI copy, tests, ADR update

### Out of Scope

- Standard packing redesign; manual canvas; allocation/lifecycle changes; Portal; Functions deploy; production promote; Studio release; Smart Catalog work

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (gang-sheet modal three options)
- [ ] Production deploy — **not in this goal**
- [ ] Studio publish — separate phrase after DEV QA

---

## Rollback Plan

Revert Studio + shared commits; local gang-sheet caches may contain third-mode fingerprints — harmless; staff can regenerate. No server rollback.

---

## Documentation Updates Required

- [x] DECISIONS.md (ADR amendment) — at implement
- [x] ROADMAP.md — when goal starts / completes
- [ ] TESTING.md — only if new standard test command added

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-27-show-queue-gang-sheet-three-mode-refinement-review.md`
- Verdict: pending
