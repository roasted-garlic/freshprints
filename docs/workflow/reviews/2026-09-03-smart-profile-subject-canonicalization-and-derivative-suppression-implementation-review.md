# Implementation Review: Smart Profile Subject Canonicalization and Derivative Suppression

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-03-smart-profile-subject-canonicalization-and-derivative-suppression-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-03-smart-profile-subject-canonicalization-and-derivative-suppression-review.md` |
| Baseline SHA | `b2183139f5affdd8329082eee50a19c79db21cff` |
| Verdict | **approved_with_notes** |

---

## Summary

Prompt **catalog-enrich-v31** and normalizer **smart-profile-normalizer-v5** are implemented on the AI path only. Grammatical/structural collapse removes redundant action/style/color/verb/type-class subject phrases while preserving bound atomic compounds and staff/preset values. Automated tests (F1–F7, cross-domain, Gate I) and Functions `tsc` passed. No deploy, reprocess, Autonomous, tag retirement, or production.

**Note:** live catalog facet quality still requires a later owner-authorized DEV Functions deploy + targeted canary. Bound-compound first-tokens are a small grammatical class (not a subject synonym table).

---

## IR answers

### IR1. Exact prompt changes

`packages/shared/src/constants/aiEnrichment.constants.ts` `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE` subjects paragraph now requires canonical base nouns, forbids action/color/style/OCR derivatives, keeps atomic compounds, places type specificity in searchConcepts, and keeps Gate I anti-glue language.

Versions: `CATALOG_ENRICHMENT_PROMPT_VERSION` / `CURRENT_CATALOG_ENRICH_PROMPT_VERSION` / reprocess snapshot → **catalog-enrich-v31**. Dev twin → **catalog-enrich-dev-v31**.

### IR2. Exact normalizer changes

- New `packages/shared/src/utils/smartProfileSubjectCanonicalization.ts`
- `normalizeDesignSmartProfile` runs collapse **before** Gate I promote/sanitize, then string-list normalize
- Promote only bound identity modifiers (`isPromotableSpecificityModifier`)
- `SMART_PROFILE_NORMALIZER_VERSION` / reprocess snapshot → **smart-profile-normalizer-v5**
- Staff path `normalizeSmartProfileDimensions` unchanged (no collapse)

### IR3. Exact canonicalization algorithm

For each AI subject phrase:

1. 1-token → keep
2. 3+ tokens → if first token is derivative, strip and recurse; else keep phrase and ensure last token
3. 2-token `modifier + head`:
   - character-merge (donald goofy beside Donald Duck + Goofy) → pass through for sanitize
   - contiguous visible-text + verb/derivative → keep head only
   - derivative (action/style/color/mood/glue/verb/-ing) → keep head
   - bound attributive (highland, sea, fire, police, ice, christmas, hot, …) → keep phrase + head
   - standalone type (bass, schnauzer) → keep head + atomic type; relocate type into searchConcepts if not already present
   - otherwise keep phrase

No per-phrase mapping table (`bass fish → fish`).

### IR4. Base entity coverage

Collapse always retains the head noun for derivative/type phrases. Prompt requires emitting the canonical base. Fixtures assert `fish` / `dog` / `cow` / etc.

### IR5. Action derivatives

Class `derivative` includes leaping/running/dancing/smiling/-ing participles. `leaping fish` → `fish`. Promote will not add them back (not bound).

### IR6. Style/color modifiers

Color set + style/mood set (vintage, watercolor, floral, pink, tired, funny, …). `pink ghost` → `ghost`; `vintage truck` → `truck`; `watercolor flowers` → `flower` after plural fold.

### IR7. Text/OCR fragments

Light verbs (`make`, `hold`, …) are derivative. Slogan echo in description does not keep `make fish` (F4). Visible-text contiguous verb+entity also collapses to head.

### IR8. Legitimate compounds

Bound first-token class + 3+ word keep path. Fixtures: highland cow, sea turtle, fire truck, police officer, hot air balloon, Christmas tree, ice cream. Uncertain compounds default to keep + base.

### IR9. Species specificity

`bass fish` → subjects `fish` + atomic `bass`; `bass` copied to searchConcepts if not already there. Does not invent `largemouth bass`.

### IR10–IR16. Fish fixtures (automated)

| ID | Result |
|----|--------|
| F1 | subjects include `fish` **PASS** |
| F2 | `fish`; no `leaping fish` **PASS** |
| F3 | `fish`; no `bass fish`; `bass` in subjects + searchConcepts **PASS** |
| F4 | `fish`; no `make fish`; visibleText keeps slogan **PASS** |
| F5 | fish + objects waves + places ocean + interests/themes fishing **PASS** |
| F6 | fish + fisherman retained **PASS** |
| F7 | no invented fisherman/people **PASS** |

### IR17. Cross-domain

running dog, floral cow, tired nurse, pink ghost, smiling pumpkin, vintage truck, watercolor flower, dancing skeleton → canonical heads, no redundant phrases **PASS**

### IR18. Singular/plural

`nurses`/`nurse` still fold via `smartCanonicalKey` after collapse **PASS**

### IR19. Staff-edit precedence

`normalizeSmartProfileDimensions({ subjects: ["leaping fish"] })` keeps `leaping fish`. Ready-backfill staff preservation tests still pass.

### IR20. Import-preset precedence

After AI collapse to `fish`, merge prepends `Dolly Parton` and keeps it first **PASS**. Existing `mergeReadyBackfillSmartProfile` Dolly Parton test **PASS**.

### IR21. Prompt version

**catalog-enrich-v31**

### IR22. Normalizer version

**smart-profile-normalizer-v5**

### IR23. Provenance/version propagation

Builder stamps prompt from suggestions; `normalizeDesignSmartProfile` stamps `normalizerVersion`. Reprocess snapshots match. Quality contract asserts `/normalizer-v5/`. Pipeline status “current” uses live constants.

### IR24. Quality-gate change

**NO**

### IR25. Smart Profile schema change

**NO** (`smart-profile-v1`)

### IR26. Algolia schema change

**NO**

### IR27. Firestore Rules

**NO**

### IR28. Storage Rules

**NO**

### IR29. Indexes

**NO**

### IR30. Migration

**NO**

### IR31. Studio runtime

**NO** (displays live version constants after Functions/shared deploy)

### IR32. Portal runtime

**NO**

### IR33. Functions build

`npm --prefix functions run build` — **exit 0**

### IR34. Focused tests

See commands below — **PASS** (181 + 52 overlapping Gate I/reprocess)

### IR35. Regression tests

Gate I anti-glue, highland promote, donald goofy sanitize, shadow decision, slice 5/6 contracts — **PASS**

### IR36. Lint/typecheck

ESLint on touched TS files — **exit 0**. Functions `tsc` via build — **exit 0**. Portal/Studio typecheck not required (no app runtime source).

### IR37. ADR-FP-145 amendment

**YES** — amendment recorded in `docs/project/DECISIONS.md`

### IR38. DEV Functions deployment inventory (DO NOT EXECUTE)

Live enrichment uses `runAiEnrichmentPipeline` + shared prompt/normalizer:

| Export | Why |
|--------|-----|
| `enqueueAiEnrichment` | Live import/AI Review enrichment |
| `onCatalogReprocessJobWritten` | Worker runs pipeline (queue + ready_backfill) |
| `startCatalogReprocessJob` | Stamps prompt/normalizer snapshots on job |
| `previewCatalogReprocessJob` | Preview/eligibility uses snapshot constants |

Optional (playground bundle includes DEFAULT prompt): `testAiEnrichmentPlayground` — not required for catalog path.

Suggested later command (not run):

```bash
firebase deploy --project fresh-prints-dev --only functions:enqueueAiEnrichment,functions:onCatalogReprocessJobWritten,functions:startCatalogReprocessJob,functions:previewCatalogReprocessJob
```

### IR39. Targeted DEV canary (prep only)

After deploy: 5–10 fishing designs + 5–10 cross-domain (highland cow, fire truck, nurse, ghost, truck). Confirm v31/v5 provenance, `fish` present, no `bass fish`/`leaping fish`/`make fish`, waves/ocean/fishing retained, compounds survive, Needs Review/shadow unchanged. Do not full-queue or full Ready backfill.

### IR40. AI Review full reprocess

**NO**

### IR41. Ready Catalog full reprocess

**NO**

### IR42. Autonomous remains OFF

**YES**

### IR43. Tag retirement performed

**NO**

### IR44. Next queued goal

Smart Profiling completion / unattended catalog enrichment completion (do not auto-start)

### IR45. `[NEEDS OWNER DECISION]`

**None**

---

## Formal Review required-changes check

| # | Status |
|---|--------|
| Description-slogan echo cannot validate verb+entity | **met** (F4) |
| Gate I + atomic compound fixtures | **met** |
| Do not invent searchConcepts | **met** (relocate existing modifier only) |
| Staff/preset not collapsed | **met** |
| No Smart Profiling completion / Autonomous / tags / full backfill / production | **met** |

---

## Test commands (this session)

Focused:

```
npx tsx --test packages/shared/src/utils/smartProfileSubjectCanonicalization.test.ts packages/shared/src/utils/catalogAutomationDecision.test.ts packages/shared/src/utils/smartProfileNormalization.test.ts packages/shared/src/utils/smartProfileStaffEdit.test.ts packages/shared/src/utils/smartProfileImportPresets.test.ts packages/shared/src/constants/catalogReprocess.constants.test.ts functions/src/ai/smartProfileQuality.contract.test.ts functions/src/ai/catalogTitleRules.test.ts functions/src/ai/smartProfileBuilder.test.ts functions/src/ai/smartProfileEnrichmentWrite.test.ts functions/src/catalogReprocess/catalogReprocess.slice5.contract.test.ts functions/src/ai/promptParity.test.ts
```

**181/181 PASS**, exit 0

Regression:

```
npx tsx --test functions/src/ai/automationDecisionShadow.test.ts functions/src/ai/aiEnrichmentObserve.contract.test.ts functions/src/catalogReprocess/catalogReprocess.slice6.contract.test.ts packages/shared/src/utils/catalogAutomationDecision.test.ts
```

**52/52 PASS**, exit 0

Functions build: `npm --prefix functions run build` — exit 0

Lint: eslint on touched TS files — exit 0

---

## Verdict rationale

Implementation matches approved_with_changes architecture. Tests prove owner fish cases and compound safety. Remaining work is owner-gated DEV deploy + canary, not code defects → **approved_with_notes**.

## Next step

**STOP.** Await owner authorization for DEV Functions deploy. No signoff, commit, reprocess, or Smart Profiling completion.
