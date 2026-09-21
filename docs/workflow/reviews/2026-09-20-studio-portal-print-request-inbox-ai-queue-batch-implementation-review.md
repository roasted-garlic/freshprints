# Implementation Review: Studio / Portal Print Request, Inbox, and AI Queue Batch

- **Goal:** `studio-portal-print-request-inbox-ai-queue-batch`
- **Plan:** [approved plan](../plans/2026-09-20-studio-portal-print-request-inbox-ai-queue-batch-plan.md)
- **Formal plan review:** [approved formal review](./2026-09-20-studio-portal-print-request-inbox-ai-queue-batch-formal-review.md)
- **Review date:** 2026-09-20
- **Reviewer:** Independent review agents Harvey, Epicurus, and final verifier Meitner; none authored the implementation workstreams
- **Verdict:** **APPROVE**

## Scope reviewed

The changed diff was reviewed against the approved Plan and Formal Review for:

- A/D adaptive label geometry, cache invalidation, preview/export parity, partial export selection, mixed sources, stale IDs, and non-mutation.
- B source-based cursors, cumulative maps, live inserts/updates/removals, fixed cursors, older-request hydration, stable ordering, and index changes.
- C selected-show scope, DTO privacy, response-scoped grouping, shared snapshot-first pricing, canceled/unpriceable totals, and accessible UI.
- E imported-only enqueue protection, lifecycle routing, cursor-aware sequential processing, empty filtered pages, stop/pause/retry/stale/terminal safeguards, and behavioral tests.

## Review findings and corrections

The initial independent review blocked on these issues:

1. Grouped/continuous heading inputs were missing from gang-sheet cache identity, and heuristic text width could under-measure wide/Unicode glyphs.
2. Staff Inbox live limited snapshots could evict already-loaded records while retaining a fixed cursor, causing skipped/disappearing rows.
3. Shared allocation pricing required item linkage before honoring a valid pricing snapshot, and Studio retained a duplicate pricing implementation.
4. AI queue tests were too contract-oriented for the requested behavioral safeguards.

Bounded corrections were then applied:

- Cache identity now includes normalized grouped/continuous request/customer heading inputs and the layout/font version; label metrics and grapheme-safe splitting were made conservative and tested with wide lowercase, Unicode, emoji, and minimum-size cases.
- Staff Inbox page reconciliation retains shifted rows until bounded source verification confirms true deletion/filter exit, while preserving cursor, dedupe, `hasMore`, and source hydration behavior.
- Shared pricing checks valid snapshots before item linkage and Studio delegates to the shared canonical helper.
- AI tests now execute multi-page traversal, empty filtered pages, pause/stop, retry, stale, terminal, and duplicate/concurrency safeguards.
- Studio’s allocation wrapper now honors a valid immutable pricing snapshot even when legacy width/height are absent; legacy fallback remains dimension-gated.

## Verdict and remaining gate

No material A–E code blocker remains. Final independent verification approved the corrected pricing wrapper and confirmed the earlier A/B/D/E corrections remain intact.

The remaining gate is operational/manual, not an implementation blocker:

- **Focused workstream checks:** reported passing by implementation agents.
- **Whole-scope Test phase:** not yet complete and must be run by the managing workflow.
- **Owner DEV QA:** pending after the Test report.
- **Signoff/deployment:** not authorized.

The implementation is approved to enter Test. This artifact does not claim whole-scope tests passed.
