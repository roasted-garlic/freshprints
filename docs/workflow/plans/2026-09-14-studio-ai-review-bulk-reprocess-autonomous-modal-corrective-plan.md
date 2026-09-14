# Studio AI Review bulk reprocess and Autonomous modal corrective — plan amendment

Date: 2026-09-14
Phase: `studio-ai-review-reprocess-bulk-and-autonomous-modal-corrective`
Parent program: `smart-catalog-intelligence-completion-and-legacy-tag-retirement`

## Goal

Correct the rapid sequential Needs Review reprocess race and add a bounded `Reprocess Selected`
workflow using the existing AI Review multi-selection controller. Polish the existing Enable live
Autonomous confirmation modal without changing its authorization or exact typed-confirmation
contract. This phase is renderer-only and stops before any Studio release or production action.

## Proven root cause

The Needs Review rail is derived from `useDesigns` page/cache state plus local patches and live
document reconciliation. The existing successful reset path correctly patches the design to
`status=imported`, `aiReviewStatus=pending`, clears the live selection, and advances selection.
The later live-return tracking added by commit `60349719` subscribes to each reset design. Its first
snapshot can be the cached pre-reset document (`needs_review`); `resolveTrackedReprocessTerminal`
currently treats that status as a terminal return without an updated-at transition barrier. The
listener then upserts the stale document and re-adds a ghost row. Rapid actions amplify this because
the tracked-ID array recreates subscriptions and cached first emissions. A tab switch reloads the
authoritative query and hides the symptom.

## Existing paths to reuse

- Single action: `AiReviewPage` → `AiReviewWorkspace`/`AiReviewFormPanel` →
  `useAiReviewInbox.executeRerunToProcessing` → `aiReviewInboxService.rerunAiFromInbox` →
  `aiEnrichmentEnqueueService.resetForProcessing` → existing callable
  `resetAiEnrichmentForProcessing`.
- Selection: page-owned `isMultiSelectMode`, `multiSelectedIds`, anchor, range/toggle helpers,
  queue-card ARIA selection, and the existing multi-select action bar. No second selection system.

## Bounded implementation

1. Add a per-rerun freshness baseline to tracked return entries and ignore terminal snapshots at or
   before the pre-reset `updatedAt`; accept only a newer authoritative terminal return. Preserve
   fast legitimate completion even if the pending snapshot is not observed.
2. Factor a synchronous per-ID pending/duplicate guard and single-design reset primitive in the
   inbox hook. Keep backend authorization and status transition authoritative; reconcile locally
   only after callable success.
3. Add a pure serial bulk runner (concurrency 1) that deduplicates IDs, reports progress and
   per-ID failures, and invokes the same existing reset service. Revalidate selected designs as
   Needs Review-eligible immediately before each request. Successful IDs use patch-primary local
   reconciliation; failed IDs remain in the rail and remain inspectable. Bulk does not reuse the
   single-item advance ref per item; selection settles from the remaining current list.
4. Add `Reprocess Selected (N)` to the existing action bar only for eligible selected Needs Review
   designs. Preserve Header Auto and Auto Advance semantics.
5. Portal the Autonomous confirmation overlay to `document.body`, make the modal panel the direct
   flex child of the existing fixed overlay, preserve backdrop/keyboard/focus behavior, and add
   a scoped phrase row.
6. Add a real accessible Copy button using the authoritative shared
   `ENABLE_AUTONOMOUS_CONFIRMATION_PHRASE`, the existing Clipboard API/textarea fallback pattern,
   and temporary Copied feedback. Copy never changes the confirmation input.

## Files expected to change

- `apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts`
- `apps/studio/src/renderer/src/features/ai-review/utils/trackedReprocessReturn.ts` and tests
- `apps/studio/src/renderer/src/features/ai-review/utils/aiReviewBulkReprocess.ts` and tests
- `apps/studio/src/renderer/src/features/ai-review/pages/AiReviewPage.tsx`
- focused AI Review reconciliation/contract tests as required
- `apps/studio/src/renderer/src/features/settings/components/CatalogProcessingModeSettingsSection.tsx`
- `apps/studio/src/renderer/src/styles/components/settings.css` (scoped phrase-row styling only)
- focused modal contract test
- FreshForge workflow review/test/QA artifacts and state/handoff files

No Functions, callable, Rules, indexes, schemas, migrations, secrets, Portal, release, or
production files are expected to change.

## Test plan

- Freshness barrier: stale baseline ignored; newer terminal accepted; fast completion accepted.
- Rapid A/B/C sequential reprocess: no ghost reinsert, no duplicate counts, selection advances.
- Duplicate guard and serial bulk order/progress.
- Bulk all-success, partial failure, all-failure, failed-row/selection preservation, listener
  convergence.
- Existing stay-on-tab/no-reload/no-navigation and Header Auto/Auto Advance contracts.
- Modal portal/direct-child/centering source contract, resize/overlay behavior, focus/Escape,
  clipboard exact phrase, temporary feedback, no input autofill, exact enable guard.
- Targeted ESLint, Studio TypeScript, renderer/Vite build (documenting baseline failures), and
  `git diff --check`.

## Owner boundary

Implementation and automated validation may continue automatically after Formal Review. Manual DEV
QA remains required. Do not publish Studio 1.0.12, mutate published 1.0.11, deploy production, or
change Autonomous/Pass 2 settings.
