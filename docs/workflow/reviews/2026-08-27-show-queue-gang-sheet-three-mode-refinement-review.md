# Review: Show Queue gang-sheet three-mode refinement

| Field | Value |
|-------|-------|
| Date | 2026-08-27 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-27-show-queue-gang-sheet-three-mode-refinement-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

The plan correctly identifies today’s shipped grouped export as **sheet-per-customer** behavior (via `customerId` grouping in `composeGroupedGangSheetSheets`, not per-Print Request), and proposes a backward-safe three-mode contract: preserve `grouped_by_customer` for **Sheet per Customer**, add `customer_grouped_continuous` for the new **Grouped by Customer** continuous packing, and leave Standard untouched. Architecture reuses shared grouping/heading helpers and separates only sheet-boundary logic. Scope is Studio + shared only; no Firebase. **Approved for implementation** after listed minor plan/doc hygiene items.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | In/out lists match owner brief; Smart Catalog excluded |
| Architecture alignment | pass | Layering preserved; no UI→Firestore shortcuts |
| Security impact addressed | pass | IPC URL validation unchanged; no new surfaces |
| Data model impact addressed | pass | No persisted schema changes |
| Backend impact addressed | pass | Explicitly no Functions |
| Test strategy adequate | pass | 12 automated scenarios + manual QA matrix |
| Human checkpoints identified | pass | DEV QA before release |
| Roadmap alignment | pass | Phase 7 fast-follow; queued goal documented |
| Documentation plan | pass | ADR + ROADMAP at implement |
| No silent scope expansion | pass | Standard regression gated |

---

## Architecture Review

**Findings:**

- Root-cause analysis matches source: `composeGroupedGangSheetSheets` appends one PNG per customer nest segment; `planGroupedGangSheetLayout` forces `commitSheetIfNeeded(true)` at customer boundaries — explains preview/export alignment on sheet-per-customer today.
- Recommended split (preserve compositor for sheet-per-customer; new continuous planner + compositor) is appropriate — continuous mode requires **multiple customer section bands on one physical PNG**, which today’s compositor never does.
- Enum Option A (retain `grouped_by_customer` for preserved behavior) is the correct backward-safe choice given existing local cache fingerprints.

**Required changes:**

- [ ] During implement, ensure **sheet-count preview** for Sheet per Customer tracks `composeGroupedGangSheetSheets` semantics (planner should not drift from compositor for any mode).

---

## Security Review

**Findings:**

- No change to download URL allowlist, auth, or Firestore access.
- Grouping metadata still derived from staff-loaded `PrintRequest` records.

**Required changes:**

- [ ] None

**Human approval needed before production:**

- [ ] None for this goal (Studio release remains separate checkpoint)

---

## Data Model Review

**Findings:**

- `layoutMode` is request-time IPC only; no Firestore fields.

**Required changes:**

- [ ] None

---

## Backend Review

**Findings:**

- Plan correctly states no Functions/Firebase involvement.

**Required changes:**

- [ ] None

---

## Testing Review

**Findings:**

- Test matrix covers owner acceptance criteria including two-customers-one-sheet (continuous) vs two-sheet (sheet-per-customer).
- Standard regression explicitly tied to existing efficiency contract tests.

**Required changes:**

- [ ] Add at least one compositor-level test (or export integration test) for continuous mode if pure planner tests pass but PNG band stacking could regress — implement agent judgment.

---

## Documentation Review

**Findings:**

- Plan supersedes queued brief semantics; stale “per Print Request” wording still exists in `2026-08-24-show-queue-gang-sheet-three-mode-refinement-queued-goal.md` and ROADMAP follow-up notes.

**Required changes:**

- [ ] At implement start: update queued brief header to **superseded** and correct per-customer wording; point to this plan.

---

## Required Changes (approved_with_changes)

1. **Supersede queued brief** — Mark `2026-08-24-show-queue-gang-sheet-three-mode-refinement-queued-goal.md` superseded; fix any remaining “per Print Request” isolation wording to **per customer**.
2. **Preview/compositor parity** — Implement continuous mode with paired planner + compositor tests; keep sheet-per-customer preview aligned with `composeGroupedGangSheetSheets`.
3. **Filename confirmation** — Use proposed `grouped-continuous-gang-sheet` base name unless owner objects during DEV QA (non-blocking).

---

## Blockers

None.

---

## Verdict Rationale

The plan is repo-grounded, backward-safe on enums/cache, and correctly scopes the new work to continuous customer-grouped sheet filling while preserving Standard and today’s sheet-per-customer export. Security and data-model impact are nil. Conditional approval covers documentation supersession and implement-time preview/compositor parity — not plan redesign.

---

## Next Step

**STOP — do not implement until owner authorizes Implement phase** (e.g. `Continue Workflow` / explicit implement authorization). When authorized: follow `docs/workflow/plans/2026-08-27-show-queue-gang-sheet-three-mode-refinement-plan.md` and required changes above.
