# Plan: Phase 5B — AI Processing Pipeline

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Status | **approved_with_conditions** — architecture plan §5B; production AI provider requires human checkpoint |
| Prerequisite | Phase 5A workspace polish |
| Related | `phase-5-ai-review-architecture-plan.md`, ADR-FP-009 |

---

## Goal

Implement the automatic background AI pipeline that feeds the existing AI Processing workspace. Imports enqueue AI after derivatives; Cloud Functions process designs; workspace shows live pipeline stages and real `aiSuggestions`.

**Out of scope:** Customer requests, print runs, portal, workspace UI redesign.

---

## Architecture

```txt
Import orchestration (derivatives complete)
    ↓
aiEnrichmentEnqueueService.enqueue(designId)  [callable — returns immediately]
    ↓
Firestore: aiProcessingStage = queued
    ↓
onDesignAiEnrichmentQueued (Firestore trigger)
    ↓
aiEnrichmentPipeline.run(designId)
    ↓
Provider abstraction → Development (default) | OpenAI Vision (OPENAI_API_KEY secret)
    ↓
Write aiSuggestions, aiAnalysis, aiProcessingStage, aiReviewStatus
    ↓
Renderer onSnapshot → workspace updates live
```

---

## Firestore changes

On `designs/{id}`:

| Field | Writer | Purpose |
|-------|--------|---------|
| `aiProcessingStage` | Cloud Function only | Pipeline stage for Processing Status UI |
| `aiSuggestions` | Cloud Function only | Versioned AI catalog suggestions |
| `aiAnalysis` | Cloud Function only | Rich metadata for future features |

Rules: block client mutations of these fields on update.

---

## Pipeline stages

`queued` → `preparing_image` → `sending_to_ai` → `receiving_response` → `validating_response` → `ready_for_review`

On failure: `failed` + `aiReviewStatus: pending` + `aiSuggestions.errorCode`; item remains in Processing with retry.

---

## Queue behavior

| Tab | Query |
|-----|-------|
| Processing | `aiReviewStatus: pending` (actively processing) |
| Needs Review | `aiReviewStatus: needs_review` |
| Rejected | `status: rejected` |

Successful AI completion sets `needs_review` — item leaves Processing automatically. Failed AI remains in Processing until retry succeeds or staff handles the failure separately.

---

## Provider abstraction

`AiEnrichmentProvider` interface in `functions/src/ai/providers/`. Default: development provider (no API key). Production: OpenAI when `OPENAI_API_KEY` secret set (human approval required).

---

## Client changes

- `aiEnrichmentEnqueueService` — callable wrapper
- Enqueue after `importDerivativeService` success
- `designDocumentSubscriptionService` + hook for selected design realtime
- `aiProcessingOutput.ts` — read persisted fields
- `createAiReviewDraftFromDesign` — seed form from `aiSuggestions`

---

## Testing

- Unit: pipeline stages, suggestion mapping, draft seeding
- Manual: import → Processing → live stages → Needs Review → approve
- Failure: disconnect API / force error → Processing tab with failed badge and retry action

---

## Deployment

**Required for AI pipeline (human approval):**

```bash
firebase deploy --only firestore:rules
firebase deploy --only functions
```

- Prefer full `functions` deploy so all exports align with `functions/package.json` `main`.
- `OPENAI_API_KEY` must be in **Firebase Secret Manager** before deploy — **not** in Firestore settings, **not** in the desktop app.
- Development heuristic provider can run without a real key at runtime; production OpenAI requires Secret Manager (human checkpoint).

---

## Phase 5B E2E verification (2026-06-24)

**White screen root cause:** Committed `shared/types/ai/aiProcessing.types.js` (CJS) was resolved before `.ts` by Vite. Removed artifact; added `shared/**/*.js` to `.gitignore`.

**Pipeline logging:** Structured `ai-pipeline` events in dev (renderer) and Cloud Logging (functions).

## Phase 5B metadata quality (2026-06-24)

- OpenAI prompt v2: catalog titles from artwork only (no upload filename in prompt)
- `catalogTitleRules.ts`: title case, filename rejection, fallback to `primarySubject` / tags
- Import `design.title` remains filename stem until staff approval; `originalPath` unchanged
- **Future:** optional `searchTitle` on `aiSuggestions` for hidden search keywords (not implemented)

## Phase 5B QA follow-up (2026-06-24)

- `TagChipInput` reused in Design Edit modal (`DesignFormFields`)
- Tag chip styles moved to shared `tag-chip-input.css`
- Secret-handling rules documented in `FIREBASE.md`, `SECURITY.md`, `BACKEND.md`, `DEPLOYMENT.md`

## Phase 5B QA polish (2026-06-24)

- Import completion button/copy: **Open AI Processing**
- Queue rows: two-line title clamp, badges below title
- Preview: full image `object-fit: contain`, fixed stage height, click-to-lightbox only
- Removed workspace zoom percentage controls and lightbox button
- Tag chip input in Final Catalog Information form

## Phase 5B deployment fix (2026-06-24)

**Root cause:** Stale `functions/lib/index.js` (only Phase 1 exports) was the runtime entrypoint while new AI functions compiled to `lib/functions/src/`.

**Fix:** `package.json` `main` → `lib/functions/src/index.js`; build script cleans `lib/` before `tsc`.
