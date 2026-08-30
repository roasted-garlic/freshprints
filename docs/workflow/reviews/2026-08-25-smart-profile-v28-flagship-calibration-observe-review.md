# Formal Review: Smart Profile v28 Flagship Calibration Observe Plan

| Field | Value |
|-------|--------|
| Date | 2026-08-25 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-25-smart-profile-v28-flagship-calibration-observe-plan.md` |
| Audit | `docs/workflow/reviews/2026-08-25-smart-profile-v28-flagship-calibration-observe-audit.md` |
| Verdict | **approved_with_changes** |

---

## Summary

The observe approach is the correct alternative to widening reset lifecycle: a **local, non-deployed, read-only enrichment path** for six approved flagship fixtures on **fresh-prints-dev** only.

Repo inspection confirms **no existing** full-v28 observe mechanism. The plan direction is sound, but implementation is **not ready** until the binding requirements below are incorporated. **Do not implement** from the plan as written without addressing duplication risk, strict guards, immutability proof, and explicit side-effect exclusion.

---

## Owner lock audit (10 questions)

| # | Question | Answer |
|---|----------|--------|
| 1 | Is the entire observe path write-free? | **Not yet** — achievable only if implementation excludes all pipeline persistence helpers (see §1) |
| 2 | Is secret handling safe and repo-aligned? | **Yes**, if implementation copies `calibration-run-dev.mjs` pattern (env from session / `gcloud secrets`; no files, args, or logs) |
| 3 | Is candidate generation equivalent to v28 pipeline? | **Not yet** — requires shared extraction + parity contract test; plan’s “duplicate orchestration acceptable” is **rejected** |
| 4 | Are Automation Health / vocab refresh / Algolia side effects excluded? | **Not yet** — must explicitly bypass `incrementCatalogAutomationHealth`, `maybeRefreshSmartProfileVocabSnapshot`, and all design writes |
| 5 | Is six-ID + fresh-prints-dev guard fail-closed? | **Not yet** — plan says “optional allowlist”; owner requires **mandatory** hard-coded six-ID set |
| 6 | Is before/after immutability proven? | **Not yet** — plan checks few fields; owner requires **deterministic deep snapshot hash** |
| 7 | Is no Cloud deploy required? | **Yes** — module internal only; **must not** export from `functions/src/index.ts` |
| 8 | Is local JSON the only calibration output write? | **Not yet in plan** — owner forbids `calibrationRuns` Firestore docs in v1 |
| 9 | Are exactly six AI observations bounded? | **Yes** in intent — must hard-code six IDs; no outer retry loop |
| 10 | Can implementation proceed without lifecycle architecture change? | **Yes** — observe path preserves approved design state |

---

## §1 Zero business-state writes — call graph audit

### Pipeline persistence side effects (MUST NOT run in observe)

| Helper | Writes | Source |
|--------|--------|--------|
| `updateAiProcessingStage` | `designs/{id}` — `aiProcessingStage`, `updatedAt` | `designAiFields.ts` |
| `markAiFailure` | `designs/{id}` — stage, `aiSuggestions`, etc. | `aiEnrichmentPipeline.ts` |
| `markAiSuccess` | `designs/{id}` — `smartProfile`, `aiSuggestions`, `aiAnalysis`, lifecycle fields, optional `readyAt` | `aiEnrichmentPipeline.ts` |
| `incrementCatalogAutomationHealth` | `settings/catalogAutomationHealth` counters | `catalogAutomationHealth.ts` |
| `maybeRefreshSmartProfileVocabSnapshot` | `settings/aiSmartProfileVocab` (via `refreshSmartProfileVocabSnapshot`) | `refreshSmartProfileVocabSnapshot.ts` |

### Safe read-only helpers (MAY use in observe)

| Helper | Behavior |
|--------|----------|
| `adminDb.collection("designs").doc(id).get()` | Read |
| `adminStorage` preview download | Read |
| `loadCachedAiEnrichmentSettings` | Read settings + in-process cache |
| `loadCachedActiveCategories` / `loadCachedApprovedTags` | Read taxonomy snapshot + cache |
| `loadSmartProfileVocabSnapshot` | Read `settings/aiSmartProfileVocab` + in-process cache |
| `prepareAiAnalysisImage` | Pure transform |
| `provider.enrichDesign` | External Gemini API only |
| `callTagRerank` / `callSuggestedTagAuthorStandalone` | External API only (verified: no Firestore in providers) |
| `resolveAiCatalogTags`, `resolveThemeCategory` | Pure |
| `buildDesignSmartProfile` | Pure |
| `computeCatalogAutomationDecision` | Pure (shared package) |
| `runTargetedCatalogVerifier` | Pure |
| `logPipelineEvent` | Logging only |

### Algolia / catalog publication

No Algolia client in enrichment hot path. Catalog/Algolia sync is triggered by **design document writes**. Observe that performs **zero design writes** does not trigger Algolia or catalog publication side effects.

### v1 output writes

**Allowed:** local JSON only (`docs/workflow/reviews/_calibration-flagship-observe-results.json`).

**Forbidden:** `calibrationRuns/*` Firestore docs, any design/settings mutation.

**Verdict on lock §1:** Plan must bind explicit bypass of all five persistence helpers. Observe path is **not write-free until implemented accordingly**.

---

## §2 Secret handling

### Existing repo pattern (approved)

`functions/scripts/calibration-run-dev.mjs`:

1. `$env:GEMINI_API_KEY` set in **shell session** from `gcloud secrets versions access latest --secret=GEMINI_API_KEY --project=fresh-prints-dev`
2. Fallback `execSync(gcloud ...)` inside script
3. Key passed in-memory to pipeline function only

This aligns with `docs/architecture/FIREBASE.md` (Secret Manager; never commit keys).

### Required implementation constraints

- **No** committed `.env`, plaintext key files, or CLI `--gemini-key=...` arguments
- **No** logging/printing of key or full `execSync` stdout
- **No** Firestore-stored secrets
- Reuse `resolveGeminiKey()` pattern from calibration runner (extract to shared script helper if desired)

**Verdict on lock §2:** Safe and repo-aligned **if** above constraints are binding. No new secret storage approach required.

---

## §3 Pipeline parity without drift

### Finding

`runAiEnrichmentPipelineInternal` (~500 lines) interleaves candidate generation with persistence. Plan’s fallback “duplicate orchestration” would create a **silent fork** — **not approvable**.

### Required approach (binding)

1. **Extract** shared read-only core, e.g. `generateAiEnrichmentCandidateForDesign(...)` in `functions/src/ai/aiEnrichmentCandidateCore.ts` (name flexible).
2. **Refactor** `runAiEnrichmentPipelineInternal` to call core → then persist via existing helpers.
3. **Observe** calls core only — never imports `markAiSuccess`, `markAiFailure`, `updateAiProcessingStage`, `incrementCatalogAutomationHealth`, `maybeRefreshSmartProfileVocabSnapshot`.
4. **Add parity contract test** (e.g. `aiEnrichmentObserve.contract.test.ts`): for a fixture design, core output matches pre-persist candidate shape from pipeline refactor (mock provider or recorded fixture acceptable per `TESTING.md` patterns).

**Verdict on lock §3:** **approved_with_changes** — extraction + contract test are **mandatory**, not optional.

---

## §4 No observe-specific vocab refresh

`maybeRefreshSmartProfileVocabSnapshot` must **not** be called from observe path.

Observe may call `loadSmartProfileVocabSnapshot` (read-only; may populate **in-process** cache only — acceptable).

**Verdict on lock §4:** Satisfied by explicit exclusion binding.

---

## §5 Automation decision purity

`computeCatalogAutomationDecision` in `packages/shared/src/utils/catalogAutomationDecision.ts` is **pure** — no Firestore, no side effects.

The **write** is separate: pipeline calls `incrementCatalogAutomationHealth` **after** computation (`aiEnrichmentPipeline.ts` ~699–708).

Observe may call `computeCatalogAutomationDecision` and attach results to **local candidate output only**.

**Verdict on lock §5:** Satisfied if `incrementCatalogAutomationHealth` is excluded from observe (binding).

---

## §6 Strict DEV + six-ID guards

Plan’s “optional allowlist” is **insufficient**.

### Binding guards (module + script)

```text
FIREBASE_PROJECT_ID === "fresh-prints-dev"  (fail closed)
designId ∈ {
  yJm2VBRvecPNjx79aSnK,
  6x2LyTvG3ewIePeWHanV,
  KI7Ncd1O9JCuX9uCq505,
  mZWO3Lsra91EhNRNEkhR,
  W1bwk4jrCoQFn0OiyiSU,
  ltn0gzs2YGXPADqCejr8
}
```

- No CLI override flag for arbitrary IDs in v1
- No production project switch
- Guards enforced in **both** `aiEnrichmentObserve.ts` and `calibration-flagship-observe-dev.mjs`

**Verdict on lock §6:** **approved_with_changes** — mandatory hard-coded allowlist.

---

## §7 Approved-design immutability proof

Plan’s “re-read design doc — fields unchanged” is **insufficient**.

### Binding immutability protocol

**Before observe:**

1. Read full design document
2. Serialize **business snapshot** (canonical JSON):
   - `status`, `aiReviewStatus`, `readyAt`, `title`, `description`
   - `categoryId`, `categoryName` (if present)
   - `smartProfile`, `aiSuggestions`, `aiAnalysis`
   - `aiProcessingStage`, `aiProcessed`, `aiReviewed`, `aiReviewedAt`, `aiReviewedBy`
   - `aiReviewConfidence`, `aiReviewVersion`, `aiReviewNotes`
   - `updatedAt` (ISO string)
3. Compute stable hash (e.g. SHA-256 of canonical JSON)

**After observe:**

1. Re-read design document
2. Recompute hash
3. **If hash differs:** mark run **FAILED**, log diff keys, **STOP** remaining observes (fail-closed on mutation)

Store before/after hashes in local JSON evidence.

**Verdict on lock §7:** **approved_with_changes** — deep snapshot hash required.

---

## §8 No Cloud export / deploy

- `aiEnrichmentObserve.ts` — internal module only
- **Must not** appear in `functions/src/index.ts`
- Execution: local script → compiled lib → six observations → local JSON

**Verdict on lock §8:** Approved as planned.

---

## §9 Cost / retry bound

- Exactly **six** observations (one per flagship ID)
- Provider-internal retry (`fetchVisionWithRetry`, etc.) may remain
- **No** outer multi-sample loop per design
- **No** re-observe on success
- On fixture failure: record error; continue to next fixture **only** if immutability hash unchanged (per-design isolation)

**Verdict on lock §9:** Approved with binding six-ID loop only.

---

## §10 Candidate output only

Observe result is **calibration candidate** — title, description, category, tags, Smart Profile, automation decision/reason codes, visible text, provider/model/provenance.

**Never** merged into approved design document.

**Verdict on lock §10:** Approved.

---

## Required plan amendments (binding for implementation)

| ID | Requirement |
|----|-------------|
| R1 | Extract `generateAiEnrichmentCandidateForDesign` shared core; refactor pipeline to use it |
| R2 | Observe module calls core only; **never** import/call persistence helpers listed in §1 |
| R3 | Add parity contract test for core vs pipeline candidate generation |
| R4 | Hard-code six design IDs + `fresh-prints-dev` fail-closed in module and script |
| R5 | Immutability: canonical business-field snapshot + SHA-256 before/after; STOP on mutation |
| R6 | Local JSON output only — **remove** plan reference to optional `calibrationRuns` Firestore docs |
| R7 | Secret handling: reuse env/`gcloud` pattern; no files, CLI args, or key logging |
| R8 | Do **not** export observe from `functions/src/index.ts`; no Firebase deploy |
| R9 | Script loops exactly six IDs once; no wildcard mode |
| R10 | On immutability failure: abort remaining observes |

---

## Architecture / security / scope

| Check | Result |
|-------|--------|
| Lifecycle architecture unchanged | ✅ |
| No reset widening | ✅ |
| No bulk reprocess / Slice 5/6 | ✅ |
| Owner-only diagnostic (local script) | ✅ |
| FreshForge starter surface impact | None |
| Human checkpoint after observe run | Required (calibration report update) |

---

## Verdict

### approved_with_changes

Implementation may proceed **only after** binding requirements R1–R10 are reflected in the plan (or treated as authoritative from this review).

**Implementation is NOT ready** from the plan document alone due to:

- Optional allowlist vs mandatory six-ID guard
- Permitted duplication vs required shared core + parity test
- Weak immutability check vs required deep hash
- Optional Firestore calibration docs vs local JSON only

---

## Next step

1. Amend plan with R1–R10 (or implement agent treats this review as binding).
2. **Implement** observe module + script + contract test.
3. Run six observations → update calibration report → **STOP** for owner review.

**Do not:** deploy Functions, run observations, sign off refinement, or start Slice 5/6.
