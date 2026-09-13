# Plan: Studio Show Queue / Internal Sheet dollar totals

| Field | Value |
|-------|-------|
| Date | 2026-09-10 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase (orthogonal Studio visual tweak during maintenance-prerequisite pause) |
| Related | Staff Inbox glance pills (`StaffInboxItemRow`); shared `calculateGangSheetCustomerSectionSummary` |

---

## Goal

On Studio Show Queue and Internal Gang Sheets, show each attached print request’s dollar total on the PR row, and show a selected show/sheet total that sums those PR totals — using the existing gang-sheet pricing calculation already used by Staff Inbox and Print Request cost summaries.

## Background

Owner paused the production-maintenance-mode prerequisite so this Studio visual tweak can ship. Staff Inbox already displays glance pills (`N designs`, `N print qty`, `$N`) via `calculateGangSheetCustomerSectionSummary` + `sectionPricing`. Show Queue / Internal Sheet attached-PR rows currently show design/item counts and size classes but no dollar amount, and there is no show/sheet-level dollar rollup.

## Scope

### In Scope

- Selected Whatnot Show Queue detail: per attached PR dollar total (active allocations on that show).
- Selected Internal Gang Sheet detail: same per attached PR dollar total.
- Selected show/sheet aggregate dollar total = sum of those per-PR totals.
- Reuse shared pricing helper + already-loaded `useGangSheetSettings().settings.sectionPricing`.
- Match Staff Inbox price-pill emphasis (muted secondary pills optional; `$` emphasized primary weight).
- Focused unit/helper test(s) for the rollup helper.
- Local Studio UI only; no Functions, Rules, indexes, Portal, deploy, commit, or push unless owner later authorizes.

### Out of Scope

- Print Requests list rail cards (already have design/qty; detail panel already has cost).
- Staff Inbox changes.
- Page-wide totals across every show/sheet in the left rail (would require loading allocations for all listed shows).
- Persisting dollar totals on show documents.
- Pricing/settings schema changes.
- Maintenance-mode prerequisite implementation.

---

## Affected Areas

### Files / Modules (expected)

- `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx`
- New small util under `apps/studio/.../upcoming-shows/utils/` (e.g. `showAllocationDollarTotals.ts` + `.test.ts`)
- `apps/studio/src/renderer/src/styles/components/show-queue.css` (and/or reuse glance-pill classes carefully)

### Architecture Impact

- [x] Details: Presentation-only; call existing shared pricing util from Studio UI with allocation width/qty inputs. No new backend layer.

### Security Impact

- [x] None — staff-only Studio screens; no new data exposure or permission changes.

### Data Model Impact

- [x] None — compute from already-loaded allocation snapshots + settings.

### Backend Impact

- [x] None

### UI / UX Impact

- [x] Details: Attached PR rows gain `$N`; “Attached print requests” header (or adjacent summary) gains selected show/sheet `$` total. Manual visual QA required.

### Migration Impact

- [x] None

---

## Approach

1. **Confirm calculation source**  
   Use `calculateGangSheetCustomerSectionSummary(units, sectionPricing).totalPriceUsd` with units built from **non-canceled** allocations on the selected show/sheet:
   - `printWidthInches` / `printHeightInches` from allocation snapshots  
   - `quantity` = `allocatedQuantity`  
   Same pricing config already used for gang-sheet export / Print Request cost UI (`gangSheetSettings.settings.sectionPricing`).

2. **Extract a tiny helper**  
   e.g. `calculateShowAllocationGroupPriceUsd(allocations, pricing)` and `sumShowAllocationGroupPrices(...)` so the page stays thin and tests cover edge cases (empty, canceled-only, invalid width → safe omit/`null`).

3. **Per-PR display**  
   On each `show-allocation-row`, append an emphasized `$N` (Staff Inbox `staff-inbox-glance-pill-price` look). Prefer showing `$0` only when there are active allocations that price to zero; omit or show `—` if pricing cannot be computed (missing width).

4. **Show/sheet aggregate**  
   In the “Attached print requests” section header, display **Total $N** (label: “Show total” on Whatnot, “Sheet total” on Internal) = sum of successfully priced active PR groups. Do not double-count canceled/moved-away inactive rows.

5. **Surfaces**  
   One page (`UpcomingShowsPage`) already serves both `queueSurface === "whatnot"` and `"staff_gang_sheets"` — implement once so both list/detail surfaces get the behavior.

---

## Open question (non-blocking default)

| Question | Default in this plan |
|----------|----------------------|
| Price **allocated-on-this-show** qty vs full original request qty? | **Allocated-on-this-show** (matches production planning for the selected show/sheet). |

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Helper unit tests | `npx tsx --test apps/studio/.../showAllocationDollarTotals.test.ts` (exact path at implement) | yes |
| Diff hygiene | `git diff --check` on touched files | yes |
| Targeted lint if configured for path | existing Studio lint pattern | preferred |

### Manual

## Manual Test Checkpoint

**Feature / area:** Studio Show Queue + Internal Gang Sheets dollar totals  
**Why automated tests are insufficient:** visual pill placement and label wording  
**Environment:** local Studio against DEV data  
**Prerequisites:** gang sheet section pricing configured; a show and an internal sheet with ≥2 attached PRs

### Steps

1. Open Show Queue → select a show with multiple attached PRs → **Expected:** each active PR row shows `$…`; section shows Show total equal to the sum of those PR `$` values.  
2. Open Internal Gang Sheets → select a sheet with attached PRs → **Expected:** same per-PR `$` and Sheet total.  
3. Compare one PR’s `$` to Print Request detail cost for the same sizes/qty when fully allocated on that show → **Expected:** match when allocated qty equals request qty.  
4. Row with only canceled allocations → **Expected:** no inflated active total; aggregate excludes that group’s canceled qty.

### Pass criteria

- [ ] Per-PR and show/sheet totals visible and consistent with shared pricing  
- [ ] Both surfaces (Show Queue + Internal) covered  
- [ ] No regressions to add/remove/move/export actions

### Please reply with

- `PASS` / `FAIL: …` / `PASS WITH NOTES: …`

---

## Human Checkpoints Anticipated

- Owner visual QA after local implement (required before considering this tweak done).  
- Commit/push only if owner explicitly authorizes (same pattern as recent Portal polish).  
- Maintenance prerequisite remains paused / not implemented.

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Missing `printWidthInches` on legacy allocation | Helper returns null; UI omits `$` for that row; aggregate sums only priced rows |
| Confusion vs full-request price when partially allocated | Document allocated-on-this-show default; owner can request full-request later |
| CSS clash with Staff Inbox classes | Prefer show-queue-scoped classes copying the glance-price emphasis |

Rollback: revert the Studio UI/util/CSS commits; no data migration.

---

## FreshForge Impact Classification

| Area | Impact |
|------|--------|
| Starter Surface | No |
| Development Tooling | No |
| Distribution/Installer | No |
| Documentation | Workflow plan/review/signoff only |
| Development History | No |

---

## Acceptance Criteria

- [ ] Active attached PRs on Show Queue and Internal Sheets show `$` totals from existing gang-sheet pricing.  
- [ ] Selected show/sheet displays combined dollar total of those PR totals.  
- [ ] No backend/deploy/commit without separate owner authorization.  
- [ ] Owner visual QA recorded.
