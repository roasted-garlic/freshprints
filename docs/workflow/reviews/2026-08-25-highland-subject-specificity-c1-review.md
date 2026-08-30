# Formal Review: C1 Highland Subject Specificity

| Field | Value |
|-------|--------|
| Date | 2026-08-25 |
| Plan | `docs/workflow/plans/2026-08-25-highland-subject-specificity-c1-plan.md` |
| Verdict | **approved_with_changes** |

---

## Verdict: approved_with_changes

Root cause is confirmed by flagship observe: model emits generic `cow`; title/searchConcepts already carry highland; autonomy detects `subject_specificity_risk:cow` but normalizer does not repair. Plan scope is appropriately narrow.

### Binding requirements

| ID | Requirement |
|----|-------------|
| H1 | Deterministic promote from title/`centralSubject` using the **same** specificity pattern as `detectSubjectSpecificityRisk` (modifier + head) — primary fix |
| H2 | Prompt subjects rule strengthened (DEFAULT template); archive prior DEFAULT as PREVIOUS_v28 if following existing versioning pattern |
| H3 | Bump normalizer to **`smart-profile-normalizer-v3`** |
| H4 | No curated breed seed lists; no filename/image hard-codes; no global subject denylist |
| H5 | Do **not** touch Auto Background / C2b |
| H6 | Unit + contract tests for promote / non-promote |
| H7 | DEV non-mutating re-observe Highland (immutability PASS); subjects must include highland cow |
| H8 | No Slice 5, production, bulk reprocess, live Autonomous |
| H9 | Prefer specific phrase first in `subjects`; do not invent breeds absent from title/`centralSubject` |

### Changes required vs draft plan

- Prefer implementing promote helper in **shared** package next to `detectSubjectSpecificityRisk` so automation and normalizer cannot drift.
- Do not rely on prompt-only; **H1 is mandatory** even if prompt helps.

Implement may proceed under H1–H9.
