# Plan: C1 Highland Subject Specificity Corrective

| Field | Value |
|-------|--------|
| Date | 2026-08-25 |
| Status | **approved_with_changes — implemented; awaiting owner accept** |
| Workflow | managed-phase (Smart Profile quality refinement) |
| Goal | `smart-catalog-intelligence-unattended-enrichment` |
| Parent | `docs/workflow/plans/2026-08-25-smart-profile-quality-canonicalization-and-import-background-plan.md` |
| Evidence | `docs/workflow/reviews/2026-08-25-smart-profile-v28-dev-calibration-report.md` |
| Fixture | `yJm2VBRvecPNjx79aSnK` (Highland Cow With Bow) |
| Environment | DEV only (`fresh-prints-dev`); non-mutating observe for verification |

---

## Goal

Ensure Smart Profile **`subjects`** preserve a **specific** animal identity when that identity is confidently supported by title / `centralSubject` / visual evidence — e.g. **`highland cow`**, not only generic **`cow`**.

This is the **blocking** Smart Profile corrective before Slice 5 / refinement signoff.

---

## Background / root cause (repo + observe)

Flagship observe (v28, immutability PASS) for `yJm2VBRvecPNjx79aSnK`:

| Field | Value |
|-------|--------|
| Candidate `subjects` | `["cow"]` only |
| Title / description | Contain “Highland cow” / “highland cow” |
| `searchConcepts` | Include `highland cow cartoon`, `cute highland cow` |
| Autonomy | Already flags `subject_specificity_risk:cow` → Needs Review |

**Root cause:**

1. **Model first-pass** still collapses to the generic head noun despite prompt line “prefer highland cow over only cow.”
2. **`smart-profile-normalizer-v2`** preserves emitted tokens; it does **not** promote a more specific multi-word identity already present in the title when subjects only list the generic head.
3. Autonomy **detects** the defect (`detectSubjectSpecificityRisk`) but does not **repair** the profile.

Not a vocab hard-code / curated seed list issue (contract tests forbid highland seed modules). Not Auto Background (C2b closed).

---

## Scope

### In scope

1. **Prompt (v28 → v29 default template):** Strengthen subjects specificity rule — when a specific multi-word animal/character identity is clear, `subjects` **must include** that phrase (generic head alone is insufficient). Keep “do not invent uncertain breeds.”
2. **Deterministic normalizer repair (→ normalizer-v3):** When title (and/or `centralSubject`) contains a more specific multi-word identity ending in a single-token subject already listed (same signal as `detectSubjectSpecificityRisk`), **promote** that phrase into `subjects` (prepend; keep generic optional or drop duplicate head — prefer specific first; avoid synonym spam).
3. Reuse / share logic with existing `detectSubjectSpecificityRisk` so autonomy and repair stay aligned.
4. Unit + contract tests; bump normalizer version constant.
5. **Re-observe** Highland flagship (prefer six-ID observe script) on DEV — immutability required; assert candidate `subjects` include highland cow (case/canonical-normalized).

### Out of scope

- Auto Background / C2b (accepted; deferred tuning)
- Slice 5 / 6, bulk reprocess, live Autonomous, production
- Global unsupported-subject denylist
- Curated breed seed lists / filename hard-codes
- Broad synonym tables beyond title/`centralSubject`-grounded promotion
- C1 is **not** mixed with import UI work

---

## Affected areas

| Area | Paths (expected) |
|------|------------------|
| Prompt | `packages/shared/src/constants/aiEnrichment.constants.ts` |
| Normalizer | `packages/shared/src/utils/smartProfileNormalization.ts` (+ new helper module if cleaner) |
| Specificity signal | `packages/shared/src/utils/catalogAutomationEvidence.ts` (share extract/promote helpers) |
| Builder wiring | `functions/src/ai/smartProfileBuilder.ts` if title/centralSubject needed at normalize time |
| Constants | `packages/shared/src/constants/smartProfile.constants.ts` → `normalizer-v3` |
| Tests | `smartProfileQuality.contract.test.ts`, `smartProfileBuilder.test.ts`, `catalogAutomationDecision.test.ts`, new promote unit tests |
| Observe | existing `calibration-flagship-observe-dev.mjs` (no design mutation) |

### Impacts

- Architecture: shared util only; no new services
- Security: none
- Data model: Smart Profile schema v1 unchanged; normalizerVersion bump only
- Backend: enrichment pipeline picks up via shared package; DEV Settings may auto-upgrade default prompt if already on shipped default
- UI: none
- Migration: none; existing designs unchanged until re-enriched

---

## Approach

1. Extract shared helper: given `title` + `subjects`, return promoted specific phrases (e.g. `highland cow` from title + subject `cow`).
2. Apply promotion inside `normalizeDesignSmartProfile` (or builder immediately before normalize) using title + optional `centralSubject`.
3. Strengthen DEFAULT prompt subjects bullet; archive prior DEFAULT as PREVIOUS_v28 if pattern requires (match existing PREVIOUS_V27 pattern).
4. Bump `SMART_PROFILE_NORMALIZER_VERSION` to `smart-profile-normalizer-v3`.
5. Tests: Highland collapse → promote; no invent when title lacks specificity; Jimothy/raccoon unchanged; no curated seed module.
6. DEV non-mutating re-observe Highland (and remaining flagships for regression); record results.
7. STOP for owner acceptance of C1; then refinement signoff can proceed (separate step).

---

## Test strategy

| Check | Required |
|-------|----------|
| Unit: promote from title when generic subject present | Yes |
| Unit: no promote without title evidence | Yes |
| Contract: prompt mentions specificity; no curated highland seed module | Yes |
| Functions/shared tests + lint | Yes |
| Flagship observe Highland subjects include highland cow | Yes (DEV) |
| Design immutability on observe | Yes |

---

## Human checkpoints

- Owner acceptance after Highland re-observe
- No production
- No Slice 5 until C1 accepted + refinement signoff

---

## Risks / rollback

| Risk | Mitigation |
|------|------------|
| Over-promotion from noisy titles | Only promote when existing specificity-risk pattern matches (modifier + head already in subjects) |
| Model still emits cow only | Normalizer repair is primary safety net |
| Prompt Settings custom copy | Auto-upgrade path for previous defaults; custom prompts may need Settings refresh |

Rollback: revert normalizer-v3 + prompt DEFAULT; observe-only verification leaves designs untouched.

---

## Acceptance

1. Observe candidate for `yJm2VBRvecPNjx79aSnK` has `subjects` containing highland cow (canonical match OK)
2. Autonomy no longer requires unresolved specificity for that case solely due to generic-only subjects (or risk cleared by repair)
3. No Auto Background changes
4. No production / Slice 5 / bulk reprocess
