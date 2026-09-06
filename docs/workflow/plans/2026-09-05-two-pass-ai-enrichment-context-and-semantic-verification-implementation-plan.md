# Plan: Two-Pass AI Enrichment — Implementation

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Parent | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Child | `two-pass-ai-enrichment-context-and-semantic-verification-implementation` |
| Governing architecture | `docs/workflow/plans/2026-09-05-two-pass-ai-enrichment-context-and-semantic-verification-architecture-plan.md` |
| ADR | **ADR-FP-182** |
| Environment | `fresh-prints-dev` |
| Code this pass | **NONE** — Plan + Review only |

---

## Goal

Implement Pass 1 Visual Context + conditional Pass 2 Semantic Reviewer on shared Processing/Playground cores; retire active tag AI; fix visibleText wiring and authority-order for WAA; preserve ADR-FP-181, Explicit, Model 2 objective hardness, and temporary legacy `design.tags`.

---

## Background

Owner approved architecture (`approved_with_changes`) and locked product decisions (ADR-FP-182). Canonical-copy Signoff closed with PASS WITH NOTES. Philosophy: **AI understands semantics; code enforces objective contracts.**

---

## Scope

### In Scope (future Implement phase)

1. `visual-context-v1` types + `aiAnalysis.visualContextProfile` persistence
2. `catalog-enrich-v38` Pass 1 prompt/schema (no tag generation)
3. Shared Pass 1 / Pass 2 cores + Playground UI (manual Pass 2, costs)
4. Pass 2 eligibility, patch authority, one-call max, fail → Needs Review
5. Retire lexical evidence / specificity as **hard judges** → Pass 2 triggers
6. Retire `category_dominant_intent_conflict` hard block + semantic category overrides of valid AI category
7. Retire Tag Rerank / Suggestion Author / suggestedNewTags / matchedTags influence / tag settings UX from active product
8. visibleText canonical wiring fix
9. WAA on effective post-merge profile (narrow; not WS6)
10. DEV canary cost measurement fixtures
11. Contract/parity tests per matrix below

### Out of Scope

- Production / Autonomous ON / WS6
- Destructive `design.tags` backfill
- Dynamic model registry
- Synonym dictionaries
- Restoring lean title / description synthesis

---

## Owner decisions recorded (authoritative)

| # | Decision | Locked value |
|---|----------|--------------|
| 1 | VCP storage | `aiAnalysis.visualContextProfile` |
| 2 | VCP version/schema | `visual-context-v1` with `summary` + `detailedDescription` + bounded structured fields |
| 3 | Pass 2 eligible | `structured_evidence_gap:*`, `subject_specificity_risk:*` |
| 4 | Objective non-override | See Formal Review enumeration |
| 5 | Patchable | subjects, objects, styles, themes, interests, professionsGroups, occasions, places, searchConcepts |
| 6 | Category Pass 2 | **NONE**; trust Pass 1 approved + empty gap; retire dominant-intent hard |
| 7 | Category resolver | Pass 1 authoritative; validate only; no matchedTags |
| 8 | Reviewer model | `gemini-2.5-flash-lite` default |
| 9 | Enable setting | OFF default until canary |
| 10 | Max Pass 2 | **1** per enrichment run |
| 11 | Failures | Needs Review |
| 12–15 | Tags / Playground / shared core / costs | Per owner prompt |
| 16–21 | visibleText / authority / old records / audit trail / Explicit / ADR-FP-181 | Per owner prompt |

---

## Exact TypeScript contracts (implement)

### Visual Context — `visual-context-v1`

Prefer new file e.g. `packages/shared/src/types/catalog/visualContext.types.ts` (or under `ai/`):

```ts
export const VISUAL_CONTEXT_VERSION = "visual-context-v1" as const;

/** Caps — ceilings, not targets (tune after DEV cost canary). */
export const VISUAL_CONTEXT_SUMMARY_MAX = 320;
export const VISUAL_CONTEXT_DETAILED_MAX = 2400;
export const VISUAL_CONTEXT_STRING_MAX = 240;
export const VISUAL_CONTEXT_ARRAY_MAX = 12;
export const VISUAL_CONTEXT_ALIAS_MAX = 16;
export const VISUAL_CONTEXT_LINE_MAX = 120;

export interface VisualContextProfile {
  version: typeof VISUAL_CONTEXT_VERSION;
  /** Short high-level visual concept (required). */
  summary: string;
  /** Richer evidence-grounded narrative for text-only review (required). */
  detailedDescription: string;
  peopleCharacters?: string[];
  animals?: string[];
  objects?: string[];
  appearance?: string;
  posesActions?: string;
  relationships?: string;
  readableArtworkText?: string[];
  symbols?: string[];
  setting?: string;
  styleComposition?: string;
  colors?: string[];
  themesInterests?: string[];
  professionsGroups?: string[];
  occasions?: string[];
  visualJokeOrStory?: string;
  /** Natural equivalent descriptions — evidence only, not catalog tags. */
  semanticAliases?: string[];
  uncertainties?: string[];
  /** Optional stamp when persisted. */
  generatedAt?: string;
  promptVersion?: string;
  model?: string;
  provider?: string;
}
```

Persist on `DesignAiAnalysis.visualContextProfile` (omit empties). Do **not** put into staff-editable SP dimensions.

### Pass 2 response — `catalog-semantic-review-v1`

```ts
export const CATALOG_SEMANTIC_REVIEW_PROMPT_VERSION = "catalog-semantic-review-v1" as const;

export const SEMANTIC_REVIEW_DECISIONS = [
  "APPROVE",
  "APPROVE_WITH_PATCH",
  "NEEDS_REVIEW",
] as const;

export type SemanticReviewDecision = (typeof SEMANTIC_REVIEW_DECISIONS)[number];

export const SEMANTIC_REVIEW_PATCHABLE_FIELDS = [
  "subjects",
  "objects",
  "styles",
  "themes",
  "interests",
  "professionsGroups",
  "occasions",
  "places",
  "searchConcepts",
] as const;

export type SemanticReviewPatchableField = (typeof SEMANTIC_REVIEW_PATCHABLE_FIELDS)[number];

export interface SemanticReviewPatch {
  field: SemanticReviewPatchableField;
  from: string[];
  to: string[];
}

export interface SemanticReviewResult {
  decision: SemanticReviewDecision;
  reason: string;
  blockersResolved: string[];
  blockersUnresolved: string[];
  patches?: SemanticReviewPatch[];
}
```

### Pass 2 telemetry on `DesignAiSuggestions` (mirror tagRerank*)

- `semanticReviewStatus?: "skipped" | "succeeded" | "failed" | "ineligible"`
- `semanticReviewFailureReason?: string`
- `semanticReviewDecision?: SemanticReviewDecision`
- `semanticReviewReason?: string`
- `semanticReviewPromptTokens` / `CompletionTokens` / `EstimatedCostUsd`
- `semanticReviewPromptVersion` / `semanticReviewModel` / `semanticReviewProvider`
- `semanticReviewBlockersResolved?` / `Unresolved?`
- `semanticReviewPatchesApplied?` (sanitized)

### Original SP snapshot

- `smartProfileAiSnapshot` already exists for Reset-to-AI — extend or add `smartProfilePass1Snapshot` / provenance keys: `pass1SmartProfileSnapshot`, `semanticReviewInvoked`, etc. Prefer additive provenance without bumping `smart-profile-v1` unless editable schema changes.

### Settings (minimal)

| Field | Type | Default |
|-------|------|---------|
| `semanticReviewerEnabled` | boolean | **false** |
| `semanticReviewerModelId` | allowlisted model id | `gemini-2.5-flash-lite` |

Remove active Tag Rerank / Suggested Tags / Suggestion Author / suggestedNewTagsPolicy controls from Settings UX when retiring; keep backward-compatible reads of old Firestore keys only if mechanically required.

---

## Pass 1 prompt / schema delta

| Item | Value |
|------|-------|
| Prompt version | **`catalog-enrich-v38`** (`CATALOG_ENRICHMENT_PROMPT_VERSION`) |
| Auto-upgrade | Add v37 to previous-default set → upgrade to v38 |
| Keep from v37 | Visual-first copy rules; `categoryGapNote` true-gap-only semantics |
| Add | Visual Context instructions + JSON object `visualContextProfile` |
| Remove | Prefer **omit `tags` field entirely** from schema + normalizer |
| If temporary `tags:[]` required | Document sole consumer; force inert; Formal Review prefers full removal |

Prompt principle (owner): comprehensive evidence-grounded context for catalog/search/validate; no invention; record uncertainty; no microscopic pixel dump.

---

## Shared core architecture

```
runPass1VisionAnalystCore(input) → {
  visualContextProfile,
  title, description, categoryRaw, smartProfileParse, readable/visible text,
  usage, model, provider, promptVersion
}

runPass2SemanticReviewerCore(input) → {
  result: SemanticReviewResult,
  usage, model, provider, promptVersion
}
```

| Surface | Wrapper |
|---------|---------|
| Processing | `generateAiEnrichmentCandidateForDesign` → Pass1 → validate → merge authority → blockers → maybe Pass2 → revalidate → persist |
| Playground Pass 1 | Callable → Pass1 core → display only |
| Playground Pass 2 | Callable → Pass2 core with **exact** displayed Pass1 payload + blockers |

**Parity tests mandatory:** identical cores → identical semantic results.

---

## Target Processing flow

```
IMAGE
→ Pass 1 core (vision, v38)
→ structural validate + acceptCanonicalCatalogCopy
→ persist-ready VCP (immutable)
→ map visible/readable text to ONE canonical analysis.visibleText (+ SP visibleText)
→ category: exact approved match of Pass 1 category → IDs; else unresolved
   (NO matchedTags; NO dominant-intent override; NO structured-evidence challenge of valid exact match)
→ build + normalize SP (mechanical)
→ merge import presets + staff-preserved dims  ← BEFORE WAA
→ compute blockers on EFFECTIVE profile
→ if only Pass2-eligible + semanticReviewerEnabled → Pass 2 ONCE
→ validate patches (allowed fields, no staff/preset keys, justified)
→ apply → normalize → revalidate ONCE
→ Ready candidate or Needs Review
→ persist: VCP, suggestions, SP, Pass1 snapshot, Pass2 provenance, costs
→ Explicit deterministic (unchanged)
NO Tag Rerank / Suggestion Author / tag resolve for AI tags
```

---

## Eligibility predicate

```
Pass2Eligible =
  semanticReviewerEnabled
  AND hardObjectiveBlockers.length === 0
  AND semanticBlockers.length > 0
  AND every semanticBlocker matches structured_evidence_gap:* OR subject_specificity_risk:*
  AND visualContextProfile present and structurally valid
```

If semantic blockers exist but VCP missing (old record / failed parse) → Needs Review (no fabricated context).

---

## Blocker classification (implement)

### Pass-2 eligible (semantic)

- `structured_evidence_gap:subjects:*` / `objects:*`
- `subject_specificity_risk:*`

These become **triggers**, not final hard judges when Pass 2 enabled. When reviewer OFF: retain Needs Review (fail closed) OR soft — **Recommend:** still Needs Review until canary ON (no silent approve).

### Objective — never Pass-2 overridable

- Provider/parse/structural schema failures (fail enrichment earlier)
- `validation:*` hard (except documented soft warnings)
- `title:title_missing`, `title:title_exceeds_max_characters`
- `description_missing`
- `category_unresolved`
- `category_gap_suggested` (genuine)
- Settings-read failure overlay
- Illegal / unsupported Pass 2 patch
- Staff/preset authority conflict
- `verifier_unresolved` if still used for non-semantic soft (keep narrow)
- Operational failures

### Retire from hard approval

| Code / mechanism | Action |
|------------------|--------|
| `category_dominant_intent_conflict` | **Remove** from `HARD_BLOCKER_CODES` and stop emitting in decision |
| Lexical evidence as hard judge | Emit as Pass2-eligible reason; Pass 2 adjudicates when enabled |
| Subject specificity as hard judge | Same |
| Resolver dominant-intent / structured challenge of **exact** AI category | **Retire** when `categoryGapNote` empty / gap not suggested |
| Fallback scoring that overrides valid exact match | **Retire** |
| Fallback when **no** exact match | **KEEP** score/lookup among approved names OR leave unresolved — Formal Review: prefer leave unresolved if AI name invalid; optional soft alternatives only |

---

## Retirement consumer audit (summary)

Full mechanical inventory: explore agent session for this plan. Highlights:

| Mechanism | Active-path action | Compatibility |
|-----------|-------------------|---------------|
| Tag Rerank | Remove from candidate core + playground callable/UI | Keep historical `tagRerank*` reads |
| Suggestion Author | Remove | Keep historical field reads |
| suggestedNewTags | Stop emission; remove AI Review Suggested-new section | Historical readable optional |
| matchedTags | Always `[]` / delete param use | Optional type field OK |
| resolveAiCatalogTags | Remove from enrichment | Keep `normalizeForAliasMatch` for category name match |
| excluded-tag plumbing | Remove with tags | Settings cleanup |
| structured_evidence hard | Replace with Pass 2 path | Keep helper for trigger generation |
| subject_specificity hard | Replace with Pass 2 path | Same |
| dominant-intent conflict | Remove hard emit | Soft UI optional |
| resolveThemeCategory overrides | Retire semantic override of valid exact AI category | Keep exact ID/name map |
| Lean/synth helpers | Delete or quarantine | Update/delete `developmentAiEnrichmentProvider` usage |
| Schema `tags` | **Prefer remove**; normalizer must stop requiring array | Coordinated with v38 |

Legacy `design.tags`: retain; D8-A / AI tag reconcile paths removed so tags never enter Pass 1/2/category/WAA.

---

## visibleText wiring corrective

**Defect:** parse visible text on `smartProfileEnrichmentParse.visibleText`; automation uses `analysis.visibleText` → often `undefined`.

**Fix:** After Pass 1 normalize, set **one** canonical `analysis.visibleText` (and SP `visibleText`) from the same sanitized phrases. Delete transient parse only after copy. Never invent `centralSubject` from `subjects[0]` for evidence.

---

## Authority-order corrective (narrow)

1. Build AI SP + VCP + category validation  
2. Merge import presets + staff-preserved dimensions  
3. Compute automation decision / Pass 2 eligibility on **effective** profile  
4. Pass 2 patches **skip** any `staffEditedDimensionKeys` / import-preset-owned keys  
5. Persist  

Not WS6.

---

## Playground UI plan

Non-persisting. Inspectable sections (not raw-only JSON):

**Pass 1:** Visual Context (summary + detailed + structured); Title; Description; Category; Smart Profile; WAA; Objective blockers; Semantic blockers; Pass-2 eligibility; PASS 1 COST  

**STOP** → button **Run Semantic Review**  

**Pass 2:** Decision; Reason; Resolved/Unresolved; Patches; Original SP; Final SP preview; Final WAA; PASS 2 COST; COMBINED COST  

---

## Cost / telemetry

| Call | Fields |
|------|--------|
| Pass 1 | existing `promptTokens` / `completionTokens` / `estimatedCostUsd` + model/provider/promptVersion |
| Pass 2 | `semanticReview*` fields above |
| Combined | Pass1 + Pass2 only (no Tag Rerank) |
| Playground | Display all three |

**Do not lock portfolio $.** Implement DEV fixture suite measuring Pass1 (±VCP) and Pass2 tokens/cost/latency. Tag Rerank retirement is architectural (fixture ~$0.00006) — not a cost-savings justification.

---

## Test matrix (required)

| Fixture | Expect |
|---------|--------|
| Woman/girl semantic | Pass 2 APPROVE or APPROVE_WITH_PATCH; no synonym table |
| Unsupported subject | NEEDS_REVIEW / unresolved |
| Specificity supported vs unsupported | Pass 2 adjudicates correctly |
| Objective + semantic | Pass 2 does not run or cannot clear objective |
| Staff authority | Staff wins; no patch |
| Category patch attempt | Reject |
| Title/desc patch | Reject (ADR-FP-181) |
| One-pass limit | Still blocked → Needs Review; no 2nd call |
| Playground ≡ Processing cores | Identical |
| Cost split | Pass1 / Pass2 / Combined |
| Tags inert | No rerank/author/suggestedNew/matchedTags; legacy tags unread by AI |

Plus unit: eligibility, patch validation, category exact-trust, evidence not hard when Pass2 path, normalizer bump only if required.

---

## Implementation sequencing

1. Types + constants (VCP, Pass2, settings, prompt versions)  
2. Pass 1 prompt v38 + normalize (no tags; VCP required fields)  
3. visibleText canonical wiring  
4. Category validate-only path; retire overrides + dominant-intent hard  
5. Extract Pass 1 core; wire Processing + Playground  
6. Automation: semantic blockers as eligible; Pass 2 provider + core  
7. Authority merge before decision; patch apply + one revalidate  
8. Strip tag AI from candidate core + Settings/UI  
9. Playground Pass 2 UI + costs  
10. Contract tests + DEV cost canary  
11. DEV Functions (+ Studio) deploy allowlist — **owner auth**  
12. Signoff after canary  

---

## Deploy surface (expected)

**Functions (typical):** `enqueueAiEnrichment`, `reprocessReadyDesignWithAi`, `onCatalogReprocessJobWritten`, `updateAiEnrichmentSettings`, `testAiEnrichmentPlayground`, new/updated Pass2 playground callable; remove/disable `testAiEnrichmentTagRerank`.

**Studio:** Settings AI page; Playground; AI Review (Suggested Tags removal); design AI field mapper; cost display.

**Shared:** types, constants, automation decision, category dominant-intent, evidence.

**Rules/indexes:** Additive maps usually no rules change; verify `[NEEDS REPO CHECK]` at implement. No migration. No production.

---

## Rollback

- Feature-flag: `semanticReviewerEnabled=false`  
- Prompt: revert default template auto-upgrade gate to v37 if needed  
- Tag path: do not re-enable without new Plan  
- Keep VCP additive (harmless if unused)

---

## Risks

| Risk | Mitigation |
|------|------------|
| Pass 2 rubber-stamps hallucinations | Pixel-blind limitation documented; uncertainty → NR; objective gates remain |
| VCP token blow-up | Caps + canary measure |
| Category override removal regressions | Exact-match trust tests; gap still hard |
| Tag UI leftover confusion | Remove active controls; document legacy tags |

---

## Human checkpoints

- [ ] Owner proceed to Implement  
- [ ] DEV deploy allowlist  
- [ ] DEV canary / Playground manual  
- [ ] Production — not this phase  

---

## Documentation at implement

- [x] ADR-FP-182 recorded  
- [ ] DATA_MODEL / BACKEND / handoff 06–07 / TESTING  
- [ ] Update architecture investigation note “implemented”

---

## Open Questions

- [x] Owner decisions locked  
- [ ] Residual: none blocking Plan; cost numbers measured at canary  

---

## Approval

- Review: `docs/workflow/reviews/2026-09-05-two-pass-ai-enrichment-context-and-semantic-verification-implementation-review.md`
- Verdict: **approved**
- Implementation authorized: **YES** (await owner proceed before code)
