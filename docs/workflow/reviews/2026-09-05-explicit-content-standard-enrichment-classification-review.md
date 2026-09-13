# Formal Review: Explicit Content — Standard Enrichment Classification (Post-WS5 Corrective)

| Field | Value |
|---|---|
| Date | 2026-09-05 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-05-explicit-content-standard-enrichment-classification-plan.md` |
| Verdict | **approved_with_changes** |
| Implementation | **NOT AUTHORIZED** this pass |
| WS6 | Remains **blocked** until corrective complete (implement + DEV deploy + owner QA) |

---

## Summary

Owner post-WS5 product decision to persist Explicit as standard enrichment metadata is sound and aligned with treating classification separately from Autonomous lifecycle. Plan correctly identifies Ready-gated write coupling in `aiEnrichmentCandidateCore` + `markAiSuccess`, authority conflation risk in `hasProtectedHumanExplicitAuthority`, and UI truthfulness debt for “Would Mark Explicit.” Approved with required implement changes: staff-vs-automation distinction, settings-fail skip Explicit write, truthful Studio labels, and ADR-FP-172. No implement/deploy in this pass.

---

## Checklist

| Area | Status | Notes |
|---|---|---|
| Scope clear and bounded | pass | Write-semantics corrective; no WS6 live |
| Architecture alignment | pass | Enrichment vs lifecycle separation |
| Security impact addressed | pass | Fail-closed settings; staff authority |
| Data model impact addressed | pass_with_changes | Authority source field required |
| Backend impact addressed | pass | Functions enrichment only |
| Test strategy adequate | pass | 20-case matrix covered |
| Human checkpoints identified | pass | Clearing decision; implement auth; QA |
| Roadmap alignment | pass | Post-WS5 / pre-WS6 |
| Documentation plan | pass | ADR-FP-172 |
| No silent scope expansion | pass | |

---

## Required answers (1–33)

1. **Does Explicit classification become independent of Autonomous mode?** **YES** (proposed).
2. **Does it persist in shadow?** **YES**.
3. **Does it persist when other blockers exist?** **YES**.
4. **Can Explicit classification itself force Needs Review?** **NO** (must not).
5. **Can it cause Ready?** **NO** by itself.
6. **Does lifecycle automation remain separately gated?** **YES** (dual gate unchanged).
7. **Correct persistence point?** Same `markAiSuccess` design update; decouple Explicit from `publishReady` branch; classify in candidate after evidence (current location OK).
8. **Atomicity safe?** **YES** if single update includes Explicit with enrichment/lifecycle — required.
9. **Human Explicit=true preserved?** **YES** — required.
10. **Human Explicit=false preserved?** **YES** — required.
11. **Human censoredTerms preserved?** **YES** — required.
12. **Staff removal survives reprocess?** **YES** — required with staff source marker.
13. **Can automated fields be distinguished from human authority if necessary?** **Not today** — **required change** before/with implement (smallest `explicitContentSource` or staff-edit marker).
14. **Automatic clearing allowed?** **NO** (Plan default). Confirm: **[NEEDS OWNER DECISION — AUTOMATED EXPLICIT CLEARING]** — recommend NO.
15. **Multiple terms correct?** **YES** — preserve matcher.
16. **Empty vocabulary semantics preserved?** **YES** — intentional `[]`.
17. **Settings failure behavior safe?** **YES if** Explicit auto-write skipped on `settingsReadFailed` **and** Autonomous fail-closed retained.
18. **Existing Autonomous Ready+Explicit preserved?** **YES** — must not regress Case C.
19. **Shadow preview/provenance needs adjustment?** **YES** — truthful applied/detected semantics.
20. **Studio UI wording truthful?** **Required** — replace misleading “Would Mark” when root write occurs.
21. **Portal masking unchanged?** **YES** (consumer fields unchanged).
22. **Customer Print Requests unchanged?** **YES**.
23. **Model/prompt/normalizer/schema changes required?** **NO** (v34/v6/v1). Additive provenance/authority field does **not** require Smart Profile schema bump if kept on design root or additive preview flags.
24. **Second AI call?** **NO**.
25. **Tags/reranker dependency?** **NO**.
26. **Source files required?** **YES** — shared utils, candidate, pipeline, Studio AI Review UI, tests, ADR/docs.
27. **Functions deploy required?** **YES** (after implement auth).
28. **Studio DEV deploy required?** **YES** if UI ships with Functions.
29. **Rules/index/migration required?** **NO**.
30. **Focused regression sufficient or WS5 rerun required?** **Focused regression sufficient**; full WS5 rerun **not** required.
31. **WS6 blocked until this corrective complete?** **YES**.
32. **Production impact?** **NONE** this pass; production later separate.
33. **`[NEEDS OWNER DECISION]`** — (a) confirm **NO automated Explicit clearing**; (b) authorize **implement** separately; (c) after DEV QA, authorize WS6 Plan start.

---

## Required changes before implement

1. Ship durable **staff vs automation** Explicit authority distinction; update `hasProtectedHumanExplicitAuthority` usage accordingly.
2. Skip Explicit auto-write when `settingsReadFailed` (do not classify-write against silent defaults).
3. Decouple `explicitContentAutomation` payload construction from `publishReady` in candidate; write root fields for Needs Review and Ready paths when allowed.
4. Update Studio AI Review labels/provenance so UI does not present applied writes as hypothetical.
5. Add **ADR-FP-172**; annotate ADR-FP-169/170 as partially superseded on write timing only.
6. Expand automated tests per Plan matrix (including automation reprocess non-clear + staff override).
7. Keep gate **shadow / live false** unless separately authorized.

---

## Architecture / Security notes

- Explicit metadata must not trigger Algolia Ready publication.
- Customer upload / Print Request paths must remain untouched.
- Decision-before-authority-merge WS6 issue remains separate; Explicit root prior-read in `markAiSuccess` is the correct authority boundary for this corrective.

---

## Verdict

**approved_with_changes** — Plan approved for a future implement phase after owner confirms clearing default and authorizes implement. **Implementation authorized: NO** this pass.

**WS5 history:** not invalidated.

**WS6:** blocked until corrective complete.
