# Plan: Post-Launch Catalog and Processing Stability

| Field | Value |
|-------|-------|
| Date | 2026-08-04 |
| Managed goal | `post-launch-catalog-and-processing-stability` |
| Phase | Plan |
| Author | Planning pass (this session) |
| Scope | Root-cause analysis only — **no application source, Firebase, Rules, index, Function, or production changes in this pass** |

---

## 1. Purpose

Fresh Prints Studio v1.0.0 is published, installed, connected to production, and smoke-tested. This
Plan diagnoses five defects discovered during real production/post-launch use:

1. Tag archive does not take effect.
2. Default catalog ordering is wrong on four surfaces.
3. Severe Firestore read spikes during catalog import/processing.
4. AI Processing completes but Studio remains stale (false ineligibility error + stale counts/lists).
5. First Studio import upload after launch receives a Storage permission error.

This Plan does not reopen the unrelated, currently-paused `production-release` / Studio
automatic-updates production-PR workflow tracked in `.cursor/workflow/state.md`. That gate is
untouched by this pass.

Method: five independent, read-only source-tracing investigations (one per workstream), each
producing file:line-cited evidence, run in parallel, then synthesized here. No production log
inspection was performed in this pass — see §6 and §11 for what remains outstanding before the
Firestore-cost hypothesis can be called fully confirmed.

---

## 2. Summary table

| # | Defect | Confidence | Root cause | Shared with another defect? |
|---|--------|-----------|------------|------------------------------|
| A | Tag archive silently fails to update UI | High (direct code evidence) | Client-side `tagListCache` never invalidated after the `archiveTagWithGuards` callable succeeds | No — independent of B/C |
| B | Catalog ordering wrong | High (direct code evidence) | Studio Design Library only — wrong default sort field (`updatedAt` instead of `createdAt`) in one constant + one fallback hook. **Portal (Library/Discover/filtered) already sorts correctly in current source — no defect found there.** | No — independent; not caused by the snapshot architecture |
| C | Firestore read spikes | High (quantified from source) | A single imported design can schedule up to 4 independent full-catalog-snapshot rebuilds across its lifecycle (create → processing → imported-with-derivatives → ready), each rebuild being an **unbounded full scan** of designs+categories+tags; debounce is in-memory/per-invocation, not coalesced across concurrent Function instances | Shares the generated-snapshot architecture with B, but is a distinct defect (scheduling/scan cost, not ordering) |
| D | AI Processing stale after completion | High (direct code evidence) | (1) A stale/duplicate enqueue call against an already-`needs_review` design is correctly rejected server-side but surfaced to the user as a hard error instead of a benign no-op; (2) Processing list and Processing/Needs-Review counts are two independent one-shot reads with no shared reconciliation trigger, and the reprocess handler does not force either to refresh | No — independent |
| E | Studio import Storage permission error on first upload | Medium-high (strong circumstantial evidence, no production log confirmation) | Firestore-based role check (`isStaff()` calling `firestore.get(users/{uid})` inside Storage Rules) can evaluate against role/`isActive` state that has not yet converged with what the client's own bootstrap read observed, immediately after login/account changes — a read-your-own-doc timing gap, not a Rules misconfiguration or a size limit | No — independent |

**No two defects share one root cause.** C and B both touch the generated catalog-snapshot
architecture but for unrelated reasons (write-scheduling/cost vs. a plain wrong constant).

---

## 3. Workstream A — Tag archive

### Root cause (confirmed by source trace)

The archive button in `TagManagementModal.tsx` calls `useCatalogTags.archiveTag`, which calls
`taxonomyArchiveGuardsService.archiveTag` → the `archiveTagWithGuards` callable
(`functions/src/archiveTaxonomyWithGuards.ts:257-317`). That callable is an **Admin SDK write**
(`adminDb.collection("tags").doc(tagId).set({ status: "archived", ... }, { merge: true })`,
lines 298-305) — it succeeds and is not blocked by Firestore Rules (Rules only govern client
writes; Admin SDK bypasses them).

The failure is entirely client-side: `catalogTagService.ts`'s `listTags`/`listAllTags` read through
`tagListCache` (a 12-hour TTL in-memory cache, `catalogTagService.ts:44,48-54`). The sibling
client-write methods (`createTag`, `updateTag`, `bulkCreateTags`) each explicitly call
`invalidateCatalogTagListCache()` after writing. **The guarded-archive call chain
(`taxonomyArchiveGuardsService.archiveTag` → `useCatalogTags.archiveTag`) never calls that
invalidator anywhere.** So the modal's own reload (`loadTags()` after `archiveTagWithGuards`
resolves) serves the stale pre-archive cached list, and the tag appears unchanged in the UI for up
to 12 hours (or until an unrelated cache-invalidating action happens to run).

A secondary, much smaller contributor: the generated taxonomy snapshot (`onTagSnapshotSourceWritten`,
`functions/src/catalogSnapshots/publishCatalogSnapshots.ts:965-979`) does rebuild correctly on a
`status` change, but only after its 15-second debounce — this is expected async behavior and not the
dominant cause of the reported "does not take effect" symptom, which persists far longer than 15
seconds.

Firestore Rules, the tag document/collection identity, and alias/canonical-record concerns were all
checked and ruled out — the write target is correct and there is no second tag record.

**Category parity risk:** `archiveCategoryWithGuards` almost certainly has the identical pattern
(same Admin-SDK-write-plus-client-cache shape). This Plan recommends checking and, if confirmed,
fixing categories in the same implementation pass rather than filing it as a separate future defect.

### Files expected to change

- `apps/studio/src/renderer/src/features/designs/services/taxonomyArchiveGuardsService.ts` — invalidate the tag (and category) list cache after a successful archive/restore call.
- `apps/studio/src/renderer/src/features/designs/services/catalogTagService.ts` — confirm/export the invalidator for this use (already exported; needs wiring).
- `apps/studio/src/renderer/src/features/designs/hooks/useCatalogTags.ts` — defense-in-depth: force a non-cached reload after archive succeeds, don't rely solely on the service-layer fix.
- The category equivalent of `catalogTagService.ts` (to be located during implementation) if the category-archive parity risk is confirmed.

### Test coverage found

None. Zero `.test.ts` files exist for `archiveTagWithGuards`, `previewTagArchive`,
`taxonomyArchiveGuardsService`, `useCatalogTags`, `catalogTagService`, or `TagManagementModal`. This
is why the regression shipped unnoticed. The fix must add a regression test asserting the tag list
cache is invalidated (or bypassed) immediately after a successful archive/restore call.

### Firestore document verification requirement

Per the task brief, before treating this as closed, implementation must independently confirm via
the actual Firestore document (dev project) that `status: "archived"` really is present after
clicking Archive — the trace above is strong source evidence but the Plan does not claim this was
empirically re-verified against a live document in this pass (no Firebase access was used; this was
a source-only investigation).

---

## 4. Workstream B — Catalog newest-first ordering

### Root cause (confirmed by source trace)

**This is two claims, not one — and they resolve very differently:**

**Studio Design Library — genuine defect, confirmed.**
`DESIGN_LIBRARY_DEFAULT_SORT_FIELD` in
`apps/studio/src/renderer/src/features/designs/constants/designLibraryFilters.ts:157-158` is
literally set to `"updatedAt"`, with a comment stating the opposite of the product rule ("most
recently processed/updated first (AI completion bumps updatedAt)"). This feeds
`buildCatalogDesignListQuery`, used whenever `DesignLibraryPage` falls back to a direct Firestore
query (archived-mode, category-modal, or any time `firestoreLoadPolicy.loadReadyDesignPage` is
true). Separately, `useGeneratedReadyDesigns.ts:115-129`'s **fallback path** (used when the generated
ready-index asset is unavailable) also hardcodes `sortField: "updatedAt"` and re-sorts by
`"updatedAt"` again. `designService.ts`'s internal defaults (`?? "updatedAt"`, several call sites)
follow the same wrong convention for any caller that omits an explicit `sortField`.

The **primary/generated path** (`useGeneratedReadyDesigns` reading the Storage-hosted
`studio/ready-index.json`, built by `buildPortalCatalogStudioReadyIndex` /
`studioCatalogReadyOrder` in `functions/src/catalogSnapshots/snapshotBuilders.ts:196-228`) is
correct — `createdAtMs desc, id desc` — and is well tested
(`snapshotBuilders.test.ts:413-450`). The defect only manifests on Studio's **fallback** paths, but
those paths are reachable in ordinary use (archived view, category-filtered modal, and whenever the
generated index is briefly unavailable) — not an edge case that can be dismissed.

**Git-history finding:** this default has been `"updatedAt"` since the constant was introduced and
was never subsequently changed. The 2026-07-21 signoff
(`docs/workflow/reviews/2026-07-21-studio-design-download-and-newest-sort-signoff.md`) claims a new
test file `designListMergeSort.test.ts` and a modification to `designLibraryFilters.ts` — neither
exists in the actual repository history. **The "newest-sort" half of that signed-off plan was never
actually implemented or committed; the prior signoff is inaccurate for that half of its claimed
scope, not a case of a later regression reverting a real fix.** This should be corrected in the
historical record as part of this goal's eventual signoff, not silently left contradicting the
current investigation.

**Portal (Library, Discover default, filtered results) — no defect found in current source.**
`useCatalogDesigns.ts` defaults to `'createdAt'` for non-metric browse (`sortFieldForDiscovery`,
lines 39-54) and explicitly re-sorts the generated `discover.json` asset by `createdAtMs desc, id
desc` for default browse (lines 179-188), because that asset's own raw order is intentionally
metric-ranked. Filtered/searched/tagged browse (`portalCatalogAssetService.listMatchingDesigns`)
preserves the publisher's `createdAt desc` order through ID-list intersection
(`portalCatalogAssetService.ts:274-290`), with an inline comment citing the exact prior regression
class this was written to prevent. The direct-Firestore fallback (`catalogService.ts:136-138,
166-202`) also defaults to `createdAt desc`. Discover's rails (New/Popular/Most Liked/Recent, plus
category rails) are all correctly ranked per their own rules; no distinct "default/all" Discover
section renders an unranked array. **The task brief's assumption that Portal is also broken is not
supported by the current source — this Plan recommends the owner re-observe the Portal symptom
specifically (browser, exact URL/filter state, cold vs. warm load) before authorizing any Portal
code change**, since no fix target was found there.

One **latent, currently-inert** fragility was found and is worth fixing opportunistically: 
`publishCatalogSnapshots.ts:525-536`'s `categoryPages` builder iterates the raw Firestore snapshot
order instead of the already-computed `browseOrder`. No current Studio or Portal consumer reads
`categoryPagePathTemplate`, so this is not live-user-visible today, but it would silently misorder
results the moment any future consumer reads it.

### Files expected to change

- `apps/studio/src/renderer/src/features/designs/constants/designLibraryFilters.ts` — `DESIGN_LIBRARY_DEFAULT_SORT_FIELD` → `"createdAt"`; correct the comment.
- `apps/studio/src/renderer/src/features/designs/constants/designLibraryFilters.test.ts` — update the two assertions that currently pin the wrong default (`"defaults Design Library sort to updatedAt descending"` and its counterpart) to assert `createdAt`.
- `apps/studio/src/renderer/src/features/designs/hooks/useGeneratedReadyDesigns.ts:115-129` — fallback path: change `sortField`/re-sort from `"updatedAt"` to `"createdAt"`.
- Audit (not necessarily change) `designService.ts`'s implicit `?? "updatedAt"` defaults for any caller that omits `sortField`.
- Optional, opportunistic: `functions/src/catalogSnapshots/publishCatalogSnapshots.ts:525-536` — iterate `browseOrder` instead of raw `cards` for `categoryPages`, closing the latent ordering gap even though it is not currently consumer-visible.
- No Portal file change identified — pending owner re-confirmation per above.

### Test coverage found

`snapshotBuilders.test.ts` covers the generated-order builders correctly. `sortDesignsForListQuery.test.ts`
covers sort mechanics for both fields but never pins Studio's actual default. `designLibraryFilters.test.ts`
actively encodes the wrong default and will need updating as part of the fix, not just left passing.
No end-to-end test currently asserts "Design Library's real default query returns createdAt-desc" —
that gap is why this shipped unnoticed. Portal-side ranking/order-preservation tests
(`catalogDiscoveryRanking.test.ts`, `portalCatalogAssetService.test.ts`) are adequate and found no gap.

---

## 5. Workstream C — Firestore read costs / snapshot architecture

### Root cause (quantified from source)

`rebuildCatalogSnapshots` (`functions/src/catalogSnapshots/publishCatalogSnapshots.ts:884-908`) runs
`publishReference` and `publishPortal` in parallel. Each is an **unbounded full collection scan**:
`publishReference` reads all active `categories` + all approved `tags` (lines 344-383, no limit).
`publishPortal` reads all `ready` `designs` (line 468, no limit) plus the same full
categories+tags scan again (line 469 — **not shared/cached across the two `publishKind` calls**).
Cost scales with total catalog size, not with how many designs actually changed — every rebuild
re-reads everything, every time.

**A single imported design's lifecycle schedules up to 4 independent full `portal-catalog` rebuild
attempts**, traced write-by-write:

| Step | Write | Classification | Triggers rebuild? |
|---|---|---|---|
| Create on import | `status: "imported"` | index-filter | Yes |
| Marked processing | `status: "processing"` | index-filter | Yes (wasted — `processing` is never in the published `ready` set) |
| Derivatives complete | `status: "imported"` (reverted) + `thumbnailPath`/`previewPath` | index-filter | Yes (wasted — same reason) |
| AI pipeline stage writes | `aiProcessingStage` only | operational | No (correctly excluded) |
| Staff approves | `status: "ready"` | index-filter | Yes (the only one that actually changes the published set) |

Two of those four (`processing`, then reverted to `imported`) fire full-rebuild scheduling for status
values the publisher's own `where("status","==","ready")` query never reads — pure waste. Across a
500-file batch import (the documented `MAX_BATCH_FILES` ceiling), that is up to roughly 1,500
independent full-rebuild schedule attempts from import/derivative status churn alone, before any
design even reaches `ready`.

**Debounce is in-memory per invocation, not coalesced.** `markAndPublishAfterDebounce`
(`publishCatalogSnapshots.ts:743-792`) persists a dirty flag (`markDirty`, Firestore-backed) but the
actual 15-second wait (`DEBOUNCE_MS = 15_000`, line 59) is a plain `setTimeout` inside the current
function execution. Cloud Functions gives no cross-invocation shared memory — under a burst, **N**
separate `onDocumentWritten` trigger invocations each independently call `markDirty` (N extra
Firestore writes) and each start their own 15-second timer, then each attempt to acquire the
publish lease. A persisted, transactional **lease** (`publishKind`, lines 684-741,
`LEASE_MS = 10 * 60_000`) does correctly prevent more than one *scan* from running concurrently per
kind — so the scan cost itself is not multiplied per burst — but the retry loop
(`runPublicationCatchUpLoop`, up to `PUBLICATION_PASS_LIMIT = 3` retries with a 5-second backoff) and
the coordination-doc reads/writes scale with the number of raw qualifying writes in the burst, not
with the number of actual rebuilds. This matches the reported 305 writes/minute tracking closely
with the 54K reads/minute, rather than a small fixed write count.

**Best-evidence hypothesis for the spike:** a burst of import/derivative/status-transition writes
during batch catalog import repeatedly wins the lease across the session (spaced ~10 minutes apart
per the lease duration, or faster once each publish completes and releases it), and **each winning
publish is a full unbounded scan of designs+categories+tags** — with a catalog of even a
moderate size (hundreds to low thousands of documents, consistent with figures cited elsewhere in
this codebase, e.g. ~1,122 approved tags noted in `publishCatalogSnapshots.ts:104`), a handful of
full rebuilds within one minute is sufficient to produce tens of thousands of reads, matching the
observed ~54K/minute. This is the primary, best-evidenced hypothesis — **not the only
possible contributor**, see the secondary/tertiary items below.

**Secondary contributor:** the same in-memory-debounce/no-coalescing behavior described above adds
coordination-doc read/write overhead proportional to raw write-burst size, independent of the scan
cost.

**Tertiary, unconfirmed contributor:** the AI enrichment pipeline's taxonomy loader normally reads a
generated Storage snapshot with a 60-second in-memory TTL cache per warm instance
(`aiEnrichmentRuntimeCache.ts`), not Firestore — this is not a multiplier under normal conditions.
**However**, if the Storage snapshot manifest/asset is ever missing, mid-republish, or fails to
parse, `loadAiCatalogReferenceSnapshot.ts:110`'s catch-all falls back to `loadFirestoreFallback()` —
a full, unindexed `categories`+`tags` scan repeated per cold instance every 5 minutes
(`FALLBACK_TTL_MS`). No direct evidence ties this to the specific production incident (no forced
kill-switch or known snapshot outage was found in source), but it is a plausible secondary
contributor during any window where the catalog-reference snapshot itself was being actively
republished by the same import burst. This is flagged as an open item for the production-log
correlation step (§6), not confirmed or ruled out by source alone.

**Ruled out:** Studio/Portal catalog hydration was not found to have any fallback-to-broad-Firestore-read
path (consistent with the 2026-07-27 Wave C signoff's own final QA traces). No Firestore
listener/polling churn was found during import — batch import progress uses Electron IPC events, not
`onSnapshot`.

### Required architecture recommendation

Comparing the five options named in the task brief:

| Option | Read cost | Freshness | Operational complexity | Failure recovery | Staff workflow impact |
|---|---|---|---|---|---|
| 1. Permanent direct-Firestore fallback | High, unbounded per client session | Perfect | Low | N/A | None, but reintroduces Wave A/B/C's original problem |
| 2. Owner-controlled pause + Publish Now | Bounded to owner-chosen moments | Owner-controlled, can be stale during import | Low-medium | Simple (manual retry) | Adds a step owners must remember |
| 3. Persistent dirty flag + coalesced delayed publication | Bounded — one publish per settled batch, not per write | Near-real-time after batch settles | Medium (needs a real scheduled/coalescing mechanism, not per-invocation `setTimeout`) | Good — dirty flag persists across instance churn | None — fully automatic |
| 4. Incremental affected-shard publication | Lowest per-publish cost | Real-time | High (requires re-architecting the builder to be delta-aware per shard) | More failure modes to reason about | None, but higher engineering risk |
| 5. Hybrid: last-valid-snapshot-active during imports | Same as option 3 for cost; adds explicit "stay on old snapshot mid-batch" framing | Deliberately stale during import, fresh after | Medium | Good | None |

**Recommendation: Option 3, converging into the shape of Option 5** — this matches the task
brief's own stated preferred direction and this investigation's evidence does not disprove it:

- Keep the last valid snapshot active and serving reads at all times (already true today — the
  lease-protected publish never removes the previous snapshot until the new one is written; this
  is a description of already-correct existing behavior worth preserving explicitly, not a new
  build).
- Replace the per-invocation in-memory `setTimeout` debounce with **persistent coalescing**: the
  existing `markDirty`/generation-counter mechanism (`snapshotPublicationState/{kind}`) already
  gives a persisted dirty signal — the gap is that the *wait-then-publish* step should be driven by
  a single scheduled/coalescing mechanism (e.g. a short-interval Cloud Scheduler tick, or a
  Firestore-triggered check that only proceeds if no newer dirty mark has landed in the debounce
  window) instead of each trigger invocation independently sleeping and racing for the lease.
- Stop scheduling a rebuild for status values the publisher never reads (`processing`, and the
  revert-to-`imported` step) — narrow `INDEX_FILTER_FIELDS`'s effective trigger condition for
  `portal-catalog` so that only a transition into or out of `ready` (or a genuine `title`/
  `description`/`categoryId`/`tags`/`createdAt` edit on an already-`ready` design) schedules a full
  rebuild; that alone removes roughly half of the wasted scheduling attempts found in this trace
  without any incremental-shard engineering.
- Retain the existing lease as the concurrency guard (it already works correctly); the fix target is
  coalescing the *schedule*, not the *lease*.
- Preserve the fallback-only-for-missing-or-invalid-snapshot behavior that already exists for
  Studio/Portal consumers; do not introduce new broad fallback reads (Option 1) as a routine path.

This does not require Option 4's heavier per-shard delta engineering unless a future measurement
shows the coalesced full-scan cost is still unacceptable after the scheduling fix above.

### Immediate containment recommendation (no deploy required to decide; deploy requires separate approval)

Because status-transition scheduling waste (`processing`, revert-to-`imported`) is the single
largest, cheapest-to-fix contributor found, and because it requires no architectural change (only
narrowing which `designs` field-changes are classified as `index-filter` for the `portal-catalog`
kind), this Plan recommends it be the **first** implementation slice, deployed and measured before
the larger coalescing-mechanism work, if the owner wants a fast partial mitigation. This is a
recommendation for sequencing within the eventual Implement phase — not a request to deploy
anything during this Plan/Review pass.

### Files expected to change

- `functions/src/catalogSnapshots/publishCatalogSnapshots.ts` — coalescing/scheduling mechanism; narrow `portal-catalog` trigger classification for wasted status transitions; category-page ordering fix from Workstream B if bundled.
- `functions/src/catalogSnapshots/portalCatalogChangeClassifier.ts` — narrow `INDEX_FILTER_FIELDS`'s `status` handling so only `ready`-boundary transitions (not `processing`/`imported` churn) qualify.
- Possibly a new small scheduled-check mechanism (Cloud Scheduler-triggered function or equivalent) replacing the per-invocation `setTimeout`, if Option 3's persistent coalescing is implemented as designed above — **new dependency/infra decision requiring explicit owner sign-off before implementation**, per architecture constraints (no new dependency without justification).
- Read/write instrumentation: extend the existing `accounting` object already computed in `publishPortal`/`publishReference` (`readyDesignsRead`, `categoriesRead`, `tagsRead`) into a persisted, queryable log so future cost regressions can be attributed without a fresh source investigation.

### Test coverage found

Good unit coverage of the snapshot builders' output correctness
(`snapshotBuilders.test.ts`, `publicationRecovery.test.ts`, `targetedPortalPublication.test.ts`,
`waveCReadContainment.test.ts`) but no test asserts a bound on read/write counts per rebuild, and no
test exercises the debounce-under-concurrent-invocations scenario. This should be added alongside
the fix.

### Production log correlation — deferred to a following step

Per the task's explicit permission, read-only production log inspection for the observed spike
window is allowed and would materially strengthen or falsify the ranked hypotheses above
(especially the tertiary AI-fallback contributor). **This Plan does not claim that log inspection
was performed** — it was intentionally out of scope for the parallel source-tracing investigations
that produced this section, to keep each investigation narrowly read-only-source-only and avoid
touching any Firebase project during Plan. Recommend this be the first action of the Implement
phase (still read-only, still no deploy) before finalizing which slice of the recommendation above
is built first.

---

## 6. Workstream D — AI Processing reconciliation

### Root cause (confirmed by source trace)

Two distinct, compounding bugs:

**1. False "no longer eligible" error is a real server-side idempotency guard, surfaced as a hard
error instead of a benign no-op.** `enqueueAiEnrichment` (`functions/src/enqueueAiEnrichment.ts:99-101`)
throws `failed-precondition` when `shouldAllowAiEnqueueForReviewStatus`
(`functions/src/ai/enqueueAiEnrichmentValidation.ts:13-26`) returns false — which happens whenever a
plain (non-rerun) enqueue call targets a design whose `aiReviewStatus` has already advanced past
`pending` (most commonly `needs_review`, i.e. **already successfully completed**). The client
(`aiEnrichmentEnqueueService.ts:70-102`) passes this server message straight through to the user
verbatim rather than treating "already reached the desired terminal state" as success. This fires
when a stale/duplicate enqueue call races a design that has already finished — e.g. the auto-queue
loop or a duplicate click acting on a client-held design snapshot that hasn't yet observed the
completion.

**2. Processing list and Processing/Needs-Review counts are two independently-refreshed one-shot
reads, not live listeners, and the reprocess handler doesn't force either to refresh.**
`executeRerunToProcessing` (`useAiReviewInbox.ts:495-526`) never calls `reloadDesigns()`; it relies
on tab navigation's side effect (`setSearchParams` → new `listQueryKey` → `useDesigns` refetch) to
refresh the list. The counts (`useAiReviewTabCounts`) are a completely separate one-shot
`countDesigns` aggregation, refreshed only via its own `reloadCounts()`, wired through the same
`onQueueChanged` callback the reprocess handler does call — meaning the count path is refreshed but
the list path is not, unless the user happens to also change tabs. Neither is a live Firestore
listener for the tab-level list/count (a narrow per-selected-design listener exists but only forces
a list reload under a specific condition: currently on the Processing tab AND the live doc flips to
`needs_review`). **This exactly explains why navigating away and back "fixes" it** — a remount reruns
both `useDesigns`'s and `useAiReviewTabCounts`'s mount effects from scratch against current Firestore
state, with no stale closures or optimistic patches left over.

### Files expected to change

- `apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts` — `executeRerunToProcessing` should deterministically trigger both a list reload and a count reload, not rely on tab-navigation as an implicit side effect.
- `apps/studio/src/renderer/src/features/ai-review/hooks/useAiProcessingQueue.ts` — guard the auto-queue loop against re-enqueuing a design against stale local state; treat an "already terminal" response as success, not failure.
- `apps/studio/src/renderer/src/features/ai-review/services/aiEnrichmentEnqueueService.ts` — `resolveAiEnrichmentCallableErrorMessage` should special-case the "no longer eligible" failed-precondition as a soft outcome (trigger a reload, no user-facing error) when the cause is "already reached terminal state."
- `functions/src/enqueueAiEnrichment.ts` / `functions/src/ai/enqueueAiEnrichmentValidation.ts` — recommend returning a structured `{queued: false, reason: "already_terminal"}` response (matching the existing `already_processing` pattern already used elsewhere in the same file) instead of throwing, so the client can branch on structured data instead of parsing error text.
- `apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewTabCounts.ts` and `apps/studio/src/renderer/src/features/designs/hooks/useDesigns.ts` — add a shared reconciliation trigger so list and counts cannot independently go stale relative to each other.

### Test coverage found

`enqueueAiEnrichmentValidation.test.ts` covers the pure validation function (including the exact
condition producing this error) but not the callable's error path or client handling. Client-side
tests cover isolated helpers (`aiReviewRerunSession.test.ts`, `aiProcessingQueue.test.ts`,
`aiReviewTabCountQuery.test.ts`) but nothing exercises the full reprocess → enqueue →
error-mapping flow end-to-end, nor the specific "list/count remain stale without a tab change or
remount" scenario. This is the coverage gap that let the defect ship; the fix must close it with a
regression test.

---

## 7. Workstream E — Studio import upload authorization

### Root cause (strong circumstantial evidence; not confirmed against production logs)

Confirmed **not** a size-limit issue: `MAX_SINGLE_PNG_SIZE_BYTES` (150 MiB = 157,286,400 bytes) is
checked in `pngValidator.ts` **before** decode; if the file had exceeded it, decode/trim/normalize
could never have completed, contradicting the reported evidence. The reported "159.24 MB" figure is
consistent with a decimal-MB vs. binary-MiB rounding difference against a true byte count at or
under the threshold — not a real limit breach. Studio's `/originals/` path and Portal's
customer-upload limits are fully separate code paths and constants; no cross-contamination found.

Confirmed **not** a token-refresh-timing issue in the conventional sense: the codebase has **zero**
Firebase Auth custom claims anywhere (`setCustomUserClaims`/`getIdTokenResult` — no matches
repo-wide). Role authorization is entirely Firestore-document-based on both the client
(`userService.getUserById` at bootstrap) and the server (`storage.rules`'s `isStaff()` calling
`firestore.get(users/{uid})` live, at upload time) — there is no ID-token claim to refresh that would
change the outcome.

Confirmed the naive "route rendered before role hydrated" race is **not** plausible:
`AuthBootstrapGate` blocks all routed children, including the Imports page, until the bootstrap
Firestore `users/{uid}` read has already resolved successfully once.

**Best-evidence hypothesis:** a **read-your-own-doc timing/consistency gap between the client's one-time
bootstrap read and Storage Rules' independent, live `firestore.get()` at the moment of upload.** The
client's bootstrap read only proves the `users/{uid}` doc was valid *once, at login* — it does not
transactionally guarantee the *server-side* re-read performed by Storage Rules at upload time
observes the same `role`/`isActive` values, especially immediately after account provisioning, a
role change, or (plausibly, on a first-ever Studio launch for a given install) any residual
client/server read-path divergence around that exact moment. This is consistent with every other
piece of reported evidence: decode/trim/normalize succeeded (proving the app itself was otherwise
fully functional), the error text matches the exact `storage/unauthorized`/`storage/unauthenticated`
client-side mapping in `importUploadService.ts`, and — per the task's own reproduction note — retry
with the *same* image (no reprocessing) succeeds, which is explained by the Storage Rules' live
Firestore read simply converging to the correct value by the second attempt with no code-path
difference at all.

This is the strongest hypothesis the source supports, but it remains a **timing hypothesis, not a
directly observed one** — this Plan does not claim to have reproduced the failure or inspected
production Storage/Auth logs for the exact incident. Confirming it precisely (e.g., correlating the
exact account/session age at the time of the failed upload, or the account's `isActive`/`role`
write timestamp relative to the upload attempt) is recommended as an Implement-phase log-correlation
step, not claimed as already done here.

### Files expected to change

- `apps/studio/src/renderer/src/features/auth/services/authProfileCacheService.ts` /
  `authSessionService.ts` — if the fix is to avoid ever serving a stale cached profile without a
  staleness/re-verification check (the current in-memory cache has no TTL).
- `apps/studio/src/renderer/src/features/imports/services/importUploadService.ts` — candidate for a
  narrow, bounded automatic retry specifically on `storage/unauthorized` immediately following a
  fresh Firestore re-read of the caller's own user doc (not a blind retry loop), so a genuine
  first-attempt propagation gap self-heals without the user needing to notice and manually retry.
- `apps/studio/src/renderer/src/features/imports/hooks/useSinglePngImport.ts` — if the retry needs to
  be surfaced/sequenced at the hook level rather than purely inside the service.
- Possibly nothing in `storage.rules` or `firestore.rules` — no misconfiguration was found; changing
  Rules is very likely unnecessary and should only be considered if the log-correlation step
  produces evidence contradicting the timing hypothesis above.

### Test coverage found

`storageRulesAlignment.test.ts` covers the `/originals/` byte-size constant but nothing about
`isStaff()`'s role list, its live `firestore.get()` semantics, or any timing/race scenario. No
emulator-based test simulates "upload immediately after login" or "upload immediately after an
`isActive`/`role` write." This is a real, confirmed coverage gap — a regression test for this
scenario is not straightforward (it requires simulating a Firestore consistency delay against the
Rules emulator) and should be scoped carefully during Implement rather than assumed trivial.

---

## 8. What is NOT required (per current evidence)

- **No Firestore Rules change** is currently indicated for any of the five defects (A's write
  bypasses Rules via Admin SDK; E's Rules block was checked and matches documented intent).
- **No Storage Rules change** is currently indicated for Workstream E.
- **No index change** is currently indicated for any workstream.
- **No migration or production-data rewrite** is currently indicated for any workstream.
- **No Portal source change** is currently indicated for Workstream B — pending the owner
  re-confirmation recommended in §4.

If the Implement phase's log-correlation step (Workstreams C and E) surfaces evidence contradicting
any of the above, that must be raised as a scope amendment before proceeding, not silently absorbed.

---

## 9. Recommended implementation grouping

Trace independently (already done in this Plan); **group into two implementation batches** based on
blast radius and dependency, not on defect numbering:

**Batch 1 — client-only / low-risk (no Functions deploy required):**
- Workstream A (tag archive cache invalidation)
- Workstream B (Studio Design Library sort-field fix)
- Workstream D (client-side error-mapping + reload triggers; the structured-response change to
  `enqueueAiEnrichment` is a Functions change and belongs in Batch 2 if pursued, but the client-side
  half of D can ship without it as an interim mitigation)

**Batch 2 — Functions/backend changes requiring a dev deploy + owner-approved verification:**
- Workstream C (snapshot scheduling/coalescing fix; requires `functions/` changes and a
  `fresh-prints-dev` deploy to verify read-count reduction before any production consideration)
- Workstream D's structured-response change to `enqueueAiEnrichment` (optional refinement layered on
  top of Batch 1's client fix)
- Workstream E's retry-on-`storage/unauthorized` mitigation, if pursued (client-only, could move to
  Batch 1, but should wait for the log-correlation step's findings first since it changes user-facing
  retry behavior)

Both batches remain scoped to `fresh-prints-dev` only; no production deploy is authorized by this
Plan or its Review.

---

## 10. Acceptance criteria

Restated from the task brief, unchanged — see the managed-goal brief for the full list under
"Acceptance criteria for the eventual implementation." This Plan does not narrow or alter those
criteria; each Batch above is designed to satisfy its corresponding criteria bullet.

---

## 11. Open items for Implement phase (not blocking Plan/Review completion)

1. Read-only production log correlation for the Workstream C read-spike window (Function invocation
   names, counts, timestamps, durations, concurrency) — permitted per the task brief, not yet
   performed.
2. Read-only production log / account-timeline correlation for the Workstream E incident (exact
   account age, `isActive`/`role` write timestamp vs. upload attempt timestamp) — to move the
   Workstream E hypothesis from "strong circumstantial" to "confirmed."
3. Independent live Firestore document check for Workstream A on `fresh-prints-dev` (click Archive,
   read the actual document) — the task brief requires this before closing Workstream A; it was not
   performed in this Plan pass (no Firebase access was used).
4. Owner re-confirmation of the reported Portal ordering symptom (exact URL/filter state, cold vs.
   warm load) before authorizing any Portal code change, since no Portal defect was found in
   current source.
5. Confirm whether `archiveCategoryWithGuards` has the identical cache-invalidation gap as
   `archiveTagWithGuards` (flagged as likely but not yet independently traced with the same rigor as
   tags).

---

## 12. Required Plan output (per managed-goal brief)

1. **Plan path:** `docs/workflow/plans/2026-08-04-post-launch-catalog-and-processing-stability-plan.md` (this file)
2. **Formal Review path and verdict:** `docs/workflow/reviews/2026-08-04-post-launch-catalog-and-processing-stability-review.md` — see that document for the independent verdict.
3. **Confirmed root cause or bounded hypotheses per defect:** §3–§7 above (A, B, D confirmed by direct code evidence; C confirmed/quantified with one unconfirmed tertiary hypothesis; E strong circumstantial, pending log correlation).
4. **Shared root cause across defects:** None. See §2 table.
5. **Exact files expected to change:** listed per workstream in §3–§7.
6. **Firestore spike attribution evidence:** §5 (Workstream C) — quantified read/write counts, trigger-cascade table, debounce analysis, ranked hypotheses.
7. **Snapshot architecture recommendation:** §5, "Required architecture recommendation" — Option 3 converging into Option 5, with the specific narrowing of wasted `status`-transition scheduling as the fastest first slice.
8. **Immediate containment recommendation:** §5, "Immediate containment recommendation" — narrow the `portal-catalog` trigger classification to stop scheduling rebuilds for `processing`/reverted-`imported` status writes; no deploy performed, recommendation only.
9. **Backend/Rules/index/migration/production-data change required:** No Rules, index, or migration change is currently indicated for any workstream (§8). Functions changes ARE required for Workstream C (and optionally D's structured response) — these require a `fresh-prints-dev` deploy during Implement, not during Plan/Review, and remain non-production throughout.
10. **Recommended implementation grouping:** §9 — two batches (client-only; Functions+dev-deploy).
11. **Exact approval phrase for batched implementation:** see below.

**Approval phrase:**

`APPROVE POST-LAUNCH CATALOG AND PROCESSING STABILITY IMPLEMENTATION`

(unchanged from the managed-goal brief; the Formal Review did not find grounds to narrow it — see
the Review document for confirmation.)
