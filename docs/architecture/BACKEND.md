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
| Flows | Portal: email/password or Google (customers); Studio: email/password only. See `FIREBASE.md` and ADR-FP-081 |
| Session / token | Firebase client SDK session |
| Local dev auth | Firebase emulators or project dev credentials — see `docs/workflow/setup/` |
| Portal account self-service (2026-07-20) | Password reset + verify-before-update email + deletion **request** callables (`syncPortalAccountEmail`, `requestPortalAccountDeletion`, `cancelPortalAccountDeletionRequest`). ADR-FP-104. |
| Owner single-user delete (2026-07-20) | Studio Test Data → `ownerDeleteUser` (owner + fresh-prints-dev only). Hard-deletes one staff or customer identity + associated records. Not bulk wipe. |

**Portal post-auth return (2026-07-17):** When `AuthGate` sends a signed-out customer to `/login`,
it includes the protected Portal path and query string in `returnTo`. Email/password and Google login
return to that validated target after the existing Firebase user/customer bootstrap succeeds.
First-time Google users carry the same target through `/complete-profile`. `returnTo` is untrusted:
Portal accepts same-origin relative application paths only, rejects external/protocol-relative,
backslash/control-character, malformed, and auth-loop destinations, and falls back to `/`.
This is client navigation only; it does not change Firebase providers, tokens, rules, Functions,
environment variables, or secrets.

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
| Resend | Team/customer invitations and Assisted proof-ready notices | API key (Functions / Secret Manager) | `docs/workflow/setup/resend-email-setup.md` |
| Google AI (Gemini) | AI design enrichment | API key (Functions / Secret Manager only) | `FIREBASE.md` — **not** Firestore or renderer |

**Etsy (Phase 9A — Open API + link-first — ADR-FP-087l):** Portal builds official website search URLs (Primary + Broader). In-app listing cards come from Etsy Open API via callable `searchEtsyRecommendations` (Secret Manager `ETSY_X_API_KEY`, bound to that callable only). Website scrape remains removed (ADR-FP-087j). Soft-fail to links-only if the secret is missing or search returns empty. Purchases stay off-platform via listing/search URLs. `SCRAPERAPI_API_KEY` / `FIRECRAWL_API_KEY` are not used by product code.

**Custom Designs Portal routes (ADR-FP-087m, amended 2026-07-16):** Choose at `/custom-designs`; Find wizard at `/custom-designs?flow=find&step={subject|style|wording|review}`; results at `/custom-designs?flow=find&step=results&requestId=…`; Assisted at `/custom-designs?flow=assisted&step=…`. Legacy path URLs and bare `?step=` (no flow) rewrite to the canonical query forms. In-progress questionnaire answers use localStorage drafts; free-text is not placed in the URL.

**Etsy wizard suggestion lists (ADR-FP-087k):** Collection `etsyRecommendationSuggestions` holds admin-added Subject / Tone overlays. Callables `addEtsyRecommendationSuggestion` and `deactivateEtsyRecommendationSuggestion` (owner/admin, Admin SDK). Portal and Studio read active docs as signed-in clients (client write denied). Static seed dictionaries in shared code remain the baseline; admin docs grow autocomplete. Studio management UI lives on **Customer Requests → Suggestions** (not Settings).

**Customer suggestion requests:** Collection `etsySuggestionRequests`. Portal callable `submitEtsySuggestionRequest` (customer auth; daily submit quota via `etsyRecommendationRateLimits`; pending dedupe). Studio callables `approveEtsySuggestionRequest` / `rejectEtsySuggestionRequest` (owner/admin). Staff may read pending docs; client writes denied.

**Etsy recommendation searches (Studio list — ADR-FP-087n):** Staff may read `etsyRecommendationRequests` for the Custom Designs → Etsy tab. Customers still read only their own docs. Client writes remain denied. Owner wipe of searches on `fresh-prints-dev` uses Test Data Reset target `etsySearches` only (`wipeOperationalTestData`) — not the Etsy tab UI.

**Assisted Creation requests (Studio list — ADR-FP-088):** Staff may read `assistedCreationRequests` for the Custom Designs → Assisted tab. Customers read only their own docs. Mutations go through callables (not client Firestore writes). Owner wipe of Assisted Creation fixtures on `fresh-prints-dev` uses Test Data Reset target `assistedCreationRequests` only (`wipeOperationalTestData`) — deletes docs plus Storage under `assisted-creation/`; not available on the Assisted tab UI.

Proof and revision-request sequence labels are derived from chronological `revisionHistory` for
display in both apps (`Proof 1`, `Revision request 1`, `Proof 2`, and so on). The customer-facing
timeline is labeled **Messages** in Portal and Studio. `customerSendAssistedCreationMessage` and
`staffSendAssistedCreationMessage` append owned chat messages without changing status; **open
statuses only** (`submitted` | `in_progress` | `proof_ready` | `revision_requested`). Terminal
statuses (`approved` | `rejected` | `cancelled`) are rejected with `failed-precondition`
(“Messaging is closed for completed requests.”) — ADR-FP-092. Callables validate auth (Portal
ownership or owner/admin staff), a 2,000-character maximum, and a transaction-enforced 10-second
per-request cooldown per actor role. New rows use `kind: "customer_message"` or
`kind: "staff_message"` so unread/display behavior does not depend on note text. Existing unmarked
history remains compatible; no backfill, Firestore rules, Storage rules, or index change is
required. Studio tab layout: Overview holds Internal staff notes (explicit Save notes via
`staffUpdateAssistedCreationStatus` action `update_notes`), primary Staff actions when Start work /
Resume revision apply, and Reject/Cancel/Restore in a status-row ⋯ menu (Portal-parity overflow);
Proofs holds proof upload; Messages is thread + compose only while open (Portal parity).
Deploy the updated send callables after owner approval:
`firebase deploy --only functions:customerSendAssistedCreationMessage,functions:staffSendAssistedCreationMessage --project fresh-prints-dev`.

**Assisted proof download retention (ADR-FP-093):** Proofs are raw uploads at
`assisted-creation/{uid}/{requestId}/proofs/{fileId}` where new uploads use basename
`proof-{n}-{mmddyyyy}-{HHmm}.{ext}` (Studio local clock; Firestore `proof.id` stays a UUID; no grey derivative). On approve,
`customerRespondToAssistedCreationProof` sets `approvedProofId`/`approvedAt` and deletes sibling
full-res objects. Customer cancel and staff reject/cancel delete all proof full-res.
`purgeExpiredAssistedCreationProofs` (callable, `dryRun`) and
`purgeExpiredAssistedCreationProofsScheduled` (daily) delete approved full-res after 14 days and
orphan leftovers on rejected/cancelled. Portal download uses callable
`customerGetAssistedCreationApprovedProofFile` (Admin Storage download → base64 in
callable response; AuthZ: owning customer + shared eligibility). Portal decodes to a
blob and triggers `<a download>` so PNGs save as files (GCS signed-URL navigate often
opens in-tab; raw HTTPS Function fetch hit CORS / “Failed to fetch” from Portal).
Legacy callable `customerGetAssistedCreationApprovedProofDownloadUrl` (signed URL) is
deprecated for Portal UI. Deploy (dev):
`firebase deploy --only functions:customerGetAssistedCreationApprovedProofFile --project fresh-prints-dev`.
Optional Storage CORS backup: `docs/workflow/setup/firebase-storage-cors.md`.

**Assisted proof → Current Request (ADR-FP-094):** Portal callable
`customerAddAssistedApprovedProofToPrintRequest` copies the approved proof into customer-upload
Storage, creates a private ready upload, and attaches it to the working print request (qty 1,
pixel sizing). Skips customer transparency/quality gates. Idempotent via
`assistedCreationRequests.printRequestIngest`. Deploy (dev):
`firebase deploy --only functions:customerAddAssistedApprovedProofToPrintRequest --project fresh-prints-dev`.

**Provider-neutral email (ADR-FP-089 / ADR-FP-090):** `functions/src/lib/email/` owns normalized
messages, templates, provider routing, Resend + Brevo HTTP transports, recipient resolution, and
canonical Portal URL resolution. `staffAddAssistedCreationProof` transactionally creates a
deterministic `emailDeliveryJobs` outbox document. `onEmailDeliveryJobCreated` uses bounded attempts
and a lease; network/timeout/429/5xx errors retry, permanent 4xx fails safely. Before send, the
worker honors `customers/{id}.assistedProofEmailOptIn` (missing = opted in); opted-out jobs fail
non-retryably with `customer_opted_out`. After a successful send, the worker appends
`revisionHistory` note `Proof-ready email sent` (`byRole: system`, `emailDeliveryJobId` for
idempotency). Resend receives the job ID through `Idempotency-Key`; Brevo receives a UUID-shaped
hash in `headers.idempotencyKey`. Firestore remains the durable logical dedupe boundary. Logs
contain IDs and safe codes only. `settings/emailProviders` independently selects invitation and
proof-notice providers (`resend` or `brevo`). `settings/customerUploadQuotas` holds owner-tunable
America/Chicago (CST/CDT) daily upload caps for print-request vs catalog-donation (code defaults when
missing; ADR-FP-095). Day key is Central midnight (not UTC).
**Enforcement (2026-07-19 UX):** Portal Upload Designs no longer charges day buckets — Current
Request room (`L`) is the customer cap (request-room copy only; no midnight reset line). Donate
Designs still enforces **images/day** only (footer: resets at midnight CST); upload starts and ZIP
day counters are not charged (Studio Settings fields remain configurable). ZIP byte max is **2 GB**
for both Upload Designs and Donate.
`settings/printRequestLimits` holds the sole Portal limit `L` (`maxQuantityPerShowPerCustomer`:
max Current Request prints = max per customer per show; default 20; ADR-FP-102). Legacy Cap A field
`dailyDesignsAddedToRequestsLimit` is mirrored = `L` on save for one-release rollback and is **not**
enforced. Cap A counters in `printRequestDesignDailyLimits` are no longer written; optional wipe
target remains on Test Data Reset. Print-request / queue rejects may include structured `details.code`:
`WORKING_REQUEST_PRINT_LIMIT` (request over `L`), `SHOW_CUSTOMER_LIMIT` / `SHOW_CAPACITY` /
`SHOW_ALLOCATION_BLOCKED` (`failed-precondition` on queue). Stale queue clients sending `selections`
are rejected with soft-reload copy. Upload quota Settings remain ADR-FP-095 (enforcement narrowed as above).
Product Brevo uses Secret Manager `BREVO_API_KEY` — never the
Cursor MCP token (`BREVO_MCP_TOKEN`).

**Cursor agent tooling:** Project MCP may list ScraperAPI and Brevo at `.cursor/mcp.json` (agent-only; not product email). Setup notes: `docs/workflow/setup/scraperapi-mcp-setup.md`, `docs/workflow/setup/brevo-mcp-setup.md`. Product Brevo email: `docs/workflow/setup/brevo-email-setup.md`.

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
| `registerCustomer` | Callable | Customer self-registration — provisions `users/{uid}` + `customers/{id}` + username reservation after Firebase Auth signup. Requires `biddingAcknowledgmentAccepted` + version; writes `portalBiddingAcknowledgments.signup`. |
| `updateTeamUser` | Callable | Update team user fields |
| `createPortalPrintRequest` | Callable | Portal: create the customer's one working print request |
| `createCustomerUploadBatch` | Callable | Portal: create customer artwork upload batch + source/ZIP paths (ADR-FP-073) |
| `getCustomerUploadDailyQuota` | Callable | Portal: remaining quota buckets + size limits. Customer-facing: Donate shows images/day; Upload Designs shows Current Request room (`L`) instead. Functions charge donation `finalizeImage` only; print-request day buckets and donation starts/ZIP are not charged. |
| `addPortalCatalogDesignToPrintRequest` | Callable | Portal: add/increment catalog design; working-request max = `L` |
| `updatePortalPrintRequestItemQuantity` | Callable | Portal: set item qty; clamps to working-request max `L` |
| `removePortalPrintRequestItem` | Callable | Portal: remove item |
| `duplicatePortalPrintRequestItem` | Callable | Portal: duplicate item; visually to the **right** of source under newest-first display via `resolveDuplicateInsertBeforeSortOrder` (ADR-FP-098); working-request max = `L` |
| `finalizeCustomerUpload` | Callable | Portal: validate/normalize one direct image upload → ready/failed |
| `finalizeCustomerUploadZip` | Callable | Portal: server-extract ZIP + per-image finalize (ADR-FP-073) |
| `confirmCustomerUploadsAndAttachToRequest` | Callable | Portal: confirm ownership/catalog ack + attach ready **print_request** uploads to working request |
| `confirmCustomerUploadsForDonation` | Callable | Portal: confirm ownership + required catalog listing consent for **catalog_donation** uploads (no print-request attach) |
| `recordCustomerUploadHalftoneResponse` | Callable | Portal: persist optional customer Yes/No halftone selection (evidence only; ADR-FP-080) |
| `recordCustomerUploadHalftoneStaffDecision` | Callable | Studio: persist explicit staff true/false halftone decision on customer upload |
| `clearPortalWorkingPrintRequest` | Callable | Portal: empty own working request (delete items, `itemCount: 0`); keep `draft`/`editing` so next Add reuses the same id |
| `archiveStaleWorkingPrintRequests` | Callable | Owner/admin: archive empty working requests older than 14 days (`dryRun` supported) |
| `archiveStaleRejectedDesigns` | Callable | Owner/admin: soft-archive `status: rejected` designs older than 7 days (`dryRun` supported; ADR-FP-086) |
| `purgeIdleCustomerUploadFullSize` | Callable | Owner/admin: purge request-upload source+production after show done/idle 14d; keep thumb/preview (`dryRun` supported; ADR-FP-086) |
| `purgePromotedDonationFullSize` | Callable | Owner/admin: purge donation upload source+production 14d after promote; keep thumb/preview (`dryRun` supported; ADR-FP-086) |
| `promoteCustomerUploadToAiReview` | Callable | Studio staff (owner/admin): promote ready upload → design `imported` + enqueue AI |
| `excludeCustomerUploadFromCatalog` | Callable | Studio staff: mark upload excluded (keeps request artwork + production assets) |
| `restoreCustomerUploadCatalogEligibility` | Callable | Studio staff: reverse exclusion → `pending_staff_review` |
| `retryCustomerUploadProcessing` | Callable | Studio staff (owner/admin): retry eligible technical failures |
| `cleanupAbandonedCustomerUploads` | Callable | Owner/admin: mark stale open batches abandoned; fail unfinished uploads; delete orphan **source** objects only (`dryRun` supported) |
| `purgeArchivedDesignAssets` | Callable | Owner: archive-first purge of design originals + previews (keep thumbnail; ADR-FP-084) |
| `getPortalShowPrintProgress` | Callable | Portal: show print progress for customer |
| `listPortalAllocatableShows` | Callable | Portal: list upcoming shows + `customerAllocatedQuantity` (usage per show under `L`); includes past-cutoff shows as non-allocatable with cutoff meta; returns `portalQueueCutoffHoursBeforeStart` (ADR-FP-103) |
| `queuePortalPrintRequestToShow` | Callable | Portal: allocate **entire** Continuable request to **one** show atomically or reject; one request per customer per show; rejects past Portal queue cutoff; rejects stale `selections`; no remainder; bidding ack + version (ADR-FP-102 / ADR-FP-103) |
| `completeEtsyRecommendationRequest` | Callable | Portal: mark own active Etsy recommendation request completed |
| `cancelEtsyRecommendationRequest` | Callable | Portal: cancel own active Etsy recommendation request |
| `submitEtsyRecommendationRequest` | Callable | Portal: create/replace one active Etsy recommendation request; returns website search URL |
| `searchEtsyRecommendations` | Callable | Portal: Open API listing search for an owned active request (`ETSY_X_API_KEY`) |
| `completeEtsyRecommendationRequest` | Callable | Portal: mark active recommendation request completed |
| `cancelEtsyRecommendationRequest` | Callable | Portal: cancel active recommendation request |
| `addEtsyRecommendationSuggestion` | Callable | Studio: owner/admin add Subject or Tone autocomplete overlay |
| `deactivateEtsyRecommendationSuggestion` | Callable | Studio: owner/admin soft-deactivate an overlay (`active: false`) |
| `submitEtsySuggestionRequest` | Callable | Portal: customer submits pending Subject/Tone suggestion for review |
| `approveEtsySuggestionRequest` | Callable | Studio: owner/admin approve pending suggestion → live overlay |
| `rejectEtsySuggestionRequest` | Callable | Studio: owner/admin reject pending suggestion |
| `submitAssistedCreationRequest` | Callable | Portal: submit assisted creation brief (one open) |
| `cancelAssistedCreationRequest` | Callable | Portal: cancel own open assisted request |
| `customerUpdateAssistedCreationRequest` | Callable | Portal: update answers/references while status is `submitted` only |
| `customerSendAssistedCreationMessage` | Callable | Portal: append text-only message to own Assisted request while open; rejects terminal; preserves status |
| `staffSendAssistedCreationMessage` | Callable | Studio: owner/admin append staff chat message while open; rejects terminal; preserves status |
| `customerRespondToAssistedCreationProof` | Callable | Portal: approve proof (optional 1–5 rating + short note; sets `approvedProofId`/`approvedAt`; purges sibling proof full-res) or request revision with note |
| `customerGetAssistedCreationApprovedProofFile` | Callable | Portal: Admin-streamed approved proof bytes (base64) for blob file download (ownership + 14-day/legacy eligibility; ADR-FP-093) |
| `customerGetAssistedCreationApprovedProofDownloadUrl` | Callable | Legacy: mint short-lived signed URL (deprecated for Portal UI; ADR-FP-093) |
| `customerAddAssistedApprovedProofToPrintRequest` | Callable | Portal: copy approved Assisted proof → private customer upload + attach to Current Request / working request (skips upload quality gates; ADR-FP-094) |
| `staffUpdateAssistedCreationStatus` | Callable | Studio: owner/admin start/resume/reject/cancel/restore, or `update_notes` (notes only, no status/history change); reject/cancel purge all proof full-res |
| `staffAddAssistedCreationProof` | Callable | Studio: owner/admin attach proof → `proof_ready` |
| `purgeExpiredAssistedCreationProofs` | Callable | Owner/admin: purge approved proof full-res after 14 days + orphan full-res on rejected/cancelled (`dryRun` supported; ADR-FP-093) |
| `purgeExpiredAssistedCreationProofsScheduled` | Scheduled (daily) | Same purge logic as the callable (ADR-FP-093) |
| `updateEmailProviderSettings` | Callable | Studio owner: select invitation and proof-notice providers (`resend` \| `brevo`) |
| `updateCustomerUploadQuotaSettings` | Callable | Studio owner: set America/Chicago daily print-request vs donation upload caps (`settings/customerUploadQuotas`; ADR-FP-095) |
| `updatePrintRequestLimitSettings` | Callable | Studio owner: set sole limit `L` (`maxQuantityPerShowPerCustomer`); mirrors into legacy Cap A field for one-release rollback (ADR-FP-102) |
| `onEmailDeliveryJobCreated` | Firestore create | Deliver a proof-ready notice from the durable outbox |
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

See `FIREBASE.md` and `docs/workflow/setup/` for Firebase, Resend, and Brevo configuration.

Email Functions use Secret Manager `RESEND_API_KEY` and `BREVO_API_KEY` (both bound on invitation
and proof-delivery Functions; runtime selection by `settings/emailProviders`), parameter defaults
`INVITATION_FROM_EMAIL` / `PROOF_NOTICE_FROM_EMAIL` (`Fresh Prints
<team@funkyfreshprints.com>`), and a fail-closed project map for Portal URLs:
`fresh-prints-dev` → `https://myprintrequest.dev`; production mapping →
`https://myprintrequest.com`. That map drives both proof-notice review CTAs and
Portal invite Firebase Auth password create/reset **continue** URLs
(`…/login`). `PORTAL_BASE_URL` is accepted only as a localhost Functions
emulator override — never as a deployed customer-facing continue host. Shared
values and deployments require a human checkpoint. Firebase Authentication
**Authorized domains** must include the Portal hosts (`myprintrequest.dev`,
`myprintrequest.com`); `localhost` is for local Portal only.

**Portal Open Graph absolute URLs (2026-07-20):** The Next.js Portal uses the same customer hosts
for `metadataBase` / OG image resolution via optional `NEXT_PUBLIC_PORTAL_ORIGIN`, else
`NEXT_PUBLIC_FIREBASE_PROJECT_ID=fresh-prints-dev` → `https://myprintrequest.dev`, else
production non-dev project → `https://myprintrequest.com`, else `http://localhost:3100`.
Per-design share pages at `/share/design/{id}` use **Firebase Admin** (ADC on App Hosting) to
read ready catalog title/description and sign a Storage image URL for crawlers—without opening
Firestore/Storage client rules to anonymous users. Non-design URLs load `settings/portalSocialMeta`
(owner-editable via Studio **Settings → Social sharing** / `updatePortalSocialMetaSettings`) plus a
daily-rotated ready-library image. See `docs/standards/DEPLOYMENT.md` (Portal Open Graph section).

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
- Customer upload daily abuse caps are purpose-split (print-request vs catalog-donation); concurrent finalize leases shared (max 8). See `customerUploadLimits.constants.ts` and `SECURITY.md`.
- Monitoring: Firebase console
- **Human approval** required for production rule changes, auth config, and secret rotation

---

## Security Notes

See `docs/standards/SECURITY.md`. Firebase rules and Electron IPC security are documented in `FIREBASE.md` and `docs/workflow/setup/electron-security-setup.md`.

---

## Revision History

| Date | Summary |
|------|---------|
| 2026-07-13 | ADR-FP-080: removed automatic halftone detection; documented `recordCustomerUploadHalftoneResponse` / staff decision callables; sizing policy `image-quality-v2` unchanged |
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
