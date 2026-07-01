# Architecture Decision Records — Fresh Prints

> Log significant technical and process decisions. Newest first.

---

## Decisions

### ADR-FP-038: AI Processing approved taxonomy prompt context

| Field | Value |
|-------|-------|
| Date | 2026-06-30 |
| Status | accepted |

**Decision**

1. Keep the ADR-FP-036 single-call, playground-style AI Processing request path and prompt version
   `catalog-enrich-openai-v17`.
2. Expand the saved Settings prompt placeholders before the OpenAI call:
   `{{approved_categories}}` becomes active category names with descriptions,
   `{{approved_tags}}` becomes approved tag names with aliases and preferred-when guidance, and
   `{{excluded_tags}}` becomes the effective exclusion list.
3. Require the prompt contract to choose one approved category and approved tag names first.
4. Allow AI to return `suggestedNewTags` only when no approved tag name or alias is relevant
   enough. Each suggested tag must include `name`, `aliases`, `preferredWhen`, and `reason`.
5. Keep backend normalization as the final guard: approved tag names and aliases resolve to
   `aiSuggestions.tags`; invalid suggestions or suggestions that duplicate approved names/aliases
   are rejected before staff review.

**Consequences**

Positive: AI can use the same category descriptions, aliases, and preferred-when guidance staff use
without creating approved tags automatically.

Tradeoff: Prompt size now scales with the approved taxonomy library. If latency or token pressure
returns, the next phase should add retrieval or taxonomy chunking instead of weakening validation.

---

### ADR-FP-037: Global approved tag library

| Field | Value |
|-------|-------|
| Date | 2026-06-30 |
| Status | accepted |

**Decision**

1. Add a global `tags` Firestore collection for approved tag definitions with `name`, `aliases`,
   `preferredWhen`, `status`, and audit fields.
2. Keep design documents unchanged: `designs.tags` remains `string[]`; no tag migration or
   backfill is part of this phase.
3. Tags are not owned by categories. Category records do not contain tag lists or `categoryHints`.
4. Tag Management lives in Design Library. Owner/admin may create, edit, and archive tags;
   owner-only bulk import accepts strict flat JSON only.
5. Cloud Functions normalize AI tag output against approved tag names and aliases. Matched values
   persist to `aiSuggestions.tags`; unmatched values persist to `aiSuggestions.suggestedNewTags`.
6. AI never creates approved tag documents automatically. Owner/admin may approve suggested-new-tags
   from AI Review.

**Consequences**

Positive: AI and staff tagging share one approved vocabulary without changing existing design tag
storage or category behavior.

Tradeoff: Legacy/freeform design tags remain searchable/filterable alongside approved tags until a
future explicitly approved migration/backfill phase.

---

### ADR-FP-036: Settings prompt template + Processing reset re-run

| Field | Value |
|-------|-------|
| Date | 2026-06-29 |
| Status | accepted |

**Decision**

1. Keep the AI Playground unchanged as a one-off testing tool.
2. Extend `settings/aiEnrichment` with an owner/admin-editable AI Processing `promptTemplate`.
   The saved template must contain `{{approved_categories}}`, `{{approved_tags}}`, and
   `{{excluded_tags}}`; the server replaces them with approved taxonomy context and the effective
   base + Settings exclusion list immediately before the OpenAI call.
3. Narrow live AI Processing output from ADR-FP-035's five-field v17 shape to four catalog fields:
   `description`, `category`, `title`, and `tags`.
4. Reduce live AI Processing tags from 10 to 8 and keep server-side single-word, lowercase,
   dedupe, generic-word, and exclusion filtering after parsing.
5. Add a Processing-tab settings control beside Auto advance for on-the-fly model and reasoning
   overrides. Manual processing uses the current override or Settings default. Auto advance
   snapshots the resolved model/reasoning when the run starts.
6. Change Needs Review and Rejected **Re-run AI Suggestions** to reset the design back to Processing
   instead of running AI in place. The reset clears prior AI output and waits for staff to start the
   next Processing run.

**Why**

The playground-proven request pattern is strongest when the production path stays equally simple:
one image call, a short prompt, explicit model/reasoning, tolerant JSON extraction, no forced
`response_format`, and no extra quality/OCR/model-escalation round trips. Staff still reviews every
result before catalog publish.

**Consequences**

Positive: AI Processing prompt tuning can happen from Settings without changing code; staff can pick
stronger or cheaper model/reasoning combinations per processing session; review tabs are simpler and
no longer host a live re-run overlay/session path.

Tradeoff: historical suggestions may still contain older `confidence` or `aiAnalysis.visibleText`
data, but new live AI Processing writes only the catalog suggestion fields needed for review plus
provider/model/prompt metadata.

---

### ADR-FP-035: Playground-style single-call AI Processing (catalog prompt v17)

| Field | Value |
|-------|-------|
| Date | 2026-06-29 |
| Status | accepted |

**Superseded note:** ADR-FP-036 keeps the ADR-FP-035 single-call request pattern but narrows the live
output contract from five fields to four (`description`, `category`, `title`, `tags`) and caps tags
at 8.

**Decision**

1. Rebuild live AI Processing around the lightweight Settings AI Playground request shape: one
   server-side OpenAI call, a short instruction-only prompt, and tolerant server-side JSON parsing.
2. Remove forced `response_format: { type: "json_object" }` from the catalog AI Processing call.
   The model returns JSON from instructions alone; the server extracts the first JSON object
   (handles fenced/prose-wrapped output).
3. Replace the heavy v16 structured contract (15 keys + consistency rules) with a 5-field contract:
   `visibleText`, `description`, `title`, `tags`, `confidence`. Bump prompt version to
   `catalog-enrich-openai-v17` (dev `catalog-enrich-dev-v17`).
4. Keep one normal OpenAI call on success. No empty-output retry, no quality retry. Keep only the
   reasoning-effort 400 fallback and the 429/5xx network retry.
5. Enforce tag rules server-side after parsing: single words, lowercase, dedupe, drop generic
   words, apply tag exclusions (also injected into the prompt), cap at 10
   (`OPENAI_SIMPLE_ENRICHMENT_MAX_TAGS`).
6. Clamp `confidence` to 0–1; default to 0.7 only when the model omits/garbles it
   (`OPENAI_SIMPLE_ENRICHMENT_DEFAULT_CONFIDENCE`). Store on `aiSuggestions.confidence`.
7. Store visible text on the existing `aiAnalysis.visibleText` field (no new persisted field).
   `aiSuggestions` keeps title/description/tags/confidence/provider/model/promptVersion/generatedAt.
8. Resolve category deterministically via the existing `resolveCatalogCategory` (no extra model
   call); leave category undefined when nothing matches and let staff set it in AI Review.
9. Keep model allowlist, reasoning-effort default (`medium`), token cap (2500),
   client/server timeouts, `detail: "high"`, model override, and staff review all unchanged.

**Why**

At equal model + `medium` effort, the playground returns quickly and reliably while AI Processing
hit `OpenAI returned no visible output (reason: length)` on complex designs. Root cause: the heavy
structured-output requirement plus `response_format` exhausted the 2500-token budget during
reasoning before any JSON was emitted. Shrinking the output and dropping `response_format` fixes the
error at its source without changing effort, model, cap, or timeouts.

**Consequences**

Positive: AI Processing now mirrors the playground — one fast call, no `length` errors expected for
typical runs, simpler parsing. Supersedes ADR-FP-034 item 6 (prompt version) and the v16 prompt on
the live path.
Tradeoff: AI no longer returns rich analysis fields (theme/style/audience/colorPalette) or
prompt-driven category matching; these were not rendered by AI Review. The v16 prompt/parser/retry
modules remain in the repo as tested utilities for back-compat and can be removed in a later cleanup.

---

### ADR-FP-034: Saved reasoning effort + Settings AI playground + compact rerun menu

| Field | Value |
|-------|-------|
| Date | 2026-06-29 |
| Status | accepted |

**Decision**

1. Extend `settings/aiEnrichment` with a saved `reasoningEffort` field.
2. Allow only `none`, `minimal`, `low`, `medium`, and `high`; set `medium` as the default.
3. Keep validation server-side and retry once with `low` only when the current OpenAI request path rejects the selected effort.
4. Add an owner/admin-only Settings AI playground callable for one-off text + image testing without writing to `designs` or mutating saved settings.
5. Replace the visible AI Review rerun model selector with a compact `Re-run AI` action menu while preserving the existing one-off override contract.
6. Preserve `catalog-enrich-openai-v16`, default model `gpt-5.4-nano-2026-03-17`, lowest-cost option `gpt-5-nano-2025-08-07`, stronger option `gpt-5.4-mini-2026-03-17`, and server-side `detail: "high"` image behavior.

**Consequences**

Positive: Staff now have controlled reasoning tuning, a safe server-side playground for maintenance testing, and a less cluttered AI Review rerun UI.
Tradeoff: AI enrichment configuration now spans saved settings, a compatibility fallback path, and a second callable surface, so docs and targeted tests need to stay aligned.

---

### ADR-FP-033: GPT-5.4 Mini allowlist and one-off AI Review override

| Field | Value |
|-------|-------|
| Date | 2026-06-29 |
| Status | accepted |

**Decision**

1. Add `gpt-5.4-mini-2026-03-17` to the server allowlist and `/settings` model options.
2. Keep `gpt-5.4-nano-2026-03-17` as the default and recommended high-volume model.
3. Keep `gpt-5-nano-2025-08-07` as the lowest-cost selectable option.
4. Allow AI Review re-runs to send a one-off `visionModelIdOverride` without mutating global saved settings.
5. Validate overrides server-side, persist the resolved model on `aiSuggestions.model`, and clear transient queue metadata after the run.
6. Preserve prompt target `catalog-enrich-openai-v16` and server-side `detail: "high"` image behavior.

**Consequences**

Positive: Staff can choose a stronger model for selective manual re-runs without changing the team default or exposing model control to the client beyond allowed ids.
Tradeoff: AI Review rerun flow now spans renderer UI, callable validation, and pipeline cleanup, so regression coverage must stay in place.

---

### ADR-FP-032: GPT-5.4 Nano as default high-volume vision model

| Field | Value |
|-------|-------|
| Date | 2026-06-29 |
| Status | accepted |

**Decision**

1. Promote `gpt-5.4-nano-2026-03-17` to the default OpenAI vision model when no saved override exists.
2. Keep `gpt-5-nano-2025-08-07` available as the lowest-cost selectable option.
3. Do not add `gpt-5.4-mini` until an exact supported snapshot ID is verified in repo-controlled configuration/docs.
4. Keep the existing server-side Chat Completions pipeline and add `detail: "high"` on the image input for more predictable catalog-analysis fidelity.
5. Preserve the current prompt target from repo state: `catalog-enrich-openai-v16`.

**Consequences**

Positive: Better default cost/accuracy balance for high-volume catalog enrichment while preserving the cheaper manual option.
Tradeoff: Existing saved settings remain respected, so teams may still see older models until they switch settings intentionally.

---

### ADR-FP-031: Catalog enrichment prompt v16 observed-image-first contract

| Field | Value |
|-------|-------|
| Date | 2026-06-29 |
| Status | accepted |

**Decision**

1. Keep the existing OpenAI Chat Completions transport, retries, and queue behavior unchanged.
2. Upgrade the prompt contract to an observed-image-first structure: read text first, identify visible subject/style/colors second, derive catalog metadata third.
3. Explicitly separate observed image facts from inferred catalog metadata inside the prompt wording.
4. Tighten anti-hallucination guidance: do not invent unreadable text; omit or lower confidence when uncertain.
5. Bump prompt version to `catalog-enrich-openai-v16` for stored auditability in `aiSuggestions.promptVersion`.

**Consequences**

Positive: Clearer alignment with current vision-analysis best practices while preserving the stable server pipeline.
Tradeoff: Output distribution may shift on future AI runs, so prompt version tracking remains required for QA comparisons.

---

### ADR-FP-030: Phase 6 Print Request foundation, request counters, and deferred indexes

| Field | Value |
|-------|-------|
| Date | 2026-06-29 |
| Status | accepted |

**Context**
The Phase 6 Print Requests foundation is implemented ahead of stale roadmap text. The implementation creates request lists, request items, guest customers, and a Design Library request-selection mode. `printRequestService.addPrintRequestItem` increments `designs.requestCount` and `designs.lastRequestedAt`; Firestore rules exist for Phase 6 collections, but `firestore.indexes.json` does not yet include Print Request indexes.

**Decision**

1. Treat `requestCount` and `lastRequestedAt` as lightweight request reference metadata allowed in Phase 6.
2. These fields are analytics-adjacent but do not change design lifecycle status, do not imply printing, and do not implement Phase 10 dashboards.
3. Production state remains on `printRequestItems` and future `printRunItems`, never on `designs.status`.
4. Keep current broad collection reads for the Phase 6 foundation only; add server-side Print Request queries and indexes as a hardening follow-up before large request volume.
5. No Phase 7, Portal, ecommerce, shipping, payment, Whatnot, or analytics dashboard work is introduced by this decision.

**Consequences**
Positive: Staff can see request popularity metadata as requests are built without polluting catalog lifecycle status.
Tradeoff: Broad reads are acceptable for the foundation but must be revisited for scale.
Follow-up: Add targeted tests for `printRequestService` and server-side indexed request queries.

---

### ADR-FP-029: Catalog enrichment prompt v15 + validation hardening

| Field | Value |
|-------|-------|
| Date | 2026-06-26 |
| Status | accepted |

**Decision**

1. **Prompt v15:** Cleaner system/user prompts with explicit JSON field formats; `visibleTextColor` requested as array in prompt.
2. **Parse layer:** `catalogEnrichmentResponse.ts` coerces messy model output (string arrays, string booleans, confidence clamping).
3. **Consistency:** `artworkContainsText` synced from `visibleText`; `textOnlyArtwork` corrected when illustration indicators present.
4. **Category:** `resolveCatalogCategory` exact match then keyword remap; omit when confidence low; retry before remap on first pass.
5. **Retry:** Unified `shouldRetryCatalogEnrichment` (max one quality retry at `reasoning_effort: low`) plus existing empty-output cap retry.
6. **Storage:** `visibleTextColor` array collapsed to existing enum (`black` \| `white` \| `mixed` \| `unknown`).
7. **Reasoning:** First pass stays `minimal`; optional bump to `low` deferred pending latency measurement.

---

### ADR-FP-028: Dual-arc OCR validation + Re-run overlay stepper

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Superseded note:** ADR-FP-036 supersedes the Needs Review in-place re-run behavior. Tag exclusions
remain, but current AI Processing replaces `{{excluded_tags}}` inside the Settings prompt template
and review-tab re-runs now reset the design back to Processing.

**Decision**

1. **Prompt v14:** Dual-arc OCR examples, homophone guardrails, character-by-character user prompt reinforcement.
2. **Server validation:** `isImplausibleVisibleText` flags merged/gibberish/homophone drift; one-shot retry with `reasoning_effort: low`; description `/` phrase fallback before `visible_text_low_quality` log.
3. **Re-run overlay:** `isRerunInProgress` forces queued/waiting stepper (step 1 active) until Firestore stages update — mirrors Processing optimistic enqueue.

---

### ADR-FP-027: Rejected tab actions navigate to target inbox tab

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Decision:** **Reopen for Review** on Rejected navigates to Needs Review with the same `designId` selected. **Re-run AI Suggestions** on Rejected navigates to Processing with the same design selected. Handoff uses `pendingCrossTabSelectionRef` so tab-change effects do not reset selection to the first queue item.

---

### ADR-FP-026: AI catalog descriptions required with server synthesis fallback

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Decision:** Prompt v13 requires non-empty descriptions. Server `resolveCatalogDescription` rejects placeholders (`-`, `—`, `N/A`, etc.) and empty post-sanitize strings, synthesizing copy from visible text, subject/style, title, or a generic fallback. Pipeline re-checks before `markAiSuccess`. Event `catalog.enrich.description_fallback` logged when synthesis runs.

---

### ADR-FP-025: AI processing latency — minimal reasoning default + timing logs

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Decision**

1. **Reasoning effort:** Primary `minimal` on Processing path (reverts ADR-FP-023 default for speed). Use `low` only on empty-output retry (4000-token cap) or when model rejects `minimal`.
2. **Timing logs:** Pipeline phases log `durationMs`, `totalPipelineMs`, and `loggedAtMs`; OpenAI requests log `openai.request.started` and `openai.completion.usage` with `durationMs` and token breakdown.
3. **Runtime cache:** Settings and active categories cached in function instance memory (60s TTL); cleared on settings update.
4. **Client UX:** Optimistic "Queuing AI processing…" stepper before Firestore `queued` stage.
5. **Deferred:** `minInstances` and callable→pipeline direct invoke require human approval for production.

**Tradeoff:** Faster median runs; OCR on arched text may rely on retry path more often. Monitor `openai.empty_content` with `willRetry: true`.

---

### ADR-FP-024: Black/White Text title suffix — text-only designs only

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Decision:** Append `Black Text` or `White Text` to catalog titles only when `textOnlyArtwork === true` and ink is single-color black/white. Server strips suffix when not text-only (fail-closed). Prompt v15 adds `textOnlyArtwork` field.

---

### ADR-FP-023: Prompt v11 OCR quality + reasoning effort low + re-run overlay

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Decision**

1. **Prompt v11:** Multi-segment `visibleText`; description sentence 1 joins all phrases with ` / ` before art copy; category must match theme.
2. **Reasoning effort:** Primary `low` (was `minimal`) for better OCR on arched text — slightly higher cost per run; 4000-token empty-output retry unchanged.
3. **Monitoring:** Log `catalog.enrich.description_text_mismatch` when description sentence 1 lacks overlap with `visibleText[0]` (warning only).
4. **Re-run UX:** Needs Review overlay on preview with stepper; Processing tab unchanged.

---

### ADR-FP-021: Settings-managed tag exclusions + Needs Review re-run AI

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Decision**

1. **Tag exclusions:** `BASE_AI_TAG_EXCLUSIONS` (code, non-removable) merged with `settings/aiEnrichment.additionalTagExclusions` (owner/admin). Effective list injected per pipeline run into prompt and `normalizeAiTags`.
2. **Re-run AI:** Needs Review **Re-run AI** button calls `enqueueAiEnrichment` with `rerunFromReview: true` — in-place regeneration, no Processing queue navigation. Staff may trigger; unsaved draft requires confirm.

---

### ADR-FP-020: Analysis canvas omitted from catalog copy; AI tag exclusion list v1

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Context**  
Vision AI receives designs composited on neutral grey analysis canvas (`prepareAiAnalysisImage`). Models described "gray background" in catalog copy. Skeleton/skull art produced morbid tags (`death`, `skull`) unsuitable for apparel search.

**Decision**

1. Prompt **v9** instructs models to ignore analysis canvas in description, `colorPalette`, and tags.
2. Server post-processing: `sanitizeCatalogDescription`, `filterBackgroundColorsFromPalette`.
3. Maintainable **`AI_TAG_EXCLUSIONS`** in `aiTagExclusions.ts` — injected into prompt and filtered in `normalizeAiTags` (exact token match).
4. Titles/descriptions may still mention skull when accurate; **tags** must avoid exclusion list.

**Consequences**  
Functions redeploy required. Exclusion list changes require code deploy until future settings UI.

---

### ADR-FP-019: GPT-5 nano reasoning token budget for vision enrichment

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Context**  
GPT-5 nano snapshots are reasoning models. `max_completion_tokens: 600` counted hidden reasoning tokens; HTTP 200 responses often had empty `message.content` while gpt-4o-mini worked with `max_tokens: 550`.

**Decision**

1. Vision requests: `reasoning_effort: "minimal"` (fallback `"low"` if unsupported), `OPENAI_VISION_MAX_COMPLETION_TOKENS = 2500`.
2. One-shot retry at 4000 tokens when `finish_reason: length` and reasoning tokens ≥ 90% of cap.
3. Empty content: log `openai.empty_content` with usage/reasoning breakdown; user-safe error; `openai_empty_output` or `openai_token_budget_exhausted`.
4. Keep dated nano allowlist and Settings model switch — do not revert to gpt-4o-mini in this phase.

**Consequences**  
Higher per-request token cap vs prior 600; lower reasoning waste vs default effort. Functions redeploy required.

---

### ADR-FP-018: Configurable dated OpenAI vision model snapshots

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Context**  
Staff need to A/B test speed vs accuracy between two dated nano snapshots without code deploys.

**Decision**

1. Team setting in Firestore `settings/aiEnrichment.visionModelId` with server allowlist: **`gpt-5.4-nano-2026-03-17`** (default), **`gpt-5-nano-2025-08-07`** (lowest-cost alternate).
2. Owner/admin changes model in **Settings** (`/settings`) via callable `updateAiEnrichmentSettings`; invalid values rejected or fall back to default on read.
3. **AI Processing** shows read-only active model label for all staff; per-design `aiSuggestions.model` records the model used.
4. No model switch on Processing action bar; no API keys in settings.

**Consequences**  
Functions + Firestore rules deploy required. Helpers see active model on AI Processing but cannot change it.

---

### ADR-FP-017: GPT-5 Chat Completions params + per-design retry only

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Context**  
After switching to `gpt-5.4-nano`, OpenAI returned HTTP 400 because Chat Completions for GPT-5 family reject `max_tokens` (requires `max_completion_tokens`). Error bodies were discarded, showing only "status 400" in UI. Sequential one-at-a-time queue made bulk **Retry All Failed** redundant.

**Decision**

1. Use **`max_completion_tokens: 600`** (not `max_tokens`) in vision enrichment requests; minimal payload (`model`, `messages`, `response_format`).
2. Parse OpenAI `error.message` on failure; persist in `aiSuggestions.errorMessage`; map HTTP 400 to `openai_invalid_request`.
3. Remove **Retry All Failed** from Processing tab; keep **Retry AI Processing** for the selected failed design only.

**Consequences**  
Functions redeploy required. Operators see actionable OpenAI errors when requests fail.

---

### ADR-FP-016: OpenAI vision model gpt-5.4-nano for catalog enrichment

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Context**  
High-volume catalog AI processing (~1024×1024 preview WebP). Staff pricing analysis: `gpt-5.4-nano` is ~5× cheaper per image than `gpt-4o-mini` for this workload; `gpt-5.4-mini` remains a higher-quality fallback for a future escalation tier.

**Decision**

1. Default production vision model: **`gpt-5.4-nano`** (`OPENAI_VISION_MODEL_ID` in `functions/src/ai/aiEnrichmentConfig.ts`).
2. Keep prompt **`catalog-enrich-openai-v8`** unless QA shows regression.
3. **No auto-escalation** to mini in this phase — manual ADR if quality gaps require it.

**Consequences**  
Functions redeploy required. Compare Needs Review output vs prior `gpt-4o-mini` runs on diverse designs before production signoff.

---

### ADR-FP-015: Single-word AI catalog tags only

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Status | accepted |

**Decision:** AI enrichment persists **single-word** lowercase catalog tags only (5–12 per design). `normalizeAiTags` tokenizes provider output, drops stopwords, and does **not** inject visible-text phrases. Prompt `catalog-enrich-openai-v8`. Staff may add multi-word tags manually at approve time within existing 40-character limits.

---

### ADR-FP-014: Staff-controlled sequential AI processing queue

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Status | accepted |
| Deciders | Product owner + architecture/security review |

**Context**  
Bulk import auto-enqueued every design, spawning up to 10 concurrent Cloud Function instances and causing OpenAI **429** rate limits. Processing tab filled with failures before staff could review.

**Decision**

1. **No auto-enqueue on import** — after derivatives, designs remain `aiReviewStatus: pending` with no `aiProcessingStage` until staff acts.
2. **Processing tab queue controls** — **Auto advance** (sessionStorage): **Start AI** / **Pause AI** runs sequential queue; OFF shows **Process image with AI** for one-at-a-time manual stepping.
3. **Retry UX** — **Retry AI Processing** for the selected failed design only (bulk **Retry All Failed** removed in ADR-FP-017).
4. **Concurrency** — `AI_ENRICHMENT_MAX_INSTANCES = 1` for manual-queue era; OpenAI retry (2× backoff) unchanged.

**Consequences**  
Staff must open AI Processing after batch import. Throughput is slower but reliable; 429 storms avoided in normal use.

---

### ADR-FP-013: Batch import 500 PNG cap + discovery summary clarity

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Decision:** `MAX_BATCH_FILES = 500`, `MAX_ZIP_ENTRIES = 2000`. Discovery summary exposes `processed`, `skippedByLimit`, and ZIP skip reasons (`zipsSkippedByLimit` vs `zipsSkippedOther`). Design library list limit (100) unchanged — document only.

---

### ADR-FP-012: ZIP import limit 2.1 GB (Google Drive parts)

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Decision:** `MAX_ZIP_SIZE_BYTES = floor(2.1 × 1024³)` for Select ZIP, folder ZIP discovery, and nested ZIP extraction. Supports staff workflows that download large Drive folders as ~2 GB ZIP parts. `MAX_EXTRACTED_BYTES` (10 GB) unchanged.

---

### ADR-FP-011: AI title rules v7 and batch enrichment concurrency

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |
| Deciders | Product owner + architecture review |

**Context**  
Production QA: text-only designs titled `"Text"` despite correct descriptions; 61-design batch left Processing tab with PENDING/FAILED mix.

**Decision**

1. **Prompt v7** (`catalog-enrich-openai-v7`): OCR-first; forbid generic titles when readable text exists; `visibleText[0]` is primary phrase.
2. **Server-side `resolveCatalogTitle`**: reject generic tokens; prefer `visibleText`; description quoted-text fallback; 6-word cap for long slogans.
3. **Pipeline concurrency**: `maxInstances: 10` (one OpenAI request per design); not full serialization — staff observe queue drain in Processing tab.
4. **Retries**: 2 automatic retries with exponential backoff on OpenAI 429/5xx.
5. **Stale recovery**: re-enqueue when active `aiProcessingStage` unchanged >10 minutes.
6. **UX**: batch import surfaces enqueue failures; Processing tab **Retry All Failed** (owner/admin).

**Consequences**  
- Positive: Meaningful text-only titles; fewer silent enqueue failures; self-throttling on rate limits  
- Trade-off: Higher concurrent OpenAI usage during large batches; requires functions deploy  

---

### ADR-FP-010: Raised batch import size limits (PNG, ZIP, extract)

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Status | accepted |
| Deciders | Product owner (managed phase) |

**Context**  
Staff hit the 200 MB ZIP cap and needed headroom for large print PNGs during batch import (Select Images, Select ZIP, Select folder).

**Decision**

| Constant | Value |
|----------|-------|
| `MAX_SINGLE_PNG_SIZE_BYTES` | 150 MB |
| `MAX_ZIP_SIZE_BYTES` | 1 GB |
| `MAX_EXTRACTED_BYTES` | 10 GB (explicit; exceeds derived `min(100×PNG, 2.5×ZIP)` = 2.5 GB) |

ZIP extraction continues entry-by-entry (streamed); cumulative extract budget is the guard. `MAX_BATCH_FILES`, `MAX_FOLDER_ZIPS`, and `MAX_NESTED_ZIP_DEPTH` unchanged. Error messages use `shared/utils/importLimitMessages.ts`. `storage.rules` must be deployed to Firebase before uploads above the prior 50 MB cap succeed in production.

**Consequences**  
- Positive: Real-world archives import without silent folder ZIP skips at 200 MB  
- Trade-off: Higher peak renderer memory (~300 MB with `UPLOAD_CONCURRENCY=2`); larger temp extract disk use up to 10 GB per ZIP job  
- Security: Zip-slip, compression ratio, and entry count limits unchanged  

---

### ADR-FP-009: Fresh Prints Studio three-workspace model and AI Review Inbox

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Status | accepted |
| Deciders | Architecture review (Phase 5 refinement) |

**Context**  
Phase 4 separated Design Library (approved catalog) from operational import workflow. Phase 5 architecture needed final simplification before implementation: queue naming, automatic AI, review drafts, confidence routing, and approval UX.

**Decision**

1. **Three workspaces:** Imports (`/imports`), AI Review (`/ai-review`), Design Library (`/designs`) — each with a single responsibility and no overlap.
2. **AI Review is the Inbox:** Every imported design lands in AI Review until approved or rejected. Design Library never shows imported or rejected designs.
3. **Automatic AI:** After import + derivatives, enqueue AI enrichment without manual "Generate AI" for new imports.
4. **Queue tabs:** **Processing** (UI) maps to `aiReviewStatus: pending`; **Needs Review**; **Rejected** (retain terminology — designs not deleted).
5. **No Firestore review drafts:** Approval Mode uses temporary form state; Approve persists to catalog fields via `catalogApprovalService`.
6. **Confidence informational only:** No auto-routing or auto-publish based on confidence scores.
7. **AI version tracking from day one:** `provider`, `model`, `promptVersion`, `generatedAt` on `aiSuggestions`.

**Consequences**  
- Positive: Simpler schema; predictable queue flow; faster review UX; maintainable Phase 5 implementation  
- Trade-off: Form state lost on hard refresh unless optional sessionStorage (5E)  
- References: `docs/workflow/plans/phase-5-ai-review-architecture-plan.md`, `docs/workflow/reviews/phase-5-ai-review-architecture-review.md`

---

### ADR-FP-008: Official application naming — Fresh Prints Studio and Fresh Prints Portal

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Status | accepted |
| Deciders | Project team |

**Context**  
ADR-FP-007 established two applications and no native mobile, but documentation used inconsistent terms (Desktop Admin App, Customer Web Portal, Customer Website, etc.).

**Decision**  
Official product names:

1. **Fresh Prints Studio** — Electron desktop; staff only (owner, admin, helper).
2. **Fresh Prints Portal** — mobile-first responsive web; customers only.

Fresh Prints Portal is the permanent mobile solution. Optional PWA install is still the Portal, not a third app. All future roadmap planning assumes only these two applications unless a future ADR changes this.

**Consequences**  
- Positive: Stable vocabulary; clear staff vs customer branding  
- Follow-ups: Active docs updated; historical signoffs unchanged; code routes/folders not renamed by this ADR  
- Full record: `docs/architecture/ADR-Application-Platform-Strategy.md`

---

### ADR-FP-007: Two-application platform (no native mobile)

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Status | accepted (naming superseded by ADR-FP-008) |
| Deciders | Project team |

**Context**  
Documentation referenced a future standalone mobile application alongside staff desktop and customer web surfaces.

**Decision**  
Fresh Prints consists of **two applications only**. No native iOS, Android, React Native, Flutter, Xamarin, or MAUI application. Responsive web is the permanent mobile strategy.

Official names: see **ADR-FP-008** (Fresh Prints Studio, Fresh Prints Portal).

**Consequences**  
- Positive: Clear scope; shared Firebase backend; no duplicate mobile codebase  
- References: `docs/architecture/ADR-Application-Platform-Strategy.md`, ADR-FP-006

---

### ADR-FP-006: Business model and workflow realignment

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Status | accepted |
| Deciders | Project team (manual workflow review) |

**Context**  
Phase 4A and earlier roadmap docs conflated design catalog lifecycle with production queue status, treated customer requests as order-like workflows, and positioned AI review filters in Design Library. Manual review clarified Fresh Prints is a design catalog and print planning system — not ecommerce, shipping, fulfillment, or order payment.

**Decision**  
1. **Design Library** = approved catalog browse only (search, category, tags, archived toggle).  
2. **AI Review** = import enrichment queue (Phase 5); sidebar + import navigation in Phase 4 cleanup.  
3. **Print Request / Print Run** = production planning on items, not designs (Phases 6–7).  
4. **Custom Request** = separate Q&A + Etsy referral + optional design fee (Phase 9).  
5. **Fresh Prints Portal** = mobile-first responsive web only; `role: customer` does not access Fresh Prints Studio (Phase 8).  
6. Renumber roadmap phases 4–10 per `docs/workflow/reviews/roadmap-realignment-review.md`.

**Resolved (2026-06-24 cleanup planning):** OD-5 Design Library defaults to `ready` only — **yes**. OD-6 AI Review as dedicated sidebar — **yes**.

**Consequences**  
- Positive: Clear entity boundaries; Phase 4A search/filter mostly reusable  
- Follow-ups: Phase 4 cleanup (remove status/AI filters from library); Phase 5–10 plans per new sequence  
- References: `docs/workflow/plans/customer-print-request-and-print-run-architecture-plan.md`

---

### ADR-FP-005: AppForge documentation structure

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Status | accepted |
| Deciders | Project team |

**Context**  
Fresh Prints adopted the AppForge workflow starter. Documentation needed a stable layout separating project docs from workflow artifacts.

**Decision**  
Use `docs/project/`, `docs/architecture/`, `docs/standards/`, `docs/intake/`, and `docs/workflow/{plans,reviews,setup}/`. Keep `docs/AI_RULES.md` and `docs/WORKFLOWS.md` at docs root.

**Consequences**  
- Positive: Managed phase, intake, and bootstrap workflows align with AppForge  
- Follow-ups: Historical phase docs may retain old paths (acceptable as archive)

---

### ADR-FP-004: Import derivatives in Electron main process

| Field | Value |
|-------|-------|
| Date | 2026-06-20 |
| Status | accepted |
| Deciders | Phase 3C signoff |

**Context**  
Thumbnail/preview generation requires native image processing (`sharp`). Renderer must not perform filesystem or native processing.

**Decision**  
Generate WebP derivatives in `electron/` main process; upload via renderer Firebase services.

**Consequences**  
- Positive: Layer boundaries preserved  
- Negative: Native module build complexity on Windows dev machines

---

### ADR-FP-003: Firebase as sole backend

| Field | Value |
|-------|-------|
| Date | `[INFERRED]` early foundation |
| Status | accepted |

**Decision**  
Use Firebase Auth, Firestore, Storage, and Cloud Functions as the only production backend. No separate REST API for core operations.

---

### ADR-FP-002: Feature-based renderer organization

| Field | Value |
|-------|-------|
| Date | `[INFERRED]` Phase 1 |
| Status | accepted |

**Decision**  
Organize React code under `src/renderer/src/features/{domain}/` with `components/`, `hooks/`, `services/`, `types/`, `pages/`.

---

### ADR-FP-001: Electron + Vite desktop admin first

| Field | Value |
|-------|-------|
| Date | `[INFERRED]` project start |
| Status | accepted (product naming superseded by ADR-FP-008) |

**Decision**  
Build the operational staff application as Electron desktop first (**now: Fresh Prints Studio**); customer surface as responsive web (**now: Fresh Prints Portal**), sharing Firebase and `shared/` types.

---

## Historical Note

AppForge starter template ADRs (ADR-001 through ADR-004 in prior template) described the **AppForge development repository**, not Fresh Prints product decisions. They are not applicable to this target project and were removed during intake.

---

## Revision History

| Date | Summary |
|------|---------|
| 2026-06-30 | ADR-FP-038: AI Processing approved taxonomy prompt context |
| 2026-06-24 | ADR-FP-009: Three-workspace model; AI Review Inbox; no persisted review drafts; confidence informational only |
| 2026-06-24 | ADR-FP-008: Fresh Prints Studio + Fresh Prints Portal naming |
| 2026-06-24 | Fresh Prints ADRs added; AppForge starter ADRs removed |
