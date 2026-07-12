# Backend

> **Fresh Prints** — backend overview. Firebase-specific details live in `FIREBASE.md`.

---

## Overview

Fresh Prints uses **Firebase** as the primary backend platform for authentication, Firestore data, Cloud Storage, and Cloud Functions. **Fresh Prints Studio** (Electron) and **Fresh Prints Portal** (responsive web) share Firebase services through documented service layers.

---

## Backend Provider

| Topic | Value |
|-------|-------|
| Primary provider | Firebase (Google Cloud) |
| Region(s) | See Firebase console / `FIREBASE.md` |
| Account / project ID | `[NEEDS HUMAN INPUT — do not store secrets here]` |

### Project-Specific Backend Docs

| Doc | Purpose |
|-----|---------|
| **`FIREBASE.md`** | Firebase Auth, Firestore, Functions, Storage, rules, env vars — **source of truth** |
| `DATA_MODEL.md` | Collections, entities, status values, relationships |

---

## Authentication

| Topic | Value |
|-------|-------|
| Provider | Firebase Authentication |
| Flows | Email/password (team accounts); see `FIREBASE.md` |
| Session / token | Firebase client SDK session |
| Local dev auth | Firebase emulators or project dev credentials — see `docs/workflow/setup/` |

---

## Database / Primary Store

| Topic | Value |
|-------|-------|
| Type | Cloud Firestore |
| Access pattern | Firebase SDK via renderer services; security rules enforced server-side |
| Local development | Firestore emulator — see `docs/workflow/setup/firestore-setup.md` |

See `DATA_MODEL.md` for entities.

---

## Storage (Files / Media)

| Topic | Value |
|-------|-------|
| Provider | Firebase Cloud Storage |
| Public vs private | Staff-only paths for originals, thumbnails, previews |
| Access control | Storage security rules — see `FIREBASE.md` and `docs/workflow/setup/firebase-storage-setup.md` |

---

## APIs

### Internal API

Fresh Prints does not expose a separate REST API for core operations. Business logic runs in:

- Electron renderer services (Firebase SDK)
- Firebase Cloud Functions (server-side operations)

### External Integrations

| Service | Purpose | Auth method | Doc |
|---------|---------|-------------|-----|
| Resend | Team invitation email | API key (Functions / Secret Manager) | `docs/workflow/setup/resend-email-setup.md` |
| Google AI (Gemini) | AI design enrichment | API key (Functions / Secret Manager only) | `FIREBASE.md` — **not** Firestore or renderer |

**AI provider secrets:** `GEMINI_API_KEY` lives in Firebase Secret Manager. Cloud Functions read it; the desktop renderer must not. Do not add provider keys to Firestore settings or the Settings UI. (As of ADR-FP-040, OpenAI is no longer used; `OPENAI_API_KEY` was removed from Cloud Function code.)

**Vision model:** Configurable via Firestore `settings/aiEnrichment.visionModelId` (owner/admin updates through callable `updateAiEnrichmentSettings`). Server allowlist in `functions/src/ai/aiEnrichmentConfig.ts`: default `gemini-2.5-flash-lite`, newer alternate `gemini-3.1-flash-lite`. Both are called through Gemini's OpenAI-compatible Chat Completions endpoint.

**One-off AI Processing override:** The Processing tab may pass a one-off `visionModelIdOverride` value. The callable validates it, stores it only as transient processing metadata, and clears it after the run so global settings stay unchanged. Manual processing uses the current Processing override or Settings default; Auto advance snapshots the resolved value when it starts. The resolved per-run model is persisted on `aiSuggestions.model`.

**Settings AI playground:** Owner/admin users can call `testAiEnrichmentPlayground` from `/settings` for one-off text + image tests. The callable validates model, prompt length, and image type/size; keeps the Gemini call server-side; does not write to `designs`; and fails safely if `GEMINI_API_KEY` is missing.

As of ADR-FP-039/ADR-FP-040, **AI Processing is a single playground-style call** (prompt version `catalog-enrich-v19`): the saved Settings prompt template is sent with `{{excluded_tags}}` replaced server-side (approved category/tag context is resolved server-side, not injected into the prompt). The model is asked for catalog fields (`description`, a raw `category` candidate, `title`, up to 8 tag candidates) plus optional complete `suggestedNewTags` objects when no approved tag name or alias is relevant enough, and the default prompt explicitly requires full-image text inspection plus exact readable-text inclusion in the description when text is present. It does **not** send `response_format: { type: "json_object" }`; the server extracts JSON tolerantly (`extractJsonObject`, handling fenced/prose-wrapped output). One normal call per success — no empty-output retry and no quality retry; only the 429/5xx network retry remains. Server-side normalization resolves AI tags against approved global `tags` documents by name/alias, persists matches to `aiSuggestions.tags`, and stores unmatched tokens or valid nonmatching `suggestedNewTags` as `aiSuggestions.suggestedNewTags` for owner/admin review. AI never creates approved tag documents. Category resolution runs server-side after tag resolution (`catalogThemeCategoryResolver.ts`), using the raw model category candidate only as one scoring signal alongside title/description/visible text/matched tags — never persisted directly. The server-side image input keeps `detail: "high"` for both catalog enrichment and the Settings playground. Empty `message.content` responses still log usage and surface a clean `failed` state (`vision_empty_output`) for manual re-run.

---

## Serverless / Edge Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `createTeamUser` | Callable | Create team user + invitation flow |
| `registerCustomer` | Callable | Customer self-registration — provisions `users/{uid}` + `customers/{id}` + username reservation after Firebase Auth signup |
| `updateTeamUser` | Callable | Update team user fields |
| `createPortalPrintRequest` | Callable | Portal: create the customer's one working print request |
| `createCustomerUploadBatch` | Callable | Portal: create customer artwork upload batch + source/ZIP paths (ADR-FP-073) |
| `finalizeCustomerUpload` | Callable | Portal: validate/normalize one direct image upload → ready/failed |
| `finalizeCustomerUploadZip` | Callable | Portal: server-extract ZIP + per-image finalize (ADR-FP-073) |
| `confirmCustomerUploadsAndAttachToRequest` | Callable | Portal: confirm ownership/catalog ack + attach ready uploads to working request |
| `promoteCustomerUploadToAiReview` | Callable | Studio staff (owner/admin): promote ready upload → design `imported` + enqueue AI |
| `excludeCustomerUploadFromCatalog` | Callable | Studio staff: mark upload excluded (keeps request artwork + production assets) |
| `restoreCustomerUploadCatalogEligibility` | Callable | Studio staff: reverse exclusion → `pending_staff_review` |
| `retryCustomerUploadProcessing` | Callable | Studio staff (owner/admin): retry eligible technical failures |
| `cleanupAbandonedCustomerUploads` | Callable | Owner/admin: mark stale open batches abandoned; fail unfinished uploads; delete orphan **source** objects only (`dryRun` supported) |
| `getPortalShowPrintProgress` | Callable | Portal: show print progress for customer |
| `enqueueAiEnrichment` | Callable | Run imported design through direct AI processing |
| `resetAiEnrichmentForProcessing` | Callable | Return Needs Review or Rejected design to Processing for a staff-started re-run |
| `updateAiEnrichmentSettings` | Callable | Owner/admin: set team vision model, prompt template, and tag exclusions |
| `testAiEnrichmentPlayground` | Callable | Owner/admin: run one-off image + prompt test against the allowlisted Gemini models |
| `onDesignAiEnrichmentQueued` | Firestore update | Legacy compatibility trigger; live Processing flow should use direct callable execution |

**AI enrichment latency observability:** Callable logs `enqueue.queued` with `loggedAtMs`; trigger logs `trigger.fired`; pipeline logs phased `durationMs` / `totalPipelineMs`; vision request logs `vision.request.started` and `vision.completion.usage` (includes `durationMs`, token counts). Settings and categories are cached per function instance (60s).

Location: `functions/src/` — compiled to `functions/lib/` (gitignored). See `docs/workflow/setup/firebase-functions-setup.md`.

---

## Environment Variables

> Document **names and purpose only**. Never commit values.

See `FIREBASE.md` and `docs/workflow/setup/` for Firebase and Resend configuration.

---

## Local Development

### Prerequisites

- Node.js 18+
- Firebase CLI
- Electron dev environment

### Start Backend

Use Firebase emulators or connect to a dev Firebase project per setup guides in `docs/workflow/setup/`.

### Desktop App

```bash
npm run dev
```

---

## Production Considerations

- Rate limits: Firebase quotas apply
- Monitoring: Firebase console
- **Human approval** required for production rule changes, auth config, and secret rotation

---

## Security Notes

See `docs/standards/SECURITY.md`. Firebase rules and Electron IPC security are documented in `FIREBASE.md` and `docs/workflow/setup/electron-security-setup.md`.

---

## Revision History

| Date | Summary |
|------|---------|
| 2026-07-12 | Sub-phase G: wipe target `customerUploads` + callable `cleanupAbandonedCustomerUploads` (abandoned source orphans; Scheduler optional) |
| 2026-07-12 | Sub-phase E: staff intake callables `promoteCustomerUploadToAiReview`, `excludeCustomerUploadFromCatalog`, `restoreCustomerUploadCatalogEligibility`, `retryCustomerUploadProcessing`; Studio `/imports` intake section |
| 2026-07-12 | Sub-phase C: `confirmCustomerUploadsAndAttachToRequest` + Portal upload UI; queue-to-show rejects upload-backed items until D; deployed to `fresh-prints-dev` |
| 2026-07-11 | Documented customer artwork upload callables (`createCustomerUploadBatch`, `finalizeCustomerUpload`, `finalizeCustomerUploadZip`) — Sub-phase B; deploy to `fresh-prints-dev` still required before Portal UI |
| 2026-07-01 | Removed OpenAI as an AI provider; Google (Gemini) is now the only vision model provider. Removed `OPENAI_API_KEY`/reasoning effort entirely (ADR-FP-040) |
| 2026-06-30 | Documented AI Processing taxonomy prompt context for category descriptions, tag aliases, preferred-when guidance, and complete suggested-new-tags |
| 2026-06-30 | Documented global approved tag normalization and suggested-new-tag review |
| 2026-06-29 | Added saved reasoning effort, Settings AI playground callable, and documented one-off AI Review rerun override/menu behavior |
| 2026-06-25 | Configurable vision model via `settings/aiEnrichment` + `updateAiEnrichmentSettings` callable |
| 2026-06-25 | Document OpenAI vision model `gpt-5.4-nano` (`OPENAI_VISION_MODEL_ID`) |
| 2026-06-24 | Initial Fresh Prints backend overview; links to FIREBASE.md |
