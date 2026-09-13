# Plan: Category Dominant-Intent Calibration (post-WS3)

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase (corrective; blocks WS4 Start) |
| Parent goal | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Trigger | `OWNER WS3 SHADOW SAMPLE: PASS WITH NOTES` |
| Related | `docs/workflow/reviews/2026-09-03-smart-catalog-intelligence-completion-ws3-owner-shadow-sample-checkpoint.md` |
| Related | `docs/workflow/reviews/2026-09-03-category-dominant-intent-calibration-review.md` |

---

## Goal

Correct demonstrated **category primary selection** failures so future Auto Approve and the pending Ready Catalog reprocess (WS4, 346 stale) choose categories by **strongest reusable commercial/design intent**, not the most literal depicted subject — without harming accepted v32/v6 title/description/visibleText/subject quality, and without enabling Autonomous or starting Ready reprocess in this corrective.

---

## Background

WS3 AI Review reprocess (`omLhRHLnpkyvhOc8yQp9`) completed 165/165 at `catalog-enrich-v32` / `smart-profile-normalizer-v6` in Shadow. Owner reviewed 15 Shadow samples: **12/15 acceptable** for future Auto Approve as generated; enrichment quality generally good.

Remaining issue is **category dominant-intent selection**:

| Sample | Observed | Owner expected primary | Notes |
|--------|----------|------------------------|-------|
| #1 F-caw-f Raven | Animals | Funny & Sarcastic | Raven depicted; commercial intent is F-CAW-F joke. Funny not even in alternatives. |
| #6 Fairytale castle / book | → Books & Reading after owner added category | Books & Reading | Positive: AI can adopt newly curated category. |
| #9 Just Hit It | Funny & Sarcastic | Cannabis & 420 | Owner added Cannabis & 420; humor may remain secondary. **Cache timing must be ruled out before treating as resolver defect.** |
| #12 Aries / zodiac | Pop Culture & Characters (WS3) | Astrology & Zodiac (live name; owner said “Zodiac”) | Category already existed — not a create/cache miss. |
| #13 Darth Vader / “I Am Their Father” | Pop Culture & Characters | Pop Culture & Characters | Positive dominant-intent example (franchise > Family). |

Owner contract (general, not per-design hardcodes):

- Humor/sarcasm overwhelmingly primary → **Funny & Sarcastic** over literal subject (e.g. Animals)
- Overwhelmingly cannabis/420 → **Cannabis & 420** over Funny & Sarcastic
- Obvious zodiac/astrology → **Astrology & Zodiac** over generic Pop Culture
- Franchise/character dominant with family wording → **Pop Culture & Characters** over Family (#13 already correct)

WS4 Ready reprocess must **not** Start until this calibration is implemented, tested, and owner-gated.

---

## Investigation findings (read-only; Plan inputs)

### 1) Taxonomy cache TTL

| Item | Value |
|------|--------|
| Constant | `AI_TAXONOMY_CACHE_TTL_MS` in `functions/src/ai/loadAiCatalogReferenceSnapshot.ts` |
| TTL | **15 minutes** (`15 * 60_000`) |
| Scope | **Process-local** per Cloud Run / Functions instance (not global fleet) |
| Documented intent | “Revision-keyed (RC5); TTL is secondary” |

### 2) Do category writes actively invalidate the AI taxonomy cache?

| Layer | Behavior |
|-------|----------|
| `onCategoryTaxonomySourceWritten` | Rebuilds taxonomy **materialization** (new Firestore revision) via coalesce |
| `clearAiCatalogReferenceSnapshotCache` / `clearAiEnrichmentRuntimeCache` | **Not** called from category/tag write triggers |
| Cache clear callers today | `updateAiEnrichmentSettings`, `updateCatalogWorkflowMode` (settings/mode paths) |
| Hit path within TTL | Returns in-memory snapshot **without** comparing live materialization revision |

**Conclusion:** Category creation does **not** guarantee immediate visibility to enrichment workers on warm instances. Stale category lists can persist up to **~15 minutes** (or longer across multiple warm instances until each expires/restarts). This is **not** an invented bypass — it is the current code path.

**#9 Cannabis miss:** **Plausible taxonomy-cache timing issue**, **not yet proven**. Books & Reading (#6) succeeding after create is consistent with a later reprocess hitting a refreshed instance/TTL. Plan requires a **controlled #9 reprocess after taxonomy is known-current** before classifying #9 as a pure calibration defect.

### 3) Why #1 preferred Animals over Funny & Sarcastic

Observed on design `7bVlWMFwxECdfHH8VNPB` after WS3:

- Resolved / suggested category: **Animals**
- Tag candidates included `funny`, `sarcastic`, `attitude`
- `categoryAlternatives` empty

Mechanism:

1. Lean prompt injects **approved category names only** (not Firestore category descriptions).
2. Model returned exact approved name **Animals**.
3. `resolveThemeCategory` **trusts exact match outright** and returns immediately — **no** token-overlap / priority-family scoring when exact match hits (`catalogThemeCategoryResolver.ts`).
4. Therefore funny/sarcastic tags never compete; Humor is not in `PRIORITY_FAMILIES` (only Family / Faith / Teacher).
5. Decision-layer `category_dominant_intent_conflict` (ADR-FP-145) only covers **fantasy/story/reading vs scenic Floral** — it does **not** reassign Animals→Funny and did not fire here.

Root cause class: **exact-match trust + weak humor-over-subject guidance/enforcement**, not missing category.

### 4) Why #12 missed existing Zodiac

Live approved name is **`Astrology & Zodiac`** (not a separate category literally named `Zodiac`). It is active and was available during WS3.

WS3 sample selected **Pop Culture & Characters**. That is an exact-match path once the model emits that name — resolver will not override to Astrology & Zodiac.

Root cause class: **model primary-category choice / insufficient zodiac vs pop-culture discrimination** under name-only prompt + exact-match trust. **Not** explained by new-category cache delay.

### 5) Why #13 correctly preferred Pop Culture over Family

Model selected **Pop Culture & Characters** for Darth Vader / Star Wars with “I AM THEIR FATHER” wording. Exact-match trust preserved the correct franchise-primary choice. Tag candidates included franchise signals (`starwars`, `darthvader`, …) plus `dad`. This is the desired dominant-intent outcome and a regression anchor.

### 6) Can one general dominant-intent rule fix these without hardcoding designs?

**Yes, in principle**, as layered general rules (not design IDs):

| Layer | Role |
|-------|------|
| Prompt | Stronger examples of commercial-intent priority (humor joke > depicted animal; cannabis theme > humor vehicle; zodiac sign > pop culture; franchise > family role words) + require `categoryAlternatives` when dual-intent |
| Resolver | Soften or second-pass exact-match when strong competing **priority families** exist (extend beyond Family/Faith/Teacher); score using title/description/visibleText/matchedTags **and** category name/description tokens |
| Decision blocker | Optionally expand `category_dominant_intent_conflict` families for safety — but blocker alone does **not** fix primary category; owner wants correct selection |

**Category description-only changes are insufficient** for the model path (descriptions not in lean prompt). Descriptions **do** help resolver fallback scoring when exact match does not short-circuit.

### 7) Prompt / resolver / metadata / version bumps

| Change | Required? | Notes |
|--------|-----------|-------|
| Prompt text change | **Likely yes** | Owner examples absent from current v32 category paragraph |
| Prompt version bump | **Yes if prompt text ships** | Expect **`catalog-enrich-v33`** (or next) + Settings previous-default auto-upgrade pattern |
| Resolver change | **Likely yes** | Exact-match short-circuit is the structural reason tags/signals cannot correct #1 |
| Category metadata/description | **Helpful, not sufficient alone** | Keep descriptions accurate for resolver; do not invent categories |
| Normalizer bump | **No** (default) | Category resolution is pre-normalizer; bump only if proven coupling |
| Schema bump | **No** | |
| matchedTags retirement / replacement | **No** in this corrective | Tags remain operational signals |

---

## Scope

### In Scope

1. Record owner PASS WITH NOTES and block WS4 Start until calibration gate passes.
2. **Cache honesty path for #9:** verify taxonomy revision/TTL behavior; after taxonomy known-current (wait TTL and/or confirm materialization revision on worker path — **no ad hoc bypass**), reprocess design `1Ws0T9fivryest6IUSbt` once and record Cannabis vs Funny outcome.
3. Implement general dominant-intent calibration (prompt ± resolver ± optional decision-family expansion) covering owner examples without per-design hardcodes.
4. Focused automated tests for #1 / #9 / #12 / #13 style fixtures.
5. Focused DEV canary reprocess of the four owner examples after deploy authorization (separate later step — **not** this Plan+Review stop).
6. ADR / TESTING / DECISIONS notes as needed.

### Out of Scope

- WS4 Ready Catalog Start / `REPROCESS READY CATALOG`
- Autonomous enablement / live Ready publication
- Tag retirement; matchedTags architecture replacement (unless a tiny signal use inside resolver scoring of **existing** tags)
- Schema change; normalizer bump (unless review forces)
- Production; commit/push in this stop
- Uncontrolled category creation (owner-curated only)
- Broad AI Review or Ready full reprocess beyond focused canaries after implementation approval

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/constants/aiEnrichment.constants.ts` (prompt default + previous-default chain + version constant wiring)
- `packages/shared/src/constants/smartProfile.constants.ts` / `catalogReprocess.constants.ts` (prompt version snapshot if bumped)
- `functions/src/ai/catalogThemeCategoryResolver.ts` (+ tests)
- Possibly `packages/shared/src/utils/catalogCategoryDominantIntent.ts` (+ tests) — safety net only
- `functions/src/ai/loadAiCatalogReferenceSnapshot.ts` (+ `aiTaxonomyCache.test.ts`) — **optional** true revision check on cache hit
- `docs/project/DECISIONS.md`, `docs/standards/TESTING.md` as needed

### Architecture Impact

- [x] Details: Preserve lean prompt (category **names** list). Strengthen dominant-intent selection at prompt and/or resolver. Do not reintroduce full category-description dump unless separately justified (cost/latency). Cache remains process-local; prefer revision-aware refresh over invented bypass.

### Security Impact

- [x] None material (taxonomy already staff-owned; no rules/auth change)

### Data Model Impact

- [x] None required (no schema). Optional owner-curated category description edits only.

### Backend Impact

- [x] Details: Enrichment category resolution behavior; optional taxonomy cache hit revision check. No Firestore Rules / indexes / Algolia settings.

### UI / UX Impact

- [x] Details: Studio AI Review category display improves for canaries; Settings prompt version label if bumped. Owner canary QA required.

### Migration Impact

- [x] None (no migration). Reprocess is operational canary only after implement/deploy authorization.

---

## Approach

1. **Gate A — #9 cache verification (read/ops, no product “fix” yet)**  
   Confirm Cannabis & 420 present in materialization; wait until process TTL cannot explain staleness (or implement revision-aware cache miss in same corrective if approved); reprocess `1Ws0T9fivryest6IUSbt` once; record primary category + alternatives.

2. **Gate B — Design general rules**  
   Encode owner contract as reusable priority families / prompt examples (humor, cannabis/420, astrology/zodiac, pop-franchise vs family). No design-ID branches.

3. **Implement (after Formal Review approval + owner implement auth)**  
   - Prompt bump if text changes.  
   - Resolver: exact-match soft second-pass when competing family score exceeds threshold.  
   - Optional: revision check on taxonomy cache hit so new categories appear without relying solely on 15m TTL.  
   - Tests for four golden fixtures + non-regression (#13 Family must not steal Star Wars).

4. **Canary**  
   Reprocess #1, #9, #12, #13 only; owner QA.

5. **Only then** allow separate authorization for WS4.

---

## Test Strategy

### Automated

| Check | Command / focus | Required |
|-------|-----------------|----------|
| Unit — resolver | `catalogThemeCategoryResolver.test.ts` fixtures for humor>animals, cannabis>funny, zodiac>pop, pop>family | yes |
| Unit — dominant intent (if touched) | `catalogCategoryDominantIntent` tests | yes if changed |
| Unit — taxonomy cache | revision change within TTL → miss (if cache fix ships) | yes if changed |
| Prompt parity / constants | version bump + previous-default upgrade tests | yes if prompt bumps |
| Typecheck / lint / existing AI suites | project scripts | yes |
| Broad Ready reprocess | — | **no** |

### Manual

- [x] Owner canary on four designs after DEV deploy of corrective
- [x] #9 post-cache-window single reprocess result recorded
- [ ] No WS4 / Autonomous in this corrective

### Focused test matrix (four owner examples)

| ID | Design | Must select primary | Must not | Also assert |
|----|--------|---------------------|----------|-------------|
| #1 | `7bVlWMFwxECdfHH8VNPB` F-CAW-F raven joke | Funny & Sarcastic | Animals as primary | Animals may appear in alternatives |
| #9 | `1Ws0T9fivryest6IUSbt` Just Hit It | Cannabis & 420 (when category visible) | Funny as primary when cannabis overwhelms | Funny may be alternative; cache-visible precondition |
| #12 | `7BjqFQIhkavo80sv5kCp` Aries traits | Astrology & Zodiac | Pop Culture as primary | — |
| #13 | `E2fVUzTL8Smx0gXaGqUZ` I Am Their Father / Vader | Pop Culture & Characters | Family as primary | Positive regression anchor |

---

## Human Checkpoints Anticipated

- [x] Business logic — owner dominant-intent contract (received)
- [x] Manual QA — post-implement canary on four designs
- [x] #9 cache verification result before blaming resolver alone
- [ ] DEV deploy of corrective (separate auth after implement)
- [ ] WS4 Start (explicit later phrase — **not** this phase)
- [ ] Production — none

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Softening exact-match over-corrects good model picks | High | Thresholded second-pass; keep #13 / Family-priority goldens |
| Prompt-only fix flaky | Med | Pair with deterministic resolver family scoring |
| Cache revision check increases materialization reads | Low | Compare revision meta only; load corpus on miss |
| Expanding dominant-intent blocker without reassignment → more Needs Review, wrong category remains | Med | Prefer resolver reassignment for primary; blocker as backstop |
| Scope creep into tag retirement | High | Explicit out of scope |
| WS4 with wrong categories at scale | High | Hard gate: no Ready Start until canary PASS |

---

## Rollback Plan

- Revert prompt to v32 previous-default recognition path
- Revert resolver / cache PR
- No data migration to roll back; re-canary if needed

---

## Documentation Updates Required

- [ ] DECISIONS.md (ADR for dominant-intent calibration / exact-match second-pass)
- [ ] TESTING.md (canary commands / fixtures)
- [ ] Owner sample checkpoint updated with PASS WITH NOTES
- [ ] Other: WS3 result cross-link

---

## Open Questions

- [ ] #9 after known-current taxonomy: does AI select Cannabis & 420? (must answer in implement/canary before WS4)
- [ ] Prefer prompt+resolver together vs resolver-only? **Recommendation: both** (prompt for model; resolver for deterministic safety)
- [ ] Should Funny appear as `categoryAlternatives` when humor is secondary (cannabis primary)? **Yes, when dual-intent**

---

## Answers to owner STOP questions (summary)

1. **#9 cache timing?** Plausible / not proven — verify with post-TTL (or revision-aware) reprocess.  
2. **TTL?** 15 minutes.  
3. **Category writes invalidate AI cache?** Materialization rebuild yes; **process-local AI cache clear no**; warm instances can stay stale until TTL/restart.  
4. **#1 Animals?** Exact-match trust on model “Animals”; funny tags ignored; no humor priority family.  
5. **#12 missed Zodiac?** Model chose Pop Culture; live name `Astrology & Zodiac` existed; not cache.  
6. **#13 Pop Culture?** Correct franchise-primary exact match — keep as golden.  
7. **One general rule?** Yes — layered dominant-intent families, not design hardcodes.  
8. **Prompt change?** Likely yes.  
9. **Resolver change?** Likely yes (exact-match second-pass).  
10. **Metadata alone sufficient?** No.  
11. **Prompt version bump?** Yes if prompt text changes (→ v33).  
12. **Normalizer bump?** No by default.  
13. **Regression risks?** Exact-match softening; Family/Faith/Teacher goldens; #13.  
14. **Test matrix?** Four owner examples above.  
15. **Corrective scope?** Prompt ± resolver ± optional revision-aware cache; focused canaries; **no WS4**.  
16. **Formal Review?** See companion review doc.  
17. **Next owner checkpoint?** Approve Formal Review / authorize implement; then #9 cache-verify + four-design canary QA — still no WS4.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-09-03-category-dominant-intent-calibration-review.md`
- Verdict: pending → filled by Formal Review
