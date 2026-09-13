# WS2 Review: Current-Version Inventory + Reprocess Preview

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Goal | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Workstream | **WS2** — inventory + Preview only (**no Start**) |
| Source SHA | `0424653dcfa28475030da2d63d1611e1380bf48b` (+ uncommitted WS1 tree preserved) |
| Project | **fresh-prints-dev** |
| Method | Preview-equivalent Admin inventory using the same builders as live `previewCatalogReprocessJob` (`buildAiReviewQueueInventory` / `buildReadyCatalogInventory`). No callable Start. No mutations. |
| Raw JSON | `docs/workflow/reviews/2026-09-03-smart-catalog-intelligence-completion-ws2-preview-inventory-raw.json` |
| Verdict | **PASS** |

---

## Live runtime confirmed

| Item | Value |
|------|--------|
| Prompt target | **catalog-enrich-v32** |
| Normalizer target | **smart-profile-normalizer-v6** |
| Schema | **smart-profile-v1** |
| `catalogWorkflowMode` | **shadow** |
| `catalogAutonomousLiveEnabled` | **false** |
| Active reprocess jobs | **none** (AI Review / Ready) |
| Captured at | 2026-09-03T22:45:31.012Z |

---

## AI Review Queue — Inventory + Preview

### Official Preview-equivalent output

| Field | Value |
|-------|--------|
| targetType | `ai_review_queue` |
| targetEnabled | true |
| eligibleCount | **165** |
| alreadyCurrentPipelineCount (prompt==v32 only) | **0** |
| missingProfileCount | **0** |
| requiredConfirmationPhrase | `REPROCESS AI REVIEW QUEUE` |
| activeJobId | null |
| aiReviewNotes | 0 non-empty / 165 scanned → `clear_ok` |

**statusDistribution (eligible set):** `imported: 165`  
**aiReviewStatusDistribution (eligible set):** `needs_review: 165`

**promptVersionDistribution:**

| Version | Count |
|---------|------:|
| catalog-enrich-v29 | 165 |

**normalizerVersionDistribution:**

| Version | Count |
|---------|------:|
| smart-profile-normalizer-v3 | 165 |

**Exclusions (indexed status counts — not eligible for this target):**

| Bucket | Count |
|--------|------:|
| rejectedStatus | 0 |
| readyStatus | 359 |
| archivedStatus | 7 |
| pendingReviewProcessing | 0 |
| eligibleAiReviewQueue | 165 |

**Additional live counts (outside eligible set):**

| Metric | Count |
|--------|------:|
| aiProcessingStage=failed | 0 |
| status=processing | 0 |

### Exact v32/v6 extras (both prompt + normalizer)

| Metric | Count |
|--------|------:|
| schema smart-profile-v1 | 165 |
| exact v32 + v6 | **0** |
| older than current | **165** (all `v29/v3`) |
| missing provenance | 0 |
| staffEditedDimensionKeys present | 0 |
| smartProfileImportPresets present | 0 |
| designs with legacy `tags[]` non-empty | 0 |

### Shadow decision on *current* persisted root fields (pre-reprocess)

Computed with `computeCatalogAutomationDecision` (Shadow, live OFF) against current design docs.

| Metric | Count |
|--------|------:|
| wouldAutoApprove | **0** |
| decision=needs_review | **165** |
| decision=shadow | 0 |
| hard `category_unresolved` | **165** |
| hard `description_missing` | **165** |
| `category_alternatives_present` (soft) | 25 |
| `category_dominant_intent_conflict` | 2 |
| `title:title_missing` | **0** |

**Interpretation:** Every AI Review eligible design currently lacks root `categoryId` and/or `description` (typical Needs Review backlog before approval/enrichment write-back). This is **not** a prediction of post-WS3 Shadow would-auto rates. After v32/v6 reprocess, enrichment is expected to write category/description/Smart Profile; WS3 sample must re-measure Shadow distribution.

Many `structured_evidence_gap:*` codes appear on v29-era profiles (subjects/objects). Post-v32 canonicalization is expected to reduce glue/derivative gaps — another reason WS3 sample is required before Autonomous.

### AI Review reprocess recommendation

**A. Full AI Review v32/v6 reprocess required**

- Scope: **165 / 165** eligible designs (0 already exact v32/v6)
- Target: `ai_review_queue`
- Phrase: `REPROCESS AI REVIEW QUEUE`
- Mode gate: Shadow + Autonomous OFF (already true)
- Notes: `clear_ok` (safe to clear on reprocess path per existing contract)
- Staff SP edits on eligible set: **0** (no anomaly pause)

---

## Ready Catalog — Inventory + Preview

### Official Preview-equivalent output

| Field | Value |
|-------|--------|
| targetType | `ready_catalog` |
| targetEnabled | true |
| eligibleCount | **359** |
| alreadyCurrentPipelineCount (prompt==v32 **and** normalizer==v6) | **13** |
| missingProfileCount | **0** |
| requiredConfirmationPhrase | `REPROCESS READY CATALOG` |
| activeJobId | null |

**statusDistribution:** `ready: 359`  
**aiReviewStatusDistribution:** `approved: 359`

**promptVersionDistribution:**

| Version | Count |
|---------|------:|
| catalog-enrich-v30 | 317 |
| catalog-enrich-v29 | 29 |
| catalog-enrich-v32 | 13 |

**normalizerVersionDistribution:**

| Version | Count |
|---------|------:|
| smart-profile-normalizer-v4 | 317 |
| smart-profile-normalizer-v3 | 29 |
| smart-profile-normalizer-v6 | 13 |

**Pairs:**

| Pair | Count |
|------|------:|
| v30 / v4 | 317 |
| v29 / v3 | 29 |
| v32 / v6 | 13 |

**Exclusions:**

| Bucket | Count |
|--------|------:|
| importedNeedsReview | 165 |
| rejectedStatus | 0 |
| archivedStatus | 7 |
| pendingReviewProcessing | 0 |
| readyNotApproved | 0 |
| eligibleReadyCatalog | 359 |

**Tag density (observation only):** zero=0, low(≤3)=95, high=264 — **all 359 Ready designs carry legacy tags**.

### Human authority / Ready preservation

| Metric | Count / result |
|--------|----------------|
| schema smart-profile-v1 | 359 |
| staffEditedDimensionKeys present | **0** |
| smartProfileImportPresets present | **13** |
| Ready-preservation contract | Confirmed by existing Slice 6 / `ready_backfill` architecture (status/approval/`readyAt` preserved; staff > presets > AI; Halftone/background not overwritten by enrichment) |
| Proposed refresh that must preserve Ready | **346** |

### Ready reprocess recommendation

**A. Ready v32/v6 reconciliation required (full eligible minus already-current)**

- Already exact v32/v6: **13** (skip / already current)
- Refresh scope: **346**
- Phrase: `REPROCESS READY CATALOG`
- Order: after WS3 + owner stratified sample
- Prefer bounded Ready canary before full Start (existing Slice 6 pattern)

---

## Tag / category / Algolia observations (no mutation)

| Observation | Value |
|-------------|-------|
| Approved tag taxonomy size | **1127** |
| AI Review eligible with non-empty `tags[]` | 0 |
| Ready eligible with non-empty `tags[]` | 359 / 359 |
| matchedTags → resolveThemeCategory | **unchanged** (not modified in WS2) |
| Algolia settings / reconcile | **not performed** |
| Planning note | Ready refresh of 346 will eventually re-upsert Algolia via existing Ready sync (no settings change) |

---

## Automation Health historical metrics

WS1 counters (`retries`, `failures`, `publicationFailures`, etc.) that never fired remain absent → Studio “not tracked yet”. Do not invent historical would-auto totals from Health.

---

## Proposed serial order (unchanged)

WS2 Preview **(done)**  
→ **WS3** AI Review Start (165) + owner sample / Shadow re-measure  
→ **WS4** Ready canary then full (346) + owner sample  
→ WS5 Autonomous canary  
→ WS6 broader Autonomous  
→ category matchedTags replacement/parity  
→ tag retirement  

---

## WS3 owner checkpoint (DO NOT EXECUTE)

1. Confirm live still Shadow + Autonomous OFF  
2. Confirm no active `ai_review_queue` job  
3. Preview refresh optional (expect ~165)  
4. Start with exact phrase: **`REPROCESS AI REVIEW QUEUE`**  
5. Eligible scope: **165** designs, all currently `v29/v3`  
6. After completion: stratified sample (subjects, visibleText, titles/descriptions, category write-back, Shadow would-auto distribution)  
7. **STOP** — do not Start Ready until owner authorizes WS4  

Proposed post-run sample size: **≥15** stratified (or owner-chosen), including OCR-heavy + character art + prior evidence-gap cases.

---

## WS4 owner checkpoint (DO NOT EXECUTE)

1. Confirm WS3 sample PASS  
2. Confirm Shadow + Autonomous OFF  
3. Bounded Ready canary (2–10 IDs) covering: v30/v4, v29/v3, already v32/v6 control, import-preset design  
4. Canary PASS → Start phrase: **`REPROCESS READY CATALOG`** for remaining eligible older designs (**346** expected if 13 remain current)  
5. Verify zero Ready demotions / approval lifecycle intact  
6. **STOP** before Autonomous  

---

## Safety checklist

| Action | Result |
|--------|--------|
| AI Review Start | **NO** |
| Ready Start | **NO** |
| Any reprocess mutation | **NO** |
| Autonomous enable | **NO** |
| Tag retirement | **NO** |
| Firebase deploy | **NO** |
| Rules/indexes/Algolia settings | **NO** |
| Commit/push | **NO** |
| Production | **NO** |

---

## Anomalies / notes

1. AI Review official Preview “already current” is **prompt-only** (`alreadyCurrentPipelineCount`); Ready requires **prompt+normalizer**. WS2 extras report exact both for AI Review (**0**).
2. Pre-reprocess Shadow would-auto=0 on AI Review is driven by missing root category/description — expect change after WS3; do not calibrate Autonomous on this snapshot.
3. No `[NEEDS OWNER DECISION]` blocking WS2 closeout. Next decision is owner authorize **WS3 Start**.
