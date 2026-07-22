# Plan: Firestore Usage Audit and Cost Reduction

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Goal | `firestore-usage-efficiency` |
| Related | docs/workflow/reviews/2026-07-22-firestore-usage-efficiency-review.md |

---

## Goal

Audit Firestore reads, listeners, and writes across Fresh Prints Studio, Portal, and Cloud Functions; identify the largest sources of unnecessary document traffic; then implement **evidence-based** reductions that preserve customer and staff workflows, realtime operational behavior where required, security boundaries, and product rules. Produce a reproducible measurement method and an audit report. **No production deploy.**

## Background

Firebase console baseline (July 2026, owner-reported):

| Metric | Approx. value |
|--------|----------------|
| Project cost | ~$1.29 |
| Firestore reads (Jul 21) | ~137,000 |
| Free daily read allowance shown | 50,000 |
| Firestore writes (same view) | ~2,300 |
| Firestore deletes | ~238 |
| Cloud Function invocations (month) | ~18,000 |

Primary concern: **unnecessary reads** (unbounded queries, duplicate listeners, full-collection / full-matching hydrates, count-via-full-fetch, N+1). Writes are secondary; do not remove legitimate workflow-state, progress, rate-limit, or idempotency writes merely to lower the metric.

This is infrastructure / performance hardening. It does not advance Phase 9 product features.

Handoff docs referenced in the prompt (`CURRENT-STATE.md`, `01-project-brief.md`, …) were **not present** under `references/project-chatgpt-handoff/` in this workspace. Repository docs (`docs/architecture/*`, `docs/standards/*`, `docs/project/*`) are authoritative.

---

## Scope

### In Scope

1. Complete Firestore access inventory (Portal, Studio, Functions, rules-relevant evaluation reads).
2. Ranked suspected read and write drivers with code evidence.
3. Implement only optimizations supported by the audit (Wave A + Wave B below; Wave C deferred unless review explicitly expands).
4. Development-only measurement / tracing method (not permanent production noise).
5. Automated tests + manual QA checkpoint with before/after comparison.
6. Audit report artifact (this plan § Audit Report + updates after implement/test).

### Out of Scope

- Production deployment; billing-plan changes
- Removing legitimate realtime solely to cut reads
- Weakening Firestore/Storage security rules
- Moving Firebase access into React components
- Changing one-working-request, 200 DPI floor, upload processing policy, rate limits, AI enrichment behavior, show capacity/allocation/production rules, design lifecycle statuses
- Data migrations without owner approval
- New third-party packages without plan/review approval
- Speculative caching without invalidation
- Claiming write batching reduces billed document-write count
- Broad visual redesign; Phase 9 feature expansion

---

## Affected Areas

### Files / Modules (expected)

**Wave A (safe consolidations / count queries / redundant poll):**

| Area | Files |
|------|--------|
| Studio pending upload badges | `apps/studio/.../customer-uploads/hooks/usePendingCustomerUploadCount.ts`, `Sidebar.tsx`, new shared hook/service for dual-purpose counts |
| Studio Assisted duplicate listeners | `AssistedMessagesProvider.tsx`, `useAssistedCreationRequests.ts`, `AssistedCreationRequestsSection.tsx`, `assistedCreationRequestsService.ts` |
| Studio AI Review tab counts | `useAiReviewTabCounts.ts`, `designService.ts` (add count helper if missing), `aiReviewInboxConstants` / filter builders |
| Portal limit double-read | `portalPrintRequestLimitService.ts`, `usePortalWorkingRequestLimitState.ts`, `useLiveQuotaRefresh.ts` |
| Dev measurement | New small DEV-only module(s) under portal/studio shared or feature `diagnostics/` (gated; never enabled in production builds by default) |

**Wave B (bounded lists / shell fan-out / gallery):**

| Area | Files |
|------|--------|
| Portal catalog library hydrate | `catalogService.ts`, `useCatalogDesigns.ts` |
| Portal Discover home pool | `catalogService.listHomeDiscoveryPool` (reduce query count only if rails still feed correctly) |
| Portal shell print-request fan-out | `portalPrintRequestService.ts`, `useMyPrintRequests.ts`, `PortalPrintRequestContext` / provider |
| Portal account artwork gallery | `customerUploadService.listAccountArtworkGallery`, related hooks |
| Studio AI Processing server filter | `designService` list query / `shouldApplyServerAiReviewFilter` / AI inbox constants |

**Wave C (deferred — document only unless explicitly approved):**

| Area | Why deferred |
|------|----------------|
| Staff Inbox unbounded listeners | Operational realtime alerts; bounding needs product/ops confirmation |
| Design Library `loadAll: true` (Studio) | Client-side facets depend on full set; needs UX decision for server search vs deferred hydrate |
| Print Requests N+1 item summaries + `listAllShowAllocations` | Larger refactor; denormalization or summary fields = data-model touch |
| Functions progress-stage coalescing | Risk to upload/AI observability |
| Security-rule `exists`+`get` cleanup | Rules change → human deploy approval |
| Settings doc shared cache across routes | Needs clear invalidation; low absolute cost |

### Architecture Impact

- [x] Details: Keep Firebase I/O in **services**; hooks coordinate. Prefer shared providers/context for page+shell duplicate subscriptions. No component-owned Firebase business logic. No new packages.

### Security Impact

- [x] Details: No rule weakening. Count queries and filters must remain within existing staff/customer permissions. DEV tracers must not log PII/secrets. Functions progress coalescing (if ever done) must not skip terminal states.

### Data Model Impact

- [x] None for Wave A/B (query/listener shape only). Wave C may later need summary fields — out of scope unless re-planned.

### Backend Impact

- [x] Details: Prefer client/service query changes. Functions write coalescing deferred. No new indexes expected for Wave A; Wave B may need composites if new filter combos appear — verify against `firestore.indexes.json` before implement; **no index deploy without human approval**.

### UI / UX Impact

- [x] Details: Badge counts, AI Review tab numbers, Discover/Library load timing, Current Request shell freshness must remain correct. Prefer **same visible behavior** with fewer reads. Manual checkpoint required.

### Migration Impact

- [x] None

---

## Approach

### Phase 0 — Inventory (complete in Plan)

Repo inspection of `onSnapshot` / `getDocs` / `getDoc` / `getCountFromServer` / writes across Portal, Studio, Functions. Full inventory: **§ Audit Report** below.

### Phase 1 — Measurement harness (Implement, first)

Add **development-only** Firestore usage tracer:

- Count listener attach/detach by key (collection + filter signature).
- Count one-shot `getDocs`/`getDoc`/`getCountFromServer` calls by key.
- Optional session summary dump to console when `localStorage` / env flag set (e.g. `FP_FIRESTORE_TRACE=1`).
- No production default; strip or no-op outside development builds.
- Document a fixed cold-start navigation script (acceptance list in prompt).

Preferred secondary: Firebase Emulator request logs when local emulator available — optional, not required for signoff if client tracer + manual counts are recorded.

### Phase 2 — Wave A implementations

1. **Studio Sidebar pending counts:** One `onSnapshot` (or two `getCountFromServer` polls if realtime badge not required — prefer **one** snapshot, derive both purpose counts client-side) instead of two identical unbounded queries.
2. **Assisted Creation:** Ensure Customer Requests Assisted tab reuses `AssistedMessagesProvider` data / single `subscribeRecent` + single ack subscription (no second identical listener).
3. **Portal print-request limit:** Keep `onSnapshot`; disable or gate `useLiveQuotaRefresh` `getDoc` while listener is healthy (retain focus refresh only if needed after reconnect errors).
4. **AI Review tab counts:** Replace triple `listDesignsPage` with `getCountFromServer` (or bounded aggregation-compatible queries) per tab filters; preserve “has more” UX via count vs pageSize or separate lightweight peek if required.
5. **AI Processing server filter:** Apply `aiReviewStatus == pending` (or equivalent) server-side so Processing tab does not over-fetch non-pending imported designs.

### Phase 3 — Wave B implementations

1. **Portal Library:** Do **not** call `listAllMatchingReadyDesigns` on every filter change by default. Show first page for grid; start full hydrate **only** when client-side search / multi-tag needs the full matching set (or replace multi-tag with server constraints where already indexed). Keep `getCountFromServer` for totals.
2. **Portal shell requests:** Split chrome path: load **continuable/working** request (+ its items) for header/drawer; defer full history + all items + all allocations to `/requests` (and dashboard if needed). Preserve one-working-request UX.
3. **Portal account gallery:** Query with status / confirmation filters + reasonable `limit` (or pagination); stop unbounded `customerUid ==` full fetch for a 14-item preview.
4. **Discover home:** Re-evaluate whether all four `×80` sorts are required every visit; if rails share enough overlap, drop or shrink least-used rail queries **only if** UI still matches current rails (owner visual check). Prefer shrink limits over removing rails silently.

### Phase 4 — Test + Manual + Report

Run lint/typecheck/builds/focused unit tests. Manual checkpoint with before/after tracer numbers. Update audit report with implemented vs deferred items. **Stop before any production deploy.**

---

## Ranked suspected read drivers (confidence × impact)

| Rank | Driver | Evidence | Confidence | Likely impact |
|------|--------|----------|------------|---------------|
| 1 | Studio always-on Staff Inbox: unbounded portal `printRequests` + portal `showAllocations` + **all** `upcomingShows` | `staffInboxSubscriptionService.ts` | High | High (session-long) |
| 2 | Portal Library full matching hydrate | `listAllMatchingReadyDesigns` + `useCatalogDesigns` | High | High (scales with catalog × filter visits) |
| 3 | Studio Design Library `loadAll: true` up to 2000 | `DesignLibraryPage.tsx` → `useDesigns` | High | High |
| 4 | Portal shell: all my requests + all items + allocations | `useMyPrintRequests` / `portalPrintRequestService` | High | High (every auth session / nav) |
| 5 | Studio Print Requests: unbounded requests + N+1 items + `listAllShowAllocations` | `printRequestService`, Print Requests page | High | High on page visit |
| 6 | Studio sidebar **2×** pending upload listeners (same query) | `usePendingCustomerUploadCount` ×2 in `Sidebar.tsx` | High | Med–High |
| 7 | Studio Assisted: shell + page duplicate `subscribeRecent` (+ acks) | `AssistedMessagesProvider` + section hook | High | Med–High when tab open |
| 8 | Portal Discover home 4×80 design queries | `listHomeDiscoveryPool` | High | Med–High per home visit |
| 9 | AI Review tab counts via 3× page fetch (+ Processing over-fetch) | `useAiReviewTabCounts`; pending filter client-only | High | Med |
| 10 | Portal favorites / drawer N+1 `getDoc` designs | `getReadyDesignsByIds`, working-item summaries | Med | Med |
| 11 | Portal account gallery unbounded uploads | `listAccountArtworkGallery` | High | Med |
| 12 | Portal limit `onSnapshot` + 45s `getDoc` poll | `useLiveQuotaRefresh` + limit service | High | Low–Med (small docs, high frequency) |
| 13 | Functions: queue-to-show full allocation scans; progress callables if polled | `queuePortalPrintRequestToShow`, `getPortalShowPrintProgress` | Med | Med (event-driven) |
| 14 | Security-rule `get(users/…)` (+ exists+get) on client lists | `firestore.rules` | Med | Med (multiplies client reads) |

## Ranked suspected unnecessary write drivers

| Rank | Driver | Evidence | Notes |
|------|--------|----------|-------|
| 1 | Customer upload finalize stage writes (~6–10+/file) | `finalizeCustomerUpload` / processing lib | Legitimate observability — **coalesce only if UI still usable** (Wave C) |
| 2 | AI enrichment stage writes (~5–7/run) | AI pipeline | Same — defer |
| 3 | Rate-limit / lease / quota txn docs | upload + Etsy rate limit libs | Keep — security |
| 4 | Allocation/favorite counter triggers | `onShowAllocationCreated`, favorites | Keep — product metrics |
| 5 | Portal qty / size updates | Size already skips unchanged; qty via callables | Verify no double-write on hydrate; debounce only if evidence of spam |
| 6 | Staff inbox alert delivery `setDoc` | delivery service | Keep for sound/idempotency |

**Do not** remove required status transitions, audit fields, rate limits, or idempotency docs.

---

## Exact proposed changes (Wave A + B)

| ID | Change | Before | After | Risk |
|----|--------|--------|-------|------|
| A1 | Single pending-upload count subscription for both sidebar badges | 2× identical `onSnapshot` | 1× snapshot → two derived counts | Low |
| A2 | Shared Assisted recent feed | 2× `subscribeRecent` when Assisted open | 1× via provider/context | Low |
| A3 | Portal limit: no poll while live | Listener + 45s getDoc | Listener primary; poll only on error/backoff | Low |
| A4 | AI tab counts via aggregation | 3× `listDesignsPage` | `getCountFromServer` (or equivalent) | Low–Med (verify filters) |
| A5 | Processing tab server filter | Client filter pending after over-fetch | Server `aiReviewStatus` constraint | Low–Med (index check) |
| B1 | Portal Library deferred hydrate | Always full matching set | First page + hydrate only when search/multi-tag needs it | Med (search UX) |
| B2 | Portal shell slim chrome load | All history+items+allocations in shell | Working/continuable + items for chrome; history on requests routes | Med (badge/drawer correctness) |
| B3 | Account gallery bounded query | Unbounded by uid | Filtered + limited | Low–Med |
| B4 | Discover pool trim | Up to 4×80 | Shrink/drop redundant queries if rails OK | Med (visual) |
| M1 | DEV Firestore tracer | None | Flag-gated attach/get counters + session script | Low |

### Indexes

- Wave A/B: expect **no new indexes** if reusing existing design/status/aiReview composites. Before shipping A5/B1/B3, confirm against `firestore.indexes.json`. If a new composite is required → **human checkpoint** (no silent index deploy).

### Migrations / security rules

- None in approved waves.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Lint | `npm run lint` | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes if Portal touched |
| Portal build | `npm run build:portal` | yes if Portal touched |
| Studio typecheck | `npx tsc --noEmit` from `apps/studio` | yes if Studio touched (note known TS5103 risk) |
| Studio Vite build | `npx vite build` from `apps/studio` | yes if Studio touched |
| Functions build | `cd functions && npm run build` | yes if Functions touched (Wave A/B expect no) |
| Unit tests | `npx tsx --test` on changed utils/hooks/services | yes |

### Manual

Required — see planned `docs/workflow/reviews/2026-07-22-firestore-usage-efficiency-manual-checkpoint.md` covering Studio cold start through Portal progress tabs, add catalog/upload, qty/size, DPI block, queue to show, remount/listener multiplication, realtime where expected, **plus tracer before/after**.

---

## Measurement strategy

1. Enable DEV tracer (`FP_FIRESTORE_TRACE=1` or documented flag).
2. Run fixed script:
   1. Cold-open Studio → Imports → AI Review → Design Library → Print Requests → Show Queue → Customer Uploads
   2. Cold-open Portal → Discover → Current Request → progress tabs → navigate away/return
3. Record: listener attach count by key, peak concurrent listeners, cumulative getDocs/getDoc/getCount, notes on remounts.
4. Repeat after optimizations.
5. Report deltas in test/signoff. **Do not claim production billing reduction** unless measured from Firebase console over comparable traffic.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (listener/realtime + catalog/request correctness)
- [ ] Design approval — only if Discover rail visual changes (B4)
- [ ] Business logic decision — if B1 search behavior needs owner choice
- [ ] Production deploy — **forbidden this phase**
- [ ] Database migration — none
- [x] Implementation approval after Review (this stop gate)
- [ ] Firestore index deploy — only if new composite required
- [ ] Security rules change — out of scope / separate approval

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Staff Inbox / Show Queue feel stale if over-bounded | High | Wave C deferred; keep realtime for inbox |
| Library search incomplete without hydrate | Med | Hydrate on search/multi-tag engagement; keep count query |
| Shell badge wrong after slim load | Med | Explicit chrome query for working request; tests + manual |
| `getCountFromServer` filter mismatch vs tab list | Med | Share query builders; unit-test constraints |
| DEV tracer leaks to production | Med | Build-time / env gate; no-op default |
| Claiming billing savings without console proof | Low | Report only session tracer deltas + honest caveats |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

- Revert PR / git revert of Wave A/B commits.
- Feature-flag optional for B1/B2 if implemented behind a constant (preferred for B2).
- No migrations → no data rollback.
- Tracer removal is safe (dev-only).

---

## Documentation Updates Required

- [ ] BACKEND.md or FIREBASE.md — brief note on client read patterns / DEV tracer (if behavior is lasting)
- [ ] DECISIONS.md — ADR only if we change catalog hydrate or shell load product semantics
- [ ] TESTING.md — tracer / measurement commands if kept
- [x] Workflow plan + review + manual checkpoint + signoff + audit section
- [ ] RISK_REGISTER.md — only if residual cost drivers remain after phase

---

## Open Questions

- [ ] None blocking Plan→Review. Owner may choose at implementation approval whether Wave B4 (Discover trim) is in or deferred.
- [ ] Staff Inbox bounding remains **explicitly deferred** pending ops confirmation (Wave C).

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-22-firestore-usage-efficiency-review.md
- Verdict: approved_with_changes (implement); signoff approved_with_notes (2026-07-22 owner manual PASS)
- Signoff: docs/workflow/reviews/2026-07-22-firestore-usage-efficiency-signoff.md

---

# Audit Report (Plan baseline)

> Updated after Implement/Test with measurements and implemented list.

## Inventory summary

### Portal (client)

| Path | Mode | Collection(s) | Bounds | Cost |
|------|------|---------------|--------|------|
| Library hydrate | getDocs loop | designs | Full matching set | **High** |
| Discover home pool | getDocs ×4 | designs | 80 each | **High** |
| Shell my requests + items + allocations | getDocs | printRequests, items, allocations | Unbounded history | **High** |
| Working items + N+1 summaries | getDocs + getDoc | items, designs, uploads | Working set | High |
| Favorites + N+1 designs | getDocs + getDoc | favorites, designs | Unbounded favorites | Med–High |
| Account gallery | getDocs | customerUploads | Unbounded by uid | Med–High |
| Notifications | onSnapshot | customerNotifications | limit 50 | Med |
| Print request limits | onSnapshot + getDoc poll | settings/printRequestLimits | 1 doc | Med |
| Assisted open/recent | onSnapshot | assistedCreationRequests | limit 5 / 10 | Med |
| Upload batch progress | onSnapshot | customerUploads | batch-scoped | Med session |
| Categories/tags | getDocs | categories, tags | Active/approved | Low–Med |
| Auth profile | getDoc/getDocs | users, customers | 1–2 | Low |

### Studio (renderer)

| Path | Mode | Collection(s) | Bounds | Cost |
|------|------|---------------|--------|------|
| Staff Inbox (shell) | onSnapshot ×3 | portal requests, portal allocations, **all shows** | Unbounded | **High** |
| Design Library | getDocs pages | designs | loadAll ≤2000 | **High** |
| Print Requests page | getDocs + N+1 | requests, items, all allocations | Unbounded | **High** |
| Assisted Messages + tab | onSnapshot | assistedCreationRequests | limit 100; duplicate risk | **High** |
| Sidebar pending uploads ×2 | onSnapshot ×2 | customerUploads pending | Unbounded, duplicated | **High** |
| AI Review inbox + tab counts | getDocs | designs | page + 3× count-via-page | Med–High |
| Upcoming Shows | getDocs | shows / allocations | Full shows; filtered allocations | Med–High |
| Customer upload intake | onSnapshot | customerUploads | limit 50 + N+1 | Med |
| Settings docs | onSnapshot | settings/* | 1 doc each | Low–Med |
| Customers directory | getDocs | customers | Full | Med |

Electron **main**: no Firestore usage. `getCountFromServer` unused in Studio today.

### Functions (Admin SDK)

| Path | Pattern | Cost |
|------|---------|------|
| Upload finalize | Many progress writes + quota/lease | High write |
| queuePortalPrintRequestToShow | Full show allocation scans (+ triggers) | High read on queue |
| listPortalAllocatableShows / getPortalShowPrintProgress | Wide reads; progress if polled | Med–High |
| AI enrichment | Stage writes + categories/tags scan (60s cache) | Med–High |
| Rate limits / leases | Small txn docs | Med frequency |
| Purge/wipe callables | Full scans | High when run |

`packages/shared`: collection constants/types only — no live I/O.

### Rules

Authenticated client lists often evaluate `isStaff()` → `get(users/{uid})`. Ownership helpers may `exists`+`get` same doc. Admin SDK bypasses rules. Rules optimization deferred (deploy gate).

## Duplicate / remount findings

- Studio Sidebar: two identical pending-upload listeners.
- Assisted: provider + page both `subscribeRecent` when Assisted tab open.
- Portal: shell working items vs detail page overlap when viewing current request.
- Portal: limit listener + poll.
- Dev Strict Mode / HMR can double one-shot fetches (measurement should note).

## Implemented optimizations

_(filled after Implement — 2026-07-22)_

| ID | Status |
|----|--------|
| M1 DEV tracer | Done — `packages/shared/src/utils/firestoreUsageTrace.ts` |
| A1 pending upload dual listener | Done — single `usePendingCustomerUploadCounts` |
| A2 Assisted duplicate subscribe | Done — shared subscription helpers |
| A3 Portal limit poll | Done — `intervalMs: 0` while listener live |
| A4 AI tab counts | Done — `designService.countDesigns` / `getCountFromServer` |
| A5 Processing server filter | Done — pending no longer skipped; index verified existing |
| B1 Portal Library deferred hydrate | Done |
| B2 Portal shell chrome vs full | Done |
| B3 Account gallery bound | Done — limit 150 by `createdAt` |
| B4 Discover trim | Deferred by owner |

## Deferred opportunities

- B4 Discover pool trim
- Staff Inbox bounding / active-shows-only listener
- Studio Design Library server search instead of loadAll
- Print Requests denormalized summaries / kill N+1 + full allocations
- Functions progress coalescing
- Rules exists+get cleanup
- Shared settings subscription cache

## Before/after measurements

_(fill after manual checkpoint tracer dumps)_

## Remaining expected baseline

Even after Wave A/B, Staff Inbox always-on listeners, legitimate catalog page reads, Functions upload/AI writes, and growing operational data will remain. Exact production billing impact unknown without console comparison.

## Risks and rollback

See Risks & Rollback sections above.
