# Formal Review: Studio / Portal Print Request, Inbox, and AI Queue Batch

- **Goal:** `studio-portal-print-request-inbox-ai-queue-batch`
- **Plan:** [2026-09-20-studio-portal-print-request-inbox-ai-queue-batch-plan.md](../plans/2026-09-20-studio-portal-print-request-inbox-ai-queue-batch-plan.md)
- **Review date:** 2026-09-20
- **Review type:** FreshForge formal plan review
- **Final verdict:** **APPROVE**
- **Implementation status:** Not started; not authorized
- **Production status:** Untouched

## Review evidence

The plan was reviewed read-only by two independent agents after the repository investigations. The primary formal reviewer was Helmholtz; the independent cross-check was Descartes. No reviewer edited files or changed workflow state.

Review sequence:

1. Initial review: **BLOCK** for inaccurate paths, unresolved Portal privacy/data semantics, underspecified B cursor behavior, incomplete E lifecycle routing, and missing accessibility/cache tests.
2. First amendment review: **APPROVE_WITH_CHANGES**, requiring direct parent-request hydration, removal of unsupported Portal `notes` search, exact shared pricing target, AI cursor hook coverage, and cache algorithm versioning.
3. Final review after amendment: **APPROVE** — no remaining material blockers.

## Scope verdict

The plan is bounded to five improvements:

- A: shared adaptive gang-sheet label layout with shrink-then-wrap behavior and export/preview parity.
- B: cursor-based incremental loading for Staff Inbox Open sources, stable ordering, source-map deduplication, live removal handling, and direct/batched request-context hydration beyond the old request cap.
- C: selected-show Portal Admin search, response-scoped customer grouping, server-computed request/show totals, and snapshot-first pricing without exposing raw customer identifiers.
- D: export-only whole-item selection for direct Print Request gang-sheet generation, preserving saved quantity/dimensions and making no Firestore/lifecycle mutation.
- E: explicit Staff Artwork AI lifecycle routing and cursor-aware sequential AI Processing beyond the initial 100-item page.

The plan explicitly excludes a new all-shows Portal manager, quantity editing from the partial-export modal, Manual Gang Sheet Builder changes, a durable ordinary AI worker, migrations/backfills, Rules changes, production actions, and release actions.

## Required plan corrections applied

- Corrected actual repository paths for `StaffInboxProvider`, shared Staff Inbox ordering, design-report history, the Functions contract test, and `staffArtworkService`.
- Confirmed A’s existing validated 20 px minimum; no new font setting is proposed.
- Added `gangSheetCacheFingerprint.ts` algorithm/font versioning and selected-layout inputs.
- Defined B’s source-specific cursor tuples, page sentinel behavior, cumulative maps, generation resets, live `removed` reconciliation, stable alert tie-breaker, `hasMore`, and older allocation-page direct/batched Print Request hydration.
- Defined C’s response-scoped non-reversible `customerGroupKey`; raw customer ID/email/username are not returned, unknown customers never merge, and search is limited to request ID/name/display-safe customer label. `notes` is explicitly excluded because it is not currently in the customer-safe DTO.
- Defined C’s `printRequestItems` chunk loading, saved quantity/dimension request pricing, active allocation snapshot-first pricing, legacy fallback, two-decimal USD rounding, null/unpriceable semantics, and exact shared utility target `packages/shared/src/utils/showAllocationDollarTotals.ts`.
- Added E’s lifecycle matrix for imported/pending, ready/approved, rejected, other non-imported, and terminal states; added `useDesigns.ts` cursor coordination and active-filter/no-match exhaustion coverage.
- Added accessibility, cache invalidation, stale selection, live pagination, DTO privacy, pricing, lifecycle, and cursor-crossing test requirements.

## Gate decision

The plan is complete for implementation planning, but owner approval is still required. The following exact phrase is the implementation checkpoint:

`APPROVE IMPLEMENTATION OF THE REVIEWED PLAN: studio-portal-print-request-inbox-ai-queue-batch`

Until that phrase is received:

- no application code may be implemented;
- no Firestore Rules/index/schema/data changes may be made;
- no Functions, Portal App Hosting, Studio, console, or production action may be performed;
- no release or production smoke-test claim may be made.

## Test status

No application tests were run because this phase produced only the plan and formal review artifacts. The plan requires focused tests, Studio/Portal/Functions builds, lint, `git diff --check`, and visual/accessibility QA during implementation. This is not a test-pass claim.

## Workflow disposition

- **Plan:** complete
- **Review:** approved
- **Implementation:** not started
- **Test:** not run
- **Signoff:** not applicable; implementation is awaiting owner approval
- **Next step:** owner responds with the exact implementation approval phrase, or requests a bounded amendment
