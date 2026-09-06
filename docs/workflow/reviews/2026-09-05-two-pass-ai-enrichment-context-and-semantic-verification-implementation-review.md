# Review: Two-Pass AI Enrichment — Implementation Plan

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-05-two-pass-ai-enrichment-context-and-semantic-verification-implementation-plan.md` |
| Governing architecture | Architecture Review `approved_with_changes` + ADR-FP-182 |
| Verdict | **approved** |
| Implementation authorized | **YES** (plan gate cleared — **await owner proceed before code**) |
| Environment | `fresh-prints-dev` |

---

## Summary

Implementation Plan matches locked owner decisions: Pass 1 Visual Context on `aiAnalysis.visualContextProfile`, conditional text-only Pass 2 for evidence/specificity blockers, category trust without dominant-intent hard second-guessing, tag AI retirement with temporary legacy `design.tags`, shared Playground/Processing cores, visibleText + authority-order fixes, ADR-FP-181 preserved. Consumer audit is sufficient to implement without blind deletion. **This Review does not execute code.**

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | DEV implement slice; hard outs honored |
| Architecture alignment | pass | ADR-FP-182 / architecture Review |
| Security impact addressed | pass | Fail closed; no secrets; staff authority |
| Data model impact addressed | pass | Additive; no migration; no SP v bump required |
| Backend impact addressed | pass | Shared cores; Functions allowlist at deploy |
| Test strategy adequate | pass | Required fixtures listed |
| Human checkpoints identified | pass | Proceed → deploy → canary |
| Roadmap alignment | pass | Parent program |
| Documentation plan | pass | ADR recorded |
| No silent scope expansion | pass | No WS6 / prod / tag destroy |

---

## Architecture Review

**Findings:** Shared cores + manual Playground Pass 2 correctly prevent historical parity drift. Category validate-only boundary and Pass 2 patch limits are clear. Prefer **full removal** of Pass 1 `tags` field (normalizer + schema) over inert `tags:[]`.

**Required changes:** None blocking. At implement: extract `normalizeForAliasMatch` if deleting tag resolver file wholesale.

---

## Security Review

**Findings:** Pass 2 cannot clear objective blockers; illegal patches → Needs Review; Explicit untouched.

**Human approval before production:** Required later.

---

## Data Model Review

**Findings:** `visualContextProfile` on `DesignAiAnalysis`; Pass 2 telemetry on `DesignAiSuggestions`; optional provenance audit keys. No new collection. Old records without VCP cannot Pass 2.

---

## Backend Review

**Findings:** Deploy inventory in Plan is adequate. Remove/disable Tag Rerank callable when cutting Settings UI.

---

## Testing Review

**Findings:** Woman/girl, unsupported, specificity, objective+semantic, staff, category/copy rejection, one-pass, parity, cost, tags-inert — complete.

---

## Documentation Review

**Findings:** ADR-FP-182 recorded. Update DATA_MODEL/BACKEND/handoff at implement.

---

## Required Changes

None. Proceed to Implement only after owner explicit proceed.

---

## Blockers

None for plan approval.

---

## Verdict Rationale

Owner decisions are complete and mapped to exact schemas, retirement boundaries, and sequencing. Residual cost measurement is correctly deferred to DEV canary.

---

## Next Step

Owner authorizes Implement (e.g. `Continue Workflow` / `Implement`). Then Implementation Agent executes Plan scope only.

---

# REQUIRED STOP REPORT

## OWNER DECISIONS

1. **Decisions recorded:** YES — ADR-FP-182 + this Plan/Review
2. **Visual Context storage:** `aiAnalysis.visualContextProfile`
3. **Visual Context version:** `visual-context-v1`
4. **Pass 2 blockers:** `structured_evidence_gap:*`, `subject_specificity_risk:*`
5. **Patchable fields:** subjects, objects, styles, themes, interests, professionsGroups, occasions, places, searchConcepts
6. **Category authority:** Pass 1 + exact approved validation; **no** Pass 2 category patch
7. **Reviewer model:** `gemini-2.5-flash-lite` default
8. **Reviewer enable setting:** `semanticReviewerEnabled` default **OFF**
9. **One-pass rule:** Max **1** Pass 2 AI call per enrichment run
10. **Tag active-retirement boundary:** Remove Rerank, Suggestion Author, suggestedNewTags, matchedTags influence, tag AI settings/UX from active enrichment
11. **Legacy-tag retention:** Keep `design.tags` + minimal find/manage UI; **inert** to AI
12. **Playground persistence:** Non-persisting to catalog designs by default

## PASS 1

13. **Exact schema:** Plan TypeScript `VisualContextProfile` (`summary` + `detailedDescription` + bounded structured fields + semanticAliases + uncertainties)
14. **Prompt version:** `catalog-enrich-v38`
15. **Prompt delta:** Add VCP; keep v37 visual-first + gap semantics; prefer remove `tags`
16. **Storage fields:** `designs/{id}.aiAnalysis.visualContextProfile`
17. **Provenance:** Immutable; stamp model/provider/promptVersion/generatedAt; never overwritten by Pass 2
18. **Token caps:** Summary 320; detailed 2400; arrays ≤12; aliases ≤16; string fields ≤240 (tune after canary)
19. **Cost telemetry:** Existing Pass 1 token/cost fields; measure VCP delta in DEV

## PASS 2

20. **Exact input:** VCP + original title/description/category + original SP + effective SP (if authority differs) + eligible blockers only
21. **Exact response schema:** `SemanticReviewResult` (APPROVE | APPROVE_WITH_PATCH | NEEDS_REVIEW + reason + blockersResolved/Unresolved + patches[{field,from,to}])
22. **Prompt version:** `catalog-semantic-review-v1`
23. **Provider/model flow:** Allowlisted model; default flash-lite; same dual-provider architecture as Luna Phase 1; text-only request
24. **Eligibility predicate:** enabled ∧ no objective hard ∧ only eligible semantic blockers ∧ valid VCP
25. **Patch validation:** Allowlist fields; reject staff/preset keys; reject title/desc/category/colors/visibleText/context/Explicit; schema-safe arrays
26. **Final revalidation:** Exactly once after patch
27. **Failure behavior:** Needs Review (provider / malformed / uncertainty / illegal patch / still blocked)
28. **Max-call guarantee:** One Pass 2; no recursive semantic retry

## RETIREMENT

29. **Tag Rerank consumers:** `catalogTagRerankProvider.ts`, candidate core, playground callable, Settings UI, `tagRerank*` fields, cost display — remove active; keep historical reads
30. **Suggestion Author consumers:** `catalogSuggestedTagAuthorProvider.ts`, candidate core, settings — remove active
31. **Suggested Tags consumers:** `AiReviewSuggestedTagsSection`, mapper, policy — remove active UX/emission
32. **matchedTags consumers:** `buildThemeCategoryResolveInput` / `resolveThemeCategory` general scoring — remove influence
33. **excluded-tag consumers:** `aiTagExclusions.ts`, settings, normalize tags — remove with tag schema
34. **structured evidence consumers:** `findStructuredEvidenceGaps` → decision hard via `isHardEvidenceCode` — retire hard judge; keep as Pass 2 trigger source
35. **subject specificity consumers:** `detectSubjectSpecificityRisk` → same
36. **dominant-intent consumers:** `detectCategoryDominantIntentConflict` + HARD_BLOCKER + Studio display + reprocess roll-up — retire hard emit; resolver family overrides retired for valid exact AI category
37. **Dead lean/synthesis consumers:** `resolveLeanCatalogTitle` / synth / `buildTitleFromReadableTextLines` — dead on live path; delete/quarantine + fix development provider
38. **Exact remove/retain:** Remove active tag AI + semantic hard judges + dominant-intent hard + resolver semantic override of valid category. Retain: structural validation, ADR-FP-181, Explicit, gap hard, category existence map, mechanical normalizer, legacy `design.tags`, historical telemetry fields

## CATEGORY

39. **Pass 1 authority:** Trust exact approved name when gap note empty
40. **Approved-category validation retained:** YES (ID/name map)
41. **Gap behavior retained:** YES hard `category_gap_suggested`
42. **Dominant-intent behavior:** Retire as hard approval + retire resolver override of valid exact match
43. **Semantic resolver override:** Retire for valid exact AI category; keep lookup; invalid name → unresolved (not invent)
44. **matchedTags removed:** YES from influence

## DATA FLOW

45. **visibleText wiring:** Canonical `analysis.visibleText` (+ SP) from one sanitize path
46. **Authority-order:** Merge staff/presets **before** WAA / Pass 2 eligibility
47. **Original SP snapshot:** Additive Pass 1 snapshot / provenance
48. **Final SP:** After optional patch + normalize
49. **Immutable context:** `aiAnalysis.visualContextProfile` never rewritten by Pass 2
50. **Old-record behavior:** No VCP → no Pass 2; reprocess to gain context; no bulk backfill

## PLAYGROUND

51. **Shared Pass 1 core:** YES mandatory
52. **Shared Pass 2 core:** YES mandatory
53. **Manual Pass 2 UX:** YES; never auto after Pass 1
54. **Pass 1 cost:** Display
55. **Pass 2 cost:** Display
56. **Combined cost:** Pass1+Pass2 only
57. **Non-persistence confirmed:** YES default

## TAGS

58. **New AI tag generation:** expected **NO**
59. **Tag Rerank call:** expected **NO**
60. **Suggestion Author:** expected **NO**
61. **suggestedNewTags active:** expected **NO**
62. **Legacy design.tags retained:** expected **YES**
63. **Legacy tags affect AI:** expected **NO**

## TESTS / DEPLOY

64. **Test plan:** Plan matrix (woman/girl, unsupported, specificity, objective, staff, category/copy reject, one-pass, parity, cost, tags-inert)
65. **Rules changes:** Likely none for additive maps — verify at implement
66. **Indexes:** None expected
67. **Migration:** **NO**
68. **Functions deploy allowlist:** Plan Deploy surface (owner-gated)
69. **Studio files:** Settings, Playground, AI Review Suggested Tags, mappers, cost UI
70. **Rollback:** Disable semantic reviewer; prompt fallback; no tag re-enable without Plan

## REVIEW

71. **Implementation Plan path:** `docs/workflow/plans/2026-09-05-two-pass-ai-enrichment-context-and-semantic-verification-implementation-plan.md`
72. **Formal Review path:** this document
73. **Formal Review verdict:** **approved**
74. **Implementation authorized:** **YES** (await owner proceed to start code)
75. **Unresolved owner decisions:** **None** blocking

## WORKFLOW

76. **Source modified:** **NO** (docs/ADR/state only)
77. **Deploy:** **NO**
78. **Autonomous changed:** **NO**
79. **WS6 started:** **NO**
80. **Production touched:** **NO**
81. **Commit/push:** **NO**
82. **[NEEDS OWNER DECISION]:** Proceed to Implement? (yes/no)

---

## Forbidden fields (Pass 2) — final

Visual Context Profile; title; description; category; visibleText / readable artwork text; colors; Explicit; provenance history; original Pass 1 snapshot; staff-authored values; import/durable preset values.

Any other SP field discovered at implement → classify in IR before granting mutation authority.

---

## Objective blockers — final non-overridable list

- Malformed provider / unparseable Pass 1 or Pass 2 JSON
- Structural schema / required VCP `summary`+`detailedDescription` failure (Pass 1 fail closed)
- `validation:*` hard codes
- `title:title_missing`, `title:title_exceeds_max_characters`
- `description_missing`
- `category_unresolved`
- `category_gap_suggested`
- Settings-read failure overlay
- Illegal / unsupported Pass 2 patch
- Staff / preset authority conflict
- Remaining blockers after one revalidation
- Operational enrichment failures

---

## Workflow Complete (this pass)

- [x] Owner decisions recorded (ADR-FP-182)
- [x] Implementation Plan
- [x] Formal Review **approved**
- [x] STOP — no application code
