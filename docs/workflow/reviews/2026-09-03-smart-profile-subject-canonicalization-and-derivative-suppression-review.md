# Formal Review: Smart Profile Subject Canonicalization and Derivative Suppression

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-03-smart-profile-subject-canonicalization-and-derivative-suppression-plan.md` |
| Baseline SHA | `b2183139f5affdd8329082eee50a19c79db21cff` |
| Verdict | **approved_with_changes** |

---

## Summary

The plan correctly identifies that Gate I anti-glue (ADR-FP-145 / `catalog-enrich-v30` + `smart-profile-normalizer-v4`) stops **title/slogan glue promotion** but does **not** suppress model-emitted descriptive, action, species-redundant, or OCR-derived subject phrases that still become Algolia **subjects** facets. Repo inspection confirms the generation path, versions, and that Studio Design Library Smart Filter facets make duplicate subjects operationally harmful. The recommended architecture (prompt **v31** + normalizer **v5**, no schema change, no curated allowlist, no new hard Needs Review gate) is sound. Implementation is **not** authorized by this review alone — owner must authorize Implement separately. Smart Profiling completion remains queued **after** this goal, not started now.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Narrow quality corrective; Smart Profiling completion out of scope |
| Architecture alignment | pass | Prompt + shared normalizer; existing builder/write path |
| Security impact addressed | pass | No Rules/auth/secrets change |
| Data model impact addressed | pass | `smart-profile-v1` unchanged |
| Backend impact addressed | pass | Functions deploy later for live path |
| Test strategy adequate | pass | Fish F1–F7 + cross-domain + Gate I regression |
| Human checkpoints identified | pass | Implement / DEV deploy / canary / production gates |
| Roadmap alignment | pass | Owner sequencing recorded |
| Documentation plan | pass | ADR-FP-145 amendment required |
| No silent scope expansion | pass | Explicit out-of-scope list |

---

## Independent FR answers

### FR1. Exact current subject-generation path

Gemini (`catalog-enrich-v30`) → `simpleCatalogEnrichmentResponse` parse → `buildDesignSmartProfile` → `normalizeDesignSmartProfile` → `promoteSubjectsWithTitleSpecificity` (`findTitleGroundedSpecificSubjectPhrases` + `sanitizeSyntheticSubjectCompounds`) → `normalizeSmartProfileStringList` → optional import-preset merge / staff-edit preserve on write → Algolia `subjects` facet.

### FR2. Exact prompt file/version

- Template: `packages/shared/src/constants/aiEnrichment.constants.ts` → `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE`
- Version constant: `functions/src/ai/catalogTitleRules.ts` + `packages/shared/src/constants/smartProfile.constants.ts` → **`catalog-enrich-v30`**

### FR3. Exact normalizer file/version

- Orchestration: `packages/shared/src/utils/smartProfileNormalization.ts`
- Anti-glue / promote: `packages/shared/src/utils/catalogAutomationEvidence.ts`
- Version: **`smart-profile-normalizer-v4`**

### FR4. Exact anti-glue implementation

`promoteSubjectsWithTitleSpecificity` in `catalogAutomationEvidence.ts`: prefer description/centralSubject contiguous `modifier + head`; distrust title slogan tails / late title adjacency; `sanitizeSyntheticSubjectCompounds` drops 2-token compounds lacking independent support or slogan-modifier-without-preferred-support; character-merge drop (`donald goofy`). Does **not** collapse action/color/species-redundant phrases the model already emitted with description support.

### FR5. Source of `bass fish`

Primarily **model emission** under specificity-encouraging prompt (“MUST include that full phrase”); may also be **promoted** when evidence contains contiguous `bass`+`fish` and subjects only listed `fish`. Treated as “specific identity,” not slogan glue.

### FR6. Source of `make fish`

Primarily **model lifting of visible slogan/OCR wording** into subjects; description often reprints readable text → `multiWordSubjectHasIndependentSupport` returns true → sanitize **keeps** the phrase. Not searchConcept feedback.

### FR7. Source of `leaping fish`

Primarily **model emission** of action/pose compound. `leaping` is **not** in `SPECIFICITY_MODIFIER_BLOCKLIST`; prompt anti-pose guidance is insufficient alone; normalizer does not strip action modifiers today.

### FR8. Does visibleText contaminate subjects?

**Indirectly yes.** Visible text does not auto-copy into subjects in code, but (a) the model often invents subjects from wording, and (b) description/visibleText support can **validate** bad multi-word subjects so sanitize will not drop them. Direct code path does not map visibleText → subjects.

### FR9. Current specificity rules

Prompt + normalizer **promote** multi-word identity into subjects when head-only is present (highland cow pattern). Broader terms may also appear. No curated allowlist. Subject evidence gaps remain hard for unsupported subjects. No derivative-collapse toward base-only facets.

### FR10. Proposed canonical subject contract

Subjects = visibly depicted reusable entities. Canonical base required. Descriptive/action/color/style/text-fragment compounds suppressed. Secondary concepts use existing dimensions. No curated allowlist. Matches plan § Canonical subject semantic contract.

### FR11. How canonical base subjects are guaranteed

Prompt: require base subject for dominant depicted entities. Normalizer: when collapsing `modifier + head`, **ensure head retained** in subjects. Fixtures assert base presence (AC1/AC2/AC4).

### FR12. How redundant modifier phrases are suppressed

Prompt bans emitting them. Normalizer-v5 derivative pass classifies modifiers (action/pose/color/style/mood/verb/text-fragment) and drops redundant compounds when safe; does not rely on a per-species dictionary.

### FR13. How legitimate compound nouns survive

Identity-like modifiers with non-slogan independent support remain (highland cow / sea turtle class). Ambiguity defaults to **keep compound + ensure base**. Gate I positive fixtures must stay green. Staff/preset subjects not collapsed by AI derivative pass.

### FR14. Where species specificity belongs

**Lock:** `subjects` must include canonical base (`fish`). Forbidden subject form: redundant `bass fish`. Useful species/type goes to **`searchConcepts`** (preferred). Optional atomic type token in subjects (`bass`) allowed; not required. No new dimension.

### FR15. Where actions/poses belong

Not subjects. Optional `themes` / `searchConcepts` when shopper-useful; do not invent.

### FR16. Where color/style belongs

`colors` / `styles` dimensions — not `blue fish` / `vintage fish` subjects.

### FR17. Where waves/ocean secondary concepts belong

`objects` (waves as prop) and/or `places` (ocean) when visually justified; fishing activity → `interests`/`themes` as supported. Not stuffed into subjects.

### FR18. How visible people/fishermen are handled

Retain `fisherman` / `people` only when **visually depicted** as legitimate subjects. Do not invent from fishing interest or slogan text alone. Reinforce in prompt; do not add denylist for `people` (ADR-FP-144).

### FR19. Prompt change required?

**YES**

### FR20. Normalizer change required?

**YES**

### FR21. Decision/gate change required?

**NO** for redundant-subject cases (do not add hard Needs Review). Existing subject evidence-gap behavior unchanged unless a separate regression appears.

### FR22. Proposed prompt version

**`catalog-enrich-v31`**

### FR23. Proposed normalizer version

**`smart-profile-normalizer-v5`**

### FR24. Exact files proposed

As listed in plan Affected Areas (aiEnrichment.constants, catalogTitleRules, smartProfile.constants, catalogReprocess.constants, catalogAutomationEvidence, smartProfileNormalization, tests, DECISIONS ADR amendment). Staff update path must **not** gain AI derivative collapse.

### FR25. Exact automated tests

- Derivative collapse: bass fish → fish; leaping fish → fish; make fish dropped; highland cow preserved; sea turtle / fire truck / police officer preserved
- Base guarantee when collapsing
- Visible-text/description slogan echo must not keep `make fish`
- Cross-domain modifier suites
- Version contract tests (v31/v5 + reprocess snapshots)
- Staff/import-preset precedence unchanged
- Gate I anti-glue regressions (`problem skeleton`, etc.)

### FR26. Targeted DEV sample/canary plan

After implement + owner-authorized DEV deploy: small fishing-design set + cross-domain sample (AI Review and/or Ready subset). Inspect subjects facets and per-design profiles. No full Ready Catalog by default.

### FR27. Ready Catalog reprocess required?

**NO** (not for goal closeout). Optional targeted canary only with owner auth.

### FR28. AI Review reprocess required?

**NO** (not full queue). Optional targeted sample with owner auth.

### FR29. Functions deployment inventory

Live enrichment path (shared package + functions that import prompt/normalizer versions). Exact callable set at implement time from current enqueue/reprocess graph; expect `enqueueAiEnrichment` / reprocess worker consumers of shared constants.

### FR30. Firestore Rules impact

**NO**

### FR31. Storage Rules impact

**NO**

### FR32. Indexes impact

**NO**

### FR33. Schema impact

**NO** — keep `smart-profile-v1`

### FR34. Migration impact

**NO**

### FR35. Algolia/search schema impact

**NO** schema change. Value quality improves after re-enrichment; subjects remain faceted.

### FR36. Studio impact

**NO** required code change. Facet UI benefits after cleaner subjects.

### FR37. Portal impact

**NO** required code change. Same Smart Filter attributes.

### FR38. Import preset / staff-edit precedence preserved?

**YES** — AI derivative collapse on AI normalization path only; staff uses `normalizeSmartProfileDimensions` without promote/derivative collapse; presets merge after AI; staff-edited keys preserved on reprocess.

### FR39. Autonomous remains OFF?

**YES**

### FR40. ADR-FP-145 amendment required?

**YES** — refine specificity; add derivative suppression / canonical base guarantee; preserve no-allowlist + Gate I anti-glue.

### FR41. Next goal after Signoff = Smart Profiling completion?

**YES** (owner sequencing). Do not auto-start.

### FR42. Any `[NEEDS OWNER DECISION]`?

**None blocking.** Soft preference already locked in FR14 (species → searchConcepts preferred). No schema-change owner gate.

---

## Architecture Review

**Findings:**

- Option E (prompt + normalizer; no new hard gate) is the correct architecture vs A/B/D alone.
- Compound safety correctly assigned primarily to prompt + conservative classifier, not naïve token strip.
- Subjects-as-facets makes this corrective high leverage without Algolia schema work.

**Required changes:**

1. During implement, treat description-echo of slogan text as **non-identity** support for verb+entity compounds (plan intent is correct; code must not leave a loophole).
2. Explicitly assert Gate I positive fixtures (`highland cow`) and at least two other atomic compounds in the automated matrix before claiming compound safety.
3. Do not relocate modifiers into searchConcepts unless the token was already present — avoid inventing searchConcepts from collapse.

---

## Security Review

**Findings:** No permission, Rules, or secrets impact.

**Required changes:**

- [ ] None

**Human approval needed before production:**

- [x] Any production Functions deploy (separate; not this goal)

---

## Data Model Review

**Findings:** Existing dimensions sufficient. No `[NEEDS OWNER DECISION — SMART PROFILE SCHEMA CHANGE]`.

**Required changes:**

- [ ] None

---

## Backend Review

**Findings:** Version bumps must update live constants **and** reprocess snapshots together. Autonomous must stay OFF. Ready Catalog full reprocess not part of this corrective.

**Required changes:**

1. Keep Autonomous / shadow / production constraints in implement checklist.

---

## Testing Review

**Findings:** Plan matrix adequate. Must include both fish owner patterns and Gate I regressions.

**Required changes:**

1. Add explicit automated case: description contains slogan phrase including `make fish` wording → subjects must not keep `make fish`.

---

## Documentation Review

**Findings:** ADR-FP-145 amendment + handoff next-goal sequencing required at implement/signoff.

---

## Required Changes (approved_with_changes)

1. Implement description-slogan echo hardening so visible-text contamination cannot self-validate verb+entity subjects.
2. Lock automated Gate I + atomic-compound preserve fixtures before merge.
3. When collapsing, do not invent new searchConcepts tokens not already present in the profile/model output.
4. Do not apply AI derivative collapse on staff-edit or preset-owned subject values.
5. Do not start Smart Profiling completion, Autonomous, tag retirement, full Ready backfill, or production from this review.

---

## Blockers

None — proceed to Implement only after owner authorization.

---

## Verdict Rationale

Plan is accurate, scoped, and repo-grounded. Architecture and version recommendations are correct. Minor implement-time constraints above → **approved_with_changes** (not blocked).

---

## Next Step

**STOP.** Await owner authorization to Implement approved_with_changes scope. Do not bump versions, deploy, reprocess, enable Autonomous, or begin Smart Profiling completion yet.
