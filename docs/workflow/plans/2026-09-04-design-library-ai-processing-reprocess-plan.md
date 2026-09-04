# Plan: Design Library → AI Processing Reprocess (Ready → AI Review)

| Field | Value |
|-------|-------|
| Date | 2026-09-04 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Parent goal | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Related | WS4 Ready sample PASS WITH NOTES; taxonomy Inspirational Quotes & Affirmations live on DEV |

---

## Goal

Give **owners** a Design Library action that intentionally demotes an approved **Ready** design into the existing **AI Processing → Needs Review** lifecycle so AI-owned enrichment regenerates against the **current** prompt, normalizer, and **owner-curated category taxonomy** — without using Ready Catalog bulk reconciliation (which preserves Ready).

---

## Background

WS4 reconciled Ready designs to **catalog-enrich-v33 / smart-profile-normalizer-v6** while keeping Ready. Owner taxonomy updates (Faith & Worship, **Inspirational Quotes & Affirmations**, Music & Bands) landed after some designs were enriched. Targeted designs (#5, #6, #15 in the WS4 sample) need a fresh AI Review pass against the new categories.

**DEV taxonomy check (2026-09-04):**

| Name | Active | Notes |
|------|--------|-------|
| Inspirational Quotes & Affirmations | yes (`GtVLAGKQcaIHqYFSAG7N`) | Only inspirational quote category — **no duplicate** “Inspirational & Affirmations” |
| Faith & Worship | yes | |
| Music & Bands | yes | |
| Luxury & Fashion Inspired | yes | Unrelated; ignore |

Materialization: `taxonomyMaterialization/meta` **revision 16**, `ready: true`.

---

## Scope

### In Scope

- Owner-only Design Library / Design Details action to send **one** Ready design to AI Processing
- Trusted server callable enforcing owner + Ready eligibility
- Lifecycle demotion into existing Processing → Needs Review path
- Enrichment using current prompt/normalizer + current taxonomy materialization
- Preserve staff Smart Profile edits, import-preset seeds, Halftone/background intake
- Confirmation UX, Studio status reconciliation, tests, docs
- Evaluate multi-select (recommend **no** for MVP)

### Out of Scope

- Customer / Portal UI
- Autonomous / WS5
- Ready Catalog bulk Start
- Tag / matchedTags retirement
- Algolia settings / Rules / indexes / production
- Hardcoded category names in app logic
- Taxonomy seeding in source
- Automatic periodic reprocess

---

## Affected Areas

### Files / Modules (expected — [REPO CHECKED])

| Area | Paths |
|------|--------|
| Studio UI | `apps/studio/.../designs/components/DesignDetailsModal.tsx`, Design Library page/hooks as needed |
| Studio service / hook | New thin service under `features/designs/services/` + hook; `permissionService.ts` |
| Callable | New Functions export (name TBD, e.g. `reprocessReadyDesignToAiReview`) |
| Shared validation | Prefer small helpers in `packages/shared` or `functions/src/ai/` |
| Enrichment write | `functions/src/ai/aiEnrichmentPipeline.ts`, `smartProfileEnrichmentWrite.ts` (staff preserve on queue write for this path) |
| Existing (do **not** call as-is) | `resetAiEnrichmentForProcessing.ts` (deletes `smartProfile`), `enqueueAiEnrichment.ts` (blocks Ready) |
| Docs | `BACKEND.md` / `DATA_MODEL.md` / `DECISIONS.md` as needed |

### Architecture Impact

- [x] Details: Component → Hook → Service → Callable. No client Firestore business writes for demotion.

### Security Impact

- [x] Details: **Owner-only** UI + **owner-only** callable (stricter than staff `canRerunAiSuggestions`). Independent server assert.

### Data Model Impact

- [x] Details: Reuse existing `status` / `aiReviewStatus` / `aiProcessingStage`. No new collections. Optional audit field (see decisions).

### Backend Impact

- [x] Details: New callable + Functions deploy; reuse `runAiEnrichmentPipeline` queue mode with staff-aware merge.

### UI / UX Impact

- [x] Details: Design Details (primary); optional overflow on library card later. Manual QA required.

### Migration Impact

- [x] None required for MVP (no schema migration). Optional additive audit field only if owner chooses.

---

## Answers to required planning questions

| # | Question | Answer |
|---|----------|--------|
| 1 | Ready fields | `status === "ready"` ∧ `aiReviewStatus === "approved"` |
| 2 | AI Processing | `(status imported\|processing)` ∧ `aiReviewStatus === "pending"` (+ `aiProcessingStage` pipeline) |
| 3 | Needs Review | `status === "imported"` ∧ `aiReviewStatus === "needs_review"` |
| 4 | Existing rerun for NR/Rejected | Studio “Reprocess” → `resetAiEnrichmentForProcessing` then staff Start; or Catalog Reprocess queue |
| 5 | Reuse that core for Ready? | **NO as-is** — reset/enqueue **block Ready**; reset **deletes `smartProfile`** (would wipe staff/presets) |
| 6 | Narrow server action? | **YES** — new owner callable: demote Ready → Processing eligibility + enqueue enrichment with **staff/preset-preserving** clear |
| 7 | Approval metadata while in AI Review | Leave Ready path: design is **not** Ready. `readyAt` not rewritten until Approve. Current `aiReviewed*` cleared on demotion (same as reset). |
| 8 | Prior approval retained? | **No durable approval history array today.** `readyAt` is overwritten on next Approve. **[NEEDS OWNER DECISION]** whether to add `previousReadyAt` / activity log. |
| 9 | Disappear from Design Library? | **YES** immediately when `status` leaves `ready` (library scopes Ready only) |
| 10 | Portal/public while re-reviewed? | **YES removed from public Ready catalog** — Algolia `deleteObject` when `status !== "ready"` |
| 11–12 | Print Request items | **IDs retained**; existing line items not cascade-deleted; **new** adds blocked until Ready again |
| 13–15 | Algolia | Auto-delete on leave Ready; **Approve** republishes via existing sync; **no** settings changes |
| 16 | Reset vs preserve | Clear: `aiSuggestions`, `aiAnalysis`, review audit, processing stage. Preserve: artwork, tags, counts, companions, Halftone/bg, `smartProfileImportPresets`, staff SP dimensions (via merge). |
| 17 | Root title/desc/category | **Recommend retain** on demotion (like catalog reprocess preserved keys); AI Review shows new values in **`aiSuggestions`**; Approve writes roots. **[NEEDS OWNER DECISION]** if owner prefers clear roots. |
| 18 | Staff SP | Must **not** use reset’s `smartProfile` delete. Snapshot prior staff keys; on pipeline write use `mergeReadyBackfillSmartProfile`-equivalent for this path. |
| 19 | Import presets | Keep `smartProfileImportPresets`; merge via existing `mergeQueueSmartProfileWithImportPresets` / ready-style merge; staff-cleared presets stay cleared via seed sync rules |
| 20 | Halftone/bg | Untouched (preserved field set) |
| 21 | Category staff ownership | **Not represented** in `staffEditedDimensionKeys` (category excluded; Edit Design owns root `categoryId`). **[NEEDS OWNER DECISION — CATEGORY HUMAN AUTHORITY]** |
| 22–25 | Taxonomy | Category taxonomy writes rebuild materialization + bump revision; AI cache revision-aware — **no fixed 15m wait**. Studio can read `taxonomyMaterialization/meta.revision` / `ready` before QA. Single-design MVP. Library multi-select is **print-request only** — **not** reuse without expansion → **single only**. |
| 26 | Confirmation copy | See Approach |
| 27–29 | Failure | Enrichment failure → `aiProcessingStage=failed` (or recoverable pending); design stays **out of Ready**; owner retries via existing AI Review Processing retry / Reprocess once in NR/Rejected path after success lands NR |
| 30–35 | Tests / deploy / Rules | See Test Strategy & Deploy; Rules/indexes/migration/Algolia settings: **none** expected |

---

## Approach

### Proposed user flow

1. Owner opens **Design Library** → Design Details for a Ready design  
2. Owner clicks **Send to AI Processing** (proposed label; alt: “Reprocess in AI Review”)  
3. Modal confirmation (exact copy below)  
4. Callable demotes + enqueues enrichment  
5. Design leaves Design Library / Portal; appears in **AI Processing**, then **Needs Review**  
6. Owner/admin reviews suggestions (category should pick up current taxonomy, e.g. Inspirational Quotes & Affirmations)  
7. **Approve** → Ready again (republish); **Reject** → normal Rejected path  

### Exact confirmation copy (proposed)

> **Send to AI Processing?**  
> This Ready design will leave the Design Library and customer catalog until you approve it again in AI Review.  
> AI title, description, category suggestions, and AI Smart Profile fields will regenerate using the current enrichment version and category taxonomy.  
> Staff Smart Profile edits, import presets, artwork, and print settings are kept.  
> Existing print requests that already include this design are not deleted.  
>  
> Type / confirm: **SEND TO AI PROCESSING**

(Formal Review may shorten; keep consequences explicit.)

### Backend (narrow)

1. **`reprocessReadyDesignToAiReview`** (name TBD) — `onCall`, **owner-only**  
2. Preconditions: `status=ready` ∧ `aiReviewStatus=approved`; Autonomous irrelevant (always demote)  
3. Transactional update:  
   - `status: "imported"`  
   - `aiReviewStatus: "pending"`  
   - clear suggestions/analysis/review actor fields  
   - **do not delete** `smartProfile` wholesale; strip AI-only blobs as needed OR clear stage and let pipeline rewrite with staff merge  
   - set `aiProcessingStage: "queued"`  
4. Call `runAiEnrichmentPipeline(designId, key, { mode: "queue" })` with **staff+preset merge** (extend queue write to call `mergeReadyBackfillSmartProfile` when prior has staff keys and/or always for this entrypoint)  
5. Success → existing queue landing → `needs_review`  
6. Algolia / Portal: existing `onDocumentWritten` delete when not Ready  

### Permissions

| Layer | Rule |
|-------|------|
| UI | New `permissionService.canReprocessReadyDesignToAiReview(user)` → **owner only** |
| Callable | `assertOwnerCaller` (not staff) |

### Single vs multi-select

**Single-design MVP only.** Design Library multi-select is request-selection, not AI batch. Porting AI Review multi-select would expand scope — Formal Review should reject auto-batch.

### Targeted QA designs (after implement)

1. `74BdnNQuNWz0N0GaL4CO` → expect **Inspirational Quotes & Affirmations**  
2. `8QpQFWwwfM21WEimy6Vm` → same  
3. `FRP1L0K6AKq2hrgGnOxX` → same  
4. Regression: clear Faith & Worship; clear Music & Bands; Pop Culture non-music  

---

## [NEEDS OWNER DECISION]

1. **CATEGORY HUMAN AUTHORITY** — Root `categoryId` is not staff-provenance-tracked. On reprocess, AI suggestions may propose a new category; Approve would overwrite root category. Confirm: for this tool, **always allow AI category suggestion to replace root on Approve** (staff can edit category in AI Review before Approve). If some Ready categories must be locked, need new provenance before implement.  
2. **Root title/description/category during demotion** — Plan default: **retain** roots; new values live in `aiSuggestions` until Approve. Confirm or request clear-on-demote.  
3. **Approval audit** — Confirm OK that `readyAt` / `aiReviewed*` reset on re-approve with **no** historical array, **or** require additive `previousReadyAt` / activity event.  
4. **Button label** — “Send to AI Processing” vs “Reprocess in AI Review”.  
5. **Admin access** — Owner-only confirmed? (Plan assumes **owner only**.)

---

## Test Strategy

### Automated

| Check | Focus |
|-------|--------|
| Unit | Eligibility: Ready-only; reject imported/processing/rejected |
| Unit | Clear payload never deletes staff keys / preset seed / Halftone fields |
| Unit | Queue write path preserves staff dimensions when prior has keys |
| Contract | Callable owner-only; staff denied |
| Studio | Permission gate; confirmation required |

### Manual (DEV)

| Step | Expected |
|------|----------|
| Owner sees action on Ready Details | Visible |
| Admin/helper | Hidden / callable denied |
| Confirm → Processing → Needs Review | Leaves Library; Algolia deleted |
| Staff-edited Ready (e.g. Jimothy) | Staff dimensions survive |
| Preset Dolly | Seed values survive |
| Approve | Back to Ready; Algolia upsert |
| Reject | Rejected path intact |
| Taxonomy QA trio + Faith/Music/Pop regressions | Categories match intent |

---

## Human Checkpoints

- Owner decisions above before/during implement  
- DEV deploy of new callable after implement  
- Manual QA on three WS4 designs  
- **No** production; **no** WS5  

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Accidental mass demotion | Owner-only + single-design + strong confirm |
| Staff SP wipe | Do not call existing reset; staff merge on write |
| Public gap while in review | Intended; document for owner |
| Print requests show unavailable design | Existing behavior; items retained |
| Taxonomy stale cache | Revision-aware peek already shipped |

Rollback: disable UI + undeploy/disable callable; designs mid-flight stay recoverable via AI Review.

---

## WS4 disposition (this workflow)

Record owner QA: **PASS WITH NOTES** — #5/#6/#15 taxonomy re-test pending after this feature + current categories. **Do not** authorize WS5.

---

## Open Questions

See [NEEDS OWNER DECISION] above. Non-blocking for Formal Review; blocking for Implement until answered.
