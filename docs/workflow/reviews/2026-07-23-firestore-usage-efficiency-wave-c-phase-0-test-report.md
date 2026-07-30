# Firestore Usage Efficiency Wave C — Phase 0 Test Report

Date: 2026-07-23  
Scope: Internal Gate 1 containment only  
Status: **passed_with_notes — owner retest PASS**

## Implemented containment

- Removed Design Library `loadAll`; initial route load is one bounded 100-design page.
- Mount tag management only while its modal is open.
- Added bounded, TTL, in-flight-deduplicated taxonomy caches with rejection eviction and write
  invalidation.
- Added canonical, bounded, short-lived design page/count/document caches with write invalidation.
- Stabilized `useDesigns` around its serialized query rather than object identity.
- Removed AI Review's automatic second three-count pass after initial inbox loading.
- Changed Print Requests from eager full-ready-catalog loading to selected request design-ID reads.
- Replaced competing Print Requests local/URL writers with one URL authority, one canonical resolver,
  one route commit helper, and one normalization effect.
- Added URL-addressable `workingFilter` ownership for Active, Stale, Empty, and All. Explicit filter
  clicks preserve a compatible request, otherwise select the destination's first request or clear
  selection, and push exactly one history entry. Passive normalization preserves the explicit filter.
- Bounded global Staff Inbox request/allocation/show listeners using existing indexed ordering.
- Corrected trace attribution so a one-shot completion after navigation remains owned by its start
  route.
- Grouped paginated taxonomy pages by logical corpus-load correlation and traced retries after
  rejected cached loads.
- Extended taxonomy cache lifetime from 5 minutes to 12 hours, scoped keys by Firebase project and
  caller ID, and added write/authentication/manual invalidation.
- Retained default-off tracing and shared-listener attach/detach/emission diagnostics.

## Automated results

| Command | Result |
|---|---|
| `npx tsx --test <Phase 0 cache/tracer/listener/route/Print Requests suites>` | pass, 46/46 |
| `npx tsx --test packages/shared/src/utils/boundedAsyncCache.test.ts packages/shared/src/utils/firestoreUsageTrace.test.ts` | pass, 13/13 current |
| `npx tsx --test apps/studio/src/renderer/src/features/firebase/utils/createSharedFirestoreSubscription.test.ts` | pass, 2/2 |
| `npx eslint <changed Phase 0 files> --max-warnings 0` | pass |
| `npm run build:portal` | pass |
| `npm exec --workspace @fresh-prints/studio -- vite build` | pass; renderer, Electron main, and preload built |
| `git diff --check` | pass |

## Developer-owned authenticated Electron verification

An authenticated real Electron development renderer was launched against a controlled local Vite
server with Chromium protections unchanged. The run used `fresh-prints-dev` and was closed after
verification.

| Route | Query starts / returned-document bound | Cache events in the requested navigation order | Route listener result |
|---|---|---|---|
| Inbox | 0 tag/category/design starts; 0 returned | 0 taxonomy/design events | 60-second idle: `7 -> 7`; 0 events; 0 duplicates |
| Design Library | 5 physical starts: 3 tag pages + 1 category + 1 design | tag/category/design misses once; Strict Mode concurrent calls resolve as hits | tags 1,122; categories 18; designs 80 |
| AI Review | 4 starts: exactly 1 active processing page + 3 aggregate counts | category/tag hits; page miss; 3 count misses with paired Strict Mode hits | page returned 0; no inactive needs-review/rejected page preload |
| Print Requests | 0 full-ready-catalog starts | 0 taxonomy/design cache events in this data state | +0 taxonomy/design listeners |
| Imports | 0 tag/category/design/count starts before an import | 0 | +0 taxonomy/design listeners |
| Show Queue | 0 taxonomy/catalog-design starts | 0 | global operational listeners unchanged |

The final trace had 7 current/peak listeners, no duplicate active signatures, one logical tag corpus
(`3` pages / `1,122` documents), and no catalog-source event attributed to Inbox, Imports, or Show
Queue. Across the whole route run, 9 physical one-shot starts and 1,227 returned documents included
the one-time cold taxonomy/design load plus 7 initial global listener documents.

`firestoreRouteContainment.test.ts` locks these ownership boundaries to the actual route source files.
The real Electron Print Requests test performed 20 tab transitions across five cycles. Working was
populated; Queued, Printing, and Printed were empty. Back and forward both resolved correctly. The
renderer stayed responsive with no navigation-throttling warning, error, unexpected reload, or
loading loop. The corresponding async resolver tests cover populated variants of every tab, loading,
selection retention/movement, stale fallback, and empty destinations.

The owner's next test clarified that the primary status tabs were fixed but exposed a separate
secondary Working-filter defect: after selecting the sole request under Empty or All, Active or
Stale immediately reverted to All. Source inspection proved the cause was the “reveal deep link”
effect calling `setWorkingTriageFilter("all")` whenever the selected request was incompatible with
the clicked filter.

The corrected authenticated Electron run exercised Active, Stale, Empty, and All, including:

- Empty with selected request → Active: request cleared, Active remained selected, one route commit.
- Empty with selected request → Stale: request cleared, Stale remained selected, one route commit.
- All with selected request → Active: request cleared, Active remained selected, one route commit.
- All with selected request → Stale: request cleared, Stale remained selected, one route commit.
- Back restored Empty and its request; Forward restored All and its request with zero normalization
  route commits.
- Every explicit click produced exactly one history write and no later competing write or reversion.
- The page remained responsive, could navigate to Inbox, and produced zero Chromium navigation
  warnings, console errors, catalog/taxonomy one-shots, or duplicate listeners.

The expanded resolver suite covers every ordered filter transition, null/compatible/incompatible/
All-only selection, populated and empty destinations, stable equivalent inputs, classification
changes after first-item/last-item updates, direct links, stale IDs, and history destinations.

The bounded cache suite now reports hits and misses into the trace summary, shares in-flight work,
evicts failures, invalidates after writes, and proves that advancing a controlled clock by 30 minutes
without another call performs no work. Shared listener tests prove one upstream subscription and
balanced Strict Mode teardown.

## Before and bounded-after comparison

| Signal | Measured before | Enforced after |
|---|---:|---|
| Returned tag documents | ~22,440 accumulated | 1,122 once: one logical 3-page corpus per user/project/12-hour session cache |
| Design Library tag query events | 90 | 3 physical pages grouped as 1 logical load; later consumers hit cache |
| Design Library category events | 13 | 1 cold query / 18 documents; later consumers hit cache |
| Design Library design events | 14 | 1 bounded query / 80 documents; no `loadAll` loop |
| AI Review tag/category events | 22 / 6 | 0 Firestore starts after Design Library; cache hits only |
| AI Review count events | 30 | exactly 3 aggregate starts |
| AI Review design-page events | 7 | exactly 1 active processing page; inactive pages not loaded |
| Print Requests ready catalog | repeated full ready-design loading | zero full ready-catalog query; selected IDs only |
| Imports/Inbox ownership | late Design Library completions misattributed | completions remain attributed to their start route; route source has no taxonomy/design consumer |
| Print Requests navigation | Primary flood fixed; secondary Active/Stale reverted after Empty/All | Primary tabs stable; every Working filter URL-addressable; exact secondary transitions use 1 commit, 0 reversions/warnings/errors |

The after column combines authenticated Electron trace evidence with deterministic regression tests.

## Known repository-level gate failures

`npx tsc -p apps/studio/tsconfig.json --noEmit` stops at the existing
`TS5103: Invalid value for '--ignoreDeprecations'`. Overriding that option exposes existing unrelated
Studio/shared type errors. None of those reported errors point to the new containment files. The
Vite production transform/build and changed-file lint both pass.

The first combined verification command also attempted `npm run build --workspace functions`; the
repository has no `functions` workspace, so npm rejected the workspace selector. The earlier
goal-recorded command `npm run build --prefix functions` passed for the Functions instrumentation.

## Phase 0 gate result

The primary-tab retest did not cover the actual secondary Working-filter defect, so a targeted
Active/Stale-after-Empty/All retest was required. The owner subsequently passed all six corrected
checks. No further Firebase reading, primary-tab retest, route matrix, Portal idle, or full trace
matrix is required. Phase 0 is complete with verdict
`passed_with_notes`. The only note is Firebase dashboard rounding and reporting delay in the earlier
broad smoke measurement.

No deployment, rules/index change, initialization, migration, import, or production action occurred.
