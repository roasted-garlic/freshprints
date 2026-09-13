# Plan: Smart Profile Evidence Friction + Runtime Metadata + Model Evaluation

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Parent goal | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Related | `docs/workflow/reviews/2026-09-05-smart-profile-evidence-friction-runtime-metadata-and-model-evaluation-review.md` |
| FreshForge impact | Documentation + future Application (Studio UI, shared evidence/prompt, optional Functions benchmark tooling) — **not Starter Surface** |
| Environment | `fresh-prints-dev` (plan/review only this pass) |
| Parallel work | ADR-FP-173 Explicit reprocess authority QA remains separate; this plan must not block it |

---

## Goal

Produce a reviewed corrective plan that (1) explains and proposes safe fixes for TD-034-family structured-evidence false blockers that suppress legitimate `Would Auto Approve`, (2) plans Studio Smart Profile footer observability for normalizer version and model from persisted provenance, and (3) designs a controlled DEV model-quality benchmark before any configured-model change — without implementing code, switching models, enabling Autonomous, starting WS6, or touching production in this pass.

## Background

WS5 (ADR-FP-171 Model 2) proved Autonomous hard-blocker safety and deferred **TD-034** (visual subject/object listed in structured fields without lexical support in the evidence corpus). Owner cucumber design `Y2IQuCgAPgnqrBIeJuap` remains `Would Auto Approve = NO` with hard blocker `structured_evidence_gap:subjects:woman` while Explicit/`fuck` correctly apply and are **not** the blocker (`docs/workflow/reviews/2026-09-05-cucumber-go-fuck-yourself-needs-review-diagnostic.md`).

Owner manual side-tests of the same artwork with Gemini 3.1 Flash Lite and ChatGPT Luna produced titles/descriptions that lexically support `woman`. Current Fresh Prints runtime (`gemini-2.5-flash-lite` + `catalog-enrich-v34`) did not. Manual comparison is **diagnostic only** — not authorization to change models.

ADR-FP-173 Explicit reprocess authority remains a separate corrective (DEV deployed; QA C pending). This plan does **not** depend on ADR-173 completion unless a future implement phase discovers a shared-file conflict (unlikely: metadata UI is AI Review footer; evidence/prompt are shared enrichment paths).

---

## Scope

### In Scope (future Implement — after separate owner authorization)

**Workstream A — Structured evidence friction (TD-034)**
- Root-cause documentation (this plan) and chosen corrective layer(s)
- Prompt revision **planning** toward a future `catalog-enrich-v35` (do not create v35 until Implement is authorized)
- Optional narrow matching/corpus improvements **only** if Formal Review + owner accept them without defeating independent evidence
- Focused automated tests for evidence corpus / matching / Model 2 invariants
- TD-034 disposition update

**Workstream B — Smart Profile runtime metadata UI**
- Studio AI Review Smart Profile footer: show profile / prompt / normalizer / model from persisted provenance (truthful fallback when missing)
- Optional provider when persisted

**Workstream C — Model quality evaluation**
- Provider/feasibility analysis (this plan)
- Repeatable DEV benchmark design + scorecard (script/plan only until Implement)
- Owner gate before any settings model switch

### Out of Scope

- Implementation in this Plan→Review pass
- Changing configured vision model
- Creating `catalog-enrich-v35` / bumping normalizer / schema
- Weakening `structured_evidence_gap:*` hard-blocker policy
- Enabling Autonomous / starting WS6
- Legacy tag / reranker retirement
- ADR-FP-173 Explicit Content implementation or QA
- Production, migrations, commit/push
- Broad AI Review redesign
- Treating subjects/objects as self-validating evidence

---

## Mechanical trace (cucumber `Y2IQuCgAPgnqrBIeJuap`)

Verified 2026-09-05 against `fresh-prints-dev` Firestore + shared evidence helper.

| Stage | Source | Observed |
|-------|--------|----------|
| 1. Raw / persisted AI copy | `aiSuggestions` | title: `When Life Gives You Cucumbers Go Fuck Yourself`; description: `The design features a playful, albeit rude, twist on a common idiom.`; model `gemini-2.5-flash-lite`; provider `google`; prompt `catalog-enrich-v34` |
| 2. Structured dimensions | `smartProfile` | subjects `["woman"]`; objects `["cucumber"]`; visibleText slogan lines; **no** `centralSubject` field; searchConcepts includes `vintage woman`, `pin up girl` |
| 3. Normalizer stamp | `smartProfile.provenance` | `normalizerVersion: smart-profile-normalizer-v6`; version `smart-profile-v1` |
| 4. Evidence corpus | `findStructuredEvidenceGaps` in `packages/shared/src/utils/catalogAutomationEvidence.ts` | corpus = **title + description + centralSubject + visibleText** only |
| 5. Matcher | `tokenHasLexicalSupport` / `corpusIncludesPhrase` | case-insensitive substring + light singular/plural (`s` / `ies`); **no** aliases (`woman`≠`girl`); subjects/objects do **not** cross-support; searchConcepts **excluded** |
| 6. Gaps | same | `structured_evidence_gap:subjects:woman` only (`cucumber` supported via title/visibleText `Cucumbers`) |
| 7. Decision | `packages/shared/src/utils/catalogAutomationDecision.ts` | evidence codes are **hard** via `isHardEvidenceCode` |
| 8. Preview | Studio `Would Auto Approve` | derived false from provenance (`explicitAutomationPreviewDisplay` / automationDecision) |

Local reproduction with persisted title/description/visibleText yields the same single subject gap.

### Why `woman` exists but fails

1. Model correctly emitted structured subject `woman` (visual pin-up).
2. Text-dominant title rules kept slogan-only title (no “woman”).
3. Description summarized idiom/theme, **not** the depicted person — despite v34 asking description to summarize main visual subject and to set `centralSubject` when text + meaningful person exist.
4. `centralSubject` omitted/empty → never entered corpus or title append path.
5. Supporting phrases landed in **searchConcepts** (`vintage woman`, `pin up girl`), which are **not** evidence-corpus fields by design.
6. Validator correctly hard-blocks unsupported structured claim (Model 2 invariant).

---

## Root cause classification

| Factor | Contribution | Notes |
|--------|--------------|-------|
| **A. Prompt / model output not self-supporting** | **PRIMARY** | Structured subjects emitted without title/description/centralSubject lexical support; v34 does **not** explicitly require “every subject/object must appear in approved evidence fields” |
| **B. Normalizer creating the gap** | **NO for cucumber** | v6 preserves subjects; does not invent `woman`; omits empty centralSubject; does not strip woman from copy it never had |
| **C. Evidence corpus narrow** | **SECONDARY** | Corpus excludes `searchConcepts` (and styles/themes). Adding searchConcepts would be a **policy** change — richer but weaker independence (synonyms/retrieval phrases) |
| **D. Matching too literal** | **MINOR** | No `woman`↔`girl`/`pin-up` alias; plural heuristics would not help here |
| **E. Dimensions too aggressive** | **MINOR** | Emitting `woman` is correct for search; friction is missing descriptive support, not over-aggressive taxonomy |
| **F. Combination** | **YES** | A primary + C secondary + occasional D on other TD-034 cases (e.g. cannabis leaf vs leaves) |

**Preferred corrective layer (plan recommendation):** improve **internal evidence quality** (prompt contract + optionally better model) so descriptive fields support structured claims.

**Secondary layer:** narrow deterministic matching only for proven plural/canonical pairs already partially handled; optional corpus expansion only with explicit safety review.

**Hard-blocker policy change required:** **NO** (default). Do not soften `structured_evidence_gap:*` to raise approval rates.

---

## Workstream A — Corrective options (plan only)

### A1. Prompt-level (recommended primary)

Investigate future **`catalog-enrich-v35`** (name reserved; **do not create** until Implement authorized) to require:

> Every meaningful `subjects[]` / `objects[]` token must also appear with clear lexical support in at least one of: title, description, `centralSubject`, or an approved evidence field already used by the validator.

Also reinforce existing v34 guidance that text + depicted person → non-empty `centralSubject` and description that names the visual subject (not only the joke/idiom).

**v34 today:** asks for visual summary and centralSubject for text+person designs, but does **not** state the explicit self-consistency contract against structured arrays.

### A2. Normalizer-level

Inspect-only finding: v6 can canonicalize display forms and collapse redundant subjects; it should not be the first fix for cucumber. Any future normalizer change that invents descriptive evidence from subjects alone is **out of policy** (defeats independent check). Normalizer revision **not required** for cucumber root cause; retain option if later cases show normalizer-induced gaps.

### A3. Evidence corpus

Current fields (source of truth): `title`, `description`, `centralSubject`, `visibleText` — `catalogAutomationEvidence.ts` `findStructuredEvidenceGaps`.

**Do not** propose “trust subjects because subjects says woman.”

Optional future candidates (require separate owner/security review):
- **Reject by default for cucumber:** using `searchConcepts` alone (retrieval/synonym field; already held “vintage woman” while description lacked it — would paper over weak copy).
- Possible safe narrow addition: none recommended until prompt/model improve evidence quality.

### A4. Matching

Current: lowercase corpus join; substring phrase match; light singular/plural.

Safe future candidates (plan for review, not fuzzy/edit-distance):
- Documented alias table for closed human-role pairs only if owner insists after prompt/model work
- Existing plural heuristics already handle cucumber/Cucumbers-style cases

### A5. Model-level (evaluation first)

Owner side-tests suggest `gemini-3.1-flash-lite` may emit self-supporting copy more often. Treat as **Workstream C** input — evaluate before switching default.

---

## TD-034 disposition

| Item | Value |
|------|-------|
| Current status | **open** (deferred post-WS5); **reopened for planning** by this phase |
| Scope expansion | TD-034 originally emphasized **objects**; cucumber shows same family for **subjects** — track under TD-034 (do not invent a silent replacement ID unless owner wants split) |
| Proposed disposition | **partially resolved** after Implement of preferred layers; retain residual debt if prompt/model leave remaining visual-but-unspoken props |
| Known patterns | WS5/WS3: hat, stars, flowers, cannabis leaves; cucumber `woman`; bird subject gaps in prior canaries |

Update `docs/project/TECH_DEBT.md` when Implement completes; this Plan marks planning reopen.

---

## Workstream B — Runtime metadata UI

### Current UI

`apps/studio/src/renderer/src/features/ai-review/components/AiReviewSmartProfileSection.tsx` footer today:

- Profile version → `profile.provenance.version`
- Prompt version → `profile.provenance.promptVersion` (conditional)

Does **not** show normalizer or model. `Would Auto Approve` / shadow reasons already shown above.

### Persisted provenance (already available)

`SmartProfileProvenance` (`packages/shared/src/types/catalog/smartProfile.types.ts`):

| Field | Persisted on cucumber | Display? |
|-------|----------------------|----------|
| `version` | `smart-profile-v1` | yes today |
| `promptVersion` | `catalog-enrich-v34` | yes today |
| `normalizerVersion` | `smart-profile-normalizer-v6` | **missing in UI** |
| `model` | `gemini-2.5-flash-lite` | **missing in UI** |
| `provider` | `google` | optional |
| `generatedAt` | present | optional / clutter |

Also mirrored on `aiSuggestions.model` / `provider` / `promptVersion` for older paths — footer must prefer **smartProfile.provenance**, fall back truthfully (`—` or equivalent), **never hardcode** live constants as if they were this design’s run.

### Proposed footer fields

1. Profile Version  
2. Prompt Version  
3. Normalizer Version  
4. Model  
5. Optional: Provider (only if persisted)

**Migration:** **NO** — display-only; older docs may show `—` for missing normalizer/model.

**Likely files:** `AiReviewSmartProfileSection.tsx` (+ CSS if needed); optional Design Details alignment if owner wants parity (`DesignDetailsModal` already shows some AI suggestion meta — confirm during Implement, do not expand without need).

---

## Workstream C — Model evaluation (no switch)

### Verified current runtime

| Constant / setting | Value | Source |
|--------------------|-------|--------|
| Prompt | `catalog-enrich-v34` | `CURRENT_CATALOG_ENRICH_PROMPT_VERSION` |
| Normalizer | `smart-profile-normalizer-v6` | `SMART_PROFILE_NORMALIZER_VERSION` |
| Schema | `smart-profile-v1` | `SMART_PROFILE_VERSION` / provenance.version |
| Default model | `gemini-2.5-flash-lite` | `DEFAULT_VISION_MODEL_ID` |
| Allowed models | `gemini-2.5-flash-lite`, `gemini-3.1-flash-lite` | `ALLOWED_VISION_MODEL_IDS` |
| Provider path | Google Gemini OpenAI-compat URL only | `resolveProviderTarget()` → `providerId: "google"` |

### Candidate feasibility

| Candidate | Feasible in current architecture? | Notes |
|-----------|-----------------------------------|--------|
| `gemini-2.5-flash-lite` (current) | **YES** | Baseline |
| `gemini-3.1-flash-lite` | **YES** | Already allowlisted; same `GEMINI_API_KEY`; Studio settings option exists; pricing `$0.25/$1.50` per 1M vs `$0.10/$0.40` |
| ChatGPT Luna Light Reasoning | **NO without new provider** | Not in allowlist; no OpenAI provider target; mark **`[NEEDS PROVIDER/REPO CHECK]`** — do not invent API. Manual owner tests remain external diagnostics only |

**Provider/secrets for Gemini 3.1:** no new Secret Manager key expected (same Google key). Settings change would be `settings/aiEnrichment.visionModelId` — **owner approval required**; not authorized by this plan.

### Benchmark design

- Environment: `fresh-prints-dev` only; **do not mutate production**; prefer offline/replay harness or isolated fixture copies over Ready catalog writes
- Sample size: **30 designs** recommended (range 20–50); include cucumber `Y2IQuCgAPgnqrBIeJuap` and representative TD-034 patterns (hat/stars/flowers/cannabis) plus clean auto-approve controls
- Composition buckets: human subject, animal, occupation, multi-object, text-heavy, explicit/profanity, music/band, pop culture, cute, food, faith, visual-object-without-wording, historical evidence gaps, current clean AUTO
- Same images + **same catalog contract** (live approved categories with descriptions; same prompt version unless testing a planned v35 draft under explicit auth)
- Scorecard metrics (plan): valid JSON rate; normalize success; category exactness vs taxonomy; title/description quality; subject/object accuracy; **internal evidence consistency**; structured evidence hard-blocker count; false blocker count; `wouldAutoApprove` rate; unsafe false-approval count; Explicit quality; hallucination rate; latency; cost/image; total cost
- Primary success: higher **safe** `wouldAutoApprove`, not raw approval %
- Cost estimate: use `estimateVisionCostUsd` + measured tokens; order-of-magnitude for 30 images on 2.5-flash-lite is typically **well under a few USD**; 3.1 higher (~2.5× input / ~3.75× output rates) — record exact totals when benchmark runs

**Model switch authorized by this plan:** **NO**

---

## Sequencing recommendation (owner checkpoint)

Recommended order after Implement is authorized:

1. **Workstream B** (metadata UI) — small, reversible, unblocks calibration clarity  
2. **Workstream C** DEV benchmark (current vs `gemini-3.1-flash-lite` only unless provider work approved)  
3. **Workstream A** prompt v35 (and/or model promotion) based on benchmark + cucumber replay evidence  
4. Retain hard blockers; re-evaluate TD-034

Alternative: prompt-first if owner prioritizes cucumber friction before benchmark cost. Formal Review leaves choice to owner.

---

## Affected Areas

### Files / Modules (expected at Implement)

- `apps/studio/.../AiReviewSmartProfileSection.tsx` (+ CSS)
- Possibly `packages/shared/src/constants/aiEnrichment.constants.ts` (future v35 template only when authorized)
- `packages/shared/src/utils/catalogAutomationEvidence.ts` (+ tests) only if matching/corpus changes authorized
- `packages/shared/src/utils/catalogAutomationDecision.test.ts` / evidence tests — Model 2 invariants
- Optional: `functions/scripts/*-model-benchmark-dev.mjs` for DEV harness
- Docs: `TECH_DEBT.md`, `DECISIONS.md` (ADR if prompt/model changes), handoff CURRENT-STATE

### Architecture Impact

- [x] Details: UI display of existing provenance; optional prompt version bump; no layer bypass; decision hardness unchanged by default

### Security Impact

- [x] Details: Do not weaken Autonomous hard blockers; no production; DEV-only benchmark; no new public endpoints required for B; C may need staff-only script

### Data Model Impact

- [x] Details: No new required fields for B (provenance already exists). No migration.

### Backend Impact

- [x] Details: None for B. A/C may touch enrichment Functions only when authorized; Gemini 3.1 already supported.

### UI / UX Impact

- [x] Details: AI Review Smart Profile footer denser; manual checkpoint for clarity/clutter

### Migration Impact

- [x] None for display. Prompt/model changes are forward-only reprocess, not schema migration.

---

## Approach (future Implement — not this pass)

1. Owner authorizes Implement with chosen sequencing and field set.  
2. Ship Workstream B metadata footer from provenance with missing fallbacks + unit/component tests.  
3. Build DEV benchmark harness (read-only or fixture-isolated) for allowlisted Gemini models.  
4. Run scorecard; present owner checkpoint before any model switch or v35.  
5. Implement approved A-layer changes with focused tests; cucumber + unsupported-claim fixtures.  
6. Update TD-034 / ADR / docs; Signoff; still no Autonomous/WS6 unless separately authorized.

---

## Acceptance criteria (future Implement)

### Evidence friction

- [ ] Cucumber no longer false-blocks **when** model output contains trustworthy corpus support for `woman`
- [ ] Unsupported structured claims still hard-block
- [ ] Model 2: no hard blocker reaches Ready under Autonomous
- [ ] Evidence improvement covered by deterministic unit tests

### Runtime metadata

- [ ] Footer shows profile, prompt, normalizer, model from persisted provenance
- [ ] Missing historical fields show truthful fallback (not live constants)
- [ ] No hardcoded runtime labels pretending to be per-design provenance

### Model evaluation

- [ ] Benchmark rerunnable; same image/contract across models
- [ ] Safe approval + cost/latency reported
- [ ] No automatic model promotion

---

## Test Strategy

### Automated (at Implement)

| Check | Command / focus | Required |
|-------|-----------------|----------|
| Unit — evidence corpus/matching | `packages/shared` catalogAutomationEvidence tests | yes |
| Unit — Model 2 decision invariants | `catalogAutomationDecision` tests | yes |
| Unit — metadata display helpers | Studio/shared display with full vs missing provenance | yes |
| Typecheck / Functions build | as touched | yes if backend/prompt |
| Rules | N/A unless Rules touched | no |
| Benchmark harness smoke | DEV script dry-run | yes if C implemented |

### Manual

- [ ] AI Review footer visual check on design with full provenance and on older design with gaps
- [ ] Cucumber replay after A/C changes (DEV)
- [ ] Owner approval before model switch / prompt bump

---

## Human Checkpoints Anticipated

- [x] Preferred root fix for TD-034 (prompt vs model vs matching vs corpus)
- [x] Whether prompt revision required
- [x] Whether normalizer revision required
- [x] Whether evidence matching revision required
- [x] Validator hardness changes — expected **NO**
- [x] Exact metadata UI fields
- [x] Confirm persisted provenance available (verified yes)
- [x] Whether model benchmark before source corrective
- [x] Candidate model feasibility (Gemini 3.1 yes; Luna no without provider)
- [x] Benchmark sample size (recommend 30)
- [x] Owner approval before any model switch
- [x] Owner approval before any prompt/schema/version bump
- [ ] Manual UI review for footer
- [ ] Production deploy — **not in this corrective unless separately authorized**

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Softening blockers to chase approval % | high | Explicit out-of-scope; Model 2 invariant tests |
| Using searchConcepts as evidence weakens independence | medium | Default reject; require separate review |
| Premature model switch | medium | Benchmark + owner gate |
| Coupling to ADR-173 | low | Separate phases; shared files only if conflict |
| Prompt-only fix insufficient on weak models | medium | Pair with Workstream C |

---

## Rollback Plan

- UI: revert footer component  
- Prompt: keep prior template / settings version pin  
- Model: restore `visionModelId` to `gemini-2.5-flash-lite`  
- Matching/corpus: revert shared util + tests  

---

## Documentation Updates Required

- [ ] TECH_DEBT.md (TD-034 disposition)
- [ ] DECISIONS.md (ADR if prompt/model policy changes)
- [ ] DATA_MODEL.md only if provenance contract changes (not expected for B)
- [ ] Handoff CURRENT-STATE / 07-backend when Implement ships
- [x] This plan + Formal Review

---

## Open Questions (owner)

1. Prefer **prompt-first**, **benchmark-first**, or **metadata-first** Implement sequencing?  
2. Accept plan recommendation: **no** hard-blocker softening; **no** searchConcepts-as-evidence for v1 fix?  
3. Include optional Provider in footer?  
4. Authorize Gemini-only first benchmark (exclude Luna until provider exists)?  
5. Benchmark sample size confirm 30 vs 20–50?

---

## Approval

- Review doc: `docs/workflow/reviews/2026-09-05-smart-profile-evidence-friction-runtime-metadata-and-model-evaluation-review.md`
- Verdict: pending
- **Implementation authorized this pass: NO**
