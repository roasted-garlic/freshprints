# Plan: Print Runs Foundation

| Field | Value |
|-------|-------|
| Date | 2026-07-04 |
| Author | Codex |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | `.cursor/workflow/state.md`, `docs/project/ROADMAP.md`, `docs/architecture/DATA_MODEL.md`, `docs/WORKFLOWS.md`, `docs/project/DECISIONS.md`, `project-chatgpt-handoff/CURRENT-STATE.md` |

---

## 1. Goal

Revise the Phase 7 foundation so Fresh Prints Studio plans **Upcoming Shows first** and treats Whatnot as the external source of truth for show schedule data. The app should track upcoming shows by stable Whatnot show ID, keep local Firestore metadata for planning, and let future `printRuns` link to those local show records without writing any production lifecycle state to `designs.status`.

This document is planning-only. No implementation, deploy, migration, backfill, external fetch, scraping, or Whatnot integration has been approved or performed.

## 2. Phase Alignment

This work aligns with `docs/project/ROADMAP.md` Phase 7: **Print Runs / Upcoming Shows**.

It follows the signed-off Phase 6 Print Request foundation and recent follow-ups:

- `print-request-detail-autosave-and-name-locking`
- `print-request-origin-tracking`
- `print-request-oversized-selection-unblock`
- `print-request-item-preview-and-dpi-polish`

The corrected Phase 7 sequence should be:

1. local Upcoming Shows / Show Queue foundation
2. Whatnot-backed show sync planning
3. Print Runs linked to show records
4. later Pensacola export planning

Phase 8 Portal behavior and Phase 9 Custom Requests remain deferred.

## 3. Current State

Inspected paths:

- `project-chatgpt-handoff/CURRENT-STATE.md`
- `.cursor/workflow/state.md`
- `docs/project/ROADMAP.md`
- `docs/architecture/DATA_MODEL.md`
- `docs/WORKFLOWS.md`
- `docs/project/DECISIONS.md`
- `docs/standards/SECURITY.md`
- `shared/types/printRequest/printRequest.types.ts`
- `src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx`
- `src/renderer/src/features/print-requests/services/printRequestService.ts`
- `src/renderer/src/features/print-requests/utils/printRequestQueryPlanning.ts`
- `src/renderer/src/features/firebase/constants/firestoreCollections.ts`
- `src/renderer/src/features/firebase/services/firestoreCollectionService.ts`
- `src/renderer/src/routes/AppRoutes.tsx`
- `src/renderer/src/shared/components/Sidebar.tsx`
- `src/renderer/src/features/show-queue/pages/ShowQueuePage.tsx`
- `firestore.rules`
- `firestore.indexes.json`

Key repo facts:

- The app has a disabled legacy `/show-queue` placeholder route and sidebar item, but no implemented Phase 7 model yet.
- The codebase still contains legacy Firestore collection constants `showQueues` and `showQueueItems`, but no implemented `printRuns`, `printRunItems`, or show-sync model.
- Phase 6 `printRequests` and `printRequestItems` are implemented and already follow the approved page -> hook -> service -> Firestore pattern.
- `PrintRequestItem` persists production-style statuses for future workflows, but the standard Phase 6 UI intentionally hides production controls.
- `permissionService.ts` already contains `manageQueues`, so queue/show/run permissions can extend that vocabulary.
- Current Firestore rules and indexes only cover Phase 6 collections, not a Phase 7 show or run model.
- No Whatnot integration exists in the repo today. No official API availability has been verified in this planning phase.

## 4. Product Decisions Already Confirmed

- Whatnot is the external source of truth for upcoming show dates and times.
- Each locally tracked Whatnot-backed show must be keyed by stable Whatnot show ID, not by date.
- Show dates and times are mutable and must update without creating duplicate local records.
- The app should check for show updates about every 30 minutes once implemented.
- The app should keep local Firestore metadata for planning and UI.
- Print Runs remain a Studio production-planning workflow, not Portal behavior.
- Design lifecycle remains catalog-only. `designs.status` must never receive `queued`, `printed`, `done`, `pending`, or similar production writes.
- Production state belongs on `printRunItems`.
- Show schedule state belongs on a local upcoming-show / show-queue record.
- Existing Phase 6 Print Request behavior, naming, origin badges, sizing, autosave, and preview behavior must remain unchanged.

## 5. Product Decisions Still Needed

These decisions should be reviewed before implementation starts:

1. **Canonical collection/page naming**
   Recommended: use `upcomingShows` as the canonical collection name and present `/show-queue` as the Upcoming Shows route for Phase 7 continuity.

2. **Show-to-run cardinality**
   Recommended: one show may have zero, one, or many print runs; a run may optionally link to one show.

3. **Generic non-Whatnot runs**
   Recommended: allow generic batch runs later, but keep Whatnot-backed shows as the main Phase 7 use case from the start.

4. **Show lifecycle vocabulary**
   Recommended: keep separate local show status and sync status fields instead of overloading one status field.

5. **Historical retention**
   Recommended: never hard-delete or auto-delete locally planned shows just because they disappear upstream; represent missing/canceled states safely.

6. **Sidebar exposure**
   Recommended: show both Upcoming Shows and Print Runs once implemented, not one combined page.

## 6. Whatnot Show Sync Requirement

Phase 7 must treat Whatnot show sync as a first-class planning requirement.

Required planning outcomes:

- local records must store stable `whatnotShowId`
- schedule updates must match and update by `whatnotShowId`
- local records must preserve planning metadata even when upstream show details change
- the sync design must support about a 30-minute cadence
- external fetch/parsing method must remain explicitly unapproved until implementation review verifies what is technically and product-legally acceptable
- no assumption of an official Whatnot API should be made in this plan

Integration boundary recommendation:

- a backend-owned show sync service should be the only layer that reads external Whatnot show data
- Firestore should store normalized local show metadata only
- Studio should read Firestore show records and offer optional manual refresh through an approved callable or backend trigger path later

## 7. Proposed Show / Upcoming Show Data Model

### Recommended local collection name

- `upcomingShows`

Reasoning:

- clearer than `whatnotShows` if generic non-Whatnot sources are added later
- more precise than legacy `showQueues` for schedule/source records
- still compatible with `/show-queue` as a UI route label if the team wants to keep that route

### Recommended unique key answer

- stable upstream key: `whatnotShowId`
- local Firestore document ID: generated local ID or deterministic ID from source plus `whatnotShowId`

Recommendation:

- store `whatnotShowId` as a required indexed field
- keep local Firestore `id` independent so future multi-source support is possible

### Proposed local show type

```ts
export type UpcomingShowSource = "whatnot";

export type UpcomingShowStatus =
  | "scheduled"
  | "rescheduled"
  | "live"
  | "completed"
  | "canceled"
  | "missing_upstream"
  | "archived";

export type UpcomingShowSyncStatus =
  | "idle"
  | "syncing"
  | "succeeded"
  | "failed";

export interface UpcomingShow {
  id: string;
  source: UpcomingShowSource;
  whatnotShowId: string;
  whatnotUrl?: string;
  title?: string;
  scheduledStartAt?: Timestamp;
  status: UpcomingShowStatus;
  syncStatus: UpcomingShowSyncStatus;
  syncError?: string;
  lastSyncedAt?: Timestamp;
  lastSeenAt?: Timestamp;
  notes?: string;
  isArchived: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Fields to store from Whatnot now

- `whatnotShowId`
- `whatnotUrl`
- `title`
- `scheduledStartAt`
- `source: "whatnot"`
- enough raw metadata to detect changes safely if needed later, but only if implementation review approves it

### Fields to keep local-only

- `status`
- `syncStatus`
- `syncError`
- `lastSyncedAt`
- `lastSeenAt`
- `notes`
- `isArchived`
- audit timestamps and audit user fields

### Changed-date update rule

- find matching local show by `source + whatnotShowId`
- update mutable fields like `title`, `scheduledStartAt`, `whatnotUrl`, `lastSeenAt`, `lastSyncedAt`
- do not create a new record when only the date/time changes

### Removed / canceled / missing show rule

Recommendation:

- never auto-delete local show records
- if a synced show stops appearing upstream, mark it `missing_upstream` and keep local planning/history
- if upstream explicitly indicates cancellation later, map to `canceled`
- archive should remain a local staff action or explicit lifecycle step, not an automatic sync side effect

## 8. Proposed Print Run Data Model And Relationship To Shows

### Recommended relationship answer

- `UpcomingShow` owns schedule tracking
- `PrintRun` owns production planning
- a `PrintRun` may optionally link to one `UpcomingShow`
- an `UpcomingShow` may have one or more linked `PrintRun` records

This supports:

- one show with multiple production batches
- generic non-show runs later
- stable linkage even when upstream show dates move

### Proposed `PrintRun` type

```ts
export type PrintRunStatus =
  | "draft"
  | "active"
  | "completed"
  | "archived";

export interface PrintRun {
  id: string;
  name: string;
  status: PrintRunStatus;
  upcomingShowId?: string;
  whatnotShowId?: string;
  showTitleSnapshot?: string;
  scheduledStartAtSnapshot?: Timestamp;
  notes?: string;
  requestCount: number;
  itemCount: number;
  totalQuantity: number;
  createdBy: string;
  updatedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
  completedBy?: string;
  archivedAt?: Timestamp;
  archivedBy?: string;
}
```

### Proposed `PrintRunItem` type

```ts
export type PrintRunItemStatus =
  | "pending"
  | "queued"
  | "in_progress"
  | "printed"
  | "done"
  | "canceled";

export interface PrintRunItem {
  id: string;
  printRunId: string;
  printRequestId: string;
  printRequestItemId: string;
  designId: string;
  customerId?: string;
  requestNameSnapshot: string;
  requestOriginSnapshot?: PrintRequestOrigin;
  designTitleSnapshot: string;
  quantity: number;
  printWidthInches?: number;
  printHeightInches?: number;
  sizeLabel?: string;
  notes?: string;
  status: PrintRunItemStatus;
  addedBy: string;
  updatedBy: string;
  queuedAt?: Timestamp;
  queuedBy?: string;
  printedAt?: Timestamp;
  printedBy?: string;
  completedAt?: Timestamp;
  completedBy?: string;
  canceledAt?: Timestamp;
  canceledBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Recommended show/run creation flow

- staff browse Upcoming Shows
- staff open a show detail
- staff create a Print Run from that show, prefilled with show linkage and current show-date snapshot
- later, staff attach Print Requests and request items to the run

### Generic batch runs answer

Yes, generic non-Whatnot batch runs should still be allowed later.

Recommendation:

- a run without `upcomingShowId` is a generic batch run
- a run with `upcomingShowId` is a show-linked run

## 9. Proposed Route/UI Structure

### Route answer

1. `/show-queue` should become the **Upcoming Shows** page for the first Phase 7 show-sync slice.
2. `/print-runs` should remain the production-run page.
3. A show detail view should display linked Print Runs.
4. Staff should be able to create a Print Run from a show.
5. Print Runs should be groupable by linked show record and current show date.
6. Sidebar should show both **Upcoming Shows** and **Print Runs** once implemented.

### Why keep `/show-queue`

The current repo already contains a placeholder route and permission naming around queue management. Keeping `/show-queue` as the initial Upcoming Shows route reduces route churn while still allowing the underlying Firestore model to move forward with clearer naming (`upcomingShows`, `printRuns`).

Recommended UI labels:

- sidebar label: `Upcoming Shows`
- route path: `/show-queue`
- internal collection: `upcomingShows`

### Workspace shape

Upcoming Shows page:

- show list
- show sync state and last synced time
- manual refresh action if approved later
- show detail with title, current schedule, status, sync metadata, notes, and linked Print Runs

Print Runs page:

- run list
- selected run detail
- attach-request workflow
- show-link context when run is tied to an upcoming show

## 10. Proposed Sync Strategy And 30-Minute Cadence

### Options considered

#### 1. Scheduled Cloud Function every 30 minutes

Pros:

- backend-owned cadence
- does not depend on Studio being open
- single source of sync execution

Cons:

- requires Functions implementation and deploy
- may need secrets, headers, or source-specific configuration depending on final integration path
- fragile if Whatnot page structure changes

Failure modes:

- upstream page changes break parsing
- scheduled job fails silently unless surfaced into Firestore/UI/monitoring

Testing approach:

- parser/unit tests against captured fixtures
- emulator/function integration tests where possible
- manual QA with dev records after implementation approval

Secrets:

- unknown today; may be unnecessary for public page reads, but must not be assumed

#### 2. Manual Studio refresh only

Pros:

- simpler to reason about
- fewer backend moving parts at first

Cons:

- not true 30-minute sync
- depends on staff behavior and Studio availability
- stale show data risk

Failure modes:

- no one refreshes in time
- user-triggered errors create inconsistent freshness

Testing approach:

- callable/manual-refresh flow tests
- renderer/manual QA

Secrets:

- unknown today

#### 3. Hybrid: scheduled backend sync plus manual refresh

Pros:

- meets the 30-minute requirement
- gives staff a recovery tool when sync fails or urgent updates are needed
- keeps external parsing logic backend-owned

Cons:

- highest implementation surface
- requires Functions plus a callable/admin-trigger path

Failure modes:

- scheduled sync fails
- manual refresh fails
- upstream page changes break both paths

Testing approach:

- scheduled sync parser tests
- callable/manual refresh tests
- Studio error-state QA

Secrets:

- unknown today

### Recommended sync strategy

- **Hybrid approach**
- scheduled backend sync about every 30 minutes
- manual staff refresh button as fallback

### Error surfacing recommendation

- persist `syncStatus`, `syncError`, `lastSyncedAt`, and `lastSeenAt` on each show record
- surface sync health in Upcoming Shows UI
- do not hide failed syncs behind logs only

## 11. Proposed Implementation Outline By Layer

### Shared types

- add `shared/types/upcomingShow/upcomingShow.types.ts`
- add `shared/types/upcomingShow/upcomingShow.enums.ts`
- add `shared/types/printRun/printRun.types.ts`
- add `shared/types/printRun/printRun.enums.ts`

### Firebase constants/services

- add `upcomingShows`, `printRuns`, and `printRunItems` to `firestoreCollections.ts`
- extend `firestoreCollectionService.ts` with typed accessors

### Renderer features

Add `src/renderer/src/features/upcoming-shows/` for:

- Upcoming Shows page
- show detail
- linked runs summary
- manual refresh control if approved later

Add `src/renderer/src/features/print-runs/` for:

- Print Runs page
- run detail
- attach-request workflow
- show-linked run creation flow

### Service layer

`upcomingShowService` should own:

- reading local show records
- local show filtering/sorting
- optional manual refresh invocation after backend approval

`printRunService` should own:

- run CRUD
- show linkage and snapshot capture
- request attachment
- run-item creation and status management

### Backend layer

If implementation is later approved:

- one scheduled backend sync entrypoint
- one callable/manual refresh entrypoint if manual refresh is approved
- one normalization/parser layer isolated from renderer code

No implementation of external fetch/parsing is approved by this plan.

## 12. Firestore Rules/Indexes Considerations

### Likely new collections to protect

- `upcomingShows`
- `printRuns`
- `printRunItems`

### Likely rule direction

- active staff read/write only
- no customer access
- immutable `whatnotShowId` after create
- immutable run-item source references after create
- mutable sync metadata only through approved backend/service paths
- design lifecycle fields remain untouched

### Likely indexes

For Upcoming Shows:

- `scheduledStartAt`
- `status + scheduledStartAt`
- `source + whatnotShowId`

For Print Runs:

- `upcomingShowId + updatedAt`
- `status + updatedAt`

For Print Run Items:

- `printRunId + updatedAt`
- `printRunId + status + updatedAt`

### Query goals these indexes support

- upcoming show list
- next upcoming show
- local lookup by `source + whatnotShowId`
- show detail with linked runs
- run detail with run items

## 13. Functions / Deploy Considerations

Likely backend needs after implementation approval:

- scheduled Cloud Function for 30-minute sync
- callable/manual refresh function for staff fallback
- possible deploy of Firestore rules
- possible deploy of Firestore indexes

Human checkpoints required before any of these:

- external integration method approval
- Functions implementation approval
- Firestore rules deploy approval
- Firestore indexes deploy approval
- any secrets decision
- any production deploy

No deploy, secret provisioning, or external connectivity was performed in this planning revision.

## 14. Out Of Scope

- No implementation
- No actual Whatnot scraping/fetching
- No assumption of a verified official Whatnot API
- No Firebase deploy
- No Functions deploy
- No Firestore rules deploy
- No Firestore index deploy
- No migration or backfill
- No Portal behavior
- No customer Auth/login
- No Custom Requests
- No ecommerce
- No payment
- No shipping
- No gang-sheet generation
- No image mutation
- No design lifecycle status changes
- No writes of production status to `designs.status`

## 15. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Whatnot page structure may change and break parsing | high | keep parsing backend-owned, add sync status/error fields, require implementation verification before rollout |
| Show date changes could create duplicate local records if keyed by date | high | key records by stable `whatnotShowId`, never by date |
| Upstream missing/canceled shows could erase local planning if handled destructively | high | never auto-delete; use `missing_upstream` or `canceled` states |
| Mixing schedule state and production state could blur responsibilities | medium | keep show status on `upcomingShows`, production status on `printRunItems` |
| Reusing `/show-queue` could preserve naming drift if UI labels stay legacy | medium | keep route for continuity but label UI as `Upcoming Shows` and use `upcomingShows` as canonical collection |
| Scheduled sync adds deploy and operational complexity | medium | adopt hybrid plan with explicit human checkpoints and visible sync health in Studio |

## 16. Acceptance Criteria

- Staff can see upcoming Whatnot shows in the app.
- Each Whatnot show is tracked by stable Whatnot show ID.
- Show dates and times update when Whatnot changes them.
- The app checks for show updates about every 30 minutes.
- Staff can manually refresh shows if that path is approved in implementation.
- Print Runs can link to a Whatnot-backed local show record.
- Print Runs follow the show schedule instead of relying only on manually entered dates.
- Date changes do not create duplicate show records.
- Removed/canceled/missing shows are handled safely.
- Print Run production status does not write to `designs.status`.
- Existing Print Request behavior remains unchanged.
- No implementation or deploy happens during planning.

## 17. Verification Plan

### Automated checks to require after implementation

- `npx tsx --test <targeted upcoming-show and print-run test paths>`
- `npx tsc --noEmit`
- `npm run lint`
- `npx vite build`
- `git diff --check`

### Recommended targeted test coverage

- local show upsert by `whatnotShowId`
- changed-date update without duplicate creation
- missing-upstream/canceled handling
- scheduled sync normalization behavior with fixtures
- manual refresh callable path if approved
- run creation from linked show
- run snapshot capture from show
- no write path to `designs.status`

### Manual QA to require after implementation

- open Upcoming Shows page
- verify local show list ordering by upcoming schedule
- verify last synced and sync error surfaces
- trigger manual refresh if implemented
- verify a moved show updates the existing record instead of duplicating
- create a Print Run from a show
- verify the run stores show linkage and snapshot fields
- verify linked run appears from the show detail
- verify Print Requests remain unchanged
- verify no design lifecycle status changes occur

## 18. Human Checkpoints

- plan review and explicit implementation approval before any code changes
- external Whatnot integration method approval before any fetch/parsing work
- Functions implementation approval before any scheduler/callable work
- Firestore rules approval before any rules edits or deploy
- Firestore index approval before any index edits or deploy
- secrets approval before any secret storage/provisioning
- production deploy approval before any production release

## 19. Recommended Answers Summary

1. **Recommended local collection name**
   `upcomingShows`

2. **Recommended relationship between Whatnot shows, Show Queue, and Print Runs**
   `upcomingShows` stores local Whatnot-backed show records; `/show-queue` becomes the Upcoming Shows UI route; `printRuns` optionally link to one `upcomingShow`, and one `upcomingShow` may have multiple `printRuns`.

3. **Recommended 30-minute sync strategy**
   Hybrid: scheduled backend sync about every 30 minutes plus manual staff refresh fallback.

4. **Recommended route/sidebar structure**
   `/show-queue` = Upcoming Shows, `/print-runs` = Print Runs, and the sidebar should show both entries once implemented.

5. **Recommended unique key**
   Stable Whatnot show ID stored as `whatnotShowId`; never use date/time as the unique key.

6. **Recommended change-handling rule**
   Update local records by `source + whatnotShowId`; mutate schedule/title/url fields when upstream changes; never create duplicates for date-only changes.

7. **Recommended removed/missing handling**
   Keep local records; mark them `missing_upstream` or `canceled` rather than deleting them.

8. **Implementation readiness**
   Implementation remains blocked pending review approval. This revised plan does not authorize code changes.

