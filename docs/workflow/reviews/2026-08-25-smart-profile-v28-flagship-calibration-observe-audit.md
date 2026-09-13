# Audit: Non-Mutating v28 Calibration Path for Ready/Approved Designs

| Field | Value |
|-------|--------|
| Date | 2026-08-25 |
| Reviewer | Implementation Agent (repo inspection) |
| Trigger | Owner approval of calibration-only rerun for six blocked flagship fixtures |
| Verdict | **No safe existing full-v28 observe path** — Plan + Formal Review required before implementation |

---

## Owner requirement (summary)

Run **catalog-enrich-v28** + **smart-profile-normalizer-v2** against six **ready/approved** designs **without**:

- changing `design.status`
- removing ready approval / `readyAt`
- removing from Design Library
- publishing catalog / Algolia state
- overwriting production-facing approved design state

---

## Mechanisms inspected

### 1. `resetAiEnrichmentForProcessing` + `enqueueAiEnrichment`

| Criterion | Result |
|-----------|--------|
| Runs full v28 pipeline | **Yes** |
| Mutates design doc | **Yes** — deletes `smartProfile`, sets `pending`, writes new profile |
| Allowed on ready/approved | **No** — only `needs_review` or `rejected` |
| Suitable | **No** — lifecycle change; owner explicitly rejected widening reset |

**Source:** `functions/src/resetAiEnrichmentForProcessing.ts` (`assertResetEligible`)

---

### 2. `testAiEnrichmentPlayground` / `runAiEnrichmentPlayground`

| Criterion | Result |
|-----------|--------|
| Mutates design doc | **No** — documented: does not write to `designs` |
| Owner/admin gate | **Yes** — `assertOwnerAdminCaller` |
| Accepts design ID | **No** — requires `imageBase64` + `prompt` |
| Full v28 Smart Profile | **No** — returns raw vision `outputText` only |
| Tag rerank pipeline branch | **No** — not invoked in playground vision path |
| `buildDesignSmartProfile` / normalizer v2 | **No** |
| Automation / evidence output | **No** |
| v28 prompt compatible | **Yes** — uses `buildSimpleCatalogEnrichmentUserPrompt` + live settings + vocab snapshot |

**Source:** `functions/src/testAiEnrichmentPlayground.ts`, `functions/src/ai/aiEnrichmentPlayground.ts`

**Conclusion:** Useful **partial** diagnostic (vision JSON only). **Insufficient** for flagship calibration questions (Highland specificity, Jimothy `people`, Smart Profile dimensions, Search Concepts parity).

---

### 3. `testAiEnrichmentTagRerank` / `runAiEnrichmentTagRerankPlayground`

| Criterion | Result |
|-----------|--------|
| Mutates design doc | **No** |
| Full pipeline | **No** — rerank-only; requires prior vision JSON |
| Design ID scoped | **No** |

---

### 4. Catalog reprocess dry-run (`catalogReprocessCallables` / `onCatalogReprocessJobWritten`)

| Criterion | Result |
|-----------|--------|
| Purpose | Bulk job orchestration (Slice 4/5) |
| Runs enrichment on single design | **No** |
| Owner blocked bulk reprocess | **Yes** |

---

### 5. Local script `calibration-run-dev.mjs` (existing)

| Criterion | Result |
|-----------|--------|
| Full v28 pipeline | **Yes** — calls `runAiEnrichmentPipeline` |
| Mutates design doc | **Yes** |
| Suitable for ready/approved | **No** |

---

### 6. Other callables / scripts

No repo-supported **design-ID-scoped observe** callable, shadow-profile writer, or calibration evidence collection path was found in:

- `functions/src/index.ts` exports
- `functions/scripts/` (besides mutating calibration runner)
- Studio AI Review services (all route through reset/enqueue or read persisted profile)

---

## Deploy status (informational)

`testAiEnrichmentPlayground` appears on prior **fresh-prints-dev** deploy allowlists and is likely live, but **even if deployed** it does not satisfy full v28 calibration needs without additional post-processing and still requires manual image extraction per design.

**No new Function deploy is required** for the recommended approach (local observe module + script). Deploy would only be needed if owner later wants a Studio/callable UI — **not proposed in v1**.

---

## Recommended path (for Plan)

**Add a narrow observe entrypoint** in Functions source that:

1. Loads design + preview bytes (read-only on `designs/{id}`)
2. Executes the **same post-vision steps** as `runAiEnrichmentPipelineInternal` through `buildDesignSmartProfile` + automation decision scoring
3. Returns structured calibration evidence (title, description, category, Smart Profile, automation reason codes)
4. Writes **only** to calibration artifact JSON (local script) or optional `calibrationRuns/{runId}` docs — **never** mutates approved design fields

**Invoke via:** owner-run local script on **fresh-prints-dev** (no Cloud deploy for v1).

---

## Six flagship fixture IDs (from inventory — do not substitute)

| # | Slot | Design ID |
|---|------|-----------|
| 1 | animal_highland | `yJm2VBRvecPNjx79aSnK` |
| 2 | animal_jimothy | `6x2LyTvG3ewIePeWHanV` |
| 3 | plant_humor | `KI7Ncd1O9JCuX9uCq505` |
| 4 | profession_nurse | `mZWO3Lsra91EhNRNEkhR` |
| 5 | holiday_santa | `W1bwk4jrCoQFn0OiyiSU` |
| 6 | seasonal | `ltn0gzs2YGXPADqCejr8` |

---

## Next step

**Plan + Formal Review** → `docs/workflow/plans/2026-08-25-smart-profile-v28-flagship-calibration-observe-plan.md`

**STOP** — no implementation until review approval.
