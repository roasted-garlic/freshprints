# Plan: Smart Profile Subject Canonicalization and Derivative Suppression

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Author | Planning Agent |
| Status | approved_with_changes (Formal Review complete; Implement not started) |
| Workflow | managed-phase |
| Goal id | `smart-profile-subject-canonicalization-and-derivative-suppression` |
| Related | Formal Review `docs/workflow/reviews/2026-09-03-smart-profile-subject-canonicalization-and-derivative-suppression-review.md` |
| Parent ADR | ADR-FP-145 (Gate I subject anti-glue) — refine, do not replace |
| Baseline SHA | `b2183139f5affdd8329082eee50a19c79db21cff` (`development`, clean aside from local `.worktrees/`) |

---

## Goal

Improve Smart Profile **subject** quality so visually obvious entities produce clean, reusable **canonical subjects** (e.g. `fish`), while redundant phrase derivatives, OCR/text fragments, action phrases, and modifier-heavy duplicates (`bass fish`, `make fish`, `leaping fish`) do not become unnecessary separate subject facets.

Preserve genuinely useful visual concepts in **existing** Smart Profile dimensions. Do **not** introduce a curated subject allowlist. Do **not** change `smart-profile-v1` schema unless Formal Review proves impossibility (it does not).

After this goal closes, the owner's next selected managed goal should be **Smart Profiling completion**. Do **not** auto-start that goal from this plan.

---

## Sequencing (owner lock)

1. **This goal** — subject canonicalization + derivative suppression  
2. **Next** — finish / resume Smart Profiling completion  
3. Production promotion — separate, **NOT AUTHORIZED**

`show-queue-batch-allocation-performance` remains **DEFERRED**.

---

## Background

### Current baseline (repo-verified)

| Item | Value |
|------|--------|
| Smart Profile schema | `smart-profile-v1` |
| Prompt | `catalog-enrich-v30` (`CATALOG_ENRICHMENT_PROMPT_VERSION` / `CURRENT_CATALOG_ENRICH_PROMPT_VERSION`) |
| Normalizer | `smart-profile-normalizer-v4` (`SMART_PROFILE_NORMALIZER_VERSION`) |
| Reprocess snapshots | `catalog-enrich-v30` + `smart-profile-normalizer-v4` |
| Catalog mode | shadow |
| Autonomous | **OFF** |
| Production enrichment | untouched / **NOT AUTHORIZED** |
| Smart Profiling program | **PARKED** |

### Owner-reported failure

Fishing-design collection in Design Library Smart Filter **Subjects** facet shows noisy values such as:

- `fish`
- `bass fish`
- `make fish`
- `fisherman`
- `leaping fish`
- `people`

Operational harm: Studio/Portal Algolia **subjects** are customer-facing Smart Filter facets (`PORTAL_CATALOG_ALGOLIA_SMART_FACET_ATTRIBUTES`). Duplicate parent/child subject phrases split facet counts and clutter browse. `searchConcepts` / `objects` / `visibleText` are **not** faceted in Smart Filter UI.

### ADR-FP-145 context

Gate I anti-glue fixed **title/slogan glue promotion** (`problem skeleton`, `coochie alligator`, etc.) and preserved genuine specificity (`highland cow`). It did **not** solve:

- model-emitted descriptive/action compounds that look like “specificity”
- redundant `modifier + head` when head already exists
- verb/OCR fragments becoming subjects
- guaranteeing a reusable base subject while suppressing derivative phrases

---

## Scope

### In Scope

1. Root-cause-informed **prompt** guidance so subjects favor reusable canonical depicted entities and do not emit action/color/style/text-fragment derivatives.
2. Deterministic **normalizer** guardrails that suppress redundant modifier/entity subject phrases and text-fragment subjects without a curated allowlist.
3. Refined **specificity contract** (amend ADR-FP-145) distinguishing legitimate atomic compounds from redundant derivatives.
4. Automated fixtures: fish set F1–F7 + cross-domain suite.
5. Targeted DEV validation plan (canary / sample — not full Ready Catalog unless separately authorized).
6. Preserve import-preset and staff-edit precedence.
7. Version bumps only as required by architecture choice (see Approach).
8. Docs: DECISIONS amendment, handoff next-goal sequencing.

### Out of Scope

- Schema change / new dimensions (`canonicalSubjects`, `species`, etc.)
- Curated subject dictionary / fish→fish map
- Autonomous enablement; Needs Review lifecycle redesign
- Tag retirement / tag dictionary work
- Full Ready Catalog backfill (unless later owner-authorized)
- Production deploy
- Broad Smart Profiling completion workstreams
- Commit/push unless owner requests

---

## Affected Areas

### Exact files (repo-located)

| Path | Role |
|------|------|
| `packages/shared/src/constants/aiEnrichment.constants.ts` | `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE` (v30 subjects / anti-glue text) |
| `functions/src/ai/catalogTitleRules.ts` | `CATALOG_ENRICHMENT_PROMPT_VERSION` |
| `packages/shared/src/constants/smartProfile.constants.ts` | `SMART_PROFILE_NORMALIZER_VERSION`, `CURRENT_CATALOG_ENRICH_PROMPT_VERSION` |
| `packages/shared/src/constants/catalogReprocess.constants.ts` | reprocess prompt/normalizer snapshots |
| `packages/shared/src/utils/catalogAutomationEvidence.ts` | anti-glue promote / `sanitizeSyntheticSubjectCompounds` / specificity blocklist |
| `packages/shared/src/utils/smartProfileNormalization.ts` | `normalizeDesignSmartProfile` orchestration |
| `packages/shared/src/utils/smartCanonicalKey.ts` | singular/plural fold (keep) |
| `functions/src/ai/smartProfileBuilder.ts` | parse → normalize path |
| `functions/src/ai/simpleCatalogEnrichmentResponse.ts` | JSON parse of subjects |
| `functions/src/ai/smartProfileEnrichmentWrite.ts` | import-preset merge after AI |
| `functions/src/designs/designSmartProfileStaffUpdate.ts` | staff path uses dimension normalize **without** promote/anti-glue |
| Tests: `smartProfileQuality.contract.test.ts`, `catalogAutomationDecision.test.ts`, `smartProfileNormalization.test.ts`, `catalogReprocess.slice5.contract.test.ts`, related builder tests |
| Docs: `docs/project/DECISIONS.md` (ADR-FP-145 amendment), roadmap/handoff next-goal notes |

### Studio / Portal (read impact; no required UI rewrite)

| Path | Role |
|------|------|
| `apps/studio/.../DesignLibrarySmartFilterModal.tsx` | surfaces Algolia subject facet counts (owner evidence) |
| `apps/studio/.../studioAlgoliaSmartFilters.ts` | subjects among 8 faceted attrs |
| `packages/shared/src/catalog-search/portalCatalogAlgoliaRecord.ts` | subjects indexed + faceted; searchConcepts searchable but not Smart-faceted |

### Architecture Impact

- [x] Details: refine AI prompt + shared normalizer subject post-processing; no new layers; no schema change.

### Security Impact

- [x] None material — same enrichment trust boundary; no Rules/auth change.

### Data Model Impact

- [x] None for schema — `smart-profile-v1` dimensions unchanged. Profile **values** for subjects/searchConcepts/etc. quality improve on re-enrichment.

### Backend Impact

- [x] Details: Functions code that imports shared normalizer/prompt constants; DEV Functions deploy required for live path later (not this Plan+Review pass).

### UI / UX Impact

- [x] Details: no Studio/Portal code required for core fix; facet quality improves after re-enrichment of affected designs.

### Migration Impact

- [x] None immediate. Existing Ready profiles remain compatible until owner-authorized reprocess. No migration script.

---

## Root-cause audit (R1–R20 summary)

### Subject-generation path (exact)

```
Gemini (catalog-enrich-v30 JSON)
  → simpleCatalogEnrichmentResponse parse (subjects[])
  → smartProfileBuilder.buildDesignSmartProfile
  → normalizeDesignSmartProfile
       → promoteSubjectsWithTitleSpecificity
            → findTitleGroundedSpecificSubjectPhrases (may ADD “modifier + head”)
            → sanitizeSyntheticSubjectCompounds (drops title/slogan glue without independent support)
       → normalizeSmartProfileStringList (trim, vocab exact-match, plural-key dedupe, caps)
  → smartProfileEnrichmentWrite (merge import presets; preserve staff-edited dims on reprocess)
  → Algolia sync maps smartProfile.subjects → faceted `subjects`
```

### Failure class vs Gate I anti-glue

| Pattern | Likely origin | v4 behavior |
|---------|---------------|-------------|
| `bass fish` | **R1 YES** — model emits as “specific identity” under highland-style prompt; may also be **promoted** if description/title has contiguous `bass`+`fish` and subjects only had `fish` | Kept when description/centralSubject/visibleText supports phrase (**R5/R6/R11/R12**) |
| `make fish` | **R2/R13** — model lifts verb+noun from visible slogan (“I make fish come…”) into subjects; description often reprints wording → **independent support = true** | Anti-glue slogan-modifier drop only if modifier in visibleText **and** phrase **not** in description/centralSubject — description contamination defeats it (**R4/R8 no feedback from searchConcepts**) |
| `leaping fish` | **R3** — pose/action compound; prompt says avoid pose glue but model still emits; `leaping` **not** in `SPECIFICITY_MODIFIER_BLOCKLIST` | Kept / possibly promoted (**R6/R10** — no action/adjective strip today) |

Additional answers:

| # | Finding |
|---|---------|
| R7 | Promote/sanitize runs **before** string-list dedupe |
| R8 | searchConcepts do **not** feed subjects |
| R9 | Singular/plural fold exists via `smartCanonicalKey` |
| R14–R18 | Prompt-only drifts; normalizer-only risks legitimate compounds; **best = prompt + deterministic normalizer** |
| R19 | Yes — subjects are Smart Filter facets; duplicates especially harmful |
| R20 | Portal/Studio consume `subjects` as facets + ranked search; searchConcepts searchable but not Smart-faceted |

---

## Canonical subject semantic contract (proposed)

**Question subjects answer:** “What recognizable person, animal, character, or main entity is **visibly depicted**?”

### Principles

1. Every dominant depicted entity gets a **reusable canonical base subject** (usually a short noun / named identity).
2. Modifiers for color, style, mood, action, pose, or setting must **not** create a second subject phrase when the base entity is already present (or extractable).
3. Visible-text fragments are **not** subjects unless they independently name a depicted entity.
4. Base coverage > piles of descriptive subject phrases.
5. Genuine identity specificity may be preserved **without** redundant `type + head` facet clutter.
6. Secondary depicted entities remain separate subjects when genuinely visible.
7. Richness belongs across dimensions (objects, places, themes, interests, styles, colors, searchConcepts, visibleText).
8. No curated subject allowlist.
9. Deterministic rules must be conservative on legitimate atomic compounds.

### Classification (A–G)

| Class | Examples | `subjects`? | Elsewhere |
|-------|----------|-------------|-----------|
| A Canonical entity | `fish`, `dog`, `nurse` | **Yes** | — |
| B Entity specificity | `bass`, `highland cow`, `largemouth bass` | See specificity contract | searchConcepts for shopper phrasing |
| C Visual attribute | blue, retro, floral | **No** as `blue fish` | colors / styles |
| D Action / pose | leaping, running | **No** as `leaping fish` | themes / searchConcepts if useful |
| E Text fragment | make fish, hold my rod | **No** | visibleText; themes/interests/searchConcepts if semantic |
| F Activity / interest | fishing | **No** (unless depicted entity) | interests / themes |
| G Setting / secondary | ocean, waves, boat | **No** as subject unless entity | places / objects |

---

## Specificity contract (refined; Formal Review lock)

**Problem:** ADR-FP-145 “preserve genuine specificity” currently **pushes multi-word identities into subjects** and can **promote** `modifier + head`. That is correct for `highland cow`, harmful for `bass fish` / `leaping fish`.

**Proposed lock (no schema change):**

1. **Canonical base required:** if a specific animal/person/character is depicted, `subjects` must include the reusable base (`fish`, `cow`, `dog`, …) when that base is a natural catalog facet.
2. **Legitimate atomic compounds stay in subjects** when they are established named identities (examples of *behavior*, not an allowlist): `highland cow`, `sea turtle`, `hot air balloon`, `police officer`, `fire truck`, `Christmas tree`. Prefer also retaining the useful base head when it is a separate reusable facet (`cow` beside `highland cow` — existing behavior).
3. **Redundant descriptive compounds are suppressed:** `bass fish`, `leaping fish`, `blue fish`, `vintage fish`, `funny nurse`, `smiling pumpkin` → keep base; do not keep the descriptive phrase as a subject.
4. **Species / type placement:**  
   - Prefer **atomic** type token in `searchConcepts` (and optionally as its own subject token **without** redundant head): e.g. `subjects: ["fish"]`, `searchConcepts: ["bass", "largemouth bass"]`.  
   - Do **not** keep `bass fish` as a subject facet.  
   - Do **not** require a new dimension.
5. **Highland-style compounds** remain subjects (not demoted solely to searchConcepts) — this is the existing ADR-FP-145 positive case.
6. Distinguishing (2) vs (3) is primarily: **prompt semantic judgment** + normalizer classes (action/color/style/mood/verb/text vs identity-like modifier with independent non-slogan support). Not a growing manual synonym table.

---

## Text / OCR contamination contract

- `readableTextLines` / `visibleText` own the wording.
- Subjects must not be built by gluing slogan verbs/fragments onto depicted entities (`make fish`).
- Description reprinting of slogan text must not be treated as proof that a slogan fragment is a depicted-entity subject (normalizer must not treat description-only slogan echoes as identity support for verb+entity compounds).

---

## Compound-noun safety strategy

**Do not** naïvely strip first/last word of every multi-word subject.

| Strategy | Role |
|----------|------|
| Prompt | Emit atomic named compounds as subjects; emit base entities; put descriptive/action phrasing elsewhere |
| Normalizer derivative collapse | Suppress when modifier classifies as action/pose/color/style/mood/common-verb/text-fragment **and** a safe base head can be retained |
| Normalizer preserve | Keep two-token subjects when modifier is identity-like (existing `isAllowedSpecificityModifier` spirit) **and** independent identity support is not slogan-only |
| Staff / presets | Do not run derivative collapse on staff-authored or preset-owned subject values |

If a case is ambiguous, prefer: keep atomic compound + ensure base head exists (safer than destroying `highland cow`).

---

## Architecture choice

### Options evaluated

| Option | Verdict |
|--------|---------|
| A Prompt-only (v31) | Insufficient — model drift reintroduces junk facets |
| B Normalizer-only (v5) | Risky — over-collapse of legitimate compounds; prompt still encourages “must include full phrase” |
| C Prompt + normalizer | **Recommended core** |
| D Decision/quality gate only | Wrong default — creates more Needs Review; owner wants auto-correct |
| E Combination | **Selected:** C + light decision hygiene only if needed (no new hard gap for redundant subjects) |

### Chosen architecture: **Option E = prompt + normalizer; no new hard quality gate for derivatives**

1. Bump prompt → **`catalog-enrich-v31`**
2. Bump normalizer → **`smart-profile-normalizer-v5`**
3. Update reprocess snapshot constants to match
4. Quality: suppress/normalize automatically; do **not** add `structured_evidence_gap` / Needs Review reasons solely for redundant modifier subjects
5. Staff edits: `normalizeSmartProfileDimensions` only (current) — **do not** apply AI derivative collapse to staff/preset values
6. Import presets remain authoritative merge-after-AI

---

## Approach (implementation outline — not authorized in this pass)

1. Amend prompt subjects section: canonical base first; ban action/color/style/text-fragment subject phrases; clarify species → searchConcepts / atomic type; keep highland-style genuine compounds; reinforce “depicted only” for people/fisherman.
2. Extend shared evidence/normalizer:
   - derivative suppression pass after promote/sanitize (or integrated sanitize)
   - expand action/pose/verb/text-fragment handling distinct from Gate I slogan anti-glue
   - ensure base head present when collapsing `modifier + head`
   - optional safe relocation of stripped useful type tokens into searchConcepts **only when already present as the modifier and not inventing new concepts**
3. Version constants + reprocess snapshots + contract tests.
4. Fixture matrix F1–F7 + cross-domain.
5. ADR-FP-145 amendment in DECISIONS.md.
6. DEV deploy + targeted canary only when owner authorizes Implement/Test — not this pass.

---

## Owner fish examples — expected output

| Fixture | Expected subjects (min) | Must not appear as subjects | Other dims |
|---------|-------------------------|-----------------------------|------------|
| F1 generic fish | `fish` | — | — |
| F2 leaping fish | `fish` | `leaping fish` | action may be theme/searchConcept if useful |
| F3 bass / species | `fish` | `bass fish` | `bass` / `largemouth bass` in searchConcepts (optional atomic `bass` subject OK) |
| F4 “I make fish come” | `fish` if fish depicted | `make fish` | phrase in visibleText |
| F5 fish + waves/ocean | `fish` | — | objects: `waves` (if prop); places: `ocean` (if place); interests/themes: fishing as supported |
| F6 visible fisherman | may include `fisherman` and/or `people` **if depicted** | — | — |
| F7 fishing text/activity only | no invented `fisherman` | — | interests/themes: fishing |

---

## Test Strategy

### Automated

| Check | Command / focus | Required |
|-------|-----------------|----------|
| Unit — evidence/normalizer | `catalogAutomationDecision.test.ts`, new derivative-collapse cases | yes |
| Unit — normalization | `smartProfileNormalization.test.ts` | yes |
| Contract — prompt/version | `smartProfileQuality.contract.test.ts` | yes |
| Contract — reprocess snapshots | `catalogReprocess.slice5.contract.test.ts` (or current equivalent) | yes |
| Builder path | `smartProfileBuilder.test.ts` | yes |
| Staff/preset precedence | existing staff/import preset tests + assert AI collapse does not rewrite staff subjects | yes |
| Typecheck / functions build | project scripts for shared + functions | yes |
| Rules / Storage / indexes | N/A | no |

### Cross-domain fixture suite (plan)

Animals: dog / running dog; cow / floral cow; highland cow (preserve); chicken / funny chicken  
People: nurse / tired nurse; teacher / funny teacher  
Seasonal: pumpkin / smiling pumpkin; ghost / pink ghost  
Floral: flower / watercolor flower; sunflower  
Objects: truck / vintage truck; coffee cup / pink coffee cup  
Characters: skeleton / dancing skeleton  

### Manual / DEV validation (after implement; owner-gated)

- Targeted fishing + cross-domain canary on DEV (AI Review sample and/or small Ready subset) — **not** full Ready Catalog by default.
- Confirm Design Library Subjects facet converges toward reusable bases.

### Human Checkpoints Anticipated

- [ ] Owner authorize Implement after this Review
- [ ] Owner authorize DEV Functions deploy when ready
- [ ] Owner authorize any Ready Catalog / AI Review reprocess canary
- [ ] Production — **not** in this goal

---

## Deployment inventory (future implement)

| Item | Impact |
|------|--------|
| Functions (`enqueueAiEnrichment` path + shared package) | **YES** when shipping versions |
| Firestore Rules | **NO** |
| Storage Rules | **NO** |
| Indexes | **NO** |
| Algolia schema | **NO** (same fields; cleaner values after re-enrich) |
| Studio / Portal code | **NO** required |
| Migration | **NO** |
| Autonomous | remains **OFF** |

### Reprocess guidance

| Target | Required for this goal? |
|--------|-------------------------|
| AI Review Queue full reprocess | **NO** by default; optional targeted sample |
| Ready Catalog full reprocess | **NO** unless separately justified + owner-authorized |
| Targeted DEV canary (fish + cross-domain) | **YES** recommended during Test/Signoff |

---

## Rollback

1. Revert prompt constant to v30 and normalizer to v4 (or redeploy prior Functions revision).
2. Existing profiles remain readable under `smart-profile-v1`.
3. No Rules/index rollback needed.

---

## Documentation Updates Required

- [x] DECISIONS.md — ADR-FP-145 amendment (canonicalization / derivative suppression / specificity refinement)
- [ ] ROADMAP / handoff — next goal = Smart Profiling completion after closeout
- [ ] Other architecture docs only if behavior summary warrants a short note

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Over-collapse `highland cow` / `sea turtle` | High | Preserve identity-like compounds; fixtures for Gate I positive cases |
| Prompt-only drift | Medium | Deterministic normalizer-v5 guard |
| Species usefulness lost | Medium | Explicit searchConcepts placement; optional atomic type subject |
| Staff/preset rewrite | High | AI collapse only on AI path; staff uses dimension normalize only |
| Scope creep into Smart Profiling completion | High | Hard out-of-scope; sequencing recorded |

---

## Open Questions

- [x] Schema change needed? **No** — Formal Review confirms existing dimensions suffice.
- [ ] Soft preference only: whether atomic species tokens (`bass`) may also appear in `subjects` vs searchConcepts-only — Formal Review default: **searchConcepts preferred; optional atomic subject token allowed; redundant `bass fish` forbidden**.

No blocking `[NEEDS OWNER DECISION — SMART PROFILE SCHEMA CHANGE]`.

---

## Acceptance criteria (future implementation)

AC1–AC18 as specified by owner prompt (canonical fish coverage; no redundant leaping/make/bass-fish subjects; secondary dims; fisherman handling; compounds; no allowlist; staff/presets; schema unchanged; Autonomous OFF; lifecycle unchanged; Ready compatible; no Portal/Studio production-state changes).

---

## Approval

- Review doc: `docs/workflow/reviews/2026-09-03-smart-profile-subject-canonicalization-and-derivative-suppression-review.md`
- Verdict: **approved_with_changes**
- Status: ready for owner-authorized Implement (not started)
