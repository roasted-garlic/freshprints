# Firestore Usage Efficiency Wave C — Phase 0 Operation Inventory

Date: 2026-07-23  
Status: implementation inventory complete; measured attribution pending owner isolation checkpoint  
Scope: current direct Firestore operations involving `tags`, `categories`, `settings`, `designs`, `printRequests`, `printRequestItems`, `upcomingShows`, `showAllocations`, `users`, and `customers`

This is a static source inventory, not read-volume evidence. It was completed before any query behavior was changed. Phase 0 implementation to this point adds development diagnostics only.

## Client operations

| Collection | File / owner | Operation and constraints | Limit / pagination | Mount, cleanup, and expected lifecycle | Overlap / apparent-idle risk |
|---|---|---|---|---|---|
| `tags` | `apps/studio/.../designs/services/catalogTagService.ts` | `getDocs`; approved/status and management list variants; post-mutation reread | management page pagination where supplied; validation rereads unbounded | Design Library / taxonomy management route; one-shot | overlaps Portal taxonomy and Functions reference loads; mutation rereads are explicit |
| `categories` | `apps/studio/.../designs/services/categoryService.ts` | `getDocs` and `getDoc`; active/status list variants; post-mutation reread | management list pagination where supplied | Design Library / taxonomy management route; one-shot | overlaps Portal taxonomy and Functions reference loads |
| `designs` | `apps/studio/.../designs/services/designService.ts` | list `getDocs`, `getCountFromServer`, and document `getDoc`; stable status/order filters | list query has caller limit/cursor; count is aggregate | Design Library and design detail/review routes; one-shot | list/count pairs overlap; repeated ID lookups possible across consumers |
| `designs` | Studio AI Review services/hooks and shared subscription helper | `onSnapshot`, `getDocs`, aggregate counts, and mutation verification reads for processing / needs-review / rejected states | status-specific bounds and pagination vary by tab | route-owned subscriptions should detach through `createSharedFirestoreSubscription`; count queries one-shot | Strict Mode and route remount risk; shared helper prevents duplicate upstream subscription for the same registry key |
| `designs` | Studio imports/customer-upload/donated-design routes | list and document reads around import state and selection | route-specific bounds | route-owned one-shots/listeners | can remain visible as activity while import/AI work continues |
| `printRequests` | `apps/studio/.../staff-inbox/services/staffInboxSubscriptionService.ts` | global `onSnapshot`; request-origin/state filtering is applied by current service logic | currently unbounded | mounted by global Studio shell; wrapped unsubscribe on auth/tree teardown | **high idle risk**: deliberately global operational listener; exact safe bounds require Staff Inbox constraint review |
| `showAllocations` | same Staff Inbox service | global `onSnapshot` for allocation alerts | currently unbounded | global Studio shell; wrapped unsubscribe | **high idle risk** and emissions on writes |
| `upcomingShows` | same Staff Inbox service | global `onSnapshot` for show alerts | currently unbounded | global Studio shell; wrapped unsubscribe | **high idle risk** and overlaps Upcoming Shows route |
| `printRequests`, `printRequestItems` | Studio print-request services/pages | list/detail `getDocs`/`getDoc`, aggregate/supporting reads, transactions for edits | list constraints and route pagination vary | print-request routes; listeners and one-shots are route-owned except Staff Inbox | detail consumers can overlap global Staff Inbox and show allocation reads |
| `upcomingShows`, `showAllocations` | Studio upcoming-show services/pages | list/detail reads, allocation queries, and transactions | show/date constraints; page-specific limits | Upcoming Shows route; cleanup owned by route hooks | timer/UI state may appear idle but no repeating read is acceptable without trace evidence |
| `users`, `customers` | Studio auth/team/customer services | profile `getDoc`, email/identity lookup `getDocs`, and transactions | identity queries use narrow equality and small limits where implemented | authentication or customer/team routes | auth-triggered reads can occur while current route is visually idle |
| `designs` | `apps/portal/features/catalog/services/catalogService.ts` and `useCatalogDesigns.ts` | paged ready-design `getDocs`, aggregate count, one `getDoc` per deduplicated requested ID | page limit/cursor; ID resolver is unbounded across separate calls | Discover / Design Library / favorites / request / detail consumers; one-shot | **high amplification risk**: concurrent consumers are not globally coalesced |
| `tags`, `categories` | same Portal catalog service | active/approved full `getDocs` | no Firestore pagination in current taxonomy reads | catalog routes; one-shot | should not execute on non-catalog routes; overlapping consumers/remounts require trace evidence |
| `printRequests`, `printRequestItems`, `showAllocations`, `upcomingShows` | `apps/portal/features/print-requests/services/portalPrintRequestService.ts`, print-request context, show-progress hook | request/item lists and details; callable-backed progress polling; mutations use Functions | customer/status constraints; item queries by request; polling interval is hook-owned | authenticated Portal provider/request routes; cleanup cancels hook timers | **apparent-idle risk** from progress polling and provider lifetime; callable causes Admin reads |
| `customers`, `users` | `apps/portal/features/auth/services/customerProfileService.ts` | authenticated profile/user `getDoc` / equality lookup | single document or limit-one lookup | auth provider; executes on authentication transition | global auth-triggered read |
| `designs` | `apps/portal/features/favorites/services/favoriteService.ts` | favorites metadata and design-ID resolution through catalog consumers | IDs deduplicated only within one resolution call | favorites/account/catalog consumers | overlaps catalog/request/detail design lookup |
| `settings` | `apps/portal/features/brand/portalGlobalSocialMetaService.ts` and settings-backed Portal providers | settings document `getDoc` | single document | global/metadata provider depending on call site | may execute outside catalog routes; must be attributed as settings, not taxonomy |

## Functions operations

Functions are request-, event-, task-, or schedule-owned; none are client listeners. Admin SDK reads are billed independently from client reads.

| Collections | Function / module paths | Operation shape and lifecycle | Amplification / idle classification |
|---|---|---|---|
| `settings`, `categories`, `tags` | `ai/aiEnrichmentRuntimeCache.ts`, `ai/loadAiEnrichmentSettings.ts`, `ai/aiEnrichmentPipeline.ts`, `ai/aiEnrichmentPlayground.ts` | settings document read; active-category query; approved-tag query; 60-second per-instance cache | **primary import amplification candidate**: cache is instance-local and has no in-flight Promise coalescing; concurrent misses are now logged, not changed |
| `designs` | `enqueueAiEnrichment.ts`, `ai/aiEnrichmentPipeline.ts`, `ai/designAiFields.ts`, `resetAiEnrichmentForProcessing.ts` | enqueue/pipeline direct document reads plus stage/result writes | repeated jobs or retries can reread a design; invocation overlap and terminal result are now logged |
| `designs`, `categories`, `tags`, `settings` | AI playground, reranker, suggested-tag and provider/retry paths | reference loaders precede provider work; retry helpers retry provider calls, not Firestore queries directly | reference cache outcome/correlation identifies whether retries coincide with reference rereads |
| `designs` | `onCustomerFavoriteChanged.ts`, `onPrintRequestItemCreated.ts`, `onShowAllocationCreated.ts` | event-triggered direct design reads and aggregate/update work | expected per triggering write; can continue after clients close if queued events remain |
| `designs`, `categories`, `settings` | `getPortalDesignShareOpenGraph.ts`, `getPortalOgShareImage.ts`, `getPortalGlobalOpenGraph.ts` | direct design/category/settings document reads per metadata/image request | server-origin reads can be caused by crawlers or open browser metadata requests |
| `printRequests`, `printRequestItems`, `designs` | `addPortalCatalogDesignToPrintRequest.ts`, `duplicatePortalPrintRequestItem.ts`, `removePortalPrintRequestItem.ts`, `updatePortalPrintRequestItemQuantity.ts`, `clearPortalWorkingPrintRequest.ts` | callable validation reads and transactions | explicit user mutation lifecycle; not an idle source absent retries/clients |
| `printRequests`, `printRequestItems` | `confirmCustomerUploadsAndAttachToRequest.ts`, `customerAddAssistedApprovedProofToPrintRequest.ts`, `assistedCreationRequests.ts` | request/item queries and transactions, including design validation | upload/assisted workflows may outlive the initiating UI action |
| `printRequests`, `printRequestItems`, `upcomingShows`, `showAllocations`, `users` | `queuePortalPrintRequestToShow.ts` | parallel validation queries followed by transaction | explicit queue action; direct source is one callable invocation |
| `printRequests`, `upcomingShows` | `getPortalShowPrintProgress.ts` | request document plus one direct show-document read per referenced show | **poll amplification candidate** because Portal progress hook may call repeatedly |
| `customers`, `users`, `printRequests` | `createPortalPrintRequest.ts`, `registerCustomer.ts`, `createCustomerWithPortalInvite.ts`, `updateCustomer.ts`, `syncPortalAccountEmail.ts`, `requestPortalAccountDeletion.ts`, `tombstoneCustomerAccount.ts`, `ownerDeleteUser.ts` and `lib/{caller,portalCustomer,portalWorkingPrintRequest}.ts` | auth/profile equality queries, direct reads, and transactions | callable/auth lifecycle; repeated auth/provider work must be separated from client SDK traces |
| `settings` | `lib/loadCustomerUploadQuotaSettings.ts`, `lib/loadPrintRequestLimitSettings.ts`, `lib/loadPortalQueueCutoffHours.ts`, `lib/email/emailSettings.ts`, settings update/finalize callables | direct settings document reads/writes | per-invocation configuration reads; not currently covered by the AI-only cache |
| all scoped operational collections | `wipeOperationalTestData.ts` | explicitly paged Admin queries with batch limits | manual destructive dev operation only; not an idle source unless invoked |
| `designs`, `printRequests`, `upcomingShows` | archive/purge/delete functions (`archiveStaleRejectedDesigns.ts`, `archiveStaleWorkingPrintRequests.ts`, `purgeArchivedDesignAssets.ts`, `purgeIdleCustomerUploadFullSize.ts`, `deleteEligible*.ts`) | scheduled/task/callable bounded scans and direct eligibility reads | possible fully-closed server-origin reads; scheduler/task timestamps must be reconciled |
| `categories`, `tags` | `archiveTaxonomyWithGuards.ts` | direct taxonomy read plus dependent guard queries and transaction/write | explicit staff mutation only |

## Known identical or overlapping access

- Studio global Staff Inbox listeners overlap route-owned print request, show, and allocation reads.
- Studio taxonomy management, Portal catalog taxonomy, and every cold AI Function instance independently read the canonical tag/category collections.
- Portal favorites, current request, design detail, and catalog consumers can independently request the same design ID. Only IDs inside a single `getReadyDesignsByIds` call are deduplicated.
- AI settings/categories/tags caches are per Functions instance. Concurrent cold misses on one instance are observable but remain behaviorally unchanged.
- Portal show-progress polling maps one request to multiple direct show reads on every callable execution.
- Open Graph endpoints can read designs/categories/settings without an interactive app route.

## Print Requests route-writer inventory and resolution

The failed smoke exposed competing URL/local-state writers in `PrintRequestsPage.tsx`: initial
query-param hydration, tab-selection fallback, selected-request/tab synchronization, tab clicks,
request-card clicks, create/delete, and show-queue add/remove callbacks could each replace the route.
When async allocation state moved a request between tabs, those writers could disagree and repeatedly
replace the same location until Chromium throttled navigation.

The remediated ownership model is:

- URL query params are the sole source for active tab and selected request.
- `commitPrintRequestsRoute` is the only Print Requests route commit helper.
- `resolveCanonicalPrintRequestsRoute` is the only normalization decision.
- One effect commits that canonical decision after request/allocation data is ready.
- Filters may reveal a valid deep link but never write the route.
- User actions and mutation completions call the same commit helper once.

Source alignment tests reject reintroduction of local tab/selection setters or alternate replacement
helpers. Async resolver tests cover loading, valid deep links, requests moving between tabs, stale
IDs, populated/empty tabs, five cycles, and back/forward destinations.

### Secondary Working-filter correction

The later owner retest proved the primary tabs were fixed but exposed a second writer-precedence
problem inside Working. Active/Stale/Empty/All lived in local state while `requestId` lived in the
URL. The deep-link reveal effect forced the local filter to All when a selected Empty/All request was
not visible after an Active/Stale click.

The secondary filter is now canonical `workingFilter` URL state. Direct clicks compute the
destination list first, preserve the request only when compatible, otherwise select the first
destination request or clear it, then push one route. Passive async/history normalization preserves
the valid filter and only normalizes selection. Search reveal may clear local search text but cannot
change the route filter. The request list's persisted `itemCount` is the authoritative classification
input; the route does not infer Empty from partially loaded request-detail items.

## Cleanup and lifecycle conclusions to verify

1. Every route-owned listener must detach after leaving its route.
2. The global Staff Inbox listeners are expected to remain attached for the authenticated Studio shell, but their unbounded shape is not approved as safe.
3. Strict Mode may create a development attach/detach cycle; it must not leave a second active upstream listener.
4. Portal progress polling must stop when its owning component unmounts or its terminal state is reached.
5. Functions activity can continue with all local clients closed due to deployed events, tasks, schedules, crawlers, or other sessions.

## Inventory method and limitations

The inventory used repository searches for Firebase client `getDoc`, `getDocs`, `onSnapshot`, `getCountFromServer`, transactions, Admin SDK `.get()`, collection names, and the shared subscription helper, followed by service/hook call-site inspection. Dynamic collection constants and callable-induced reads are represented by their owning service/function rows above. Exact invocation counts, returned-document counts, attach/detach balance, and route ownership are intentionally deferred to the measured isolation matrix.
