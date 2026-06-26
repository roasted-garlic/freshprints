# Plan: AI Catalog Title Quality + Batch Processing Reliability

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | `docs/workflow/reviews/ai-title-batch-reliability-review.md` |

---

## Goal

1. **Problem A:** Text-only / text-dominant designs must get meaningful catalog titles from visible wording (e.g. *"I'm Not Arguing I'm Just"*) — never generic labels like `"Text"`.
2. **Problem B:** Bulk imports (~61 designs) must drain the Processing queue reliably within **30 minutes**, with **≤2 automatic retries** on transient OpenAI errors, actionable failure messages, and staff-visible enqueue errors.

---

## Background

Production QA (2026-06-25): 61-image batch import left Processing tab with mix of **PENDING** and **AI FAILED**. Example design: typographic slogan resolved to title **"Text"** while description correctly transcribed wording (`catalog-enrich-openai-v6`, `gpt-4o-mini`).

Previous phase (import size limits) is DONE.

---

## Investigation Findings (code + architecture)

> **Cloud Logging / Firestore sampling:** Not available in this planning session. Human should run queries below during manual QA to confirm production correlation. Code analysis supports hypotheses below.

### Problem A — Title `"Text"` root cause (confirmed in code)

| Finding | Evidence |
|---------|----------|
| `resolveCatalogTitle()` only uses `visibleText` when array is non-empty | `buildTitleFromVisibleText` returns `""` if `visibleText` missing/empty (`catalogTitleRules.ts`) |
| Generic `candidateTitle` ("Text") is accepted when `visibleText` empty | Fallback loop returns first non-filename `candidateTitle` without generic-title rejection (`catalogTitleRules.ts` L224–239) |
| Prompt v6 says "2-6 Title Case words" | Models may collapse long slogans to generic `"Text"` (`CATALOG_ENRICHMENT_SYSTEM_PROMPT` L11) |
| No description fallback for title | `openAiVisionEnrichmentProvider.ts` does not pass `description` into `resolveCatalogTitle` |
| `visibleText` may be empty while description transcribes text | Provider parses both independently; model can omit `visibleText` array |

**Conclusion:** Fix requires **prompt v7** + **server-side `resolveCatalogTitle` hardening** (generic rejection, `visibleText` priority, description fallback). Re-run AI required for already-processed designs (old `promptVersion` preserved on doc).

### Problem B — Batch backlog root cause (strong hypothesis)

| Finding | Evidence |
|---------|----------|
| **No concurrency limit** on Firestore trigger | `onDesignAiEnrichmentQueued` has no `maxInstances`, `timeoutSeconds`, or `memory` (`enqueueAiEnrichment.ts` L122–146) |
| **61 parallel invocations** on bulk import | Each successful import calls `enqueueAfterImport` fire-and-forget (`importOrchestrationService.ts` L250–256); batch uses same path (`importBatchOrchestrationService.ts`) |
| **Enqueue failures silent to staff** | `.catch` only `console.error` + `logPipelineEvent("enqueue.callable.failed")` — not in batch summary UI |
| **OpenAI errors not retried** | `callOpenAiVision` throws on non-OK status; no backoff (`openAiVisionEnrichmentProvider.ts` L56–57) |
| **Stuck intermediate stages possible** | If function times out/crashes after `updateAiProcessingStage("sending_to_ai")`, doc may never reach `failed` or `ready_for_review` |
| **Enqueue skip for in-flight** | `enqueue.skipped` when `currentStage` not `failed`/`ready_for_review`/empty — stuck `sending_to_ai` blocks retry (`enqueueAiEnrichment.ts` L84–91) |

**Likely failure modes for 61-design batch:**
1. OpenAI **429 / 5xx** from parallel requests → `pipeline.failed` with status in message
2. Function **timeout** (default 60s) during image prep + API call
3. **Enqueue never ran** → `aiProcessingStage` undefined, `aiReviewStatus: pending` → UI shows PENDING
4. **Stuck stage** → PENDING/waiting forever, retry blocked by `already_processing`

### Required human Cloud investigation (manual QA checkpoint)

Run in Firebase Console → Functions → Logs (filter `ai-pipeline`):

```
jsonPayload.event=("pipeline.failed" OR "pipeline.completed" OR "enqueue.queued" OR "enqueue.skipped" OR "trigger.fired" OR "enqueue.callable.failed")
```

Sample **3 failed + 3 stuck-pending** `designs/{id}` fields:
- `aiProcessingStage`, `aiSuggestions.errorCode`, `aiSuggestions.errorMessage`
- `previewPath`, `thumbnailPath`, `updatedAt`, `aiReviewVersion`

Correlate `errorMessage` with `OpenAI request failed with status 429|5xx|504`.

---

## Scope

### A. Text-only / text-dominant title rules — IN

| Item | Detail |
|------|--------|
| Prompt v7 | Update `CATALOG_ENRICHMENT_SYSTEM_PROMPT`; bump to `catalog-enrich-openai-v7` / `catalog-enrich-dev-v7` |
| Prompt rules | NEVER generic titles when readable text exists; `visibleText` must list primary phrase(s); title = primary visible wording |
| `isGenericCatalogTitle()` | Reject: Text, Typography, Quote, Words, Label, Saying, Lettering, Font, Type, Slogan, Caption, Title, Words Art, etc. |
| `resolveCatalogTitle()` | Reject generic `candidateTitle` when `artworkContainsText` or `visibleText`/`description` indicate text; prefer `visibleText[0]` or longest non-generic phrase (6-word cap via `normalizeCatalogTitle`); description quoted-text fallback |
| Long slogan rule (locked) | First **6 words** of most prominent line, e.g. *"I'm Not Arguing I'm Just"* |
| Tests | `catalogTitleRules.test.ts` — cases from acceptance criteria |
| Dev provider parity | `developmentAiEnrichmentProvider.ts` |

### B. Batch AI reliability — IN (minimal fix set)

| Item | Detail | Rationale |
|------|--------|-----------|
| **Controlled concurrency** | `onDesignAiEnrichmentQueued`: `maxInstances: 10` (tunable) | Parallel single-image OpenAI calls; user observes queue drain; backoff on 429 |
| **Increase resources** | `timeoutSeconds: 180`, `memory: "512MiB"` | Reduce timeout failures on large previews |
| **OpenAI retry** | Max **2** retries, exponential backoff on 429/5xx/network | Product locked |
| **Structured error codes** | Parse OpenAI status into `errorCode` (`openai_rate_limited`, `openai_server_error`, `openai_timeout`) | Actionable UI |
| **Stale job recovery** | Designs `aiReviewStatus: pending` + stage in active set + `updatedAt` > **10 min** → callable may force re-queue (owner/admin) OR scheduled `recoverStaleAiJobs` | Unblocks stuck `sending_to_ai` |
| **Enqueue error surfacing** | Collect `enqueue.callable.failed` per design in batch import result; show warning count + link to Processing | Staff visibility |
| **Bulk retry failed** | Processing tab: "Retry all failed" (owner/admin) — re-enqueue designs with `aiProcessingStage: failed` | Optional but in scope |
| **Enqueue await option** | Batch import: track enqueue promises; don't block upload but aggregate failures in summary | Minimal client change |

### OUT

- Category list / workspace layout changes
- Full Cloud Tasks / redesign of import pipeline
- Customer portal
- Automatic re-process of all v6 designs (staff re-run only)

---

## Affected Files

| File | Change |
|------|--------|
| `functions/src/ai/catalogTitleRules.ts` | Prompt v7, generic rejection, description fallback, long-phrase handling |
| `functions/src/ai/catalogTitleRules.test.ts` | New test cases |
| `functions/src/ai/providers/openAiVisionEnrichmentProvider.ts` | Pass description/artworkContainsText; retry wrapper |
| `functions/src/ai/providers/developmentAiEnrichmentProvider.ts` | Parity |
| `functions/src/enqueueAiEnrichment.ts` | Function options; stale-stage re-queue allowance |
| `functions/src/ai/aiEnrichmentPipeline.ts` | Richer failure codes; optional stale timestamp |
| `functions/src/ai/openAiRetry.ts` (new) | Shared retry helper |
| `src/renderer/src/features/imports/services/importOrchestrationService.ts` | Return enqueue result / failure |
| `src/renderer/src/features/imports/services/importBatchOrchestrationService.ts` | Aggregate enqueue failures |
| `src/renderer/src/features/imports/components/batch/BatchImportResultPanel.tsx` | Show AI enqueue warning |
| `src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts` | Bulk retry failed |
| `src/renderer/src/features/ai-review/pages/AiReviewPage.tsx` | Bulk retry button |
| Docs | `WORKFLOWS.md`, `FIREBASE.md`, `DECISIONS.md` |

---

## Approach

### Phase A — Title quality

1. Bump prompt version to **v7** with explicit anti-generic-title + `visibleText` requirements.
2. Add `GENERIC_CATALOG_TITLE_TOKENS` + `isGenericCatalogTitle(title)`.
3. Add `extractPrimaryWordingFromDescription(description)` — first quoted string or first sentence.
4. Update `getPrimaryVisibleTextTitle`:
   - Prefer longest non-generic phrase; if >6 words, `normalizeCatalogTitle` truncates to 6.
5. Update `resolveCatalogTitle(input)` signature:
   ```ts
   artworkContainsText?: boolean;
   description?: string;
   ```
   - If `visibleText` path empty and text indicated → try description fallback before accepting `candidateTitle`.
   - Reject generic candidates when text present.
6. Update providers to pass new fields.
7. Unit tests for all acceptance cases.

### Phase B — Batch reliability

1. Configure trigger:
   ```ts
   onDocumentUpdated({
     document: "designs/{designId}",
     secrets: [openAiApiKeySecret],
     timeoutSeconds: 180,
     memory: "512MiB",
     maxInstances: 1,
   }, ...)
   ```
2. Implement `callOpenAiWithRetry(fetchFn, { maxRetries: 2, baseDelayMs: 2000 })`.
3. Map errors in `markAiFailure` to specific `errorCode` when message contains status 429/5xx.
4. **Stale recovery in enqueue callable:** Allow re-queue when `currentStage` is active AND `updatedAt` older than 10 minutes (or `aiProcessingStage` undefined + derivatives ready + imported > 10 min).
5. **Client:** `importValidatedPngFile` returns `enqueueResult?: { queued: boolean; error?: string }`; batch summary shows `aiEnqueueFailedCount`.
6. **Bulk retry:** `retryAllFailedProcessing()` in inbox hook — parallel callable with concurrency 3 (client-side throttle) for failed stage only.

### SLA math (61 designs, 30 min target)

- OpenAI vision = **one image per API request** (no multi-image batch in current provider).
- **Parallelism** = concurrent Cloud Function instances, each processing one design.
- With `maxInstances: 10` and ~5–15s per design: 61 designs ≈ **4–8 minutes** typical.
- Retries on 429 temporarily reduce effective concurrency (self-throttling).

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Functions unit tests | `cd functions && npm run build && node --test lib/functions/src/ai/catalogTitleRules.test.js` | yes |
| Typecheck | `npx tsc --noEmit` | yes |
| Lint | `npx eslint .` | yes |
| Functions build | `cd functions && npm run build` | yes |

### Manual (human checkpoint)

1. Re-run AI on 5 text-only designs (including "I'm not arguing..." example) → title uses visible wording
2. Import batch of 20+ designs → record Processing drain time, failure count, Cloud Logs
3. Confirm failed designs show actionable `errorMessage`; single retry succeeds for simulated 429 (if testable)

---

## Human Checkpoints

- [x] **Product decisions locked** — 30 min SLA, 2 retries, 6-word title rule
- [ ] **OpenAI spend / concurrency** — confirm `maxInstances: 1` serialized processing acceptable vs faster parallel with higher cost
- [ ] **Functions deploy** — `firebase deploy --only functions:enqueueAiEnrichment,functions:onDesignAiEnrichmentQueued` (human approval)
- [ ] **Cloud Logging correlation** — run investigation queries on 2026-06-25 batch designIds during manual QA

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Serialized processing too slow for >100 designs | Medium | Document; future Cloud Tasks queue |
| `maxInstances: 1` global bottleneck | Low | Acceptable for current volume; monitor logs |
| Description fallback wrong phrase | Low | Prefer `visibleText`; fallback only when generic title blocked |
| v6 designs keep bad titles until re-run | Low | Document; staff Re-run AI |
| OpenAI cost spike on bulk retry | Medium | Human approval; bulk retry owner/admin only |

---

## Security

- OPENAI_API_KEY remains server-side only (no change)
- Retry/queue logic stays in Cloud Functions; client only calls existing `enqueueAiEnrichment` callable with staff auth
- Stale recovery and bulk retry require owner/admin (extend existing permission checks)
- No client write to `aiSuggestions` / `aiProcessingStage`

---

## Documentation Updates

- [ ] `docs/WORKFLOWS.md` — AI pipeline concurrency, retry, title rules v7
- [ ] `docs/architecture/FIREBASE.md` — function config (timeout, maxInstances)
- [ ] `docs/project/DECISIONS.md` — ADR for serialized AI processing + title rules

---

## Product Decisions (locked)

| Decision | Value |
|----------|-------|
| Batch SLA | 61 designs within 30 minutes |
| Auto-retry | Max 2 on 429/5xx |
| Text-only title | Up to 6 words of primary phrase; longer → most prominent line truncated |

---

## Open Questions

- [ ] Confirm `maxInstances: 1` vs `2` with human (spend vs speed)
- [ ] Provide sample `designId`s from 2026-06-25 batch for log correlation (optional)

---

## Approval

- Review: `docs/workflow/reviews/ai-title-batch-reliability-review.md`
- Verdict: pending
