# Plan: Slice 5 Gate I Corrective — Subject Construction + Category Safety

| Field | Value |
|-------|-------|
| Date | 2026-08-26 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase (corrective under Slice 5) |
| Related | `docs/workflow/reviews/2026-08-26-smart-catalog-intelligence-slice-5-gate-i-results.md` |
| Parent goal | `smart-catalog-intelligence-unattended-enrichment` |
| Parent plan | `docs/workflow/plans/2026-08-25-smart-catalog-intelligence-slice-5-plan.md` |

---

## Goal

Prevent Gate I material failures — especially **false-positive unattended approval** from dominant-intent category mismatch and **artificial/context-derived Subject compounds** — while preserving genuine subject specificity, verifier protection against unsupported subjects, open-ended Smart Profile vocabulary, Shadow-only validation, and locked Ready Catalog / Autonomous OFF.

---

## Phase alignment

| Item | Value |
|------|--------|
| Slice | **Slice 5** Gate I corrective (NOT Slice 6) |
| Gate H | Complete |
| Gate I | Owner sample complete → **NEEDS CORRECTIVE** |
| This pass | Plan + Formal Review only |
| Signoff Slice 5 | Blocked until corrective implemented, tested, DEV QA’d |
| Slice 6 / Ready Catalog / live Autonomous / production | Out of scope |

---

## Background

Gate I stratified sample (25 / job `zFzAwEIwCXFWC8dce0f4`, v29+v3) found:

- **1 material FAIL AUTOMATION** — `5NVU91SMRiecLkZqdrN8`: fantasy/storybook book landscape proposed as **Floral & Nature** with `shadow_would_auto_approve`
- **3 FAIL PROFILE** — including unsupported/noisy subjects that the verifier correctly kept in Needs Review
- Repeated **artificial specificity**: `problem skeleton`, `coochie alligator`, `donald goofy`, `f-caw-f raven`, `bath skeleton`, etc.
- Lower-severity over-conservative verifier blocks on minor object/generic gaps (`daisy` vs `daisies`)

Owner priority: **unattended precision > approval rate**.

---

## Scope

### In Scope

1. Tighten **specific-subject promotion** so title/slogan/context glue cannot manufacture identity compounds, without reverting to generic-only subjects.
2. Prompt guidance so the model does not invent compound subjects or unsupported depicted identities (`person` without a person; speculative `dog` from dog-like creatures).
3. Strengthen **dominant-intent category safety** so major thematic mismatch cannot reach `shadow_would_auto_approve` (general rule — not hard-coding sample IDs).
4. Preserve verifier hard-block on **dominant subject evidence gaps**; optionally soften **minor object-only** lexical gaps / plural matching without weakening subject protection.
5. Bump prompt + normalizer versions; update Slice 5 pipeline snapshot constants/tests.
6. Automated regression fixtures for Gate I patterns (good specificity, artificial compounds, unsupported subjects, category mismatch, empty subjects OK).
7. DEV-only validation path; Shadow mode; no production deploy in this corrective.

### Out of Scope

- Slice 5 signoff / Slice 6
- Ready Catalog unlock
- Live Autonomous ON
- Mode change away from Shadow
- Reprocessing the full 204-item queue (unless a later owner-authorized re-calibration pass)
- Approving/rejecting Gate I sample designs
- Creating/renaming/merging/archiving categories
- Curated subject vocabulary / breed allowlists
- Retiring legacy tags
- Production deploy
- Weakening verifier subject gaps solely to raise approval rate
- Hard-coding the 25 Gate I design IDs into product logic

---

## Root-cause findings (repo-grounded)

### A. Artificial / context-derived Subject compounds

**Stack:**

1. Prompt title rule appends `centralSubject` after readable slogan (`packages/shared/src/constants/aiEnrichment.constants.ts` — v29 title rules). Slogan tail + subject become contiguous in the title (`…Problem` + `Skeleton`, `…Coochie` + `Alligator`, `F-CAW-F` + `raven`).
2. Normalizer `promoteSubjectsWithTitleSpecificity` (`packages/shared/src/utils/catalogAutomationEvidence.ts`) promotes any adjacent `modifier + single-token-subject` when modifier length ≥ 4 and not on `SPECIFICITY_MODIFIER_BLOCKLIST`. Allowed modifiers are **not** a semantic identity check — `problem`, `coochie`, `bath`, etc. qualify.
3. Model can also emit junk compounds directly (`donald goofy`).
4. Evidence verifier uses title+description+visibleText lexical support (`findStructuredEvidenceGaps`). Compounds that appear in the enrichment **title** self-satisfy evidence and can clear automation.

**Keep:** Highland-style promotion when evidence carries a genuine multi-word identity (`highland cow` in title/description).

### B. Unsupported Subjects (profile FAIL; automation often correct)

- Lexical gap on `person` / speculative creature terms correctly yields `structured_evidence_gap:subjects:*` → `verifier_unresolved` hard block (`catalogAutomationDecision.ts`).
- Do **not** weaken this path. Improve prompt so bad subjects are emitted less often; optional post-normalize cleanup is secondary to gating.

### C. Category dominant-intent mismatch (material FAIL AUTOMATION)

Design `5NVU91SMRiecLkZqdrN8` evidence from Gate I data:

- Themes/interests/places/searchConcepts: fantasy, storytelling, reading, magical book, fairy tale, etc.
- Category: exact-resolved **Floral & Nature**
- Subjects: `[]` (allowed)
- Reason codes: only `shadow_would_auto_approve` (verifier skipped)

**Holes:**

1. `resolveThemeCategory` (`functions/src/ai/catalogThemeCategoryResolver.ts`) trusts **exact approved-name match** immediately — no cross-check vs Smart Profile themes/searchConcepts.
2. `category_alternatives_present` is **soft only** and explicitly filtered out of verifier triggers (`collectVerifierTriggers`).
3. Empty subjects do not block; no “category vs dominant-intent conflict” hard rule in `computeCatalogAutomationDecision`.
4. Prompt already says choose by dominant identity — model still chose Floral & Nature from secondary floral imagery; automation did not catch the mismatch.

### D. Minor decorative object evidence gaps (lower severity)

- Objects and subjects share the same contiguous lexical check.
- Plural heuristic is light (`s` / strip `s`) — `daisy` ↛ `daisies`.
- No object soft-lane when subject identity is already strong.

### E. What is already working

- Empty Subjects allowed for text-driven designs (Gate I PASS examples).
- Category gap → Needs Review (`mw5eiufjMAuOZPnOiMiP` PASS).
- Verifier blocks unsupported subjects (FAIL PROFILE without FAIL AUTOMATION).
- Genuine specific subjects (schnauzer, Frankenstein's monster, chimpanzee, raccoon) can succeed.

---

## Affected areas

### Files / modules (expected — implement only after Formal Review + owner auth)

| Path | Role |
|------|------|
| `packages/shared/src/constants/aiEnrichment.constants.ts` | Prompt v30: subject identity rules; category dominant-intent; anti-compound guidance |
| `functions/src/ai/catalogTitleRules.ts` | `CATALOG_ENRICHMENT_PROMPT_VERSION` → `catalog-enrich-v30` (+ dev twin) |
| `packages/shared/src/constants/smartProfile.constants.ts` | `SMART_PROFILE_NORMALIZER_VERSION` → `smart-profile-normalizer-v4` |
| `packages/shared/src/utils/catalogAutomationEvidence.ts` | Safer promote eligibility; compound reject heuristics; optional plural/object soft helpers |
| `packages/shared/src/utils/catalogAutomationDecision.ts` | Category dominant-intent conflict → hard block / verifier; object soft-lane if approved |
| `packages/shared/src/utils/smartProfileNormalization.ts` | Wire v4 promote/reject; stamp new normalizer version |
| `packages/shared/src/constants/catalogReprocess.constants.ts` | Slice 5 pipeline snapshot versions |
| `functions/src/ai/smartProfileBuilder.ts` | Only if build-time subject/category wiring needs alignment |
| `functions/src/ai/catalogThemeCategoryResolver.ts` | Optional: refuse exact-match trust when conflict signals present — prefer decision-layer gate if cleaner |
| `packages/shared/src/utils/catalogAutomationDecision.test.ts` | Regression fixtures |
| `packages/shared/src/utils/catalogAutomationEvidence` tests (existing or adjacent) | Promote/reject unit tests |
| `functions/src/ai/smartProfileQuality.contract.test.ts` | v30/v4 + highland keep |
| `functions/src/catalogReprocess/catalogReprocess.slice5.contract.test.ts` | Snapshot version strings |
| Docs: Gate I results (done); DECISIONS/ROADMAP notes on corrective | Documentation |

### Architecture Impact

- [x] Details: Remains in shared automation decision + normalizer + prompt constants; no new UI surface required. No lifecycle publish changes. Shadow path unchanged except additional hard blockers when category conflict detected.

### Security Impact

- [x] None material — no auth/rules/secrets changes.

### Data Model Impact

- [x] Details: Additive provenance version strings only; no schema migration; no category CRUD.

### Backend Impact

- [x] Details: DEV Functions redeploy of enrichment path after implement (owner-authorized). No production deploy in this corrective.

### UI / UX Impact

- [x] None required for corrective logic; AI Review continues to show Needs Review. Optional DEV QA manual sample after fix.

### Migration Impact

- [x] None. Existing designs keep prior profiles until re-enriched. No automatic reprocess of 204 in this plan unless owner later authorizes a calibration re-run.

---

## Approach (proposed behavior)

### 1. Prompt bump → `catalog-enrich-v30`

Add explicit rules (open vocabulary; no curated subject list):

- Subjects must be **genuine depicted identities** (recognized entity/type or visually supported subject phrase).
- Do **not** invent specificity by gluing slogan/title/adjective/pose/state words onto a generic subject (`problem skeleton`, `coochie alligator`, `bath skeleton`, `f-caw-f raven`).
- Do **not** merge distinct character names into one subject (`donald goofy`).
- Prefer empty `subjects` when no legitimate depicted subject exists (text-only / logo-only).
- Do not assert `person` / generic humans unless a person is actually depicted as a central subject.
- Do not invent `dog` (or similar) from merely dog-like/ambiguous creatures.
- **Category:** choose by dominant buyer intent; secondary props (flowers, mushrooms as scene dressing) must not override fantasy/storytelling/reading/etc. Prefer alternatives or `categoryGapNote` over a misleading exact category.
- Keep Highland-style multi-word specificity requirement when visually clear.

### 2. Normalizer bump → `smart-profile-normalizer-v4`

Tighten `promoteSubjectsWithTitleSpecificity` / phrase discovery:

- Prefer promotion evidence from **description / centralSubject** identity phrases over slogan tails in title.
- Reject promotion when the modifier token is primarily grounded as **visible slogan text** adjacent only because title appended `centralSubject` after readable lines (anti-glue).
- Reject promotion / strip model compounds when the multi-word subject is not a contiguous identity phrase in description/centralSubject and appears only as title-adjacent slogan glue.
- Expand blocklist **sparingly** only for clear prose/glue classes if needed; **do not** introduce a curated breed/subject allowlist.
- Preserve promotions for genuine patterns: `highland cow`, `miniature schnauzer`-style description-grounded phrases, etc.

### 3. Automation decision — category dominant-intent safety

In `computeCatalogAutomationDecision` (preferred primary gate):

- Detect **strong conflict** between resolved category name/tokens and Smart Profile dominant signals (`themes`, `interests`, `places`, `searchConcepts`, optionally `styles`) using deterministic token/family overlap — **not** a hardcoded design ID list and **not** inventing new categories.
- When conflict is high and primary category appears secondary/scenic relative to profile signals → add hard blocker reason code (e.g. `category_dominant_intent_conflict`) so `wouldAutoApprove` is false and design stays Needs Review.
- When `category_alternatives_present` **and** dominant-intent conflict signals exist, escalate (hard or verifier-worthy) — alternatives alone may remain soft if primary still consistent.
- Do **not** auto-create categories; unresolved / gap continues to Needs Review.

Exact conflict scoring algorithm to be finalized in implement within this plan’s constraints; Formal Review may require documenting the algorithm in the PR/test fixtures before merge.

### 4. Verifier precision (optional, carefully bounded)

- Keep subject `structured_evidence_gap` as hard / verifier-unresolved.
- Improve light plural matching for irregular plurals used in decorative objects (`daisy`/`daisies`) **or** treat **objects-only** gaps as soft when no subject gaps remain and category is not conflicted — only if tests prove it does not admit false auto-approvals.
- Do **not** globally soft-fail subject gaps or generic species expansions that protect unsupported identities.

### 5. Version + Slice 5 snapshot

- Update prompt/normalizer constants and catalog reprocess snapshot to v30 + v4.
- Contract tests must assert new versions.

### 6. No lifecycle regression

- Shadow still records `shadow_would_auto_approve` only when hard blockers empty.
- Live Autonomous remains OFF; Ready Catalog remains locked; no `shouldPublishReady` in Shadow.

---

## Regression fixtures (required)

| Class | Example behavior | Expect |
|-------|------------------|--------|
| GOOD SPECIFICITY | highland cow; schnauzer; Frankenstein's monster; chimpanzee; raccoon | Keep / promote legitimate multi-word or specific subjects |
| ARTIFICIAL SPECIFICITY | problem skeleton; coochie alligator; f-caw-f raven; donald goofy; bath skeleton | Must not create/promote as subjects |
| UNSUPPORTED SUBJECT | MJ glove/mic sample asserting `person` | Must not auto-approve; ideally avoid asserting unsupported `person` |
| AMBIGUOUS CREATURE | dog / dog-like from ambiguous companions | Must not invent `dog` as supported subject for unattended path |
| CATEGORY | Fantasy/storybook book landscape under Floral & Nature | Must **not** `shadow_would_auto_approve` |
| TEXT-DRIVEN | No legitimate depicted subject | Empty subjects OK; no forced subject |
| CATEGORY GAP | Unresolved category | Remains Needs Review |
| VERIFIER PROTECTION | Unsupported subject lexical gaps | Still hard-block unattended approval |

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Shared unit (decision + evidence) | `npm test` / package scripts targeting `catalogAutomationDecision.test.ts` + evidence tests | yes |
| Functions contract | `smartProfileQuality.contract.test.ts`, Slice 5 snapshot contract | yes |
| Typecheck (touched packages) | project scripts for `packages/shared` + `functions` | yes |
| Lint | if configured for touched paths | yes |
| Full monorepo build | optional if CI requires | as needed |
| E2E | no | — |
| Rules / production | no | — |

### Manual / DEV QA

After implement + DEV Functions deploy (owner-authorized):

1. Shadow mode, Autonomous OFF, Ready Catalog locked.
2. Re-run enrichment on a **small** DEV fixture set covering Gate I failure classes (not full 204 unless owner asks).
3. Confirm: fantasy/storybook no longer would-auto-approve under Floral & Nature; artificial compounds absent; highland/schnauzer-style specificity retained; text-only empty subjects OK; category gap still NR.
4. Owner Gate I–style mini sample (≤10) before Slice 5 signoff attempt.

---

## Acceptance criteria

Corrective succeeds only if:

- [ ] Genuine specificity remains (highland cow / schnauzer / Frankenstein's monster / chimpanzee / raccoon class)
- [ ] Artificial specificity reduced (Gate I compound class)
- [ ] Unsupported subject invention prevented or gated from unattended approval
- [ ] Category mismatch cannot unattended-approve (fantasy/storybook vs Floral & Nature class)
- [ ] Text-only designs are not forced to invent Subjects
- [ ] Category gaps continue to Needs Review
- [ ] No curated catalog subject vocabulary introduced
- [ ] No category governance change (AI does not create/rename/merge/archive/delete categories)
- [ ] No lifecycle regression; Shadow remains validation mode
- [ ] Ready Catalog locked; Autonomous live OFF; production untouched
- [ ] Automated regression fixtures pass
- [ ] DEV QA recorded before any Slice 5 signoff attempt

---

## Human checkpoints anticipated

- [x] Owner authorization to **implement** this corrective (this Plan+Review pass stops before implement)
- [x] Owner authorization for DEV Functions deploy of enrichment/normalizer after implement
- [x] DEV QA / mini Gate I re-sample before Slice 5 signoff
- [ ] Production deploy — **not** in this corrective
- [ ] Full 204 reprocess — only if owner later authorizes

---

## Risks & mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Over-tight promote kills Highland-style specificity | High | Regression fixtures for good specificity; prefer description-grounded promote |
| Category conflict heuristic false-blocks good Floral & Nature designs | Med | Require strong conflicting fantasy/story/reading signals; keep alternatives/gap paths |
| Softening object gaps admits unsafe auto-approve | High | Default keep object gaps hard unless subject-clear + tests prove safe; subject gaps never soft |
| Prompt-only fix insufficient | Med | Pair prompt with normalizer + decision hard blocker |
| Scope creep into Slice 6 / live Autonomous | High | Explicit out of scope; state forbids |

---

## Rollback / preservation

- Revert prompt/normalizer version constants to v29/v3 and redeploy DEV Functions.
- Decision/evidence changes are shared-package reversible via git revert.
- Designs already enriched keep prior profiles until re-run; no destructive migration.
- Preserve: open vocabulary, category governance, Shadow dual-gate, Ready Catalog lock, Autonomous OFF.

---

## Documentation updates required

- [x] Gate I results (`docs/workflow/reviews/2026-08-26-smart-catalog-intelligence-slice-5-gate-i-results.md`)
- [ ] `docs/project/DECISIONS.md` — brief ADR on promote anti-glue + category dominant-intent gate (on implement)
- [ ] `docs/project/ROADMAP.md` — Slice 5 blocked on Gate I corrective (on implement/signoff)
- [ ] Update Gate I checklist/results links from workflow state

---

## Open questions

- [ ] Exact category-conflict scoring thresholds (implement documents + fixtures; no new categories)
- [ ] Whether object-gap soft-lane ships in this corrective or is deferred if risky
- [ ] Whether owner wants a post-corrective mini re-sample only vs limited reprocess of would-auto-approve cohort

None of these block **planning/review**; they are implement-time decisions within this plan’s constraints.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-26-slice-5-gate-i-corrective-review.md`
- Verdict: pending
