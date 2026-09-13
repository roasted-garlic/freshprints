# Formal Review: Print Request Pocket / Full Size counts (amendment)

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-09-02-print-request-pocket-fullsize-counts-amendment-plan.md |
| Parent goal | `studio-history-newest-first-ordering` |
| Verdict | **approved** |

---

## Summary

Amendment is narrowly scoped: derive Pocket/Full Size **print-quantity** counts from existing gang-sheet tier classification and context-specific cutoffs (`gangSheetSectionPriceCutoffInches` on Show Queue vs Internal settings). Shared Show Queue / Internal allocation UI already exists; settings switching already exists. No backend/rules/migration. Parent History ordering must remain untouched. Empty UI: hide when both counts are zero.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Display-only; no pricing/export/DPI changes |
| Architecture alignment | pass | Shared pure util + existing settings hooks |
| Security impact addressed | pass | None |
| Data model impact addressed | pass | No persisted counters |
| Backend impact addressed | pass | Functions/Rules/indexes/migration NO |
| Test strategy adequate | pass | Classifier/qty/context + History regression |
| Human checkpoints identified | pass | Owner QA; production not authorized |
| Roadmap alignment | pass | Folded into same commit set as History goal |
| Documentation plan | pass | Workflow artifacts |
| No silent scope expansion | pass | History lock explicit |
| Cutoff not hardcoded | pass | Uses settings field + resolver |
| Classifier reuse | pass | Same `isLargeTier` / `resolveGangSheetPriceTierForInches` semantics |
| Quantity = print units | pass | Matches section summary unit model — no owner decision |

---

## Architecture Review

**Findings:**
- Paths audited and concrete.
- Internal Gang Sheet request cards are **not** a separate component — same `.show-allocation-row` on `UpcomingShowsPage`.
- Correct settings switch: `resolveActiveGangSheetSettingsSource`.
- PR page currently lacks settings hooks — adding existing hooks is acceptable; no new API.

**Required changes:**
- [x] None

---

## Security Review

**Findings:** Display-only derived counts.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] None for this amendment; production remains NOT AUTHORIZED for the combined goal.

---

## Data Model Review

**Findings:**
- Dimensions: `printWidthInches` / `printHeightInches` on items/allocations.
- No denormalized pocket/full fields.
- Canceled exclusion for counts is intentional and closer to export eligibility than the legacy total-qty summary.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- Functions / Firestore Rules / Storage Rules / indexes / migration / Portal: **NO**

**Required changes:**
- [x] None

---

## UI decisions (Formal Review)

1. **Label:** `Pocket N · Full Size M` (singular labels; natural reading with numbers).
2. **Empty:** **Hide** when `pocketQuantity + fullSizeQuantity === 0`.
3. **Placement:** secondary metadata (PR card counts row; detail under title/timestamps; allocation row under Designs/Items).
4. **Loudness:** must stay quieter than name, status, primary actions.

---

## Parent goal lock

Implementation **must not** change History / Current / Past / Upcoming sort behavior or helpers. Rerun `upcomingShowListSort.test.ts`.

---

## Testing Review

**Findings:** Plan covers cutoff examples, quantity expansion, dual settings contexts, eligibility, pricing regression, History regression.

**Required changes:**
- [x] None

---

## Blockers

None. No `[NEEDS OWNER DECISION]`.

---

## Verdict Rationale

Approved: audit answers all amendment questions; quantity semantics match existing section summary; Internal cutoff field verified; minimal client-only change with clear regression lock on History ordering.

---

## Next Step

Implement amendment → Test (incl. History regression) → Implementation Review → Owner QA.  
Do **not** signoff/commit/push until amendment Owner QA PASS, then combined signoff for parent+amendment.
