# Plan: Smart Profile v28 Flagship Calibration Observe (Six Ready/Approved Designs)

| Field | Value |
|-------|--------|
| Date | 2026-08-25 |
| Amended | 2026-08-25 — Formal Review **approved_with_changes** binding R1–R10 |
| Status | **ready for implementation** — R1–R10 incorporated; no new review cycle required |
| Workflow goal | `smart-catalog-intelligence-unattended-enrichment` |
| Parent | `docs/workflow/plans/2026-08-25-smart-profile-v28-dev-calibration-plan.md` |
| Audit | `docs/workflow/reviews/2026-08-25-smart-profile-v28-flagship-calibration-observe-audit.md` |
| Formal Review | `docs/workflow/reviews/2026-08-25-smart-profile-v28-flagship-calibration-observe-review.md` |
| Environment | **fresh-prints-dev only** |

---

## Goal

Obtain **v28 Smart Profile evidence** for six **ready/approved** flagship calibration fixtures **without** altering catalog lifecycle, then merge results into the calibration report for a **new** final recommendation.

Owner explicitly **does not** accept the interim **NEEDS CORRECTIVE** recommendation as final until this evidence exists.

---

## Scope IN

1. Repo audit (complete)
2. Extract shared read-only candidate core (`generateAiEnrichmentCandidateForDesign`)
3. Refactor production pipeline to call the **same** shared core
4. Diagnostic observe module + local script (R1–R10)
5. Parity contract test + guard/immutability tests
6. Six flagship observes → report update → STOP for owner

## Scope OUT

- Widening `resetAiEnrichmentForProcessing` for ready designs
- Bulk reprocess / Slice 5 / Slice 6
- Live Autonomous / production
- Algolia / catalog publication
- Prompt v28 / normalizer v2 / automation threshold **behavior changes**
- Vocabulary generation changes
- Fixing calibration quality findings in this pass
- Cloud Callable / HTTP / scheduled Function / Studio UI / Firebase deploy
- Firestore `calibrationRuns` or any remote calibration persistence
- Refinement signoff

---

## Flagship fixtures (exact IDs — mandatory allowlist)

| Slot | Design ID | v27 questions |
|------|-----------|---------------|
| Highland | `yJm2VBRvecPNjx79aSnK` | Specificity: `highland cow` vs generic `cow` |
| Jimothy | `6x2LyTvG3ewIePeWHanV` | Remove unsupported `people`; keep `raccoon` |
| Plant Goose | `KI7Ncd1O9JCuX9uCq505` | Useful plant concepts without audience speculation |
| Nurse | `mZWO3Lsra91EhNRNEkhR` | Accurate nurse identity; no doctor drift |
| Santa | `W1bwk4jrCoQFn0OiyiSU` | Cleaner Search Concepts vs v27 |
| Summer Vibes | `ltn0gzs2YGXPADqCejr8` | Confirm no regression |

For each: preserve persisted v27 profile as **BASELINE**; v28 observe output as **CANDIDATE**.

---

## Binding requirements R1–R10 (authoritative)

### R1 — Shared read-only candidate core

**Module:** `functions/src/ai/aiEnrichmentCandidateCore.ts`

**API (conceptual):**

```typescript
generateAiEnrichmentCandidateForDesign(input: {
  designId: string;
  design: DesignRecord; // already loaded — core does not write
  geminiApiKey: string;
  diagnosticContext: AiEnrichmentReadDiagnosticContext;
  /** Pipeline-only optional stage hook; observe omits. */
  onProcessingStage?: (stage: AiProcessingStage) => Promise<void>;
  /** Injectable clock for parity tests / stable provenance timestamps. */
  nowIso?: string;
}): Promise<AiEnrichmentCandidate>
```

Core includes current pre-persistence candidate generation:

- Preview download + `prepareAiAnalysisImage`
- Current AI settings + prompt assembly (`catalog-enrich-v28`)
- `loadSmartProfileVocabSnapshot` **READ only**
- Provider/model call + response parsing
- Settings-driven optional AI branches (tag rerank / suggestion author)
- Category resolution, title/description candidates
- `buildDesignSmartProfile` + normalizer v2
- Pure `computeCatalogAutomationDecision` + reason codes / verifier fields on candidate

**Production pipeline** must call this **same** core, then persist. No second orchestration fork.

If extraction reveals unsafe entanglement requiring a broad architecture change → **STOP** for re-review.

### R2 — Observe calls core only

**Module:** `functions/src/ai/aiEnrichmentObserve.ts`

```typescript
runAiEnrichmentObserveForDesign(input: {
  designId: string;
  geminiApiKey: string;
}): Promise<AiEnrichmentObserveResult>
```

Observe = load design (read) → guard project/ID → generate candidate via shared core → return evidence.

**MUST NOT** invoke:

- `markAiSuccess` / `markAiFailure`
- `updateAiProcessingStage`
- `incrementCatalogAutomationHealth`
- `maybeRefreshSmartProfileVocabSnapshot`
- Any design update/write helper
- Algolia / catalog sync
- Reprocess job writes

### R3 — Parity contract test

`functions/src/ai/aiEnrichmentObserve.contract.test.ts` (or sibling):

Prove shared core candidate ≡ candidate the pipeline consumes immediately before persistence, under stubbed/deterministic provider input (no live Gemini).

Compare at minimum: `promptVersion`, `normalizerVersion`, `title`, `description`, category resolution, Smart Profile, visible text / structured analysis content, automation decision + reason codes, provider/model provenance.

### R4 — Hard DEV + six-ID fail-closed

**Both** module and script independently fail closed unless:

- Firebase project === `fresh-prints-dev`
- `designId` ∈ exact six-ID set above

No wildcard, `--design-id`, production override, env bypass, or arbitrary ID flag for v1.

### R5 — Approved-design immutability proof

Before each observe:

1. Canonical snapshot of business-facing persisted fields (status, aiReviewStatus, AI stage/state, readyAt, title, description, category/categoryId, smartProfile, aiSuggestions, aiAnalysis, artwork/background/halftone metadata if present, updatedAt, other enrichment/lifecycle fields from audit)
2. Deterministic Firestore value normalization
3. SHA-256 of canonical JSON

After observe: re-read, same snapshot, SHA-256.

**Expected:** identical. On mismatch → fixture FAIL, record changed fields if safely diffable, **ABORT all remaining observes** (R10), STOP.

### R6 — Local JSON only

**Only write:** `docs/workflow/reviews/_calibration-flagship-observe-results.json`

No Firestore `calibrationRuns`, diagnostic collections, settings, designs, or other remote persistence.

Runtime logs OK if no secrets.

### R7 — Existing safe secret pattern

Reuse `functions/scripts/calibration-run-dev.mjs` pattern:

- Session `$env:GEMINI_API_KEY` from `gcloud secrets versions access ... --project=fresh-prints-dev`
- Optional in-process `gcloud` fallback
- Never: plaintext credential file, committed `.env` with secret, CLI secret arg, JSON secret, log/print secret, Firestore secret

### R8 — Internal only, no Cloud export

- Do **not** export observe (or candidate core as a deployable) from `functions/src/index.ts`
- No Callable / HTTP / scheduled Function / Studio UI / Firebase deploy

### R9 — Exactly six observations, once each

**Script:** `functions/scripts/calibration-flagship-observe-dev.mjs`

- Hard-coded six IDs
- One observation each
- Provider-level retry may remain inside shared infrastructure
- No outer reruns / multi-sample / stability loops
- Ordinary provider failure → record + continue **only if** immutability hash unchanged

### R10 — Abort on immutability failure

Hard stop: hash mismatch → abort remaining fixtures → do not claim completed calibration recommendation → record violation → STOP for owner.

---

## Explicit side-effect locks (must state in code + this plan)

| Action | Observe |
|--------|---------|
| `computeCatalogAutomationDecision` | **Pure calculation only** — allowed |
| `incrementCatalogAutomationHealth` | **NOT called** |
| `loadSmartProfileVocabSnapshot` | **READ allowed** |
| `maybeRefreshSmartProfileVocabSnapshot` | **NOT called** |
| Algolia / catalog side effects | **None** (no design writes) |
| Design persistence | **None** |
| Lifecycle transition | **None** |
| Cloud deployment | **None** |
| Calibration write | **Local JSON only** |

---

## Mechanism summary

| Artifact | Role |
|----------|------|
| `aiEnrichmentCandidateCore.ts` | Shared pre-persist candidate generation |
| `aiEnrichmentPipeline.ts` | Core → then persist + health + vocab refresh |
| `aiEnrichmentObserve.ts` | Guards + core only (internal) |
| `calibrationDesignImmutability.ts` (or script-local) | Canonical snapshot + SHA-256 |
| `calibration-flagship-observe-dev.mjs` | Six-ID loop + local JSON |
| Contract / source tests | Parity + exclusion + guards |

---

## Report structure (after observe)

| Section | Content |
|---------|---------|
| **A** | 24-fixture v28 product evidence (18 executed + 6 observe) |
| **B** | Historical v27 baseline |
| **C** | Checker / normalization artifacts |
| **D** | True color-variant comparisons |
| **E** | Artwork-variant comparisons (skeleton/hand excluded from color metric) |
| **F** | Real v28 profiler failures |
| **G** | Quality notes / acceptable variation |

**#21:** sanitization (`F*CK`), not missing OCR — product-policy question; no code change this pass.

Keep caps **12 / 24** unless new evidence contradicts.

Final recommendation: **READY FOR REFINEMENT SIGNOFF** | **NEEDS CORRECTIVE** (v28-reproduced defects only).

---

## Test strategy (minimum)

1–3. Shared core + pipeline consume core + parity contract  
4–10. Observe cannot call persistence helpers / write design / Algolia / health / vocab refresh  
11–13. Project + allowlist guards  
14–17. Snapshot determinism + hash change detection + abort on mismatch  
18–19. Local JSON evidence without secrets; exactly six IDs  
20. Observe not exported from `functions/src/index.ts`  

Also: Functions build, affected Functions tests, full repo lint, `git diff --check`. Studio build only if shared code unexpectedly affects Studio.

---

## Human checkpoints

1. Formal Review (complete — `approved_with_changes`)
2. After six observes + revised report → **STOP for owner review**
3. No refinement signoff in this phase

---

## Risks

| Risk | Mitigation |
|------|------------|
| Pipeline/observe drift | Shared core + parity contract test |
| Accidental design write | No persistence imports; SHA-256 abort |
| Broad unsafe extraction | STOP if entangled; no silent architecture rewrite |
| Secret leakage | Existing gcloud/env pattern only |
| Observe used as bypass | Six-ID + fresh-prints-dev fail-closed |

---

## FreshForge impact

| Area | Impact |
|------|--------|
| Starter Surface | No |
| Development Tooling | Script + internal Functions modules |
| Documentation | Workflow artifacts |

---

## Deliverables

- [x] Audit doc
- [x] This plan (amended R1–R10)
- [x] Formal review — **approved_with_changes**
- [ ] Shared candidate core + pipeline refactor
- [ ] `aiEnrichmentObserve.ts` + script + immutability
- [ ] Parity + guard tests
- [ ] Flagship observe results JSON
- [ ] Updated calibration report + new final recommendation

---

## Rollback

Delete observe/core modules + script; revert pipeline to prior structure if needed. No persisted design changes to revert from observe runs.
