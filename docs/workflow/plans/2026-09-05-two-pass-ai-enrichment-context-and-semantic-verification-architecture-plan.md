# Plan: Two-Pass AI Enrichment — Visual Context Profile + Conditional Semantic Reviewer (Architecture Investigation)

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase (investigation / architecture only) |
| Parent | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Child | `two-pass-ai-enrichment-context-and-semantic-verification` |
| Related | Formal Review (this package) |
| Environment | `fresh-prints-dev` |
| Implementation | **NOT IN THIS PHASE** |

---

## Goal

Audit the full catalog AI enrichment path, classify objective vs semantic post-processing, and design a target **two-pass** architecture:

1. **Pass 1 — Vision Analyst** (image once): rich immutable Visual Context Profile + canonical title/description/category/Smart Profile (ADR-FP-181 preserved).
2. **Pass 2 — Semantic Reviewer** (text only, conditional): adjudicate eligible semantic blockers; optional narrow Smart Profile patches; never rewrite context/title/description.

Deliver Plan + Formal Review only. No code, deploy, Autonomous, WS6, production, or commit/push.

---

## Background

### Closed immediately prior

- **ADR-FP-181** Signoff **approved_with_notes** — owner `CANONICAL AI COPY DEV QA: PASS WITH NOTES`.
- Copy trust passed (0/5 title+desc semantic mutations; no slogan rebuild / centralSubject append / desc synth).
- Note: 1/5 cucumber Processing run blocked by `structured_evidence_gap:subjects:woman` while copy remained correct — **not** a copy-trust failure.

### Owner philosophy

**AI understands semantics. Code enforces objective contracts.**

Do not solve `subjects: ["woman"]` + prose “pin-up girl” with synonym tables. That class of mismatch belongs to a text-only semantic reviewer over immutable Pass 1 visual context.

### Absorbed scopes

- Standalone historical auto-approve audit → **absorbed here** (not started separately).
- Tag Rerank / Suggested Tags retirement path → **designed here**; code retirement **deferred**.
- Destructive legacy tag backfill → **later** human-gated workstream.

---

## Scope

### In Scope (this phase)

- Mechanical audit of Processing + Playground call graphs
- Inventory of AI calls, semantic transforms, objective validators, hard blockers
- Evidence corpus / authority-order / Explicit / category-gap analysis
- Target architecture (Pass 1 context + Pass 2 contract + eligibility + one-pass max)
- Shared Playground/Processing core + manual Pass 2 UX
- Cost model from repo pricing + measured token samples
- Tag stack retirement boundary (active AI vs temporary legacy retention)
- Formal Review + owner decision list
- STOP

### Out of Scope

- Any application code changes
- Deploy / production / Autonomous / WS6
- Synonym / girl↔woman deterministic “fixes”
- Destructive tag migration
- Restoring lean title / description synthesis (forbidden by ADR-FP-181)
- Dynamic model registry (Luna Phase 2 deferred)

---

## FreshForge Impact Classification

| Area | Impact |
|------|--------|
| Starter Surface | Docs/workflow artifacts only this phase |
| Development Tooling | None |
| Distribution/Installer | None |
| Documentation | Plan + Review (+ handoff state) |
| Development History | N/A |

---

## Affected Areas (future implementation — inventory only)

### Files / Modules (proven consumers)

| Area | Paths |
|------|-------|
| Processing core | `functions/src/ai/aiEnrichmentCandidateCore.ts`, `aiEnrichmentPipeline.ts` |
| Playground | `functions/src/ai/aiEnrichmentPlayground.ts`, `testAiEnrichmentPlayground.ts` |
| Normalize / copy | `functions/src/ai/simpleCatalogEnrichmentResponse.ts`, `catalogTitleRules.ts` |
| Automation | `packages/shared/src/utils/catalogAutomationDecision.ts`, `catalogAutomationEvidence.ts` |
| Category | theme category resolver via `buildThemeCategoryResolveInput` / `resolveThemeCategory` in candidate core |
| Tags | `catalogTagResolver.ts`, `catalogTagRerankProvider.ts`, `catalogSuggestedTagAuthorProvider.ts` |
| Explicit | Explicit automation in candidate core (deterministic vocab; **no second AI**) |
| Settings / UI | Studio AI enrichment settings + Playground surfaces |
| Constants | `packages/shared/src/constants/aiEnrichment.constants.ts`, `smartProfile.constants.ts` |
| Types | `packages/shared/src/types/catalog/smartProfile.types.ts` |
| Persist merge | `functions/src/ai/smartProfileEnrichmentWrite.ts` |

### Architecture / Security / Data / Backend / UI

- Architecture: additive Pass 1 context + conditional Pass 2; shared core for Playground/Processing.
- Security: no secrets in Firestore; Pass 2 must not become an approval escape hatch for objective blockers; staff authority preserved.
- Data: additive provenance fields preferred; no production migration this phase.
- Backend: future Functions allowlist deploy when implementing.
- UI: Playground two-step manual Pass 2; cost display Pass 1 / Pass 2 / Combined.

### Migration Impact

- Investigation: none.
- Future implement: additive schema; old records without Visual Context → Pass 2 ineligible or Needs Review policy (**owner**).

---

## Approach (investigation method used)

1. Close canonical-copy Signoff with owner PASS WITH NOTES.
2. Trace Processing from enqueue → provider → normalize → tags/rerank → category → Smart Profile → automation decision → persist/merge.
3. Trace Playground first-call vs optional tag-rerank path.
4. Inventory hard blockers and evidence corpus from source.
5. Map tag stack + cost telemetry (`VISION_MODEL_PRICING_USD_PER_1M`, token fields).
6. Design target call graphs, retirement/blocker/cost matrices, Playground UX.
7. Formal Review with owner decisions; STOP (no implement).

---

# PART A — CURRENT STATE AUDIT (REPO-PROVEN)

## A.1 Versions / models (live defaults)

| Item | Value | Source |
|------|-------|--------|
| Prompt version | `catalog-enrich-v37` | `CATALOG_ENRICHMENT_PROMPT_VERSION` / `CURRENT_CATALOG_ENRICH_PROMPT_VERSION` |
| Smart Profile schema | `smart-profile-v1` | `SMART_PROFILE_VERSION` |
| Normalizer | `smart-profile-normalizer-v6` | `SMART_PROFILE_NORMALIZER_VERSION` |
| Default vision model | `gemini-2.5-flash-lite` (Google) | `DEFAULT_VISION_MODEL_ID` |
| Allowlist | Gemini 2.5/3.1 flash-lite; `gpt-5.6-luna` | Luna Phase 1 / ADR-FP-174 |
| Tag Rerank mode default | **`off`** | `DEFAULT_TAG_RERANK_MODE` |
| Suggestion author default | **`off`** | `DEFAULT_SUGGESTION_AUTHOR_MODE` |
| SuggestedNewTags policy default | `balanced` | still emits suggestions when tags resolve poorly |
| Catalog workflow | shadow / Autonomous OFF on DEV (operational gate) | settings |

## A.2 AI call count — normal Processing

| Call | When | Purpose |
|------|------|---------|
| **1. Vision enrichment** | Always | Image + schema JSON (title, description, category, tags=[], SP dims, readableText, gap note, …) |
| **2. Tag Rerank** | Only if `tagRerankMode` is `auto`/`always` and trigger fires | Text-only approved-tag shortlist reorder (`callTagRerank`) |
| **3. Suggestion Author** | Only if suggestionAuthorMode on + suggestedNewTags survive policy, and rerank not covering authoring | Text-only preferredWhen/aliases authoring |

**Typical DEV path today (defaults):** **1 AI call** (vision only). Tag Rerank and Suggestion Author are **optional** and default **off**.

Playground first-call: **1 vision call**. Optional separate Playground tag-rerank entry point exists (`aiEnrichmentPlayground` tag-rerank helper) — **not** auto-run after Pass 1.

## A.3 Processing call graph (current)

```
enqueue / reprocess / onJob
→ load settings + image + categories + vocab + exclusions
→ VISION provider (Google|OpenAI)  [AI YES · cost: vision tokens]
→ extractJson / normalizeSimpleCatalogEnrichment
→ acceptCanonicalCatalogCopy(title, description)  [deterministic · mutates trim-only · ADR-FP-181]
→ catalogTagResolver (rawTags→approved + suggestedNewTags)  [deterministic · semantic matching]
→ optional Suggestion Author  [AI optional]
→ optional Tag Rerank  [AI optional · mutates suggestions.tags]
→ resolveThemeCategory(... matchedTags, enrichmentParse, …)  [deterministic · semantic scoring]
→ buildDesignSmartProfile + normalizeDesignSmartProfile  [deterministic · mutates SP]
→ computeCatalogAutomationDecision  [deterministic · may block WAA]
   · validate SP / title length
   · category_unresolved / description_missing / category_gap_suggested
   · category_alternatives (soft)
   · dominant-intent conflict
   · findStructuredEvidenceGaps (subjects/objects vs title+description+visibleText)
   · subject_specificity_risk
   · targeted verifier (confirmable soft only)
→ Explicit automation (vocab match on artwork evidence)  [deterministic · NO AI]
→ persist aiSuggestions + analysis + smartProfile
   · AFTER decision: merge import presets + staff-preserved dimensions  [authority merge]
→ optional publishReady if Autonomous live (currently OFF)
```

**Critical authority note:** `computeCatalogAutomationDecision` runs on the **AI-built** Smart Profile **before** staff/import-preset merge in `persistAiEnrichmentResults` / `smartProfileEnrichmentWrite`. Staff dimensions can win on persist while WAA was computed on pre-merge AI profile. Flagged for architecture (WS6-adjacent; not implementing WS6).

## A.4 Playground call graph (current)

```
Studio Playground Run
→ same vision prompt/schema path as Processing (settings-driven)
→ normalizeSimpleCatalogEnrichment + canonical JSON display
→ cost estimate from prompt/completion tokens
→ STOPS (does not run full Processing: no tag resolve/rerank by default, no SP build/persist, no automation decision persist)
→ Optional separate UI action: Tag Rerank playground helper (requires prior vision JSON)
```

**Parity debt (historical):** Playground historically stopped before Processing post-transforms; ADR-FP-181 removed live semantic copy mutation so copy class now matches — but Playground still does **not** run the full automation/SP persistence graph. Target architecture must share Pass 1 / Pass 2 **cores**, not fake UI-only logic.

## A.5 Evidence corpus (exact)

`findStructuredEvidenceGaps` **can** accept `centralSubject`, but `computeCatalogAutomationDecision` passes only:

- `subjects`, `objects`, `title`, `description`, `visibleText`

**Not passed:** `centralSubject` (also **not persisted** on `DesignSmartProfile` today — parse-only).

Corpus = lowercase join of title + description + visibleText (+ centralSubject only if supplied).  
Support = substring / light plural heuristics. **No synonym table.**  
`girl` ≠ support for token `woman` → cucumber FAIL run.

**Wiring gap (post-audit, [Audit enrichment call graph](66a7ba7b-1f78-4df4-9e4c-1f5f790bffe0)):**  
`buildSimpleCatalogEnrichmentResult` places sanitized visible text on `analysis.smartProfileEnrichmentParse.visibleText`, **not** on `analysis.visibleText`. Candidate core still passes `result.analysis.visibleText` into automation → evidence often receives **`visibleText: undefined`** even when SP later has visible text. Implement must either fix this objective wiring or rely on Visual Context + Pass 2 — do not “fix” by mirroring `subjects[0]` as `centralSubject`.

**Circular evidence warning:** QA `centralSubject` often falls back to `subjects[0]`. Feeding that into the corpus would self-validate subjects — **forbidden** as a “fix.” Visual Context Profile must be genuine Pass 1 narrative evidence, not a mirrored subject list.

## A.6 Hard blocker inventory (reachable)

| Blocker / family | Trigger | Hard? | Notes |
|------------------|---------|-------|-------|
| `validation:*` (except missing_generated_at) | SP schema validation errors | YES | Objective structure |
| `title:title_missing` | empty title | YES | Objective |
| `title:title_exceeds_max_characters` | >200 | YES | Objective |
| `category_unresolved` | no categoryId | YES | Objective after resolver |
| `description_missing` | empty description | YES | Objective |
| `category_gap_suggested` | SP flag from non-empty gap note | YES | Product hard (v37 semantics keep false gaps empty) |
| `category_dominant_intent_conflict` | theme/interest vs category heuristic | YES | Semantic-ish deterministic |
| `structured_evidence_gap:subjects|objects:*` | lexical corpus miss | YES | **Semantic candidate for Pass 2** |
| `subject_specificity_risk:*` | underspecific subject vs title identity | YES | Semantic / structured candidate |
| `verifier_unresolved` | confirmable soft fail | YES when invoked | Currently narrow triggers |
| Soft: `category_alternatives_present` | alternatives list | Soft only | Does not hard-block alone |
| Settings read fail | forces needs_review even if WAA | Operational | Objective fail-closed |

Settings / structural parse failures at provider boundary fail enrichment earlier (not WAA).

## A.7 Semantic post-processing inventory (high-signal)

| Mechanism | Path | Mutates persist? | Blocks WAA? | AI? | Status proposal |
|-----------|------|------------------|-------------|-----|-----------------|
| `acceptCanonicalCatalogCopy` | `catalogTitleRules.ts` | trim/reject only | via missing/garbage | No | **KEEP** (ADR-FP-181) |
| `resolveLeanCatalogTitle` / slogan rebuild | `catalogTitleRules.ts` | **Not on live path** | N/A | No | **REMOVE later** (dead weight) |
| Description synthesis helpers | title rules / candidate core | Not on live path post-181 | N/A | No | **REMOVE later** |
| `normalizeDesignSmartProfile` v6 | shared utils | YES SP | indirect | No | **KEEP** mechanical; reduce semantic heuristics over time |
| Subject canonicalization / specificity promote | evidence + normalizer | YES SP | yes (specificity risk) | No | **SIMPLIFY / Pass 2** candidates |
| `findStructuredEvidenceGaps` | evidence utils | No (decision only) | YES | No | **REPLACE trigger → Pass 2** (retire as hard semantic judge) |
| Dominant-intent category conflict | `catalogCategoryDominantIntent` | No | YES | No | **NEEDS OWNER** (Pass 2 vs keep) |
| `resolveThemeCategory` + matchedTags | candidate core | YES category | via unresolved | No | **NEEDS OWNER** (Pass 1 authority vs resolver) |
| Tag resolver / suggestedNewTags | `catalogTagResolver.ts` | YES suggestions | indirect | No | **RETIRE from active enrichment** |
| Tag Rerank | `catalogTagRerankProvider.ts` | YES tags | No directly | YES | **REMOVE from active pipeline** |
| Suggestion Author | `catalogSuggestedTagAuthorProvider.ts` | YES suggestions | No | YES | **REMOVE with tags** |
| Explicit automation | candidate core | YES Explicit root | No (separate) | No | **KEEP** — Pass 2 irrelevant |
| Staff/import merge | `smartProfileEnrichmentWrite.ts` | YES | computed earlier | No | **KEEP**; fix eligibility-after-merge in implement |

## A.8 Tag stack (current)

| Piece | Role | Affects enrichment? | Affects WAA? | Affects cost? |
|-------|------|---------------------|--------------|---------------|
| Prompt `tags:[]` | Schema still asks tags | Model may emit [] | No | Tokens only |
| `rawTags` | Transient analysis | Resolver input | Indirect | No |
| `aiSuggestions.tags` | Resolved approved tags | Persist | Via category matchedTags | No |
| `suggestedNewTags` | New tag suggestions | Studio Suggested Tags | Policy-gated | Optional AI author |
| Tag Rerank | Second AI | Reorders approved tags | No | Yes when on |
| matchedTags → category | Resolver signal | Category choice | Via unresolved/conflict | No |
| excluded tags | Settings plumbing | Matcher | No | No |
| `design.tags` legacy | Historical assigned | Search/UI | Should be inert to new AI | No |
| Suggested Tags UI | Studio | Consumes suggestions | No | No |

**Owner direction:** retire AI tag generation + Tag Rerank + Suggested Tags from **active** enrichment; keep legacy `design.tags` **temporarily inert** for later backfill.

## A.9 Cost telemetry (repo)

Stored / estimable today:

- `promptTokens`, `completionTokens`, `estimatedCostUsd` on vision suggestions
- Tag Rerank / Suggestion Author: `tagRerankPromptTokens`, `tagRerankEstimatedCostUsd`, etc.
- Pricing table: `VISION_MODEL_PRICING_USD_PER_1M` in `aiEnrichment.constants.ts`
  - `gemini-2.5-flash-lite`: input **$0.10** / output **$0.40** per 1M
  - `gemini-3.1-flash-lite`: $0.25 / $1.50
  - `gpt-5.6-luna`: $0.2 / $1.2 (+ cachedInput $0.02)

Measured sample (v36 cucumber Playground, flash-lite): **4491** prompt + **509** completion → ≈ **$0.000653** vision.

Category-description QA earlier: ~$0.0004–$0.0008 vision depending on prompt size.

**No authoritative Pass 2 tokens yet** (not built). Estimate below uses text-only sizes.

Call purpose typing today is **implicit** (vision vs tagRerank* fields), not a unified `callPurpose: VisionAnalyst|SemanticReviewer` enum — recommend additive provenance.

## A.10 Recent blocker observations (no catalog-wide reprocess)

| Source | Pattern |
|--------|---------|
| Canonical-copy cucumber 5× | 1× `structured_evidence_gap:subjects:woman`; 4× WAA YES |
| Prior TD-034 notes | Lexical evidence / title-specificity friction class known |
| v37 cucumber | False category-gap **0**; run 4 WAA=false with **empty** `hardBlockers` but `needs_review` (zero-blocker NR class — Model 2 / mode edge; track separately from lexical evidence) |

Representative **semantic false-negative class:** structured subject token not literally present in title/description/visibleText despite synonymous prose.

---

# PART B — TARGET ARCHITECTURE

## B.1 Pass 1 — Vision Analyst

**Input:** artwork image; approved category names+descriptions; owner vision instructions; minimal contract context.

**Output (one response, two layers):**

### A. Visual Context Profile (immutable provenance)

Evidence-grounded visual/semantic understanding: scene, people/characters, animals, objects, appearance, pose/action, relationships, readable text, symbols, setting, style, composition, colors, themes/interests/occupations/occasions when supported, joke/story, recognizable concepts, **semantic aliases** useful for Pass 2, uncertainties.

Quality principle: materially useful, nonredundant, no invented detail, uncertainty explicit — **not** “describe every pixel.”

### B. Derived catalog output

Title, description, category, Smart Profile, other required fields — **same image analysis**, ADR-FP-181 for copy.

**Storage recommendation (repo-proven, [Audit provenance data model](049383ef-df30-4ef3-9b97-fbdc31d9e82a)):**

| Artifact | Recommended location | Why |
|----------|----------------------|-----|
| Immutable Visual Context Profile | `designs/{id}.aiAnalysis.visualContextProfile` | Same additive pattern as `halftoneShadowAssessment`; Functions-owned; not staff-editable SP dims; not Algolia-projected |
| Pass 2 call telemetry | `aiSuggestions` fields (status/tokens/cost/promptVersion/model) | Mirrors existing `tagRerank*` / `suggestionAuthor*` pattern |
| Automation-facing Pass 2 audit (optional) | Additive keys under `smartProfile.provenance` | Decision linkage without putting VCP in editable dims |

**Do not:** overload catalog `description`; put immutable VCP in `smartProfile` dimensions or `smartProfileAiSnapshot`; invent a new Firestore collection.

Immutable for the run: store original Pass 1 context + original SP snapshot; Pass 2 patches produce **final** SP without rewriting context.

## B.2 Pass 2 — Semantic Reviewer

- Text only; **no image**
- Conditional: only when hard blockers ⊆ Pass-2-eligible set
- At most **once** per enrichment run
- Outcomes: `APPROVE` | `APPROVE_WITH_PATCH` | `NEEDS_REVIEW`
- Patches: narrow allowed SP dimensions only
- Never modify: Visual Context, title, description, Pass 1 provenance, artwork, staff/preset values
- On patch: mechanical normalize → **one** deterministic revalidation → Ready or Needs Review
- Failure/malformed/uncertainty/illegal patch → Needs Review (no loop)
- Must not override objective hard blockers

**Pixel limitation (explicit):** Pass 2 can only check consistency with Pass 1 claims, not independently verify the image.

## B.3 Target Processing call graph

```
IMAGE
→ Pass 1 Vision Analyst core (shared)  [AI]
→ parse/validate structural
→ immutable Visual Context Profile + canonical copy + SP
→ mechanical normalize
→ objective deterministic gates + compute blockers
→ if no blockers → Ready candidate (mode-gated)
→ if ONLY Pass-2-eligible semantic blockers → Pass 2 core (shared)  [AI text]
   → APPROVE / APPROVE_WITH_PATCH / NEEDS_REVIEW
   → apply allowed patch if any
   → normalize
   → deterministic gates ONCE
→ else objective/non-eligible → Needs Review
→ persist provenance (P1 context, P1 SP, blockers, P2 result, final SP, costs)
→ staff/preset merge AFTER final decision inputs clarified (implement must not weaken staff)
NO Tag Rerank. NO second image. NO semantic title/description rewrite.
```

## B.4 Target Playground call graph

```
Owner selects image → Run Pass 1 (same Pass 1 core)
→ Display Visual Context | Catalog Output | blockers | Pass-2 eligibility | PASS 1 COST
→ STOP (no auto Pass 2)
→ Owner: Run Semantic Review (same Pass 2 core; text only; uses displayed P1 + blockers)
→ Display decision, patches, final SP, final WAA, PASS 2 COST, COMBINED COST
```

## B.5 Prompt / schema evolution

- Do **not** discard v37 visual-first + categoryGapNote semantics.
- Smallest delta: add Visual Context Profile field(s) + optional semanticAliases; bump to e.g. **`catalog-enrich-v38`** (name TBD at implement).
- Separate Pass 2 prompt version e.g. `catalog-semantic-review-v1`.
- Context profile may have its own schema version string.
- Token increase: expect material but bounded; measure in implement DEV canary.

## B.6 Category authority (recommendation for owner)

**Default recommend:** Pass 1 authoritative for dominant-intent category + deterministic existence/gap checks; **Pass 2 must NOT change category** in v1. Dominant-intent conflict → **NEEDS OWNER** whether Pass-2-eligible or remain hard. matchedTags influence → retire with tags.

## B.7 Explicit

Keep ADR-FP-172 contract. Pass 2 **out of scope** for Explicit. Deterministic vocab post-Pass-1 remains.

## B.8 Settings (minimal)

- Semantic reviewer enabled/disabled
- Reviewer model (allowlist only; recommend cheap Gemini flash-lite for text)
- Optional: eligible blocker family toggles only if product-safe

No secrets in Firestore.

---

# PART C — MATRICES (PLAN BASELINE; REVIEW FINALIZES)

## C.1 Retirement matrix (summary)

| Mechanism | Keep | Replace | Remove | Timing |
|-----------|------|---------|--------|--------|
| Structural JSON / copy structural validation | ✓ | | | now/keep |
| ADR-FP-181 canonical copy | ✓ | | | keep forever |
| Human authority merge | ✓ | | | keep; order fix at implement |
| Explicit automation | ✓ | | | keep |
| Genuine category gap hard | ✓ | | | keep pending owner |
| Lexical structured evidence as hard judge | | ✓ Pass 2 | | implement |
| Subject specificity lexical risk | | ✓ / owner | | implement |
| Lean title / desc synth dead code | | | ✓ | implement cleanup |
| Tag Rerank AI | | | ✓ active | implement |
| Suggested Tags / suggestedNewTags gen | | | ✓ active | implement |
| matchedTags category influence | | | ✓ | with tags |
| Prompt tags field | | | ✓ or force [] inert | implement |
| Legacy `design.tags` data | temporary retain | | later backfill | later |
| Dominant-intent conflict | owner | owner | | owner |
| Category resolver heuristics | owner | owner | | owner |

## C.2 Cost model (pricing from repo)

**Assumptions (explicit):**

- Vision Pass 1 ≈ measured **4491 / 509** @ flash-lite ≈ **$0.00065**/design
- Pass 2 text estimate (not measured): **~2000 in / 400 out** @ flash-lite ≈ **$0.00036**/design when invoked
- Tag Rerank when invoked ≈ text-only; fixtures ~**$0.00006**; live median sparse when default **off**. Use **~$0.00006–0.00040** band until measured under current models.
- Current **default** Tag Rerank **off** → typical current = Pass-1-equivalent only
- Combined UI helper today: primary + tagRerank only (does not add standalone suggestionAuthor)

| Scenario | Per design |
|----------|------------|
| CURRENT typical (rerank off) | ~$0.00065 |
| CURRENT with rerank always | ~$0.00065 + ~$0.00040 ≈ **$0.00105** |
| PROPOSED Pass 1 only | ~$0.00065–0.00090 (context may +tokens) **[NEEDS measure]** |
| PROPOSED + Pass 2 | Pass1 + ~$0.00036 |

**Portfolio (using Pass1=$0.00070 provisional, Pass2=$0.00036):**

| Designs | 0% P2 | 5% | 10% | 25% | 50% | 100% |
|---------|-------|----|-----|-----|-----|------|
| 100 | $0.070 | $0.072 | $0.074 | $0.079 | $0.088 | $0.106 |
| 1000 | $0.70 | $0.72 | $0.74 | $0.79 | $0.88 | $1.06 |

**Break-even vs always-on Tag Rerank:** If retiring always-on rerank (~$0.00040) funds Pass 2, break-even invocation rate ≈ 0.00040/0.00036 ≈ **~110%** — i.e. Pass 2 cheaper than always-rerank at any ≤100% rate. Vs **default off** rerank, Pass 2 is **net new** cost at invocation rate R.

---

## Test Strategy (future implement — not this phase)

### Automated

| Check | Required at implement |
|-------|----------------------|
| Shared Pass1 core Processing ≡ Playground | yes |
| Shared Pass2 core Processing ≡ Playground | yes |
| Objective blockers never Pass-2-cleared | yes |
| ADR-FP-181 no copy rewrite | yes |
| One Pass 2 max / fail → Needs Review | yes |
| Tag path inert to enrichment | yes |
| Typecheck / unit / Functions build | yes |

### Manual

- Playground Pass 1 inspect → manual Pass 2 → cost display
- Cucumber woman/girl semantic approve path
- Genuine unsupported subject still Needs Review

---

## Human Checkpoints Anticipated

- [x] Owner QA canonical-copy (done)
- [ ] Owner architecture decisions (Formal Review list)
- [ ] Future: implement authorization + DEV deploy allowlist
- [ ] Future: destructive tag backfill
- [ ] Production — not in scope

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Pass 2 rubber-stamps hallucinated Pass 1 claims | High | Explicit pixel limitation; keep objective gates; NEEDS_REVIEW on uncertainty |
| Context verbosity cost blow-up | Med | Prompt quality principle; measure v38 delta |
| Category wrongly Pass-2-mutable | High | Default forbid category patches |
| Staff authority weakened | High | Never patch staff keys; reconsider decision-after-merge |
| Tag retirement breaks search | Med | Temporary retain legacy tags; inert to AI |

---

## Rollback Plan

N/A this phase (docs only). Future: feature-flag Pass 2 off; retain Pass 1; revert prompt version.

---

## Documentation Updates Required (at implement)

- [ ] DECISIONS.md (new ADR)
- [ ] DATA_MODEL.md / BACKEND.md / handoff 06–07
- [ ] TESTING.md commands
- [ ] This phase: Plan + Review + state/handoff only

---

## Open Questions → Owner (see Formal Review)

1. Exact Visual Context Profile schema
2. Pass-2-eligible blocker set
3. Patchable SP fields
4. Category Pass-2 authority (recommend: none)
5. Reviewer model
6. Enable/disable setting
7. Legacy tag UI retention boundary
8. Keep any deterministic semantic resolvers?
9. Context retention/provenance policy for old records

---

## Approval

- Review doc: `docs/workflow/reviews/2026-09-05-two-pass-ai-enrichment-context-and-semantic-verification-architecture-review.md`
- Verdict: **approved_with_changes** (investigation package)
- **Implementation authorized this phase: NO**
