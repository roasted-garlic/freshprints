# Owner QA Correction: Pocket / Full Size counts are WIDTH-ONLY

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Goal | `studio-history-newest-first-ordering` |
| Amendment | `print-request-pocket-fullsize-counts` |
| Type | Owner product clarification (corrective) |

---

## OWNER PRODUCT CLARIFICATION

Pocket / Full Size **operational count** classification is **WIDTH-ONLY**.

| Class | Rule |
|-------|------|
| Pocket | `printWidthInches <= configured cutoff` |
| Full Size | `printWidthInches > configured cutoff` |

**Height does not participate** in this display count.

This is **intentionally different** from the gang-sheet pricing/weight tier classifier (`resolveGangSheetPriceTierForInches` / both-dimensions rule).

**Pricing and weight behavior is unchanged.**

---

## Prior Formal Review note

The amendment Formal Review (`2026-09-02-print-request-pocket-fullsize-counts-amendment-review.md`) assumed reuse of the both-dimensions pricing classifier for these counts. Owner QA **FAIL** corrected that product assumption. This record supersedes that classification axis for the operational count only.

---

## Owner fixture (required)

Cutoff `4"`:

| Width | Height | Qty |
|-------|--------|-----|
| 3.5 | 5.26 | 5 |
| 3.5 | 3.5 | 5 |
| 10 | 6.72 | 1 |
| 10 | 5.23 | 1 |
| 10 | 9.02 | 1 |

**Expected:** Pocket **10** · Full Size **3**
