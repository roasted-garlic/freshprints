# Formal Review: Category Dominant-Intent Calibration (post-WS3)

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-03-category-dominant-intent-calibration-plan.md` |
| Parent | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Trigger | `OWNER WS3 SHADOW SAMPLE: PASS WITH NOTES` |
| Verdict | **approved_with_changes** |

---

## Summary

The plan correctly blocks WS4, protects v32/v6 quality surfaces, and targets the real failure mode: **primary category dominant-intent**, not general enrichment quality. Repo inspection independently confirms a **15-minute process-local taxonomy cache** that is **not** actively cleared on category writes, exact-match short-circuit in `resolveThemeCategory`, and a narrow decision-layer dominant-intent blocker that cannot fix #1/#12 selection. Formal Review **approves with required changes** before implementation: prove or refute #9 as cache timing with a controlled reprocess; implement **general** rules only; pair prompt + resolver if either ships; do not treat category-description edits as sufficient.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Corrective only; WS4/Autonomous/tags/production out |
| Architecture alignment | pass | Lean prompt + server resolver retained |
| Security impact addressed | pass | No auth/rules exposure |
| Data model impact addressed | pass | No schema/migration |
| Backend impact addressed | pass | Enrichment + optional cache revision check |
| Test strategy adequate | pass | Four owner goldens + cache/resolver tests |
| Human checkpoints identified | pass | #9 verify; canary QA; no WS4 |
| Roadmap alignment | pass | Blocks Ready reprocess until category safe |
| Documentation plan | pass | ADR + TESTING |
| No silent scope expansion | pass | Explicit outs |

---

## Architecture Review

**Findings:**

- Exact-match trust in `resolveThemeCategory` is intentional (ADR lean-prompt path) but is the structural reason #1 cannot be corrected by `funny`/`sarcastic` tags once the model emits `Animals`.
- Decision-layer `category_dominant_intent_conflict` (fantasy vs floral only) is a **Needs Review backstop**, not a category reassignment engine — insufficient alone for owner contract.
- Lean prompt already states dominant buyer intent but lacks the owner’s concrete priority examples (humor>subject, cannabis>humor, zodiac>pop).
- Live zodiac category name is **`Astrology & Zodiac`** — plan must use the real approved name in fixtures/tests.
- Taxonomy: materialization rebuilds on category write; AI process cache does not clear — plan’s cache analysis is accurate.

**Required changes:**

- [x] Fixtures/docs must use **`Astrology & Zodiac`**, not a fictional bare `Zodiac` category id/name.
- [x] Any exact-match softening must be **thresholded family competition**, not per-design or per-title hardcodes.
- [x] Do not reintroduce full `{{approved_categories}}` description dump unless separately cost-reviewed (out of default scope).

---

## Security Review

**Findings:**

- No secrets, rules, or public surface changes proposed.

**Required changes:**

- [ ] None

**Human approval needed before production:**

- [x] Production remains unauthorized for this entire parent goal until a later explicit phase.

---

## Data Model Review

**Findings:**

- No schema change. Owner-curated categories (Books & Reading, Cannabis & 420) already exist in DEV.

**Required changes:**

- [ ] None

---

## Backend Review

**Findings:**

- Cache TTL **15m** confirmed (`AI_TAXONOMY_CACHE_TTL_MS`).
- Category writes → materialization revision bump; **no** `clearAiCatalogReferenceSnapshotCache` on that path.
- Optional revision-aware cache hit is aligned with existing “revision-keyed” comments and is preferable to inventing a one-off bypass.

**Required changes:**

- [x] **Gate A mandatory in implement sequence:** controlled reprocess of #9 (`1Ws0T9fivryest6IUSbt`) only after taxonomy is known-current (TTL elapsed on warm workers **or** revision-aware cache fix already deployed). Record outcome before declaring cannabis a pure calibration miss.
- [x] If cache revision-check ships, add unit coverage: same TTL window, new revision → miss/reload.
- [x] Do not claim fleet-wide instant invalidation from a process-local clear alone.

---

## Testing Review

**Findings:**

- Four-example matrix is appropriate and includes positive #13 regression.
- Existing resolver tests cover Family/Faith/Teacher priority and exact-match trust — new tests must not discard those goldens.

**Required changes:**

- [x] Add explicit non-regression: motherhood+funny still resolves Family when appropriate (existing golden).
- [x] Add #1-style: joke-primary with animal depiction → Funny & Sarcastic primary; Animals allowed as alternative.
- [x] Add #12-style: Aries/zodiac signals → Astrology & Zodiac, not Pop Culture.
- [x] Add #9-style: cannabis-primary humor → Cannabis & 420 when that category is in `approvedCategories`.
- [x] Add #13-style: Star Wars + dad wording → Pop Culture, not Family.

---

## Documentation Review

**Findings:**

- Plan correctly anticipates ADR + TESTING updates.
- Owner sample checkpoint must record PASS WITH NOTES.

**Required changes:**

- [x] Update owner sample checkpoint with PASS WITH NOTES and findings summary.
- [x] Cross-link from WS3 result that WS4 remains blocked pending this corrective.

---

## Required Changes (approved_with_changes)

1. **#9 Gate A** before closing “cannabis calibration defect” — controlled reprocess with taxonomy known-current; document cache vs calibration attribution.
2. Use real category name **Astrology & Zodiac** everywhere in implement/tests.
3. Ship **general** dominant-intent rules only (no design-ID branches).
4. If changing selection behavior: prefer **prompt + resolver** together; metadata-only is rejected as sufficient.
5. Prompt text change ⇒ **prompt version bump** (v33) + previous-default auto-upgrade pattern; **no** normalizer/schema bump unless a proven coupling appears in review of the implement diff.
6. Preserve Family/Faith/Teacher resolver goldens and #13 pop-culture golden.
7. **No WS4 Start**, Autonomous, tag retirement, deploy, commit/push, or production in the Plan+Review stop; implement/deploy/canary require separate owner authorization after this review.

---

## Blockers

None that prevent implementation **planning** — Gate A is an implement-sequence requirement, not a plan block.

---

## Verdict Rationale

**approved_with_changes** — Correct problem framing, accurate cache/resolver findings, safe outs for WS4/tags/Autonomous. Required changes ensure #9 is not mis-attributed, fixtures match live taxonomy names, and exact-match softening stays general and regression-tested.

---

## Answers mirrored (owner list)

| # | Answer |
|---|--------|
| 1 | #9: **possible cache timing** — verify before final attribution |
| 2 | TTL: **15 minutes** |
| 3 | Category writes: materialization yes; **AI process cache clear: no** |
| 4 | #1: exact-match Animals; funny tags unused; no humor family |
| 5 | #12: model→Pop Culture; Astrology & Zodiac existed |
| 6 | #13: correct franchise-primary exact match |
| 7 | General dominant-intent rules: **yes** |
| 8 | Prompt change: **likely yes** |
| 9 | Resolver change: **likely yes** |
| 10 | Metadata alone: **no** |
| 11 | Prompt bump: **yes if text changes** |
| 12 | Normalizer bump: **no by default** |
| 13 | Risks: exact-match softening / Family & #13 regressions |
| 14 | Test matrix: four owner examples (+ existing priority goldens) |
| 15 | Scope: prompt ± resolver ± optional revision-aware cache; canaries; no WS4 |
| 16 | Verdict: **approved_with_changes** |
| 17 | Next owner checkpoint: below |

---

## Next Step / Owner checkpoint

**Do not implement until owner authorizes implementation of this approved_with_changes plan.**

Exact next owner checkpoint phrase (recommended):

`OWNER CATEGORY DOMINANT-INTENT CALIBRATION: AUTHORIZE IMPLEMENT`

After implement + DEV deploy (separate auth) + Gate A #9 result + four-design canary:

`OWNER CATEGORY CANARY: PASS` / `PASS WITH NOTES` / `FAIL`

**Still forbidden until then:** WS4 Start, Ready reprocess, Autonomous, tag retirement, production, commit/push (unless owner separately asks).
