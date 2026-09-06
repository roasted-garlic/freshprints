# Review: Canonical AI Title/Description Trust Corrective

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-05-canonical-ai-catalog-copy-trust-corrective-plan.md` |
| Prior investigation | `docs/workflow/reviews/2026-09-05-ai-enrichment-playground-processing-quality-parity-investigation-review.md` |
| Verdict | **approved** |
| Implementation authorized | **YES** — narrow Processing persistence corrective; **STOP before DEV deploy** |

---

## Summary

Owner contract clarifies Option 1 from the parity investigation: **do not semantically rewrite** AI title/description. Keep structurally valid copy; fail closed on corruption; no slogan rebuild / subject append / description synthesize. v37 prompt, smart-profile-v1, normalizer-v6, evidence/Model 2 unchanged.

Existing enrichment throw path (`assertRequiredField` / provider failure) is the fail-closed vehicle — **no new invented prose path**.

---

## Owner contract confirmations (pre-implement expectations)

| # | Requirement | Expectation after implement |
|---|-------------|------------------------------|
| 1 | Semantic quality scoring does not control keep | YES |
| 2 | `resolveLeanCatalogTitle` not on active titles | YES |
| 3 | `buildTitleFromReadableTextLines` not on active titles | YES |
| 4 | No `centralSubject` append to titles | YES |
| 5 | No synthesized descriptions for valid copy | YES |
| 6 | Structural detection conservative | YES |
| 7 | Unicode/punctuation/profanity allowed | YES |
| 8 | Invalid fails closed (throw), no rewrite | YES |
| 9 | v37 unchanged | YES |
| 10 | smart-profile-v1 / normalizer-v6 unchanged | YES |
| 11 | automation/evidence/Model 2 unchanged | YES |

**Principle recorded:** AI owns semantic catalog copy; app validates structure/integrity only.

---

## Checklist

| Area | Status |
|------|--------|
| Scope bounded | pass |
| Matches owner clarification | pass |
| Fail-closed path exists | pass (throw → enrichment fail / Needs Review) |
| No prompt change | pass |
| Test strategy | pass |

## Verdict

**approved** — proceed Implement → Test → IR → STOP before DEV deploy.
