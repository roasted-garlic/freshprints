# Plan Amendment: Print Request Pocket / Full Size counts

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase amendment |
| Parent goal | `studio-history-newest-first-ordering` |
| Amendment slug | `print-request-pocket-fullsize-counts` |
| Related | docs/workflow/reviews/2026-09-02-print-request-pocket-fullsize-counts-amendment-review.md |

---

## Goal

Show a compact, non-intrusive **Pocket** / **Full Size** print-quantity count on:

1. Print Request detail (and list card on Print Requests)
2. Attached Print Request rows on Show Queue
3. The same attached-request UI on Internal Gang Sheets (shared page component)

Counts must use the **same cutoff + dimension classification** as existing gang-sheet section pricing/weight — never a hardcoded 4″ (or any fixed) threshold.

**Must not regress** History newest-first / Current / Past / Upcoming ordering from the parent goal (Owner QA already passed for History).

---

## Background

Staff need at-a-glance how many prints fall on each side of the configured section cutoff. Cutoffs can differ between Show Queue (`settings/showQueue`) and Internal Gang Sheets (`settings/internalGangSheet`).

---

## Audit findings

### Surfaces / components

| Surface | Exact path | Notes |
|---------|------------|--------|
| Print Request list card | `apps/studio/.../print-requests/pages/PrintRequestsPage.tsx` — `.print-requests-request-card` / `.print-requests-request-card-counts` | Already shows design count + total qty |
| Print Request detail | Same page — `.print-requests-detail-header` / “Request detail” | Has live `requestItems` via `usePrintRequestDetails` |
| Show Queue attached request row | `apps/studio/.../upcoming-shows/pages/UpcomingShowsPage.tsx` — `.show-allocation-row` | Same component for Whatnot Show Queue **and** Internal Gang Sheets (`lockedSurface`); subtitle today: `N Designs \| M Items` |
| Internal Gang Sheet request card | **Same** `UpcomingShowsPage` allocation rows | Settings source already switched via `resolveActiveGangSheetSettingsSource` |

### Shared classifier (authoritative)

| Item | Exact source |
|------|----------------|
| Utility | `packages/shared/src/utils/gangSheetCustomerSectionSummary.ts` |
| Rule helper | `resolveGangSheetPriceTierForInches` / private `isLargeTier` |
| Aggregator | `calculateGangSheetCustomerSectionSummary(units, pricing)` — **each array entry = 1 print unit** |

**Exact Pocket (small) rule:**  
`printWidthInches <= sizeCutoffInches` **AND** `printHeightInches <= sizeCutoffInches`  
(equivalently: not large)

**Exact Full Size (large) rule:**  
`printWidthInches > sizeCutoffInches` **OR** `printHeightInches > sizeCutoffInches`

Both rendered dimensions are evaluated. Equality at the cutoff is **Pocket/small** (confirmed by existing tests).

### Cutoff fields (verified — not invented)

| Context | Settings doc | Field |
|---------|--------------|--------|
| Show Queue | `settings/showQueue` | `gangSheetSectionPriceCutoffInches` |
| Internal Gang Sheet | `settings/internalGangSheet` | **`gangSheetSectionPriceCutoffInches`** (same field name) |

Resolved via `resolveGangSheetSectionPricingFromSettings` → `sizeCutoffInches` (default **5** when unset — still not hardcoded in feature logic; use resolver).

Context selection already exists: `resolveActiveGangSheetSettingsSource(show, showQueueSettings, internalGangSheetSettings)`.

### Dimensions (authoritative)

| Surface | Dimension source |
|---------|------------------|
| Print Request detail / list | `PrintRequestItem.printWidthInches` / `printHeightInches` (requested production size — **not** native image / DPI) |
| Show / Internal attached rows | `ShowAllocation.printWidthInches` / `printHeightInches` (+ `allocatedQuantity`), same snapshots used for gang-sheet export via `resolveQueuedPrintInches` |

### Quantity semantics — **print quantity, not rows**

Existing section summary increments **+1 per unit** in the units array. Export placements expand quantity into multiple units.

Therefore:

- PR item with `quantity: 4` → contributes **4** to Pocket or Full Size  
- Allocation with `allocatedQuantity: 3` → contributes **3**

**Not** `[NEEDS OWNER DECISION]` — matches existing pricing/weight quantity model.

### Inclusion / exclusion (reuse production eligibility)

| Surface | Include | Exclude / skip |
|---------|---------|----------------|
| Print Request items | Finite `quantity > 0`, both dimensions finite `> 0`, `status !== "canceled"` | Missing/invalid dimensions (omit from counts; do not invent sizes); canceled items; `quantity <= 0` |
| Show allocations | `status !== "canceled"` (same spirit as `filterShowExportAllocations` for non-historical), `allocatedQuantity > 0`, both dimensions valid | Canceled; missing dims; zero qty |

Note: today’s `buildPrintRequestItemSummaries` still rolls canceled into total qty for the existing design/qty labels. Pocket/Full Size will follow **production/export eligibility** (exclude canceled), which is the closer match to gang-sheet section summary.

### Settings availability / extra reads

| Surface | Today | Proposed |
|---------|-------|----------|
| `UpcomingShowsPage` | Already loads `useShowQueueSettings` + `useInternalGangSheetSettings` | **No new reads** — use `resolveActiveGangSheetSettingsSource(selectedShow, …).gangSheetSectionPriceCutoffInches` via pricing resolver |
| `PrintRequestsPage` | **Does not** load those hooks today | Add the two existing settings hooks (or kind-scoped: customer → Show Queue only; internal → Internal only). **One-time settings doc reads**, already used elsewhere — **no new backend API**, no per-request extra queries if counts are derived during existing item summary hydration / detail items |

Prefer deriving counts in the same pass as `listPrintRequestItemSummariesForRequests` / from loaded `requestItems` — **no denormalized fields** on `printRequests`.

### Empty / zero display (Formal Review choice)

**Hide** the Pocket/Full Size line when `pocket + fullSize === 0` (no printable eligible units). Less intrusive than `Pocket 0 · Full Size 0`; aligns with “secondary operational information.”

### Parent goal regression lock

Do **not** modify:

- `sortStaffGangSheetHistoryForDisplay` / History wiring  
- Current partition order  
- `sortPastShowsForDisplay` / `sortUpcomingShowsForDisplay`

Rerun `upcomingShowListSort.test.ts` in Test phase.

---

## Scope

### In Scope

- Shared derived helper(s) wrapping existing tier classification + quantity expansion  
- Compact UI on PR list card, PR detail header, Show/Internal allocation rows  
- Context-correct cutoff (Show Queue vs Internal)  
- Unit tests + History regression rerun  
- Owner QA

### Out of Scope

- Pricing, weights, cutoff values, gang-sheet layout/export, allocation logic  
- DPI / native image size / enhance floor  
- Portal  
- Functions / Rules / indexes / migration  
- Persisted pocket/full counters on documents  
- Changing History / Current / Past / Upcoming ordering

---

## Affected Areas

### Files / Modules (expected)

| File | Change |
|------|--------|
| `packages/shared/src/utils/gangSheetCustomerSectionSummary.ts` (or adjacent new util e.g. `printRequestPocketFullSizeCounts.ts`) | Thin helpers: expand items/allocations → units → `{ pocketQuantity, fullSizeQuantity }` via existing `resolveGangSheetPriceTierForInches` / `calculateGangSheetCustomerSectionSummary`; format label |
| Matching `*.test.ts` | Classification + quantity + cutoff change + eligibility |
| `PrintRequestsPage.tsx` (+ light CSS if needed) | Show compact counts on list card + detail; wire settings hooks |
| `printRequestQueryPlanning.ts` / summary build path (optional) | Extend summary with pocket/full counts when cutoff provided **or** compute in page from items — prefer no extra reads |
| `UpcomingShowsPage.tsx` | Compact counts on `.show-allocation-row` using active settings source |
| Possibly small CSS under Studio print-request / show-queue styles | Keep secondary, minimal height |

### Architecture / Security / Data / Backend / Migration

- Architecture: presentation + shared pure util only  
- Security: none  
- Data model: **no** persisted fields  
- Backend / Functions / Rules / Storage / Indexes / Migration: **NO**  
- Portal: **NO**

### UI / UX

Compact secondary line, e.g. `Pocket 6 · Full Size 12`, quieter than name/status/actions. Hide when both counts are 0.

---

## Approach

1. Add shared helper(s) that:
   - Accept cutoff inches (from `resolveGangSheetSectionPricingFromSettings(...).sizeCutoffInches`)
   - Expand PR items / allocations into units (quantity / allocatedQuantity)
   - Call existing tier classifier
   - Return `{ pocketQuantity, fullSizeQuantity }` (+ optional `formatPocketFullSizeCountsLabel`)
2. **PrintRequestsPage:** load settings; choose cutoff by `activeListKind` / `isInternal` (customer → Show Queue; internal → Internal); render on list counts row + detail header near timestamps/badges; recompute from `requestItems` on qty/size/add/remove.
3. **UpcomingShowsPage:** for each `requestGroups` row, compute from that group’s allocations + `resolveActiveGangSheetSettingsSource(selectedShow, …)` cutoff; append compact text under existing Designs/Items line (or same `<p>` with separator).
4. Do not touch History sort helpers/wiring.
5. Tests + Owner QA.

---

## Test Strategy

### Automated

| Area | Coverage |
|------|----------|
| Shared helper | cutoff 4″: 4×4, 3×4 Pocket; 4.01×3, 3×5 Full Size; cutoff 5″ recalculates; qty 4 → +4; qty 3 → +3; mixed totals; missing dims; canceled excluded; zero qty |
| Context | Show Queue cutoff vs Internal cutoff produce different totals when cutoffs differ |
| Pricing util | Existing `gangSheetCustomerSectionSummary` tests still pass (unchanged behavior) |
| History regression | Full `upcomingShowListSort.test.ts` still 17/17 (or current count) |

### Manual (Owner QA)

See checklist below.

---

## Human Checkpoints

- [x] Owner QA (UI glanceability + correct context cutoffs)
- [ ] Production — **NOT AUTHORIZED**

---

## Owner QA checklist (planned)

1. PR detail: Pocket/Full Size matches items × qty under active kind’s cutoff  
2. PR list card: same compact counts  
3. Show Queue attached row: uses Show Queue cutoff  
4. Internal Gang Sheet attached row: uses Internal cutoff  
5. Change cutoff in settings → after reload, counts update  
6. Edit item size / qty → counts update  
7. Empty request: no noisy zero badge  
8. **Regression:** History newest-first; Current/Past/Upcoming unchanged  

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Wrong settings context | Reuse `resolveActiveGangSheetSettingsSource`; PR list keyed by Internal vs customer kind |
| Extra Firestore load on PR page | Settings hooks only (2 docs); reuse existing item summary reads |
| Visual noise | Hide when zero; secondary typography |
| History regression | Do not touch sort files; rerun tests |

---

## Rollback

Revert amendment UI + helper; parent History sort remains.

---

## Open Questions

- [x] None blocking — quantity = print units; Internal cutoff field verified as `gangSheetSectionPriceCutoffInches`; empty = hide

---

## Amendment answers (required)

1. PR detail: `PrintRequestsPage.tsx` detail header  
2. Show Queue card: `UpcomingShowsPage.tsx` `.show-allocation-row`  
3. Internal card: **same** allocation row component  
4. Classifier: `gangSheetCustomerSectionSummary.ts`  
5. Show Queue cutoff: `gangSheetSectionPriceCutoffInches`  
6. Internal cutoff: `gangSheetSectionPriceCutoffInches` on `settings/internalGangSheet`  
7–8. Pocket = both dims ≤ cutoff; Full Size = either dim > cutoff  
9. Count = **requested/allocated print quantity** (not rows)  
10. Eligible items/allocs with valid dims; exclude canceled / invalid / zero  
11. Show page already has settings; PR page adds existing hooks  
12. No new backend; optional settings reads on PR page only  
13. UI: `Pocket N · Full Size M`; hide if N+M=0  
14. Derive from live items/allocs + settings  
15. No persisted fields  
16–20. Functions/Rules/Storage/indexes/migration: **NO**  
21. Tests as above + History regression  
22. Owner QA as above  

---

## Approval

- Review doc: docs/workflow/reviews/2026-09-02-print-request-pocket-fullsize-counts-amendment-review.md  
- Verdict: pending  
