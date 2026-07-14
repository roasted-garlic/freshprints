# Plan: Studio/Portal perf + show-queue gates

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |

---

## Goal

Fix five owner-reported issues in one phase:

1. Studio: Send to AI Review from customer upload / donations feels forever (callable awaits full AI pipeline).
2. Portal: Link navigation sticky / needs double-click after catalog URL caching.
3. Portal: Calendar slow when adding a request to a show.
4. Studio: Audible alert plays twice when a request is queued to a show.
5. Enforce: once a show queue is **full** or **marked done**, no more requests can be added.

## Scope

### In Scope

**1. Promote → background AI (match import)**
- `promoteCustomerUploadToAiReview`: create design + copy assets + return; do **not** await `runAiEnrichmentPipeline`.
- Studio intake/donate promote path: hand off `designId` to existing `enqueueImportedDesignsForBackgroundAi` (sequential enqueueAiEnrichment).
- UI notice: processing starts in the background; “Sending…” ends after promote returns.

**2. Portal nav smoothness after URL cache**
- Skip prefetch for keys already in `resolvedUrlCache`.
- Lower/throttle prefetch concurrency (idle or small parallel pool).
- Avoid aggressive prune+refetch churn on remount where safe.
- Audit sidebar/drawer first-tap (scrim) if still needed after cache fix.

**3. Portal allocatable shows calendar**
- Server: stop full-collection `upcomingShows.get()`; query/filter to upcoming + limited past window.
- Client: cache last successful list in session; don’t wipe on every modal open; optional prefetch when Add-to-show is available.

**4. Double alert sound**
- Coalesce `request_queued_to_show` + `show_queue_full` in one batch window (widen ~500–1000ms) so one sound plays when a queue-add also fills the show; keep both toast kinds if already shown.

**5. Full / done → no adds**
- **Full** (capacity): block new allocations (Portal + Studio). Remove/disable “add with override” for capacity full.
- **Done**: block when `productionStatus` is `completed` or `fully_printed` (and keep canceled/archived blocked).
- Apply in shared eligibility helper used by Portal callable/UI and Studio Add-to-show.
- Past scheduled shows remain blocked (existing).

### Out of Scope
- Production deploy (dev deploy for functions as needed)
- Rewriting entire AI pipeline architecture / Cloud Tasks (follow-up if client handoff insufficient)
- Changing alert toast copy beyond coalesce behavior

## Product decisions (recorded)
- #4: One sound when queue-add also fills show (toasts may still show both kinds if already emitted).
- #5: Hard block when capacity full or show finished (`completed` / `fully_printed`); no staff capacity override for new adds.

## Test Strategy
- Shared unit tests for allocate eligibility (full/done)
- Functions build; promote no longer blocks on pipeline (code review + Studio manual)
- Portal typecheck
- Manual: promote latency, Portal nav, calendar open, alert once, full/done cannot add

## Approval
- Review approved same pass — owner-directed batch
