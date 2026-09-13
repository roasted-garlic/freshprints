# Review: Two-Pass AI Enrichment Architecture Investigation

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-05-two-pass-ai-enrichment-context-and-semantic-verification-architecture-plan.md` |
| Verdict | **approved_with_changes** |
| Implementation authorized | **NO** |
| Environment | `fresh-prints-dev` |

---

## Summary

Architecture investigation is complete and sound: move semantic adjudication from brittle lexical evidence to a **conditional text-only Pass 2** over an **immutable Pass 1 Visual Context Profile**, while keeping objective contracts, ADR-FP-181, Explicit, human authority, and genuine category-gap hardness. Tag Rerank / AI Suggested Tags should leave the **active** enrichment path; legacy `design.tags` stay temporarily for later backfill. **No implementation in this phase.** Owner must lock the decision list before a separate implementation Plan.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Investigation only; hard outs honored |
| Architecture alignment | pass | Shared Pass1/Pass2 cores; ADR-FP-181 intact |
| Security impact addressed | pass | No secrets; Pass 2 not escape hatch; staff authority |
| Data model impact addressed | pass | Additive provenance recommended; no prod migration now |
| Backend impact addressed | pass | Future Functions; dual-provider allowlist only |
| Test strategy adequate | pass | Parity cores + objective non-override tests planned |
| Human checkpoints identified | pass | Owner decision list before implement |
| Roadmap alignment | pass | Parent program; absorbs auto-approve audit |
| Documentation plan | pass | ADR at implement; handoff updated |
| No silent scope expansion | pass | No WS6 / prod / tag destroy |

---

## Architecture Review

**Findings:**

- Current Processing is vision + optional tag AI + heavy deterministic semantic post-process; Playground shares vision normalize but not full automation graph.
- Lexical `structured_evidence_gap` is a proven false-negative class (`woman` vs `girl`); fixing via synonyms is rejected.
- Automation decision runs **before** staff/import merge — preserve as implement constraint.
- Pass 2 cannot see pixels — must be documented as consistency review only.
- **Post-audit amendment:** Prefer `aiAnalysis.visualContextProfile` for immutable context; Pass 2 telemetry on `aiSuggestions`. Evidence often lacks `visibleText` at decision time due to analysis-field wiring — implement must address objectively or via Pass 2 + context.

**Required changes (before implement Plan):**

1. Owner lock on Formal Review decision list (Owner Decisions section).
2. Implementation Plan must include shared-core extraction + Playground manual Pass 2 + cost fields + tag-inert boundary.
3. Do not authorize category Pass-2 mutation without explicit owner yes.

---

## Security Review

**Findings:** Pass 2 must fail closed; objective blockers non-overridable; no prompt/secret logging; Firestore settings without keys.

**Required changes:** None for this docs phase.

**Human approval needed before production:** Always (future).

---

## Data Model Review

**Findings:** Prefer additive fields on existing `aiSuggestions` / `smartProfile.provenance` rather than new collections. Do not overload catalog `description`. Store original context + original SP + Pass 2 result + final SP.

**Required changes:** Exact field names in implementation Plan after owner schema pick.

---

## Backend Review

**Findings:** Reuse `estimateVisionCostUsd` + allowlisted models; add callPurpose provenance; retire tag AI call sites from enrichment path when implementing.

---

## Testing Review

**Findings:** Plan parity tests (identical Pass1/Pass2 cores) are mandatory. Cucumber woman/girl + genuine unsupported claim cases required at implement.

---

## Documentation Review

**Findings:** Plan + this Review + state/handoff updated. ADR at implement.

---

## Required Changes (approved_with_changes)

1. Treat cost Pass-1 delta from Visual Context as **[NEEDS MEASURE at implement]** — do not lock portfolio dollars as final.
2. Dominant-intent conflict + category resolver role remain **owner decisions** — not pre-authorized as Pass-2-eligible.
3. Implementation requires a **new Plan/Review** after owner decisions — this Review does **not** authorize code.

---

## Blockers

None for investigation closure. Implementation blocked pending owner.

---

## Verdict Rationale

Investigation acceptance criteria met. Direction aligns with owner philosophy. Residual choices are product decisions, not missing audits. Implementation remains unauthorized.

---

## Next Step

Await owner decisions. If authorized, open a separate **implementation** managed-phase Plan.

---

# REQUIRED STOP REPORT

## CURRENT STATE

1. **Canonical-copy Signoff:** `docs/workflow/reviews/2026-09-05-canonical-ai-catalog-copy-trust-corrective-signoff.md` — **approved_with_notes** (owner PASS WITH NOTES).
2. **Prompt version:** `catalog-enrich-v37`
3. **Smart Profile version:** `smart-profile-v1`
4. **Normalizer:** `smart-profile-normalizer-v6`
5. **Model/provider (default):** `gemini-2.5-flash-lite` / Google (allowlist also Gemini 3.1 flash-lite, `gpt-5.6-luna`)
6. **AI calls per normal enrichment (defaults):** **1** (vision)
7. **AI call purposes (current):** Vision enrichment; optional Tag Rerank; optional Suggestion Author
8. **Playground call count (first run):** **1** vision; optional separate Tag Rerank playground action

## CURRENT PIPELINE

9. **Processing call graph:** See Plan section A.3
10. **Playground call graph:** See Plan section A.4
11. **Semantic transforms inventory:** See Plan section A.7
12. **Objective validators:** structural JSON; `acceptCanonicalCatalogCopy`; SP validation; title length; category existence; settings fail-closed; Explicit vocab; staff authority
13. **Hard blocker inventory:** See Plan section A.6
14. **Evidence corpus:** title + description + visibleText only (`centralSubject` **not** passed from decision; **not persisted** on SP). **Wiring gap:** Processing often passes `analysis.visibleText` as **undefined** while parse-visible text lives under `smartProfileEnrichmentParse.visibleText` — evidence may be title+description only in practice.
15. **Authority ordering:** staff edit > import preset > AI on persist; **WAA computed on pre-merge AI SP** (gap)
16. **Retry behavior:** vision provider retries exist; Tag Rerank failures fall back; no semantic AI retry loop for approval today

## PASS 1

17. **Proposed Visual Context Profile schema (recommend):**
    - `version` (e.g. `visual-context-v1`)
    - `summary` (short overall concept)
    - `peopleCharacters[]` / `animals[]` / `objects[]` (evidence phrases)
    - `appearanceAndPose` / `relationships` (optional strings)
    - `readableText` (primary lines)
    - `styleCompositionColors`
    - `themesInterestsOccasions` (supported only)
    - `semanticAliases[]` (natural equivalent descriptions of main subjects)
    - `uncertainties[]`
    - Caps on string lengths / array sizes to bound tokens
18. **Storage/provenance:** **`aiAnalysis.visualContextProfile`** (immutable Pass 1; same pattern as `halftoneShadowAssessment`). Pass 2 telemetry on **`aiSuggestions`** (Tag Rerank-style fields). Optional automation audit keys under `smartProfile.provenance`. No new collection; do not put VCP in staff-editable SP dims.
19. **Immutable behavior:** Never rewritten by Pass 2; patch audit references original.
20. **Canonical output relationship:** Sibling layer in same Pass 1 response; copy still ADR-FP-181.
21. **Prompt delta:** Add context instructions + JSON field(s); keep v37 visual-first + categoryGapNote semantics.
22. **Prompt version recommendation:** bump to **`catalog-enrich-v38`** at implement (name flexible).
23. **Schema version recommendation:** `visual-context-v1` independent string.
24. **Normalizer impact:** Context largely opaque to SP normalizer; SP dims still normalize mechanically.
25. **Token/cost delta:** Expect increase; **measure on DEV** before portfolio lock.

## PASS 2

26. **Role:** Text-only semantic consistency adjudicator for eligible blockers; not a second vision pass; not an approval escape hatch.
27. **Input:** immutable Visual Context; Pass 1 title/description/category/SP; exact blocker codes; minimal extra deterministic facts.
28. **Output:** `{ decision: APPROVE|APPROVE_WITH_PATCH|NEEDS_REVIEW, reason, blockersResolved[], blockersUnresolved[], patches?: {field, from, to}[] }`
29. **Reviewer model recommendation:** `gemini-2.5-flash-lite` (cheapest allowlisted). Luna only if quality fails canary — owner may override.
30. **Pass-2 eligible (recommend):** `structured_evidence_gap:*`; optionally `subject_specificity_risk:*` after owner yes.
31. **Non-eligible (recommend):** validation/title structure; category_unresolved; description_missing; category_gap_suggested; settings fail; Explicit; staff conflicts; verifier_malformed; any pixel-required claim.
32. **Patchable fields (recommend):** subjects, objects, styles, themes, interests, professionsGroups, occasions, places, searchConcepts (narrow). Not colors/visibleText without owner yes.
33. **Forbidden fields:** Visual Context; title; description; category (v1); provenance history; staffEdited keys; import presets; Explicit root.
34. **Retry/loop:** Max **one** Pass 2; no AI retry to force Ready.
35. **Failure behavior:** provider/malformed/uncertainty/illegal patch → Needs Review.
36. **Deterministic revalidation:** exactly once after patch.

## PLAYGROUND

37. **Shared core:** Extract Pass1/Pass2 functions used by Processing and Playground wrappers.
38. **Manual Pass 1:** Owner runs vision analysis.
39. **Manual Pass 2:** Explicit “Run Semantic Review”; never auto after Pass 1.
40. **Pass 1 display:** full Visual Context + catalog output + SP.
41. **Pass 2 display:** decision, reason, resolved/unresolved, patches, final SP, final WAA.
42. **Cost display:** PASS 1 COST after Pass 1.
43. **Combined cost:** PASS1+PASS2 for that test; no Tag Rerank in new UX.
44. **Persistence:** Playground may remain non-persisting to designs (current pattern) unless owner wants save — **owner**; Processing persists provenance.
45. **Parity tests:** identical cores given identical inputs.

## TAGS

46. **Primary AI tag generation:** Schema still has `tags:[]`; resolver still consumes rawTags when present.
47. **Tag Rerank status:** Implemented; **default mode off**.
48. **Tag Rerank path:** `shouldRunTagRerank` → `callTagRerank` in `aiEnrichmentCandidateCore.ts` / `catalogTagRerankProvider.ts`; Playground helper in `aiEnrichmentPlayground.ts`.
49. **Tag Rerank cost:** ~text call; fixture/smoke scale **~$0.00006** (small token counts); live median sparse when mode off. Combined UI cost = primary + tagRerank only (standalone suggestionAuthor **not** added — avoid double-count when merged).
50. **Suggested Tags consumers:** Studio settings/UI + `aiSuggestions.suggestedNewTags`.
51. **suggestedNewTags consumers:** Studio Suggested Tags; optional Suggestion Author; policy gate.
52. **matchedTags consumers:** `resolveThemeCategory` / `buildThemeCategoryResolveInput` category scoring.
53. **excluded-tag plumbing:** Settings `effectiveTagExclusions` → normalize/resolver.
54. **Safe to retire immediately (at implement):** Tag Rerank AI call; Suggestion Author; suggestedNewTags generation; matchedTags category influence; tag-rerank settings UX as active; force tags inert.
55. **Temporarily retain:** `design.tags` data; minimal tag management/filter UI for cleanup; schema fields for read compatibility.
56. **Deferred backfill:** strip tags, remove obsolete types/UI, destructive cleanup.
57. **Destructive cleanup checkpoint:** human-required later workstream.

## RETIREMENT

58. **KEEP:** structural validation; ADR-FP-181; human authority; Explicit; genuine category gap; objective title/category presence; mechanical normalize caps; immutable provenance; cost telemetry.
59. **REPLACE WITH PASS 2:** lexical structured evidence as hard semantic judge; (optional) subject specificity lexical risk.
60. **REMOVE (active path):** Tag Rerank; Suggested Tags gen; lean/synth dead code; tag-driven category/evidence; synonym expansion as product strategy.
61. **NEEDS OWNER DECISION:** category resolver heuristics; dominant-intent conflict; whether residual tags=[] schema field remains; Pass 2 on specificity; colors/visibleText patchability; Playground persist.
62. **Complexity reduction:** Significant expected LOC reduction in tag/evidence paths once Pass 2 lands; exact count at implement.

## COST

63. **Current Pass-1-equivalent:** ≈ **$0.00065**/design (4491/509 @ flash-lite sample)
64. **Current Tag Rerank:** ≈ **$0.0003–0.0005** when invoked; **$0** at default off
65. **Current combined typical:** ≈ **$0.00065**
66. **Proposed Pass 1:** ≈ $0.00065–0.00090 **[NEEDS MEASURE with context]**
67. **Proposed Pass 2:** ≈ **$0.00036** est. when invoked
68. **Proposed combined when P2 runs:** ≈ **$0.0010–0.0013**
69. **Per 100 designs by P2 rate:** see Plan section C.2 (~$0.070–$0.106 provisional)
70. **Per 1,000 designs:** ~$0.70–$1.06 provisional
71. **Break-even after reranker retirement:** vs **always-on** rerank, Pass 2 cheaper at any ≤100% rate; vs **default off**, Pass 2 is net-new cost (no offset)

## DATA / SAFETY

72. **New persisted fields:** Visual Context + Pass 2 result/patches/costs/models/prompt versions + original SP snapshot
73. **Migration required now:** **NO**
74. **Rules impact:** Additive fields may need rules allowlist at implement — **[NEEDS REPO CHECK at implement]**
75. **Indexes:** Likely none for context blob
76. **Secrets:** None new; keys stay Secret Manager
77. **Human authority preserved:** **YES** if patches never touch staff keys and merge order fixed
78. **Model 2 impact:** Hard blockers remain for objective; semantic class moves to Pass 2 — principle preserved
79. **Explicit impact:** Unchanged; Pass 2 out of scope
80. **Production impact:** None this phase

## REVIEW

81. **Recommended architecture:** Pass 1 vision + immutable Visual Context + ADR-FP-181 copy; conditional Pass 2 text reviewer; shared Playground/Processing cores; retire tag AI from active path; keep legacy tags inert temporarily.
82. **Primary risk:** Pass 2 approving internally consistent hallucinations (pixel-blind).
83. **Implementation complexity:** **High** (pipeline reshape + UI + provenance + tag retirement boundary + tests).
84. **Owner decisions:** See below.
85. **Formal Review verdict:** **approved_with_changes** (investigation package); implement gated.
86. **Implementation authorized:** **NO**

## WORKFLOW

87. **Auto-approve standalone audit started:** **NO** (absorbed)
88. **Tag retirement implementation started:** **NO**
89. **WS6 started:** **NO**
90. **Autonomous changed:** **NO**
91. **Production touched:** **NO**
92. **Commit/push:** **NO**
93. **[NEEDS OWNER DECISION]** — list below

---

# BLOCKER MATRIX (Formal)

| Blocker | Trigger | Obj/Sem | Pass 2 Eligible? | Override Allowed? | Keep/Replace/Remove |
|---------|---------|---------|------------------|-------------------|---------------------|
| `validation:*` (hard) | SP schema | Objective | NO | NO | KEEP |
| `title:title_missing` / exceeds max | title rules | Objective | NO | NO | KEEP |
| `description_missing` | empty desc | Objective | NO | NO | KEEP |
| `category_unresolved` | no categoryId | Objective | NO | NO | KEEP |
| `category_gap_suggested` | gap flag | Objective/product | NO (v1) | NO | KEEP hard |
| `category_dominant_intent_conflict` | heuristic | Semantic-det | **OWNER** | NO AI override of objective | OWNER |
| `structured_evidence_gap:*` | lexical miss | Semantic | **YES** | Via Pass 2 only | REPLACE→Pass2 |
| `subject_specificity_risk:*` | specificity | Semantic | **OWNER (lean YES)** | Via Pass 2 | REPLACE/OWNER |
| `verifier_unresolved` | soft confirm fail | Mixed | NO | NO | KEEP narrow |
| Soft `category_alternatives_present` | alternatives | Soft | N/A | N/A | KEEP soft |
| Settings read fail | ops | Objective | NO | NO | KEEP |

---

# RETIREMENT MATRIX (Formal)

| Current Mechanism | Purpose | Consumer | Cost | Keep | Replace | Remove | Timing |
|-------------------|---------|----------|------|------|---------|--------|--------|
| Lean title / slogan rebuild | Old copy repair | Dead on live path | 0 | | | Yes | implement cleanup |
| Description synthesis | Old copy repair | Dead on live path | 0 | | | Yes | implement cleanup |
| `acceptCanonicalCatalogCopy` | Structural copy gate | Processing+Playground | 0 | Yes | | | keep |
| Structured evidence lexical | WAA hard | automation decision | 0 | | Pass2 | as hard judge | implement |
| Subject specificity risk | WAA hard | automation decision | 0 | | Pass2/owner | | implement |
| Category resolver + matchedTags | Category pick | candidate core | 0 | partial | | matchedTags | owner+implement |
| Category gap | Taxonomy gap hard | SP + decision | 0 | Yes | | | keep |
| Explicit automation | Safety/policy | persist | 0 | Yes | | | keep |
| Normalizer v6 | Caps/canonicalize | SP build | 0 | mech | reduce semantic | | ongoing |
| Tag Rerank | Tag quality AI | optional 2nd call | mid | | | active | implement |
| Suggested Tags / suggestedNewTags | Tag invent | Studio | mid | | | active | implement |
| excluded_tags plumbing | Tag filter | resolver | 0 | inert/remove | | with tags | implement |
| Legacy `design.tags` | Historical | search/UI | 0 | temp | | later backfill | later |
| Suggestion Author AI | Suggestion prose | optional | mid | | | Yes | implement |

---

# OWNER DECISIONS (required before implement)

| # | Decision | Recommendation |
|---|----------|----------------|
| 1 | Exact Visual Context schema | Adopt proposed `visual-context-v1` fields + caps; **persist at `aiAnalysis.visualContextProfile`**; refine in implement Plan |
| 2 | Pass-2-eligible blockers | Start with `structured_evidence_gap:*` only; add specificity if needed |
| 3 | Patchable SP fields | Dimension lists except colors/visibleText initially; never staff keys |
| 4 | Category Pass 2 | **No** category patch/review in v1 |
| 5 | Reviewer model | `gemini-2.5-flash-lite` |
| 6 | Enable/disable setting | Yes — default off until DEV canary; then on for Processing conditional |
| 7 | Legacy tag UI | Keep management/filters for cleanup; retire Suggested Tags + Rerank UX |
| 8 | Deterministic semantic resolvers | Retire lexical evidence judge; keep mechanical normalize; owner on dominant-intent |
| 9 | Provenance/retention | Store immutable context + P1 SP + P2 result on each enrichment; old records without context → Pass 2 skip / Needs Review if only semantic blockers |

---

# PLAYGROUND UX PLAN (exact)

1. Choose/upload image
2. Run Pass 1
3. Inspect Visual Context (full)
4. Inspect canonical catalog output (title/desc/category/SP)
5. Inspect Would Auto Approve + blockers + Pass-2-eligible flags
6. Inspect PASS 1 COST
7. Manually Run Semantic Review (if desired)
8. Inspect decision + reason
9. Inspect proposed patches
10. Inspect final patched SP
11. Inspect final WAA after deterministic rerun
12. Inspect PASS 2 COST
13. Inspect COMBINED COST

No Pass 2 auto-run.

---

# TARGET CALL GRAPHS

See Plan sections B.3 (Processing) and B.4 (Playground). Shared cores mandatory.

---

## Workflow Complete (this investigation)

- [x] Plan written
- [x] Formal Review written
- [x] State + CURRENT-STATE updated
- [x] Canonical-copy Signoff completed prior
- [x] STOP — no implementation
