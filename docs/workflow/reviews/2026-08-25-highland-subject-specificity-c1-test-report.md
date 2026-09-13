# Test Report: C1 Highland Subject Specificity

| Field | Value |
|-------|--------|
| Date | 2026-08-25 |
| Plan | `docs/workflow/plans/2026-08-25-highland-subject-specificity-c1-plan.md` |
| Review | `docs/workflow/reviews/2026-08-25-highland-subject-specificity-c1-review.md` |
| Verdict | **passed** (automated + DEV observe) — **owner accept pending** |

---

## Implemented

| Item | Detail |
|------|--------|
| Prompt | `catalog-enrich-v29` — subjects MUST include specific multi-word identity |
| Normalizer | `smart-profile-normalizer-v3` — promote from title / centralSubject / **description** |
| Shared helper | `promoteSubjectsWithTitleSpecificity` + aligned `detectSubjectSpecificityRisk` |
| Guards | Per-evidence-part bigrams (no cross-boundary); modifier blocklist (articles/prose/colors) |

---

## Commands

| Check | Exit |
|-------|------|
| Focused unit/contract tests | 0 |
| `functions` `tsc` build | 0 |
| Flagship observe (6 IDs, non-mutating) | 0, aborted=false |
| `npm run lint` | 0 |

---

## Highland observe (`yJm2VBRvecPNjx79aSnK`)

| Field | Result |
|-------|--------|
| Immutability | **PASS** |
| Prompt / normalizer | `catalog-enrich-v29` / `smart-profile-normalizer-v3` |
| Candidate `subjects` | **`["highland cow", "cow"]`** |
| Prior defect | was `["cow"]` only |

Results file: `docs/workflow/reviews/_calibration-flagship-observe-results.json`

---

## Owner checkpoint

Accept C1 if Highland `subjects` including **highland cow** is sufficient. Then refinement signoff may proceed (separate step). Auto Background remains closed (C2b PASS WITH NOTES).

No Slice 5 / production until refinement signoff.
