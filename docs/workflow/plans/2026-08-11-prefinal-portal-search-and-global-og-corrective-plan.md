# Plan: Pre-final corrective package — Portal search + Global OG + Customer Uploads intake + quota + About purchase copy

| Field | Value |
|-------|-------|
| Date | 2026-08-11 (amended — Workstreams E + F + G) |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase / pre-final corrective package |
| Parent goal | `prelaunch-catalog-search-count-and-first-visit-ux` (pre-Signoff correctives) |
| Production tip (plan base) | `913329caefa5cf5041b269da1e5192424d0b95c6` (PR #56) |
| Related | docs/workflow/reviews/2026-08-11-prefinal-portal-search-and-global-og-corrective-plan-review.md |

---

## Goal

Before final Portal App Hosting / Studio 1.0.3 / Signoff, plan **seven** corrective workstreams:

| ID | Workstream |
|----|------------|
| **A** | Non-fuzzy **prefixLast** catalog search while typing (`typoTolerance: false`) |
| **B** | Fix search input dropping characters (stale URL ↔ local state race) |
| **C** | Studio Global OG **Static Image** mode (upload or Design Library pick) |
| **D** | Global OG title/description updates become authoritative **immediately after Save** (Fresh Prints source), with owner-approved defaults |
| **E** | Defer Studio Customer Uploads staff review until Print Request is **successfully added to a show** |
| **F** | Release Upload / Donate **applicable** design quota when a qualifying design is permanently removed |
| **G** | Clarify About this portal copy: submitting a Print Request does **not** place an order or charge |

**No implementation in this pass** — Plan + Formal Review only. Owner F3 decisions recorded 2026-08-11. Package awaiting implement approval phrase after Formal Review clears.

---

## Background / baseline

Shipped on production tip `913329c…`:

- Exact-token Algolia params: `typoTolerance: false` + `queryType: 'prefixNone'`
- Catalog scroll preservation, Discover aggregate count, Whatnot follow UX
- Global OG modes: `library` \| `logo` only; defaults currently omit “Whatnot” wording

Owner QA: too-strict typing (`kil` empty), dropped characters while typing fast/mobile, need Static Image for non-design shares, saved OG title/description not visible for 10+ minutes.

---

## Scope

### In Scope
- Query-time Algolia prefix semantics change (no index mutation unless proven necessary)
- Portal catalog search controlled-input / URL `q` ownership fix
- Studio + shared + Functions Global OG Static Image + cache/live-update fix
- Owner-approved default title/description strings
- **E:** Server-authoritative timing change for when `customerUploads.catalogReviewStatus` becomes `pending_staff_review` for print-request artwork (attach ≠ review submit; successful show allocation / Add to Show = review submit)
- **F:** Authoritative quota release when qualifying Upload/Donate designs are permanently removed (exact mechanism TBD after owner decision — see Workstream F)
- **G:** Shared About this portal copy — owner-approved Print Request ≠ order/charge language on `/help` + first-visit modal via `PortalHelpAboutPanel`
- Focused tests + deployment classification
- Future branch(es) from **current** `origin/production` tip only

### Out of Scope
- Fuzzy typo search / replacing Algolia / CMS / design-specific OG changes
- Domain cutover / DNS / development sync / Studio 1.0.3 publish / App Hosting in this pass
- General media library / customer-selectable social images / Whatnot API
- Auto-promote to Design Library / auto Send to AI Review / Design production statuses
- Changing Donate Designs intake timing (must remain confirm → Pending) except as branched from E attach change
- Reversible staff-review lifecycle on show de-allocation (prefer one-way; see E)
- Weakening concurrency / size / batch anti-abuse limits as a side effect of F
- Deleting catalog Designs merely to free upload quota
- Print Request business logic / checkout / Portal payment (G is copy only)

---

## Verified production findings (root cause)

### Workstream A — too-strict search

| Fact | Evidence |
|------|----------|
| Current params | `packages/shared/src/catalog-search/portalCatalogAlgoliaExactSearchParams.ts`: `typoTolerance: false`, `queryType: 'prefixNone'` |
| Applied to managed search | `apps/portal/features/catalog/services/portalAlgoliaCatalogSearchService.ts` via `withPortalCatalogAlgoliaExactTokenSearchParams` |
| Why `kil` fails | `prefixNone` requires complete tokens — intentional anti-Willie fix; overshoots typeahead |
| Preferred fix | Query-time `queryType: 'prefixLast'` **keeping** `typoTolerance: false` (Algolia-supported; client `algoliasearch` ^5.56.0) |
| Multi-word | `prefixLast` = completed earlier words exact; final word prefix — matches owner semantics |
| Searchable attrs (index settings in repo) | `searchableAttributes: ['title', 'searchText', 'categoryName', 'unordered(tagFacetKeys)']` (`functions/src/algolia/algoliaAdminClient.ts`) |
| Title / description / tags | `title` searchable; description + tag names/aliases folded into `searchText` via `buildPortalCatalogSearchText` (`buildPortalCatalogAlgoliaRecord.ts`) — **no index mutation required** for attribute coverage |
| Index `setSettings` | **Not required** for A if query-time `prefixLast` is sufficient; only reconsider if QA proves otherwise → separate human checkpoint |

### Workstream B — dropped characters (**confirmed race**, not mere hypothesis)

| Fact | Evidence |
|------|----------|
| Local + debounce | `searchQuery` → 300ms → `debouncedSearchQuery` (`CATALOG_SEARCH_DEBOUNCE_MS`) |
| Debounce writes URL | Effect on `debouncedSearchQuery` → `router.replace(..., { scroll: false })` with `q` |
| URL writes local | Effect on `searchParams` (when fingerprint ≠ designId-only) → `setSearchQuery(nextSearch)` **and** `setDebouncedSearchQuery(nextSearch)` |
| Race | Newer keystrokes update `searchQuery`; older debounced `q` lands in URL; searchParams effect **overwrites** controlled input with stale `q` → visible character drop |
| designId guard | `libraryParamsWithoutDesignId` correctly skips designId-only churn but **does not** protect against self-authored stale `q` |
| Input | `CatalogFilterBar` controlled `value={searchQuery}` |

**Principle:** While typing, local `searchQuery` is authoritative. URL persistence remains for share/deep-link/back-forward/modal, but self-authored stale `q` must not overwrite newer input.

### Workstreams C + D — Global OG architecture

| Area | Path / fact |
|------|-------------|
| Studio UI | `PortalSocialMetaSettingsSection.tsx`, hook/service, Settings tab `socialSharing` |
| Doc | Firestore `settings/portalSocialMeta` |
| Shared | `packages/shared/src/constants/portal/portalSocialMetaSettings.constants.ts` |
| Current modes | `globalOgImageSource`: **`library` \| `logo` only** — no Static Image |
| Update | Callable `updatePortalSocialMetaSettings` (client cannot write settings) |
| Resolver | `functions/src/getPortalGlobalOpenGraph.ts` — public GET |
| Portal consumer | `portalGlobalSocialMetaService.ts` → `layout.tsx` / login/register/help `generateMetadata` |
| **Why Save lags 10+ min (Fresh Prints, not only FB)** | Stacked TTLs **without write invalidation**: Function in-process cache **3600s**; Function `Cache-Control: max-age=300`; Portal `createBoundedAsyncCache` **3600s**; Next `fetch`/`revalidate` **3600s**. Firestore updates immediately. |
| Current defaults | Title `"Fresh Prints Request Portal"`; Description `"Browse the design library and submit print requests for Fresh Prints shows."` — **must change** to owner-approved Whatnot wording (below) |
| Brand upload pattern to reuse | `brand/{app}/{slot}/…` + `finalizeBrandLogoSlot` — public read Storage; owner finalize callable |
| Design share OG | Separate (`getPortalDesignShareOpenGraph`) — **must remain untouched** |

**Owner-approved defaults (authoritative fallback):**

- Title: `Fresh Prints Whatnot Request Portal`
- Description: `Browse the design library and submit print requests for Fresh Prints Whatnot shows.`

Own in shared `DEFAULT_PORTAL_SOCIAL_META_*` (+ Portal brand mirrors if present) — single source.

**Crawler-visible verification (existing):** `GET https://us-central1-{project}.cloudfunctions.net/getPortalGlobalOpenGraph` (JSON) and/or Portal HTML meta tags — distinguish Fresh Prints stale vs third-party crawler cache. No new debug endpoint unless Review forces it.

---

## Recommended PR / deployment split

| Option | Contents | Deploy |
|--------|----------|--------|
| **PR-Portal (A+B)** | Shared Algolia exact params → `prefixLast`; CatalogPageContent / FilterBar state ownership; Portal tests | **App Hosting only** after merge |
| **PR-OG (C+D)** | Shared social meta types/defaults; Studio Static Image UI; Functions update + `getPortalGlobalOpenGraph` cache invalidation / shorter coherent activation; Portal metadata cache bust aligned with Save; Storage path/rules if new static OG asset | **Functions (+ Storage Rules if needed) + App Hosting** as separate explicit checkpoints |
| **PR-Intake (E)** | Functions: stop setting `pending_staff_review` on print-request attach/assisted confirm; set it on successful show-allocation boundary; shared helper + tests; DATA_MODEL wording | **Functions required** |
| **PR-Quota (F)** | Portal self-delete UI; Functions Portal delete auth + shared donation day refund on hard delete; Cap L untouched | **Functions + Portal App Hosting**; coordinate Functions with C+D+E |
| **PR-Portal (A+B+G)** | Search + About copy; optionally fold F Portal UI into this PR or keep F Portal with Functions PR | **App Hosting** |

**Recommendation:**  
1. **PR-Portal:** A+B+G (App Hosting)  
2. **PR-OG:** C+D (Functions ± Storage Rules + App Hosting)  
3. **PR-Intake:** E (Functions)  
4. **PR-Quota:** F3 (Functions + Portal self-delete + Donate refresh)  

Functions for C+D+E+F may share **one** production Functions deploy wave after merges — **do not** hide Functions inside App Hosting. F3 is decided — no longer blocked on product option.

---

## Approach by workstream

### A — Incremental exact search

1. Change `PORTAL_CATALOG_ALGOLIA_EXACT_TOKEN_SEARCH_PARAMS.queryType` from `'prefixNone'` → `'prefixLast'`.
2. Keep `typoTolerance: false`.
3. Update types/tests/containment (`Kill` must still not match `Will`/`Willie`; `kil` must match `Kill` via prefix).
4. Studio catalog search if it imports the same helper — verify and keep parity.
5. No `setSettings` / reconcile in preferred path.

### B — Input integrity

1. Track generation / “dirty while typing” / ignore URL `q` echo when it equals last self-pushed value or is older than local `searchQuery`.
2. Prefer: only apply URL→local when change is **external** (popstate / genuine navigation / initial mount), not when `router.replace` was initiated by this page’s debounce writer.
3. Preserve: designId ignore; Back/Forward restores `q`; clear search; filters; scroll preservation; debounce of **search requests** (not of keystroke display).
4. Do not “fix” by only lengthening debounce.

### C — Static Image

1. Extend `PortalGlobalOgImageSource` with `'static'`.
2. Persist selection on `portalSocialMeta` (narrowest fields — e.g. `staticOgImage` with `{ kind: 'upload' \| 'design'; storagePath? \| designId?; … }` — exact shape in implement after Review).
3. Studio: mode option + upload (reuse brand finalize pattern or dedicated finalize callable) + Design Library picker (ready designs only).
4. `getPortalGlobalOpenGraph`: resolve static URL; on missing design/asset → fail safe to existing non-design fallback (logo / defaults).
5. Design pick is reference only — no design lifecycle mutation.
6. Mode switch: retain static config when temporarily selecting library/logo if schema allows (match existing conventions).

### D — Immediate Global OG after Save

1. Update shared defaults to owner-approved strings.
2. On successful `updatePortalSocialMetaSettings`: invalidate Function response cache (same instance + document strategy for multi-instance: version stamp / `updatedAt` check / short TTL + no hour-long sticky cache for settings fields).
3. Portal: stop 3600s stale for Global OG — prefer short revalidate **or** cache-bust query keyed by settings `updatedAt` **or** bypass bounded cache when Function returns fresh `updatedAt`.
4. Keep HTTP CDN max-age modest; document that Facebook/etc. may still need Scrape Again.
5. Title + description + image mode must activate coherently from one Save.
6. Design-specific OG unchanged.

### E — Defer Customer Uploads Studio review until successful Add to Show

#### Verified current lifecycle (do not guess)

| Step | What happens today | Studio Pending? |
|------|--------------------|-----------------|
| Batch create | `catalogReviewStatus: "not_eligible"`, `technicalStatus: "awaiting_upload"` | No |
| Finalize / processing ready | `technicalStatus: "ready"`, **keeps** `catalogReviewStatus: "not_eligible"` | No |
| **Confirm attach** (`confirmCustomerUploadsAndAttachToRequest`) | Shared `buildCatalogIntakeConfirmationPatch` sets **`catalogReviewStatus: "pending_staff_review"`** + ownership/consent/`printRequestId` | **Yes — current bug vs owner intent** |
| Assisted Add to Request | Same patch → `pending_staff_review` | **Yes** |
| Donate confirm | Same patch → `pending_staff_review` (Donated Designs tab via client purpose filter) | Yes (Donate — **preserve**) |
| Qty / size edits on request items | Item fields only | No extra effect |
| Remove item (`removePortalPrintRequestItem`) | Deletes `printRequestItems` only — **does not** clear upload `catalogReviewStatus` / `printRequestId` | Today: upload **stays** Pending if already pending |
| **Add to Show** (`queuePortalPrintRequestToShow`) | Validates upload readiness; writes `showAllocations`; sets request `active`; **does not write** `customerUploads` review fields | No change |
| Studio allocate (`upcomingShowService.allocatePrintRequestItem`) | Client `setDoc` on `showAllocations` only | No change |
| De-allocate / remove from show | Deletes allocations; may return request to `editing`; **never** touches `catalogReviewStatus` | No rewind today |
| Exclude / Restore / Send to AI | Mutate `catalogReviewStatus` among pending ↔ excluded ↔ sent_to_ai_review (+ design create on promote) | As today |

**Exact current event that puts print-request artwork in Studio Pending:** writing `catalogReviewStatus == "pending_staff_review"` via `buildCatalogIntakeConfirmationPatch` on **attach / assisted confirm** (not finalize, not Add to Show).

**Studio query:** `where("catalogReviewStatus", "==", "pending_staff_review")` + `orderBy("createdAt","desc")` (`customerUploadIntakeService` / `useCustomerUploadIntake`); purpose filtered **client-side** (`print_request` vs `catalog_donation`). Index: `catalogReviewStatus` + `createdAt`.

**Fields involved:** `CustomerUploadCatalogReviewStatus` = `not_eligible` \| `pending_staff_review` \| `sent_to_ai_review` \| `excluded_from_catalog`; plus `technicalStatus`, `catalogUseAcknowledged`, `ownershipConfirmed`, `printRequestId`, `purpose`. No separate `reviewSubmitted` / `libraryPermission` field — consent is `catalogUseAcknowledged`.

**Rules:** `customerUploads` create/update/delete **false** for clients — Admin SDK / callables only. Customers cannot self-mark review-submitted.

#### Proposed behavior

| Event | New behavior |
|-------|----------------|
| Finalize ready | Unchanged (`not_eligible`) |
| Attach / assisted confirm | Still confirm ownership, terms, `catalogUseAcknowledged`, `printRequestId`, create/reuse items — **do not** set `pending_staff_review` (leave / reaffirm `not_eligible`) |
| Donate confirm | **Unchanged** — still sets `pending_staff_review` via donate path |
| Successful Portal Add to Show | For each **customer_upload** item included in the successful queue write, transition upload `not_eligible` → `pending_staff_review` **idempotently** (server-only). Catalog `design` items untouched |
| Failed Add to Show | No allocation writes → no review transition |
| Remove before queue | Never became pending → stays out of Studio Pending |
| Show de-allocation | **One-way intake** — do **not** rewind `pending_staff_review` / excluded / sent_to_ai (matches current architecture; Formal Review agrees unless owner overrides) |

**New persisted field?** **Prefer no.** Reuse existing `catalogReviewStatus`; change **when** `pending_staff_review` is written. No migration required if legacy Pending rows stay Pending (safe, non-regressing).

#### Authoritative writer placement ([NEEDS REPO CHECK] resolved)

| Path | Can write `customerUploads`? | Recommendation |
|------|------------------------------|----------------|
| `queuePortalPrintRequestToShow` transaction | Yes (Admin SDK; already reads uploads) | **Primary for Portal** — same TX as allocation/request activation so queue success cannot permanently orphan review eligibility |
| Studio `allocatePrintRequestItem` | **No** (client Firestore; Rules forbid customerUploads update) | Cannot own the transition alone |
| Shared `onDocumentCreated` on `showAllocations` where `sourceType == "customer_upload"` | Yes | **Recommended safety net / Studio coverage** — idempotent helper; covers staff Studio allocate + retries |

**Implement preference:** shared helper `transitionCustomerUploadToStaffReviewIfEligible(uploadId)` that only advances `not_eligible` → `pending_staff_review` (no-op if already pending/excluded/sent_to_ai_review / missing). Call from Portal queue TX for every customer_upload item on the submitted request; **also** wire allocation `onCreate` (or equivalent existing Functions pattern) so Studio-allocated uploads are not permanently invisible to intake.

**[NEEDS OWNER DECISION] if Review rejects dual writers:** Accept Portal-queue-only transition and document Studio-only allocate as a known gap until allocate becomes a callable — **not preferred**.

#### Donate Designs boundary

Donate uses the **same** helper today. Implementation **must** split attach vs donate:

- Donate: keep setting `pending_staff_review` on donate confirm.
- Print-request attach / assisted: confirmation fields **without** staff-review submit.

Separation is possible without product change → **Donate timing unchanged**. Flag only if implement discovers an unavoidable shared code path that cannot branch — then STOP with `[NEEDS OWNER DECISION]`.

#### Library permission

`catalogUseAcknowledged: false` already still enters Pending today. Preserve: after show submit, declined-permission artwork still appears in intake with existing UI (“Don’t allow” / declined visibility); never auto-promote; Send to AI remains manual and still requires existing promote gates.

#### Cases 1–6 (plan verification)

1. Upload only → `not_eligible` → not Pending.  
2. Attach then remove → never pending (after fix); item gone.  
3. Abandoned working request → never pending.  
4. Successful Add to Show → attached uploads → Pending.  
5. Failed Add to Show → no transition.  
6. Catalog-only request → no Customer Uploads effect.

#### Legacy / production records

| Existing state | Rollout behavior |
|----------------|------------------|
| Already `pending_staff_review` / excluded / sent_to_ai_review | **Leave alone** — no backfill, no regression |
| Attached working only (`not_eligible` after fix; or historical pending from old attach) | Historical pending may still show until staff acts — acceptable; new attaches wait for show |
| Queued/printed with upload already pending | Unchanged |

**If any backfill appears necessary → STOP at human checkpoint; do not run.**

#### Deployment classification (E)

| Layer | Required? |
|-------|-----------|
| Portal source | Unlikely (behavior via Functions); verify no client optimistic review flag |
| Studio source | Unlikely for Pending query (same field); copy/help text if docs claim “after attach” |
| Shared packages/types | Possibly helper comments / DATA_MODEL; **no new enum required** preferred |
| Firebase Functions | **Yes** (attach + queue ± allocation trigger) |
| Firestore Rules | **No relaxation**; likely no change |
| Storage Rules | No |
| Indexes | No (existing `catalogReviewStatus` + `createdAt`) |
| Migration/backfill | **Prefer none** |

Coordinate Functions deploy with C+D classification; explicit Functions checkpoint — never App Hosting-only.

### F — Refund / release Upload + Donate quota on qualifying permanent removal

#### Verified: what Portal “quota” actually is today

These are **not** the same system. Do not conflate them.

| Surface | UI path | Display copy source | What “remaining” means |
|---------|---------|---------------------|------------------------|
| **Upload Artwork** | `/requests/artwork` → `CustomerUploadPanel` `purpose="print_request"` | `formatWorkingRequestUploadRoomHint(printSlotsRemaining)` | **Cap L — Current Request print room:** `max(0, settings/printRequestLimits.maxQuantityPerPrintRequest − Σ working printRequestItems.quantity)` |
| **Donate Designs** | `/donate` → same panel `purpose="catalog_donation"` | `formatCustomerUploadDailyQuota(dailyQuota)` | **Daily anti-abuse images:** `max(0, donationFinalizeImageLimit − customerUploadRateLimits/{uid}_{yyyyMMdd}.finalizeImageCountDonation)` — “X of Y donated image(s) left today (resets at midnight CST)” |

Exact files:

| Role | Path |
|------|------|
| Panel / badges | `apps/portal/features/customer-uploads/components/CustomerUploadPanel.tsx` |
| Cap L state | `apps/portal/features/print-requests/hooks/usePortalWorkingRequestLimitState.ts` |
| Cap L settings | `settings/printRequestLimits` via `portalPrintRequestLimitService` |
| Cap L math | `workingRequestPrintRoomRemaining` / `sumPrintRequestItemQuantities` (`packages/shared/.../portalShowQueueCapacity.ts`, `printRequestWorkingRequestMax`) |
| Donate daily fetch | `customerUploadService.getDailyQuota` → callable `getCustomerUploadDailyQuota` |
| Daily read/charge | `functions/src/getCustomerUploadDailyQuota.ts`, `functions/src/lib/customerUploadRateLimit.ts`, `functions/src/lib/customerUploadDailyQuota.ts` |
| Settings | `settings/customerUploadQuotas` (`packages/shared/.../customerUploadQuotaSettings.constants.ts`) |
| Charge gate | `shouldChargeDailyQuota` — **print_request: always false**; **donation: finalizeImage only** |
| Hard delete | Studio-only `deleteEligibleCustomerUpload` / `previewCustomerUploadDeletion` (`functions/src/deleteEligibleCustomerUpload.ts`) |
| Eligibility | `functions/src/lib/customerUploadDeletionEligibility.ts` (block if PR items or promoted) |
| Exclude / Restore | `excludeCustomerUploadFromCatalog` / `restoreCustomerUploadCatalogEligibility` — **no** quota counters |
| Remove PR item only | `removePortalPrintRequestItem` — frees Cap L; does **not** delete upload; `refunded: 0` stub |

#### Product quota vs anti-abuse (current)

| Concept | Upload Artwork | Donate |
|---------|----------------|--------|
| **A. Product / retained-design quota** | **Cap L** is product room on the **working Print Request**, not a count of retained `customerUploads`. Already refunds when item qty is removed. | **No retained-design product quota exists.** Account gallery lists confirmed donations for display only (`listAccountArtworkGallery`). |
| **B. Technical / anti-abuse** | Daily create/finalize/ZIP fields exist but **`shouldChargeDailyQuota` disables all print_request charges**. Concurrency leases, file size, files/batch still apply. | **Active:** daily `finalizeImageCountDonation` charged on first `finalizeCustomerUpload` when `!quotaChargedFinalize`. Create-batch / ZIP day charges disabled. Concurrency/size/batch still apply. |

#### Consume / release today

| Cap | Consumes when | Releases when |
|-----|---------------|---------------|
| Cap L (Upload footer) | Attach / qty increase adding prints to working request | Remove/decrease request items (not upload doc delete) |
| Donate day images | First single-image finalize charge for `catalog_donation` | **Never on delete** — counter stays until midnight CST rollover. **This matches the owner’s stale-remaining symptom for Donate.** |
| Exclude / Restore | n/a | No counter change |
| Studio Delete Upload | n/a | Doc deleted after Storage success — **counter not decremented** |
| Portal customer permanent delete | **Does not exist** | — |

#### Removal classification

| Action | Deletes upload? | Cap L | Donate day counter |
|--------|-----------------|-------|--------------------|
| Remove PR item | No | Frees room | No change |
| Studio Exclude | No | No | No |
| Studio Restore | No | No | No |
| Studio Delete Upload (eligible) | Yes (after Storage OK) | Only if items already gone (else blocked) | **Stale — no refund** |
| Processing failed / abandoned batch | Usually never confirmed | No | Charge may already have occurred on finalize attempt (`quotaChargedFinalize`) |
| Promoted | Delete blocked | — | No refund path |

#### Workstream E interaction

- Cap L / daily finalize consume **before** Add to Show; E only moves `pending_staff_review` timing.
- Delete-before-show: Cap L already freed if item removed; upload doc may remain (no Portal delete); Donate day counter still consumed if finalized.
- Delete-after-show: typically blocked by `attached_to_print_request` → **no** quota release while retained.

#### Owner decision (2026-08-11) — **F3 binding**

| Decision | Choice |
|----------|--------|
| Option | **F3** — Cap L is Upload intent; Donate gets day-counter refund on successful hard delete (F1 donate behavior) |
| Portal customer self-delete | **Yes** — safe confirmed delete for own eligible uploads/donations |
| Upload Artwork quota intent | **Cap L (request room)** — do **not** create retained-upload product quota |

#### Binding F3 implementation approach

**Upload Artwork / Cap L**
- No new retained-upload quota.
- Cap L continues: add print qty → room down; remove/decrease qty → room up.
- Permanent delete of an unattached upload does **not** invent Cap L slots (and must not change Cap L math).
- Removing a Print Request item remains distinct from deleting the underlying `customerUpload`.

**Donate Designs allowance**
- Displayed allowance remains today’s donation finalize remaining (`finalizeImageCountDonation` vs `donationFinalizeImageLimit`).
- **Authoritative release:** after successful hard delete (Storage cleaned + Firestore `customerUploads` doc deleted) of a `catalog_donation` upload that had `quotaChargedFinalize === true`, decrement today’s `finalizeImageCountDonation` by 1 (never below 0), once, server-side, in the same transaction as the doc delete (or immediately equivalent idempotent Admin write keyed off pre-delete fields).
- Blocked / failed / Storage-partial (doc retained) → **no** refund.
- Exclude / Restore → **no** refund.
- Promoted / PR-referenced → existing blockers; no delete → no refund.
- After authoritative Portal delete success: **immediately** refresh Donate quota UI (`getCustomerUploadDailyQuota` / invalidate `customerUploadQuotaCache`).
- Studio Delete Upload must use the **same** refund helper so staff delete does not leave counters stale either.

**Portal customer self-delete**
- Add Portal customer preview + delete callables (or dual-auth extension of existing delete pair) that:
  - require signed-in portal customer
  - allow only when `customerUploads.customerUid == auth.uid` (and guest rules if applicable per existing ownership model)
  - **reuse** `resolveCustomerUploadDeletionBlockers`, asset manifest, Storage-first / retain-on-Storage-failure contract from `deleteEligibleCustomerUpload`
  - do **not** use staff `assertCanDeleteCustomerUpload` for customers; staff path stays owner/admin
  - do **not** weaken blockers (PR attachment, promoted design, etc.)
- Confirmed UX (phrase or explicit confirm modal) before hard delete.
- Surfaces: Account artwork gallery (and any other owner-facing retained list) for both `print_request` and `catalog_donation` kinds that are customer-owned; Upload/Donate panels may deep-link or refresh after delete as needed.
- Customers must not delete others’ uploads or bypass eligibility via client-only state.

**Anti-abuse residual (accepted under F3)**
- Refunding donation finalize/day allows process→delete→re-upload within the same CST day.
- **Must retain** concurrency leases, file-size, files-per-batch, and other non-day protections unchanged.
- Copy remains “left today” / midnight CST — do not relabel as lifetime retained slots.

**Schema / migration**
- No new product-quota collection; no backfill of historical deletes. Prefer none.

**Deployment (F3)**

| Layer | Required? |
|-------|-----------|
| Portal | **Yes** — self-delete UI + Donate quota refresh |
| Functions | **Yes** — Portal delete auth path + donation day refund on successful hard delete (shared helper; Studio path too) |
| Shared | Types/tests as needed |
| Firestore Rules | Unlikely (writes stay Admin SDK); verify no client write added |
| Indexes / Storage Rules | No expected |
| Migration | None |

Coordinate Functions with C+D+E same wave when ready.

### G — Clarify About this portal purchase language

#### Verified current copy

| Constant / surface | Path | Current problem language |
|--------------------|------|--------------------------|
| `PORTAL_HELP_ABOUT_PARAGRAPHS[1]` | `apps/portal/features/help/portalHelpContent.ts` | Contains **“Browsing the catalog does not buy anything by itself.”** |
| Shared UI | `PortalHelpAboutPanel.tsx` | Renders paragraphs + highlight + Whatnot CTA from those constants |
| `/help` | `PortalHelpPageContent.tsx` → `PortalHelpAboutPanel` | Same |
| First-visit modal | `PortalAboutFirstVisitModal.tsx` → `PortalHelpAboutPanel` | Same — **one source** |
| Bundled FAQ `what-is-print-request` | same `portalHelpContent.ts` | Still contains the old “Browsing the catalog…” sentence (FAQ accordion, Studio-overridable list) |

Whatnot CTA (`PORTAL_HELP_ABOUT_WHATNOT_*`) must remain intact; do not duplicate a second follow CTA in body copy.

#### Owner-approved replacement (binding)

Exact body concept to use (single shared About source):

> Submitting a print request does not place an order or charge you. Your request should only include designs you personally intend to purchase, not designs you think other customers might like. It simply tells Fresh Prints which prints to have ready for you during one of our Whatnot shows. To complete your purchase, join us on Whatnot and purchase your requested prints during the show.

#### Approach

1. Replace the About paragraph that currently carries the “Browsing the catalog…” concept with the owner-approved wording (keep surrounding About paragraphs / guest-signin paragraph coherent; do not invent new product claims).
2. Keep `PortalHelpAboutPanel` as the only About renderer for `/help` + first-visit modal — **no forked copy**.
3. Retain Whatnot follow heading/body/CTA as-is; body copy should point to Whatnot purchase without adding a second CTA button.
4. Reconcile overlap with `PORTAL_HELP_ABOUT_HIGHLIGHT` (also “only request what you will buy”) so About does not feel contradictory or triply redundant — prefer trimming highlight if owner copy already covers intent, without dropping the purchase≠order message.
5. **Also update** bundled FAQ answer `what-is-print-request` so it no longer says “Browsing the catalog does not buy anything by itself” and aligns with submit≠order/charge + purchase on Whatnot (Formal Review binding). Note: live Studio `settings/portalHelp` FAQ may still override bundled text — document that Studio-edited FAQ may need a manual Studio content update if production FAQ was customized (human checkpoint if live FAQ differs).
6. No Print Request / payment / checkout logic changes.
7. Tests: `PortalHelpAboutPanel.test.ts` (and any FAQ containment tests) assert old browsing sentence gone; owner key phrases present; Whatnot CTA still wired; modal still uses panel.

#### Deployment (G)

| Layer | Required? |
|-------|-----------|
| Portal | **Yes** (App Hosting) |
| Studio / Functions / Rules / indexes | **No** for G (unless Studio FAQ live content edited manually) |

#### Acceptance (G)

1–7 per owner criteria; plus FAQ bundled string consistency.

---

## Affected Areas (expected)

### PR-Portal
- `packages/shared/src/catalog-search/portalCatalogAlgoliaExactSearchParams.ts` (+ tests)
- `apps/portal/.../portalAlgoliaCatalogSearchService*`
- `apps/portal/.../CatalogPageContent.tsx` (+ search persistence tests)
- Possibly Studio Algolia helper import parity

### PR-OG
- `packages/shared/.../portalSocialMetaSettings.constants.ts` (+ tests)
- Studio `PortalSocialMetaSettingsSection` + services/hooks
- `functions/src/updatePortalSocialMetaSettings.ts`
- `functions/src/getPortalGlobalOpenGraph.ts` (+ tests)
- Possibly new `finalizePortalStaticOgImage` (or extend brand finalize)
- `apps/portal/.../portalGlobalSocialMetaService.ts`, `layout.tsx` revalidate
- `storage.rules` / brand or new OG path if upload slot added
- DATA_MODEL / BACKEND / DEPLOYMENT notes

### PR-Intake (E)
- `functions/src/lib/customerUploadCatalogConfirmation.ts` (split attach vs donate review submit)
- `functions/src/confirmCustomerUploadsAndAttachToRequest.ts`
- `functions/src/customerAddAssistedApprovedProofToPrintRequest.ts`
- `functions/src/confirmCustomerUploadsForDonation.ts` (must keep Pending-on-confirm)
- `functions/src/queuePortalPrintRequestToShow.ts` (+ possibly new allocation `onCreate` / shared transition helper)
- Tests under `functions/src/*customerUpload*` / queue tests
- `docs/architecture/DATA_MODEL.md` Customer Uploads intake timing wording
- Studio Pending query: **no change preferred**

### Architecture / Security / Data / Backend / UI
- Architecture: Global OG mode extension; search param semantics only; **E:** intake timing only on existing `customerUploads` model
- Security: no public Settings write; Storage least privilege; search-only Algolia unchanged; **E:** review submit remains Admin SDK / callable / trigger only
- Data: optional new fields on `portalSocialMeta`; **E:** prefer no new field / no migration
- Backend: Functions + maybe Storage Rules (C); Functions for E
- UI: Studio Settings + Portal search behavior; E Studio list semantics change via data timing only

### Migration
- Forward: defaults in code; existing docs keep custom title/desc; new static fields optional; **E:** no forced backfill
- Rollback: revert PRs; redeploy prior Functions/App Hosting; static mode absent → resolve as library/logo; **E:** revert Functions → attach again submits early (known regression)

---

## Deployment classification (C+D+E)

| Layer | C+D | E |
|-------|-----|---|
| Studio | **Yes** (Static Image UI) | Unlikely (query unchanged) |
| Portal | **Yes** (defaults + OG fetch/cache; App Hosting) | Unlikely |
| Shared packages | **Yes** | Minimal / docs |
| Cloud Functions | **Yes** | **Yes** |
| Firestore schema | Additive `portalSocialMeta` | Prefer **no** new field |
| Firestore Rules | Unlikely | No relaxation |
| Storage Rules / objects | Likely if static OG path | No |
| Indexes | No | No |
| Algolia | No | No |
| Migration/backfill | No destructive | Prefer none; STOP if required |

Human checkpoints: Functions deploy (C+D and/or E); Storage Rules if changed; App Hosting for Portal; Studio 1.0.3 after lineage includes fixes.

---

## Test Strategy

### Automated (implement phase)
| Workstream | Coverage |
|------------|----------|
| A | `kil`/`kill` match Mockingbird; `kill` ≠ Will/Willie; prefixLast + typoTolerance false; facets still apply params; fail-closed unchanged |
| B | Rapid typing; simulated stale URL echo loses; modal open/close; clear; Back/Forward; designId ignore intact |
| C | Mode static; upload + design pick persist; OG returns static URL; design share unchanged; missing asset/design fail-safe; mode switch |
| D | Exact default strings; Save → Function returns new title/desc immediately (unit/integration with cache mock); both fields together; design OG untouched |
| E | Attach leaves `not_eligible`; donate still pending; queue success flips only customer_upload items once; queue failure no flip; mixed catalog+upload; idempotent re-queue; remove-before-queue never pending; promote/exclude/restore still require pending; Studio allocate covered if trigger accepted |
| F | F3: Cap L unchanged; donation hard-delete refunds day count once; blocked/failed/Exclude no refund; Portal self-delete own+eligible only; concurrent safe; quota UI refresh |
| G | Old browsing sentence absent from About (+ FAQ bundled); owner phrases present; `/help` + modal share panel; Whatnot CTA intact |

### Manual (post-deploy)
- Portal typing on mobile / OSK
- `GET getPortalGlobalOpenGraph` immediately after Studio Save
- Social Debugger separately for third-party cache
- **E:** Cases 1–6 + acceptance criteria 1–17 in staging/prod-like
- **F:** F3 acceptance (Cap L add/remove; Donate delete refund; blocked delete no refund; Portal self-delete)
- **G:** Read About on `/help` and first-visit modal; confirm purchase≠order language; Whatnot CTA works

---

## Human Checkpoints Anticipated
- [x] Owner F decisions (F3 + Portal self-delete yes + Cap L) — recorded 2026-08-11
- [ ] Owner implement approval: `APPROVE IMPLEMENT: PREFINAL A-G CORRECTIVES`
- [ ] App Hosting after PR-Portal (A+B+G)
- [ ] Functions (+ Storage Rules if any) after PR-OG / PR-Intake (E) / PR-Quota (F)
- [ ] App Hosting after Portal OG cache/default + F Portal delete UI as needed
- [ ] Studio 1.0.3 from final production tip
- [ ] Owner QA / Signoff / development sync (later)
- [ ] Algolia setSettings **only if** query-time `prefixLast` fails QA
- [ ] **E:** If Review requires backfill → STOP (do not run)
- [ ] **F:** No backfill; STOP only if implement discovers unexpected migration need
- [ ] **G:** If production Studio FAQ still has old browsing sentence — manual Studio FAQ edit

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| `prefixLast` too broad | Keep typoTolerance false; QA Kill≠Will; avoid `prefixAll` |
| Over-broad cache kill | Invalidate Global OG settings cache only; don’t disable all Next caching |
| Stale design static ref | Fail closed to logo/defaults |
| External crawler confusion | Document Scrape Again; verify Function JSON first |
| Scope creep to CMS | Static Image only in existing Social sharing settings |
| E: Donate accidentally deferred | Branch donate confirm away from attach; tests assert donate → pending |
| E: Queue succeeds, review never set | Same-TX write + optional allocation onCreate; idempotent helper |
| E: Studio allocate never submits | Allocation onCreate (preferred) or owner decision |
| E: Client marks review | Forbidden by Rules; no Portal write path |
| F: Day-counter recycle abuse | Accepted under F3; keep concurrency/size/batch; copy stays “today” |
| F: Double refund / client invent | Server-only decrement in successful delete TX; ownership checks |
| F: Portal delete weaker than Studio | Reuse same blockers + Storage-first contract |
| F: Mis-fix Cap L | Cap L unchanged; no retained-upload quota |
| G: Request implied as order | Use exact owner copy; no payment CTAs in Portal |
| G: FAQ still old | Update bundled FAQ; checkpoint live Studio FAQ |

---

## Rollback Plan

Revert respective PR(s); redeploy prior Functions/App Hosting revisions. Static mode fields ignored by old resolvers if additive. E rollback restores early Pending-on-attach. F rollback removes Portal delete + stops day refunds (counters may already have been decremented for deletes that occurred).

---

## Documentation Updates Required
- [ ] DATA_MODEL / BACKEND / DEPLOYMENT when C+D implement
- [ ] DATA_MODEL Customer Uploads intake timing when E implements (attach ≠ Pending; show allocation → Pending)
- [ ] BACKEND / DATA_MODEL note Portal self-delete + donation day refund on hard delete (F)
- [ ] TESTING if new commands
- [x] Workflow plan + review (this pass)

---

## Open Questions / owner decisions
- [x] Defaults copy — owner-provided (binding)
- [x] **F3** + Portal self-delete **yes** + Upload = Cap L — owner-provided (binding)
- [ ] Confirm PR split at approval (recommended below)
- [ ] Static Image: prefer persisting resolved Storage path vs designId-only (binding Review constraint: resolved asset ref)
- [x] **E:** One-way review after de-allocation (Plan preferred; Formal Review approved)
- [x] **E:** Studio allocate also submits via allocation onCreate (Plan preferred; Formal Review required)

---

## Workstream E return checklist (planning answers)

| # | Answer |
|---|--------|
| **23** | Current event: `buildCatalogIntakeConfirmationPatch` sets `catalogReviewStatus: "pending_staff_review"` on **attach / assisted confirm** (also donate confirm for Donated Designs) |
| **24** | Fields: `catalogReviewStatus` (gate), `technicalStatus`, `purpose`, `catalogUseAcknowledged`, `ownershipConfirmed`, `printRequestId`, `confirmedAt`, `termsVersion` |
| **25** | Proposed authoritative event: **successful show allocation** for customer_upload-backed items — primarily `queuePortalPrintRequestToShow` success (+ allocation `onCreate` for Studio path) |
| **26** | New field? **No preferred** — reuse `catalogReviewStatus` timing |
| **27** | Mixed requests: only `sourceType: "customer_upload"` items transition; catalog designs untouched |
| **28** | Removed before Add to Show: never set pending on attach → never enters Pending from that request |
| **29** | Later de-allocation: **do not rewind** review state (one-way; current architecture already) |
| **30** | Historical: leave existing pending/excluded/promoted alone; no automatic migration |
| **31** | Functions **yes**; Rules/indexes **no** expected; schema field **no**; Studio/Portal app source unlikely |
| **32** | Donate: **unchanged** if attach/donate confirmation paths branch correctly |
| **33** | Formal Review verdict: see amended review doc |

---

## Workstream F return checklist (planning answers)

| # | Answer |
|---|--------|
| **34** | Upload displayed quota = Cap L request room hint (`You can upload up to {N} image(s) for the current request.`) from `maxQuantityPerPrintRequest − Σ item qty` |
| **35** | Donate displayed quota = `{images.remaining} of {images.limit} donated image(s) left today (resets at midnight CST).` from daily finalize counter |
| **36** | Upload used: live `printRequestItems` qty sum; Donate used: `finalizeImageCountDonation` on `customerUploadRateLimits/{uid}_{day}` |
| **37** | Cap L: any working request item qty (catalog or upload). Donate day: not status-scanned — charged at donation image finalize regardless of later confirm/exclude |
| **38** | Consume: Cap L on attach/qty add; Donate day on first `finalizeCustomerUpload` charge (`quotaChargedFinalize`) for `catalog_donation` |
| **39** | Release: Cap L on item qty remove (unchanged); Donate day on successful hard delete of charged `catalog_donation` (Portal or Studio) |
| **40** | Yes historically — Donate counter stale after delete; F3 fixes via server decrement |
| **41** | Product Cap L (Upload); Donate displayed allowance = day finalize (refundable on hard delete under F3); concurrency/size/batch non-refundable |
| **42** | Storage fail / doc retained → no refund |
| **43** | PR refs / promoted → blocked delete → no refund |
| **44** | No schema/backfill for F3 |
| **45** | Functions **yes** + Portal UI; Rules/indexes no expected |
| **46** | Formal Review: F cleared under F3 — package **approved_with_changes** |
| **47** | `APPROVE IMPLEMENT: PREFINAL A-G CORRECTIVES` |

---

## Workstream G return checklist (planning answers)

| # | Answer |
|---|--------|
| **48** | Old sentence lives in `PORTAL_HELP_ABOUT_PARAGRAPHS` and bundled FAQ `what-is-print-request` in `portalHelpContent.ts` |
| **49** | Shared surfaces: `PortalHelpAboutPanel` on `/help` + `PortalAboutFirstVisitModal` |
| **50** | Owner-approved submit≠order/charge copy replaces browsing concept; Whatnot CTA retained |
| **51** | Deploy: Portal App Hosting only for G; fold into PR-Portal with A+B |
| **52** | Formal Review: G **approved_with_changes** (also fix bundled FAQ; check live Studio FAQ) |

---

## Approval
- Review doc: docs/workflow/reviews/2026-08-11-prefinal-portal-search-and-global-og-corrective-plan-review.md
- F3 owner decisions recorded; package Formal Review **approved_with_changes**

### Binding Formal Review constraints (do not drop)

1–8. (A–D)
9–12. (E)
13–17. (F3)
18–20. (G)

Full text in Formal Review § Required Changes.

### Implementation start phrase

`APPROVE IMPLEMENT: PREFINAL A-G CORRECTIVES`



