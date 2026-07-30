# Portal Print Request Pre-Launch Stability — Amendment 11 Test Report

- **Date:** 2026-07-28
- **Scope:** Plan Section 29 / Amendment 11
- **Deployment:** none required; client-only implementation (Studio + Portal + shared packages)

## Implemented behavior

1. **Workstream A (write requirement) — answered from exhaustive audit, no code change needed:**
   `printRequests.status = "completed"` is confirmed genuinely load-bearing (Studio add-to-show
   picker exclusion, print-request detail edit-lock, the persisted `queueTab` mirror Studio's list
   actually queries by, and deletion/archival/upload-purge eligibility). The write and its retry UI
   are retained, not removed.
2. **Workstream A (29.3) — diagnostic extension:** a new `diagnosePrintRequestAssignmentInvariant`
   function (`apps/studio/.../utils/printRequestCompletionDiagnostics.ts`) mirrors
   `firestore.rules`' cross-field assignment invariant exactly (read-only, no write/Rules/behavior
   change). `getPrintRequestForShowReconciliation` now surfaces this as a remediation condition
   (not a retryable failure) when detected, and the field is threaded through
   `ShowCompletionReconciliationRemediationError`/`ShowCompletionReconciliationResult`/the retry
   manifest, so the next live retry attempt can prove or rule out this specific hypothesis instead
   of another diagnostic round.
3. **Workstream B (29.4) — show-selection-loss fix:** a new pure function
   `resolveScheduleTabForStillExistingSelection` (`packages/shared/src/utils/showScheduleGrouping.ts`)
   detects when the currently selected show has reclassified out of the active schedule tab purely
   due to time passing (not owner navigation), and `UpcomingShowsPage.tsx` now auto-switches the
   active tab to preserve that selection instead of silently falling back to a different show —
   closing the root cause of the Retry button appearing inert (the whole timer panel, including its
   warning and Retry button, was being swapped out from under the owner).
4. **Workstream C — invalid record correlation:** confirmed by direct trace that the
   "excluded invalid production record" warnings are structurally scoped only to
   `showAllocations`/`upcomingShows` documents, never `printRequests` — no correlation exists by
   construction; no code change required beyond the 29.3 diagnostic extension.
5. **Workstream D (29.6) — historical default inspection and copy:** `resolveShowPickerSelection`
   now returns an `autoInspectId` when a date has no allocatable destination and exactly one
   inspectable show (never guessed among multiple); `ShowPicker.tsx` auto-inspects that show
   instead of requiring a second click. Customer-facing copy corrected at both sites
   (`PortalQueueToShowModal.tsx`'s rendered callout and `ShowPicker.tsx`'s `aria-description`) —
   "read-only" language fully removed from customer-facing output. `portalPersonalShowUsage.ts` now
   omits the remaining-spots line for a non-allocatable (historical/full/past) show while keeping
   the used-count line, closing the "implies remaining capacity" defect.

## Verification (independently re-run and confirmed twice — once directly, once by Implementation Review 13)

| Command | Result |
|---|---:|
| `npx tsc -v` | 5.9.3 |
| Focused Amendment 11 suite (10 files) | exit 0; 80/80 pass |
| Full goal regression suite (16 files spanning all prior amendments) | exit 0; 138/138 pass |
| Portal typecheck | exit 0 |
| Portal build | exit 0; 19/19 pages |
| Studio build | exit 2; unchanged 29-error baseline, none in touched files |
| Repository lint | exit 1; unchanged 41 findings (31 errors, 10 warnings), none in touched files |
| `git diff --check` | exit 0 |
| Rules suite | not run: no Rules were changed by this amendment; not required |

No changed-line lint error remains. No TypeScript setting or lint rule was weakened. No Function,
Rules, migration, or production action occurred.

**Independent Implementation Review 13**
(`docs/workflow/reviews/2026-07-28-portal-print-request-prelaunch-stability-implementation-review-13.md`):
**`APPROVED`** — did not defer to the Formal Review's approval, independently re-verified all three
workstreams against current source, ran the full verification matrix directly (218 tests total
across the combined focused + regression suites), and confirmed zero regression to Amendment 10's
retry-concurrency-safety/remediation-success/composed-test/`isSelectable`-removal fixes.

## Evidence checkpoint (unchanged in substance from Amendment 10)

The unresolved write remains exactly:

```text
updateDoc printRequests/{printRequestId}
fields: status=completed, updatedBy, updatedAt
```

The diagnostic can now additionally report whether the document fails the exact cross-field
assignment invariant Rules enforce. This does not yet prove the live cause — that still requires one
live retry reproduction. The show-selection-loss fix that made the Retry button appear inert is
resolved at the source level; only a live QA pass can confirm it holds under real React
scheduling/refresh timing, which is the residual gap Implementation Review 13 explicitly flags as
unavoidable from source review alone.
