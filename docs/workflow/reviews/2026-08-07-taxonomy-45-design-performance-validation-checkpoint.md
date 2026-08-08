# Manual QA Checkpoint — Taxonomy 45-design performance validation

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Status | **Prepared — not executed** |
| Project | **fresh-prints-dev** |
| Parent follow-up | `taxonomy-read-spike-elimination` |
| Corrective | `taxonomy-trigger-rebuild-corrective` — Signoff **approved_with_notes** |
| Signoff | `docs/workflow/reviews/2026-08-07-taxonomy-trigger-rebuild-corrective-signoff.md` |
| Baseline source | Live 45-design spike ~2026-08-08 00:20–00:24Z + plan §17 |

---

## Goal

Reproduce the prior **45-design import → AI Review** workflow and prove the former full taxonomy hydrates are gone under realistic load.

**Do not start until owner is ready.** This document is prep only.

---

## Baseline to beat (prior run)

### Studio (Firebase Debug, approximate)

| Metric | Prior |
|--------|------:|
| Approximate billable reads | **~1,461** |
| `/tags` | **1,121** |
| `/categories` | **18** |
| designs | **~322** |
| `/imports` | **~90** (~2/design for 45) |
| `/ai-review` | **~1,278** |
| callables | **45** `enqueueAiEnrichment` |

### Server (Cloud Logging)

| Metric | Prior |
|--------|------:|
| AI cold taxonomy hydrate | **1,139** docs (`taxonomy-load-success` documentCount≈1139) |
| Studio taxonomy hydrate | **1,139** (`listTags` pages + `listCategories`) |

### Console shape

Two tall taxonomy-class towers (~**1.3K** then ~**1.4K**).

---

## Instrumentation gap (binding)

Firebase Debug **does not** currently instrument `taxonomyMaterialization` raw `getDoc` calls.

- **Do not** require meta/chunk counts from Studio Debug as pass/fail.
- Prove Studio taxonomy elimination via **0** `/tags` pagination + **0** full `/categories` hydrate on the AI Review consumer path, plus optional disk-cache sanity.
- Prove server via **Cloud Function logs**, not Studio Debug.

---

## Interpretation rule

Do **not** require a flat Firebase Console graph.

Legitimate activity includes: 45 design writes/reads, enqueue/callables, enrichment pipeline work, **one compact materialization load per cold AI instance**, normal Studio design reads.

Any remaining spike must be correlated with Debug + Function logs + timestamps **before** calling FAIL.

---

## Pass criteria

### Studio

- [ ] **NO** 500 + 500 + 121 approved-tag pagination pattern
- [ ] **NO** 18-document category hydrate on normal AI Review taxonomy path
- [ ] No taxonomy fallback/error in Debug
- [ ] Import design reads roughly ~2/design (~90 for 45) unless source proves changed
- [ ] Normal design reads may remain

### Server

- [ ] **NO** `taxonomy-load-success` with `documentCount` ≈ **1139**
- [ ] Cold AI: materialization preferred / O(chunkCount) taxonomy reads (currently **1** chunk expected)
- [ ] Warm same-revision AI: process cache hit; no repeat canonical hydrate
- [ ] No repeated full taxonomy corpus reads per design
- [ ] Retired generated-catalog publishers remain **absent**

### Console

- [ ] No unexplained repeated ~1.1K taxonomy towers
- [ ] Residual spikes attributed before FAIL

### Functional spot-check (light)

- [ ] Valid category on sample designs
- [ ] Approved tag IDs only
- [ ] Aliases/resolver still sensible
- [ ] Max-tag constraints respected
- [ ] Halftone behavior OK
- [ ] No obvious taxonomy quality regression

---

## Manual Test Checkpoint

**Feature / area:** Taxonomy read-spike elimination under 45-design load  
**Why automated tests are insufficient:** Needs live Studio import, AI Review, Console, and Function logs.  
**Environment:** Studio → `fresh-prints-dev`  
**Prerequisites:** owner/admin; Firebase Debug; Console Usage; gcloud/Console Function logs access; **45 designs ready to import** (same class of assets as prior spike test)

### Please reply stage-by-stage

After each stage, reply with the stage letter and evidence before starting the next:

- `45-DESIGN STAGE 1: DONE — [notes]`
- `45-DESIGN STAGE 2: DONE — [notes]`
- `45-DESIGN STAGE 3: DONE — [notes]`
- `45-DESIGN STAGE 4: DONE — [evidence summary]`

Final overall:

- `TAXONOMY 45-DESIGN PERFORMANCE: PASS`
- `TAXONOMY 45-DESIGN PERFORMANCE: FAIL: [description]`
- `TAXONOMY 45-DESIGN PERFORMANCE: PASS WITH NOTES: [notes]`

---

### Stage 1 — Baseline / reset

**Do this first. Stop and report before importing.**

1. Confirm Studio is on **fresh-prints-dev** and signed in as owner/admin.  
2. Open **Firebase Debug**; click **Reset**; leave tracing on.  
3. Optionally note current disk cache revision (should be **2** after corrective):  
   `%APPDATA%\@fresh-prints\studio\taxonomy-cache\v1.json`  
4. Record **Central Time** now → **T1 Debug/reset/start**.  
5. Confirm retired publishers are not expected to run (no action — agent can verify list later).

**Expected:** Clean Debug snapshot; no taxonomy mutation.

Reply: `45-DESIGN STAGE 1: DONE`

---

### Stage 2 — Import 45 designs

1. Record **T2 Upload/import start** (Central Time).  
2. Import **exactly 45** designs through the normal Studio import path used in the prior spike test.  
3. Wait until import finishes successfully.  
4. Record **T3 Upload/import complete**.  
5. In Firebase Debug, note for `/imports` (or import window): design read counts, tags, categories, callables, errors, approximate billable reads.

**Expected:**

- Roughly ~**90** design-related reads (~2/design) unless known change
- **0** full tag pagination / **0** category hydrate attributed to taxonomy spike
- Enqueue/callables may appear as designs enter AI

Reply: `45-DESIGN STAGE 2: DONE` + Debug summary for import

---

### Stage 3 — AI Review

1. Record **T4 AI Review opened**.  
2. Navigate to **AI Review**; let taxonomy UI become usable.  
3. Allow AI processing/review to run for the batch until complete (or clearly settled).  
4. Record **T5 AI processing/review completion**.  
5. Capture Firebase Debug totals for the whole session so far (especially `/ai-review`): tags, categories, designs, callables, fallbacks, errors, approx billable.

**Expected:**

- **No** 1,121-tag / 18-category hydrate pattern
- Callables ≈ **45** `enqueueAiEnrichment` (or explain delta)
- Materialization meta/chunk may show as **0** in Debug (instrumentation gap — OK)

Reply: `45-DESIGN STAGE 3: DONE` + Debug summary

---

### Stage 4 — Evidence capture (after batch complete)

1. Record **T6 Final QA stop**.  
2. Screenshot or note Firebase Console **Usage** graph for **T1–T6** window.  
3. Owner (or agent after your DONE): pull Cloud Logging for AI taxonomy events in that UTC window, looking for:
   - `taxonomy-load-success` / materialization success events  
   - **absence** of documentCount≈1139 canonical hydrate  
   - warm `taxonomy-cache-hit` (or equivalent) on same revision  
   - no `taxonomy-fallback-fs` unless explained  
4. Spot-check **3–5** designs for category, tags, aliases/halftone sanity.  
5. Confirm no publisher revival symptoms (agent can list Functions if needed).

Reply: `45-DESIGN STAGE 4: DONE` + graph notes + spot-check + overall PASS/FAIL phrase

---

## Agent follow-up after owner Stage 4 (not this prep)

Read-only correlate:

1. Studio Debug numbers vs baseline table  
2. Console graph vs former towers  
3. Function logs for cold/warm taxonomy  
4. Publisher absence  
5. Write result record under `docs/workflow/reviews/`

---

## First owner action (when ready)

Say you are starting, then perform **Stage 1 only**:

1. Firebase Debug **Reset**  
2. Record **T1** Central Time  
3. Reply `45-DESIGN STAGE 1: DONE`

Do **not** import until Stage 1 is acknowledged if you want agent checkpointing between stages.

---

## Confirmations (this prep pass)

- NO batch executed  
- NO taxonomy mutation  
- NO implementation  
- NO deploy  
- NO production  
- NO PR merge  

**STOP before Stage 1 begins.**
