# Implementation Readiness Checkpoint: `production-release` (Goal #13)

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Phase | Implement (pre-production-action) |
| Plan | `docs/workflow/plans/2026-07-30-production-release-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-07-30-production-release-review.md` (`approved_with_notes`) |
| This artifact | Resolves the Plan's repo-check items, records owner decisions, and prepares (but does not execute) the production deployment sequence |
| Production action taken this pass | **None.** No Firebase project created. No secret, rule, function, App Hosting, DNS, or Auth configuration touched. |

---

## Update (2026-07-30, same day, later pass) — Production Project Checkpoint Confirmed; Functions Allowlist Finalized

The production Firebase project creation checkpoint (§4 below) is now **closed**:

- **Production Firebase project ID: `fresh-prints-prod`** — confirmed by the owner.
- The project has been created; Blaze billing is active.
- No deployment or configuration of any kind has occurred yet.
- Verified against current source: `functions/src/lib/email/portalUrlResolver.ts` already maps
  `"fresh-prints-prod" → "https://myprintrequest.com"` exactly. **No resolver edit is required.**

The 5 previously-flagged Functions (§2.1 below) now have owner decisions, recorded and
source-verified in full in the companion report
`docs/workflow/reviews/2026-07-30-production-release-functions-allowlist-report.md`:

- **Excluded:** `testAiEnrichmentPlayground`, `testAiEnrichmentTagRerank`, `ownerDeleteUser`,
  `backfillPrintRequestQueueTab` (all per explicit owner decision).
- **Included:** `rebuildCatalogSnapshots` (all 6 required source-verification conditions passed —
  owner/admin-gated, non-destructive, project-agnostic, and the documented mechanism for
  catalog-snapshot publication).

**Final allowlist: 105 total exports, 99 included, 6 excluded.** The §2.1 table below is superseded
by the companion allowlist report; refer to that report as authoritative for the final list.

The working tree has also been reconciled this pass — see
`docs/workflow/reviews/2026-07-30-production-release-working-tree-reconciliation-report.md` for the
full classification of all 541 remaining changed entries (one proven-debris file,
`functions/test-admin-auth.mjs`, was removed) and the proposed release-source strategy (reconcile
directly on `master` in goal-sized commit boundaries — no new branch, per owner decisions #7/#8).

**This pass still took no production action.** Everything below this point in the original artifact
is retained as historical record of the first Implementation-readiness pass; where it conflicts with
this update or the two companion reports, this update and the companion reports are authoritative.

---

## 1. Recorded Owner Decisions

All 18 owner decisions from this task's instruction are recorded as approved and binding for the
remainder of this goal:

1. Create a completely separate production Firebase project (not a promotion of `fresh-prints-dev`).
2. **Do not** deploy `wipeOperationalTestData` to production.
3. **Do not** deploy `inventoryCatalogImageStorage` to production.
4. Test Data Reset page and catalog inventory panel stay excluded from production Studio builds via
   their existing dev-only gates (`isOperationalWipeUiEnabled()` — no new gate needed).
5. Canonical Portal URL: `https://myprintrequest.com`.
6. `www.myprintrequest.com` redirects to the apex domain if connected.
7. Continue direct-to-`master`, manually approved deploys for this launch.
8. No CI/CD, release branch, or new branch policy introduced this goal.
9. Launch using code defaults where safe; configure remaining settings via Studio before public
   traffic.
10. Soft launch before public announcement.
11. GA4 stays disabled initially.
12. `NEXT_PUBLIC_GA_MEASUREMENT_ID` stays unset until: real GA4 property exists, Enhanced Measurement
    is disabled, privacy-policy/consent is resolved, and a separate GA4 checkpoint is approved.
13. Initial monitoring: Firebase Console, Functions logs, Firestore usage, Resend/Brevo dashboards.
14. Dedicated error tracking (e.g. Sentry) is a post-launch improvement, not a launch blocker.
15. Exact Studio production-config mechanism must be verified before any installer is produced —
    resolved below (§6).
16. Production deployment always uses explicit component and Function allowlists.
17. No bare `firebase deploy --only functions` is permitted, ever.
18. No production deployment without a separate, explicit owner approval per component.

---

## 2. Resolved Repository Checks

### 2.1 Exact Functions Production Allowlist

Read `functions/src/index.ts` fresh this pass (134 lines, re-enumerated — not copied from an earlier
session). Full current export list, classified:

| # | Exported function(s) | Classification |
|---|---|---|
| 1 | `addPortalCatalogDesignToPrintRequest` | Include |
| 2 | `cleanupAbandonedCustomerUploads` | Include |
| 3 | `archiveStaleWorkingPrintRequests` | Include |
| 4 | `clearPortalWorkingPrintRequest` | Include |
| 5 | `confirmCustomerUploadsAndAttachToRequest` | Include |
| 6 | `confirmCustomerUploadsForDonation` | Include |
| 7 | `createCustomerWithPortalInvite` | Include |
| 8 | `createCustomerUploadBatch` | Include |
| 9 | `createPortalPrintRequest` | Include |
| 10 | `duplicatePortalPrintRequestItem` | Include |
| 11 | `excludeCustomerUploadFromCatalog` | Include |
| 12 | `finalizeCustomerUpload` | Include |
| 13 | `finalizeCustomerUploadZip` | Include |
| 14 | `getCustomerUploadDailyQuota` | Include |
| 15 | `inventoryCatalogImageStorage` | **Exclude** — Goal #12 dev-only diagnostic; owner decision #3 |
| 16 | `promoteCustomerUploadToAiReview` | Include |
| 17 | `recordCustomerUploadHalftoneResponse` | Include |
| 18 | `recordCustomerUploadHalftoneStaffDecision` | Include |
| 19 | `restoreCustomerUploadCatalogEligibility` | Include |
| 20 | `retryCustomerUploadProcessing` | Include |
| 21 | `getPortalShowPrintProgress` | Include |
| 22 | `listPortalAllocatableShows` | Include |
| 23 | `queuePortalPrintRequestToShow` | Include |
| 24 | `removePortalPrintRequestItem` | Include |
| 25 | `updatePortalPrintRequestItemQuantity` | Include |
| 26 | `createTeamUser` | Include |
| 27 | `registerCustomer` | Include |
| 28 | `updateCustomer` | Include |
| 29 | `updateTeamUser` | Include |
| 30 | `submitEtsyRecommendationRequest` | Include |
| 31 | `searchEtsyRecommendations` | Include (requires `ETSY_X_API_KEY`) |
| 32 | `staffSearchEtsyRecommendationApiResults` | Include (requires `ETSY_X_API_KEY`) |
| 33 | `getEtsyRecommendationSearchQuota` | Include |
| 34 | `completeEtsyRecommendationRequest` | Include |
| 35 | `cancelEtsyRecommendationRequest` | Include |
| 36 | `addEtsyRecommendationSuggestion` | Include |
| 37 | `deactivateEtsyRecommendationSuggestion` | Include |
| 38 | `submitEtsySuggestionRequest` | Include |
| 39 | `approveEtsySuggestionRequest` | Include |
| 40 | `rejectEtsySuggestionRequest` | Include |
| 41 | `submitAssistedCreationRequest` | Include |
| 42 | `cancelAssistedCreationRequest` | Include |
| 43 | `customerUpdateAssistedCreationRequest` | Include |
| 44 | `customerSendAssistedCreationMessage` | Include |
| 45 | `customerRespondToAssistedCreationProof` | Include |
| 46 | `staffSendAssistedCreationMessage` | Include |
| 47 | `staffUpdateAssistedCreationStatus` | Include |
| 48 | `staffAddAssistedCreationProof` | Include |
| 49 | `staffAddAssistedCreationFinalSource` | Include |
| 50 | `staffSuggestAssistedCreationCatalogDesign` | Include |
| 51 | `customerGetAssistedCreationApprovedProofDownloadUrl` | Include (legacy, still exported; deprecated for Portal UI but not removed from source) |
| 52 | `customerGetAssistedCreationApprovedProofFile` | Include |
| 53 | `customerAddAssistedApprovedProofToPrintRequest` | Include |
| 54 | `enqueueAiEnrichment` | Include (requires `GEMINI_API_KEY`) |
| 55 | `resetAiEnrichmentForProcessing` | Include |
| 56 | `testAiEnrichmentPlayground` | **Needs owner decision** — a diagnostic/dev-facing playground callable (owner/admin-gated in-app, but still calls the live Gemini API from production if deployed). Not explicitly named in the Plan's exclude list. Recommend excluding from the initial production allowlist as a diagnostic tool, pending owner confirmation. |
| 57 | `testAiEnrichmentTagRerank` | **Needs owner decision** — same category as above; recommend excluding initially. |
| 58 | `updateAiEnrichmentSettings` | Include |
| 59 | `updateEmailProviderSettings` | Include |
| 60 | `updateCustomerUploadQuotaSettings` | Include |
| 61 | `updatePrintRequestLimitSettings` | Include |
| 62 | `updatePortalSocialMetaSettings` | Include |
| 63 | `updatePortalHelpSettings` | Include |
| 64 | `finalizeBrandLogoSlot` | Include |
| 65 | `updateBrandLogoDisplaySizes` | Include |
| 66 | `getPortalDesignShareOpenGraph` | Include |
| 67 | `getPortalGlobalOpenGraph` | Include |
| 68 | `getPortalOgShareImage` | Include |
| 69 | `wipeOperationalTestData` | **Exclude** — owner decision #2 |
| 70 | `ownerDeleteUser` | **Needs owner decision** — documented in `BACKEND.md` as "quarantined (no Studio UI)"; the product path is `tombstoneCustomerAccount`. Not explicitly addressed by the Plan or this task's owner-decision list. Recommend excluding from production unless the owner explicitly wants this destructive legacy callable available (even though no UI calls it). |
| 71 | `previewCustomerAccountDeletion` | Include |
| 72 | `tombstoneCustomerAccount` | Include |
| 73 | `previewPrintRequestDeletion` | Include |
| 74 | `deleteEligiblePrintRequest` | Include |
| 75 | `archivePrintRequest` | Include |
| 76 | `previewUpcomingShowDeletion` | Include |
| 77 | `deleteEligibleUpcomingShow` | Include |
| 78 | `previewCustomerUploadDeletion` | Include |
| 79 | `deleteEligibleCustomerUpload` | Include |
| 80 | `previewCategoryArchive` | Include |
| 81 | `archiveCategoryWithGuards` | Include |
| 82 | `previewTagArchive` | Include |
| 83 | `archiveTagWithGuards` | Include |
| 84 | `syncPortalAccountEmail` | Include |
| 85 | `requestPortalAccountDeletion` | Include |
| 86 | `cancelPortalAccountDeletionRequest` | Include |
| 87 | `purgeArchivedDesignAssets` | Include |
| 88 | `archiveStaleRejectedDesigns` | Include |
| 89 | `purgeIdleCustomerUploadFullSize` | Include |
| 90 | `purgePromotedDonationFullSize` | Include |
| 91 | `purgeExpiredAssistedCreationProofs` | Include |
| 92 | `purgeExpiredAssistedCreationProofsScheduled` | Include (scheduled trigger) |
| 93 | `onPrintRequestItemCreated` | Include (Firestore trigger) |
| 94 | `onShowAllocationCreated` | Include (Firestore trigger) |
| 95 | `onPrintRequestItemQueueTabInputWritten` | Include (Firestore trigger) |
| 96 | `onShowAllocationQueueTabInputWritten` | Include (Firestore trigger) |
| 97 | `backfillPrintRequestQueueTab` | **Needs owner decision** — a backfill/migration-shaped callable. Cold-start production has nothing to backfill at launch, so it is harmless to deploy, but per this task's "no migration" framing, recommend confirming this is a genuinely reusable operational callable (not a one-time migration artifact that should stay dev-only). `[NEEDS REPO CHECK]` — did not read this function's source this pass to determine which category it falls in. |
| 98 | `onCustomerFavoriteCreated` | Include (Firestore trigger) |
| 99 | `onCustomerFavoriteDeleted` | Include (Firestore trigger) |
| 100 | `onEmailDeliveryJobCreated` | Include (requires `RESEND_API_KEY`/`BREVO_API_KEY`) |
| 101 | `registerWebPushSubscription` | Include |
| 102 | `onCategorySnapshotSourceWritten` | Include (Firestore trigger) |
| 103 | `onPortalCatalogSnapshotSourceWritten` | Include (Firestore trigger) |
| 104 | `onTagSnapshotSourceWritten` | Include (Firestore trigger) |
| 105 | `rebuildCatalogSnapshots` | **Needs owner decision** — this is the one-time/rare bootstrap callable that initializes the generated-catalog-snapshot coordination documents and manifests (per `DEPLOYMENT.md`'s Wave C dev checkpoint). Production will need this run **once** after first deploy to initialize snapshots, then it is not needed again in normal operation. Recommend: include in the allowlist so it can be invoked once during Implementation §12 (Settings/reference-data initialization), but treat that invocation itself as its own human checkpoint, not an automatic side effect of deploying it. |

**Recommended production Functions deploy allowlist (all of the above marked Include):** 89 function
names (93 export lines collapse into 89 distinct function names counting grouped `export { a, b } from`
statements as separate functions). The **exact** comma-separated `--only functions:` argument must be
constructed at deploy time by concatenating every row marked "Include" above, prefixed
`functions:`, per Owner Decision #16/#17 (explicit allowlist, never bare `--only functions`).

**Excluded from production (explicit):** `inventoryCatalogImageStorage`, `wipeOperationalTestData`.

**Owner decision still required before the allowlist is final:** `testAiEnrichmentPlayground`,
`testAiEnrichmentTagRerank`, `ownerDeleteUser`, `backfillPrintRequestQueueTab`,
`rebuildCatalogSnapshots` (5 functions, all flagged above with a recommendation but not a unilateral
exclusion, since none of them were named in this task's explicit owner-decision list).

### 2.2 Firestore Indexes Audit

Read the complete `firestore.indexes.json` (1,177 lines / 61 composite indexes, 0 field overrides)
fresh this pass.

| Category | Finding |
|---|---|
| Duplicate indexes | **None found.** Each index has a distinct field-path/order/arrayConfig combination. Two indexes on `customerUploads` (`purpose` + `catalogReviewStatus`, with and without `createdAt`) are *not* true duplicates — Firestore requires the shorter prefix index separately from the composite when both query shapes are used independently. Confirmed both are structurally distinct (one 2-field, one 3-field). |
| Obsolete indexes | **None confirmed obsolete from source alone.** `[NEEDS REPO CHECK — deeper]`: the `printRequests` index on `requestOrigin` + `updatedAt` and the one on `queueTab` + `updatedAt` + `__name__` may relate to features with active/legacy status per `DATA_MODEL.md` (`requestOrigin` is documented as populated on new requests only — legacy requests read via fallback, not via this index necessarily). Determining true obsolescence requires cross-referencing every index against actual query call sites in `apps/portal` and `apps/studio` — out of scope for this Plan-adjacent pass; flagging as a possible future cleanup, not a production blocker (extra indexes cost storage/write overhead but do not break correctness). |
| Indexes tied only to dev/test tooling | **None found.** No index references `inventoryCatalogImageStorage`'s data shape, `wipeOperationalTestData`, or any Test-Data-Reset-specific collection pattern. All 61 indexes serve real product collections (`designs`, `categories`, `printRequests`, `printRequestItems`, `customers`, `showAllocations`, `gangSheets`, `gangSheetItems`, `customerUploads`, `customerUploadBatches`, `customerUploadFinalizeLeases`, `etsyRecommendationRequests`, `assistedCreationRequests`, `etsyRecommendationSuggestions`, `etsySuggestionRequests`, `customerNotifications`). |
| Required by Portal | The majority — all `designs` catalog-browse indexes (status/category/tags/sort combinations), `printRequests`/`printRequestItems` (customer-scoped), `customerUploads`, `customerUploadBatches`, `etsyRecommendationRequests`, `assistedCreationRequests` (customer-scoped), `customerNotifications`. |
| Required by Studio | `designs` AI-review/admin sort indexes (`aiReviewStatus`+`status`, `categoryId`+`status`+`updatedAt` combinations used in catalog management), `printRequests` internal/admin views (`isInternal`, `queueTab`, `requestOrigin`), `showAllocations`, `gangSheets`, `gangSheetItems`, `etsySuggestionRequests`, `etsyRecommendationSuggestions`, staff-facing `assistedCreationRequests` (`status`+`createdAt`). |
| Required by Functions | `customerUploadFinalizeLeases` (lease expiry query), most `customerUploads` technical-status indexes (used by finalize/retry/cleanup callables server-side). |

**Conclusion: no index should be removed or modified before production deploy.** All 61 indexes
appear to serve real, currently-shipped product or admin functionality. **Deploy the full, unmodified
`firestore.indexes.json` to production** (Plan §3.4's recommendation stands, now confirmed by a full
read rather than deferred).

### 2.3 App Hosting Environment Variable Mechanism

`apps/portal/apphosting.yaml` was re-read this pass — confirmed it contains **only** a `runConfig`
block (`minInstances`, `maxInstances`, `concurrency`); no `env:` key exists in the file today.

`[NEEDS REPO CHECK — could not fully resolve without live Firebase CLI/Console access]`: Firebase
App Hosting's standard mechanism (per public Firebase documentation, not verified against this
specific installed CLI version in this pass) is one of:
- An `env:` block directly in `apphosting.yaml` (supported by recent App Hosting versions for
  non-secret values), and/or
- `firebase apphosting:secrets:set <NAME> --backend fresh-prints-portal` for secret-backed values
  (stored in Secret Manager, referenced by the backend), and/or
- Console-based environment variable configuration under the App Hosting backend's settings.

This repository has never configured any App Hosting env var before (no precedent commit exists to
copy), so the exact syntax **must be verified against the installed Firebase CLI version
(`firebase --version`) at Implementation time**, immediately before use — not assumed from general
Firebase documentation. This remains `[NEEDS REPO CHECK]` and is the single largest unresolved
mechanical question blocking Portal env configuration (§3.18 checkpoint 6 in the Plan).

**Values that must be configured this way once the production project exists:**
`NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_STORAGE_BUCKET`,
`_MESSAGING_SENDER_ID`, `_APP_ID`, `_VAPID_KEY`, `NEXT_PUBLIC_PORTAL_ORIGIN=https://myprintrequest.com`.
**`NEXT_PUBLIC_GA_MEASUREMENT_ID` stays unset** (owner decisions #11/#12).

### 2.4 Production URL Resolver — Exact File Requiring Amendment

**Found:** `functions/src/lib/email/portalUrlResolver.ts` (46 lines). This is the exact, sole source
of the project-id → Portal-host mapping used for Firebase Auth email-action continue URLs
(password reset, invite) and the Assisted-Creation proof-review email CTA:

```ts
const PORTAL_BASE_URLS: Readonly<Record<string, string>> = {
  "fresh-prints-dev": "https://myprintrequest.dev",
  "fresh-prints-prod": "https://myprintrequest.com",
};
```

**Important finding not previously surfaced:** this map **already contains a `"fresh-prints-prod"`
key**, presumptively assuming that will be the production project's id. This is a **pre-existing
assumption in the codebase, not an owner-confirmed fact.** If the owner selects any project id other
than exactly `fresh-prints-prod` when creating the production project (§4 below), **this file must
be edited** to replace (or add alongside) that key with the real chosen project id — otherwise
`resolvePortalBaseUrl()` throws `EmailDeliveryError("portal_environment_unknown")` for every
production email-action URL and proof-review link, a hard production-email failure.

**Action required at Implementation time, once the owner returns the real project id:** update
`PORTAL_BASE_URLS` in this exact file to use the confirmed id. This is a one-line source change
requiring its own small implementation + verification pass — not performed in this pass since the
project id does not exist yet.

### 2.5 Studio Production Firebase Configuration Mechanism

Traced exactly, file by file:

| Concern | Mechanism | File |
|---|---|---|
| API key, Auth domain, project ID, Storage bucket, Sender ID, App ID | **Build-time**, via Vite `import.meta.env.VITE_FIREBASE_*` | `apps/studio/src/renderer/src/config/env.ts` — `validateFirebaseEnv()` throws at startup if any `VITE_FIREBASE_*` value is missing; `firebaseConfig` object is constructed once from these values |
| Firebase app/Auth/Firestore/Storage/Functions client init | Build-time, consumes the above | `apps/studio/src/renderer/src/config/firebase.ts` — `getFunctions(app)` called with **no explicit region argument**, so it uses the Firebase SDK default region `us-central1` (matches the region seen in the actual `fresh-prints-dev` deploy log for `inventoryCatalogImageStorage`, confirming no custom region is configured anywhere in this repo) |
| Source of the `VITE_FIREBASE_*` values at build time | **Environment-file based** — Vite reads `.env`, `.env.local`, etc. from `apps/studio/` at build invocation time (standard Vite behavior; no custom `envDir`/`mode` override found in `apps/studio/vite.config.ts`) | `apps/studio/.env.local` (dev, gitignored) / `apps/studio/.env.example` (template, tracked) |
| Portal URL (if Studio references it) | `[NEEDS REPO CHECK]` — not traced in this pass; Studio's own env files contain no `PORTAL`-named variable, suggesting Studio does not need one directly (email/Portal-URL resolution is entirely server-side, per §2.4) |
| Packaging | electron-builder (`apps/studio/electron-builder.json5`) packages the **already-built** `dist/`/`dist-electron/` output — it does not itself read any `VITE_FIREBASE_*` value; by the time electron-builder runs, the Firebase config is already baked into the built JS bundle from the Vite build step |

**Classification: build-time, environment-file-based, and baked into the packaged bundle.** Studio's
production Firebase configuration is **not** runtime-selectable, not user-configurable, and not
hardcoded in source — it is resolved once, at `npm run build:studio` time, from whatever
`apps/studio/.env` file(s) are present in the working directory at that moment.

**Practical consequence:** a **separate build invocation** is required to produce a production
Studio installer, with `apps/studio/.env.local` (or an equivalent file Vite will read) temporarily
containing the **production** project's `VITE_FIREBASE_*` values instead of the dev project's
values, for the duration of that one build. This is the same mechanism already used for dev builds —
no new tooling is needed — but it means whoever runs the production Studio build must deliberately
swap the env file content (or use a separate directory/machine) rather than running `build:studio`
from a working copy currently configured for `fresh-prints-dev`, to avoid accidentally shipping a
staff installer wired to the wrong project.

**Recommended safest approach (not yet implemented):** maintain a separate, clearly-named env file
(e.g. `apps/studio/.env.production.local`, gitignored, never committed) containing the production
values, and copy it to `.env.local` only immediately before running the production
`npm run build:studio`, then restore the dev `.env.local` immediately after. This is a process
recommendation for Implementation, not a code change — no new mechanism exists in the repo to
automate this switch, and this pass does not invent one.

### 2.6 Monitoring Dependency Check

Searched all `package.json` files in the repository (root, `apps/portal`, `apps/studio`, `functions`,
`packages/shared`) for `Sentry`, `@sentry`, `Bugsnag`, `LogRocket`, `Datadog`, `Rollbar`. **Zero
matches.** No error-tracking/monitoring dependency is installed anywhere in this codebase today.

**Confirmed: Firebase Console (Functions logs, Firestore usage dashboards) and the Resend/Brevo
provider dashboards are the only monitoring surfaces that exist today.** Per owner decision #14,
this is accepted as sufficient for initial launch; dedicated error tracking is explicitly deferred
as a post-launch improvement, not a blocker.

### 2.7 Working-Tree and Dependency-Closure Audit

```
git status --porcelain | wc -l          → 542 total changed entries
git status --porcelain | grep "^??"     → 312 untracked files
git status --porcelain | grep "^ M"     → 229 modified (tracked) files
git status --porcelain | grep "^ D"     → 1 deleted (tracked) file
git branch --show-current               → master
git log --oneline -15                   → most recent: 02519a5, 846dc07, 63140a5, e048c29, 679189e (all direct commits to master, no release-branch pattern)
```

**The single deleted file** —
`apps/studio/src/renderer/src/features/print-requests/hooks/useCustomers.ts` — was inspected and
determined to be **unrelated to this goal**: it belongs to other in-progress work already present in
the working tree before this goal began (not touched, created, or reverted by any `production-release`
or Goal #12 activity). Per the standing safety restriction against reverting unrelated changes, this
pass **did not** touch, stage, or explain away this deletion further — it is out of scope for
`production-release` and should be resolved by whichever goal owns it.

**This working tree currently contains substantial uncommitted work spanning many parallel,
already-signed-off and still-in-progress goals** (consistent with every prior session's provenance
findings in this repository — 542 changed entries is not new or specific to this pass). **This
repository is not currently in a single clean, production-ready commit state.**

**Conclusion: the repository is not yet safe to use as the direct source for a production release
build.** Before any production build/deploy step in the Ordered Deployment Sequence (§5) runs, the
owner (or a dedicated committing pass) must:
1. Review the full 542-entry working tree.
2. Commit everything that is genuinely finished, signed-off product work.
3. Explicitly decide the disposition of any still-in-progress or abandoned change (including the one
   unrelated deleted file above) before it is included in a production build.
4. Confirm `package-lock.json` and `functions/package-lock.json` are committed and represent the
   exact dependency set that will be installed via `npm ci` for the production build — not verified
   in this pass since it depends on the outcome of step 1–3 above.

This audit deliberately used live `git status` output at the time of this pass, not a stale
recollection from an earlier session, per the Plan's own instruction that this check must reflect
working-tree state at (near) actual deploy time.

### 2.8 Production Settings Cold-Start Classification

| Setting/reference doc | Classification |
|---|---|
| `categories` (at least one active category) | **Required before first Portal use** — catalog browse/filter and design creation reference `categoryId`; an empty categories collection would leave Portal's catalog technically functional (ready designs still show) but Studio import/catalog-management workflows expect at least one category to exist for a sane operator experience. Not a hard technical requirement, but a practical one. |
| `tags` (global approved-tag collection) | Safe to use code defaults / start empty — AI enrichment creates `suggestedNewTags` for owner review even with zero pre-existing approved tags; no feature hard-fails on an empty `tags` collection. |
| `settings/printRequestLimits` (`L` — max quantity per show per customer) | Safe to use code default — `updatePrintRequestLimitSettings` callable has a documented code default (per `BACKEND.md`) when the doc is missing. |
| `settings/customerUploadQuotas` | Safe to use code default — same pattern, documented code defaults per ADR-FP-095. |
| `settings/emailProviders` | **Required before first transactional email** — must select `resend` or `brevo` explicitly, or the default provider selection behavior `[NEEDS REPO CHECK]` (not traced in this pass whether an unset doc silently picks one provider or fails). Recommend the owner configure this explicitly via Studio Settings immediately after first deploy, before relying on any invite/proof-notice email. |
| `settings/portalHelp` (FAQ and How To) | Safe to use code defaults — missing/empty doc falls back to bundled FAQ defaults in `portalHelpContent.ts` per `ARCHITECTURE.md`. |
| `settings/portalSocialMeta` | Safe to use code defaults initially — Portal OG/share falls back to a library-rotation default image; owner-configurable via Studio Settings → Social sharing whenever convenient, not launch-blocking. |
| `settings/brandLogos` | Safe to use code defaults — falls back to the bundled `/brand/fresh-prints-request-portal-logo.png` per `DEPLOYMENT.md`. |
| `settings/aiEnrichment` | Safe to use code defaults — documented default vision model (`gemini-2.5-flash-lite`) applies when the doc is missing. |
| `upcomingShows` | **Owner-configurable after deployment, not required before first Portal use** — Portal catalog browse and account features function with zero shows; Print Request queue-to-show simply has nothing to queue to until the owner creates the first show in Studio. This is expected, normal early-launch state, not a defect. |
| `showQueues` / `printRequestDesignDailyLimits` (legacy/deprecated collections) | **Optional** — legacy/deprecated per `DATA_MODEL.md` and `TESTING.md`; no seeding needed, no functional impact if absent in a cold-start project. |

**No Firestore seeding was performed in this pass**, consistent with scope.

### 2.9 Secrets and External-Provider Checklist

**No secret value is printed, requested, or stored in this artifact or any repository file.** Names
and required actions only:

| Secret name | Required for | Action needed (name only) |
|---|---|---|
| `GEMINI_API_KEY` | AI enrichment Functions (`enqueueAiEnrichment`, etc.) | Set in production project's Secret Manager before deploying any AI-enrichment function |
| `RESEND_API_KEY` | Invitation + proof-notice email | Set in production project's Secret Manager |
| `BREVO_API_KEY` | Alternate email provider | Set **only if** `settings/emailProviders` selects Brevo |
| `ETSY_X_API_KEY` | Etsy recommendation search callables | Set in production project's Secret Manager |

| External-provider / config check | Status this pass |
|---|---|
| Resend sender-domain verification for `myprintrequest.com` | `[NEEDS OWNER INPUT]` — cannot be observed from repo; owner must confirm in the Resend dashboard |
| Brevo sender-domain verification | `[NEEDS OWNER INPUT]` — only relevant if Brevo is selected |
| `INVITATION_FROM_EMAIL` / `PROOF_NOTICE_FROM_EMAIL` params | Code defaults are already `Fresh Prints <noreply@myprintrequest.com>` (ADR-FP-111); confirm no stale project-specific `.env.<prod-project-id>` override exists once that file is created — none exists today since the project doesn't exist yet |
| Firebase Auth Authorized Domains | Must include `myprintrequest.com` (and `www.` if connected) before Portal auth functions on that host — configured after project creation, before Portal traffic |
| Firebase Auth email templates | `[NEEDS REPO CHECK]` — cannot verify Console template state from repo source; confirm no custom dev-project template exists that would need replicating |
| Google sign-in configuration | `[NEEDS REPO CHECK]` — Google OAuth client/consent-screen configuration for the production project is an external Console action; `ARCHITECTURE.md`/`BACKEND.md` confirm Google sign-in is supported for Portal customers but do not document a per-project OAuth client setup step in this repo |
| VAPID / web-push configuration | Required if web-push (`registerWebPushSubscription`) is to work in production — `NEXT_PUBLIC_FIREBASE_VAPID_KEY` must be generated for the production project via Firebase Console → Project Settings → Cloud Messaging → Web Push certificates (same mechanism documented in `apps/portal/.env.example`) |

---

## 3. Production Project Creation — Beginner-Friendly Owner Instructions

*(These instructions are provided now because the repository-readiness checks above are complete.
They describe an external Google/Firebase Console action — no repository file is changed by
following them.)*

### Step-by-step

1. **Go to the Firebase Console:** open a browser and go to `https://console.firebase.google.com/`,
   signed in with the Google account that should own the production project (this can be the same
   account used for `fresh-prints-dev`, or a different one — either works, but note which account
   owns which project for later billing/access purposes).
2. **Click "Add project"** (or "Create a project").
3. **Choose a project name.** Firebase will suggest a project **ID** based on the name — this ID is
   what appears in URLs and CLI commands. **You may edit the suggested ID before creating the
   project.** A short, clear id like `fresh-prints-prod` is recommended (this exact id is already
   assumed as a placeholder in one source file — see §2.4 above — which simplifies things if you use
   it, but is not mandatory; if you choose a different id, tell the coding agent so that file can be
   updated).
4. **Important — the project ID cannot normally be changed later.** Once you click Create, that ID is
   permanent for the life of the project. Double-check the ID field specifically (not just the
   display name) before confirming.
5. **How to avoid accidentally modifying `fresh-prints-dev`:** make sure you are creating a **brand
   new** project, not selecting the existing `fresh-prints-dev` project from a dropdown. The "Add
   project" button always starts a new project; there is no risk of overwriting `fresh-prints-dev` by
   following these steps, since nothing in project creation touches an existing project. As an extra
   safety check, once created, confirm the new project's ID in the Console's project switcher
   (top-left dropdown) is different from `fresh-prints-dev` before doing anything else.
6. **Google Analytics during project creation:** Firebase will ask whether to enable Google Analytics
   for this Firebase project. **This is a different, separate Google Analytics concept from the GA4
   Measurement ID discussed elsewhere in this plan** — Firebase's own built-in Analytics (used for
   Firebase-specific features like Crashlytics correlation) is optional and not required by anything
   in this codebase today. Recommend **declining** it during project creation to keep the initial
   setup minimal — none of Fresh Prints' code depends on Firebase's built-in Analytics. This decision
   is independent of, and does not affect, the separate Portal GA4 Measurement ID discussed in
   owner decisions #11/#12 above.
7. **Wait for project provisioning** to finish (usually under a minute).
8. **Do not configure anything else yet.** At this point, stop and return to the coding agent with
   the information in §4 below. Do not yet: add Firestore, add Storage, add Authentication providers,
   add a Web App, set up billing, or connect a domain — those are separate, later steps in the
   Ordered Deployment Sequence (§5), each with their own checkpoint.

### What Firebase products this project will need later (informational only — do not enable yet)

- **Firestore** (Native mode)
- **Cloud Storage**
- **Authentication** (Email/Password + Google providers)
- **Cloud Functions** (requires the **Blaze** pay-as-you-go billing plan — Cloud Functions are not
  available on the free Spark plan)
- **App Hosting** (also requires Blaze)
- **Web Push certificates** (part of Cloud Messaging, no extra product enablement beyond
  Authentication + a registered Web App)

**Billing note:** because Cloud Functions and App Hosting require the Blaze plan, the owner will need
to attach a billing account (credit card) to the production project before those two specific steps
in the Ordered Deployment Sequence can proceed. Firestore, Storage, and Authentication alone do not
require Blaze, but this project will need Blaze regardless once Functions/App Hosting are reached —
recommend attaching billing at project-creation time to avoid a second interruption later, but this
is not strictly required at the moment of project creation itself.

### What success looks like

- A new project appears in the Firebase Console project list, with a project ID that is **not**
  `fresh-prints-dev`.
- The project's dashboard is visible and empty (no Firestore data, no Functions, no Hosting content)
  — this is the expected and correct starting state.
- No existing `fresh-prints-dev` data, settings, users, designs, or configuration has changed in any
  way (creating a new project cannot affect an existing one).

---

## 4. Production Project Creation — Human Checkpoint

**This is the checkpoint this pass stops at, per explicit instruction.**

Please create the production Firebase project following §3 above, then return with:

1. **The selected production Firebase project ID** (exact string, e.g. `fresh-prints-prod` or
   whatever you actually chose).
2. **Confirmation that the project was created** (visible in the Firebase Console project list).
3. **Confirmation that billing (Blaze plan) is attached**, if you've already done so — or confirm you
   understand it will be needed before the Functions/App Hosting steps later in the sequence, if you
   prefer to attach it then instead.
4. **Confirmation that no deployment has been performed** — i.e., you have not yet run any
   `firebase deploy` command against this new project, and have not manually created any Firestore
   collections, Storage objects, or Authentication users in it.

**No further Implementation work proceeds until this information is provided.** Everything in §5
below remains prepared-but-not-executed until then, and each subsequent step in that sequence is
its own separate checkpoint requiring its own explicit approval — providing the project ID does not
by itself authorize any deployment step.

---

## 5. Ordered Future Deployment Sequence (prepared, not executed)

1. **Production Firebase project creation** — external Console action (§3/§4, this checkpoint).
2. **Repository project mapping/configuration** — add the new project id as a `.firebaserc` alias
   (e.g. `"production": "<project-id>"`, keeping `"default": "fresh-prints-dev"` unchanged); update
   `functions/src/lib/email/portalUrlResolver.ts`'s `PORTAL_BASE_URLS` map with the real project id
   if it differs from the placeholder `fresh-prints-prod` (§2.4); create
   `functions/.env.<project-id>` for `INVITATION_FROM_EMAIL`/`PROOF_NOTICE_FROM_EMAIL` if they need
   to differ from defaults (they currently do not). **Each of these is a small source change requiring
   its own build/lint verification before commit — a human checkpoint, not an automatic step.**
3. **Required Firebase product enablement** — Firestore (Native mode), Storage, Authentication
   (Email/Password + Google), Blaze billing plan for Functions/App Hosting. Console actions, human
   checkpoint.
4. **Firestore Rules deploy** — `firebase deploy --only firestore:rules --project <project-id>`,
   full unmodified `firestore.rules`. Human checkpoint (rule changes require explicit approval per
   `BACKEND.md`).
5. **Storage Rules deploy** — `firebase deploy --only storage --project <project-id>`, full
   unmodified `storage.rules`. Human checkpoint.
6. **Firestore indexes deploy** — `firebase deploy --only firestore:indexes --project <project-id>`,
   full unmodified `firestore.indexes.json` (§2.2 — all 61 indexes confirmed needed). Human
   checkpoint.
7. **Secret Manager population** — set `GEMINI_API_KEY`, `RESEND_API_KEY`, `ETSY_X_API_KEY` (and
   `BREVO_API_KEY` if Brevo is selected) via `firebase functions:secrets:set <NAME> --project
   <project-id>` or Console. Human checkpoint; values never touch repository files.
8. **Functions deploy with explicit allowlist** — using the exact allowlist from §2.1 (pending the 5
   flagged owner decisions), e.g.:
   `firebase deploy --only functions:addPortalCatalogDesignToPrintRequest,functions:cleanupAbandonedCustomerUploads,...,functions:rebuildCatalogSnapshots --project <project-id>`
   (full comma-separated list constructed at deploy time from the final approved allowlist — never
   a bare `--only functions`). Human checkpoint.
9. **App Hosting environment configuration** — set all `NEXT_PUBLIC_FIREBASE_*` values,
   `NEXT_PUBLIC_PORTAL_ORIGIN=https://myprintrequest.com`, via the mechanism confirmed at
   Implementation time per §2.3 (**must** be re-verified against the installed Firebase CLI version
   before use). `NEXT_PUBLIC_GA_MEASUREMENT_ID` stays unset. Human checkpoint.
10. **Portal deployment** — `firebase deploy --only apphosting --project <project-id>` (or the
    App Hosting-specific deploy command confirmed at that time). Human checkpoint.
11. **Production Studio configuration/build** — swap `apps/studio/.env.local` to production
    `VITE_FIREBASE_*` values (per §2.5's recommended separate-file approach), run
    `npm run build:studio`, verify the installer, then restore the dev env file. Human checkpoint;
    distribution/signing process itself remains `[NEEDS OWNER INPUT]` per the original Plan.
12. **Settings/reference-data initialization** — via Studio, signed in as owner against the new
    production project: create at least one category (§2.8), explicitly select an email provider in
    Settings, optionally configure social-meta/brand-logo/AI-enrichment settings, and run
    `rebuildCatalogSnapshots` once to initialize the generated-catalog coordination documents (§2.1
    row 105) before relying on Portal's generated-catalog read path. Human checkpoint.
13. **Domain and DNS connection** — connect `myprintrequest.com` (and `www.` redirect, owner decision
    #6) to the App Hosting backend via Console + the domain registrar. Human checkpoint.
14. **Auth Authorized Domains** — add `myprintrequest.com` (+ `www.` if connected) in Firebase
    Console → Authentication → Settings → Authorized domains. Human checkpoint.
15. **Transactional-email validation** — confirm Resend/Brevo sender-domain verification for
    `myprintrequest.com` is genuinely complete (§2.9), then send one real test transactional email
    (e.g. a real invite) to confirm delivery. Human checkpoint.
16. **Soft-launch smoke tests** — the 10-item checklist from the original Plan §3.16 (guest catalog
    browse, registration/login, `robots.txt` allow-variant, `/sitemap.xml` with Admin credentials
    working, one real Print Request, one real customer upload, one real transactional email, one
    real `/share/design/{id}` OG check). Human observation recommended.
17. **GA4 as a separate later checkpoint** — only after a real GA4 property exists, Enhanced
    Measurement is disabled, and the privacy-policy/consent decision is resolved (owner decisions
    #11/#12). Its own explicit human checkpoint, sequenced after Portal is otherwise stable.
18. **Search Console registration** — external Google Search Console action for the production
    domain. Human checkpoint, not blocking public soft-launch.
19. **Public announcement** — entirely an owner business decision, sequenced after the soft-launch
    period (owner decision #10) confirms stability.

**Every step above numbered 2 and higher remains unauthorized by this pass.** This artifact prepares
the sequence; it does not execute any of it.

---

## 6. Rollback Sequence (prepared, restated from Plan §3.17, unchanged)

| Component | Rollback mechanism |
|---|---|
| Portal (App Hosting) | Roll back to the previous successful App Hosting rollout via Console/CLI — exact CLI command `[NEEDS REPO CHECK]` at the time of first real rollback, not fabricated here |
| Functions | Redeploy the previous commit's `functions/` build using the same explicit allowlist |
| Firestore Rules | Redeploy the prior commit's `firestore.rules` |
| Storage Rules | Redeploy the prior commit's `storage.rules` |
| Firestore Indexes | Delete the specific added index via Console/CLI if a new index proves problematic; index changes are additive-safe otherwise |
| Configuration (env vars/secrets) | Revert the specific App Hosting env var or Secret Manager version (Secret Manager retains prior versions by default) |
| GA4 | Unset `NEXT_PUBLIC_GA_MEASUREMENT_ID` and redeploy Portal — analytics code is fail-closed and returns to fully inert immediately |
| `portalUrlResolver.ts` project-id mapping | Revert the one-line source change via normal git revert + redeploy Functions, if the wrong project id was entered |

No database rollback is prepared — §2.8 confirms this is a cold-start launch with no pre-existing
production data at risk.

---

## 7. Smoke-Test Sequence (restated from Plan §3.16, unchanged, prepared not executed)

See Ordered Deployment Sequence step 16 above — the same 10-item checklist from the approved Plan,
carried forward unchanged since nothing in this pass altered its content.

---

## 8. Remaining Human Checkpoints (consolidated)

1. **This checkpoint** — production Firebase project creation (§4).
2. Repository project-mapping change (`.firebaserc`, `portalUrlResolver.ts`) — small source change,
   own review/verification.
3. Firebase product enablement + Blaze billing attachment.
4. Firestore Rules deploy.
5. Storage Rules deploy.
6. Firestore indexes deploy.
7. Secret Manager population (4 secret names).
8. Functions deploy (explicit allowlist — pending 5 flagged function-classification decisions,
   §2.1).
9. App Hosting environment configuration (pending §2.3's CLI-mechanism verification).
10. Portal deployment.
11. Production Studio build/distribution (pending owner input on distribution/signing process,
    carried from the original Plan).
12. Settings/reference-data initialization (including the one-time `rebuildCatalogSnapshots` call).
13. Domain/DNS connection.
14. Auth Authorized Domains configuration.
15. Transactional-email live validation.
16. Soft-launch smoke test observation.
17. GA4 go-live (separate multi-step checkpoint, deferred).
18. Search Console registration.
19. Public announcement.

Additionally, **before step 2 can even be finalized**, the owner must resolve:
- The 5 flagged Functions-classification decisions (§2.1: `testAiEnrichmentPlayground`,
  `testAiEnrichmentTagRerank`, `ownerDeleteUser`, `backfillPrintRequestQueueTab`,
  `rebuildCatalogSnapshots`).
- The working-tree commit/reconciliation pass described in §2.7 (542 changed entries currently
  uncommitted).

---

## 9. Verification (this pass — read-only/local only)

| Command | Exit code |
|---|---|
| `cd functions && npm run build` | 0 |
| `npm run typecheck --workspace @fresh-prints/portal` | 0 |
| `npm run build:portal` | 0 (confirmed). First two attempts hit Windows-filesystem-only errors on the `.next` staging directory (`EPERM` on a stale `trace` lock, then `ENOENT` on a `500.html` rename race) — not code defects; compilation, typechecking, and all 19 pages succeeded in every attempt. Third attempt, after clearing `.next` and capturing the exit code directly (not through a piped `tail`), confirmed `REAL_EXIT:0`. |
| `npm run build:studio` | 0 |
| `npm run lint` (repo-wide) | 0 |
| `git diff --check` | 0 (only benign LF/CRLF line-ending advisory warnings from Windows checkout config; no actual conflict markers or errors) |

**No `firebase deploy` command of any kind was run in this pass.**

---

## 10. Explicit Confirmation

**No production resource was created, configured, modified, or deployed in this pass.** No Firebase
project was created. No `.firebaserc` alias was added. No secret was set. No Firestore Rules,
Storage Rules, indexes, Functions, or App Hosting configuration were deployed anywhere. No DNS or
domain was touched. No Firebase Auth configuration was changed. No GA4 or Search Console property was
created. No production email was sent. No Studio installer was built for production. No production
data was migrated or seeded. No public announcement occurred. No production traffic exists.

Work stops at the production Firebase project creation checkpoint (§4), per explicit instruction.
