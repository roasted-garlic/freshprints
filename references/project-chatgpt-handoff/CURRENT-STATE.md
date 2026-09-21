# Fresh Prints — Current State Snapshot

## CURRENT AUTHORITATIVE PHASE — SIGNOFF COMPLETE, PRODUCTION ROLLOUT IN PROGRESS

**Last updated:** 2026-09-21

Managed goal `studio-portal-print-request-inbox-ai-queue-batch` has Owner DEV QA **PASS** and FreshForge Signoff **approved_with_notes**. The owner explicitly authorized the full coordinated production rollout; candidate freeze and rollout closeout are in progress.

| Field | Value |
|------|-------|
| Plan | `docs/workflow/plans/2026-09-20-studio-portal-print-request-inbox-ai-queue-batch-plan.md` |
| Formal review | `docs/workflow/reviews/2026-09-20-studio-portal-print-request-inbox-ai-queue-batch-formal-review.md` |
| Implementation review | `docs/workflow/reviews/2026-09-20-studio-portal-print-request-inbox-ai-queue-batch-implementation-review.md` |
| Test report | `docs/workflow/reviews/2026-09-20-studio-portal-print-request-inbox-ai-queue-batch-test-report.md` |
| Review verdict | **Plan APPROVED**; Implementation Review **APPROVED** |
| Implementation | **Complete** for A/B/C/D/E |
| Tests | **PASSED_WITH_NOTES** — focused suites/typechecks/builds passed; Portal `.next/trace` EPERM and unrelated root-lint baseline documented |
| Human checkpoint | **Cleared** — Owner DEV QA PASS plus explicit authorization for Signoff and the full coordinated rollout |
| Required approval phrase | Received: `APPROVE IMPLEMENTATION OF THE REVIEWED PLAN: studio-portal-print-request-inbox-ai-queue-batch` |
| Signoff | `docs/workflow/reviews/2026-09-21-studio-portal-print-request-inbox-ai-queue-batch-signoff.md` — **approved_with_notes** |
| Production / release | **In progress from the exact protected candidate; no unrelated worktree changes included** |

The batch covers adaptive gang-sheet labels, Staff Inbox pagination, selected-show Portal Admin search/totals/grouping, partial Print Request gang-sheet export, and AI enqueue/queue-pagination corrections. Implementation Review found and corrected live pagination, cache, pricing, and behavioral-test issues. Owner DEV QA reports the complete manual QA looks great. The production manifest is limited to the reviewed Studio/Portal/Functions surfaces and four additive Staff Inbox indexes; Rules, Storage Rules, schema/data changes, secrets, IAM, migrations, backfills, and unrelated local changes remain excluded.

## PREVIOUS CLOSED GOAL — STAFF ARTWORK AI TITLE CORRECTIVE

### Shipped

| Item | Value |
|------|-------|
| Goal commit | `4f9732ad032d131f8e10a2bfa6aa72dbfa1d7c25` |
| PR | #105 |
| Production SHA | `9c7e4da8922a2413abb73d609b6f82ce6af3e249` |
| Rollback SHA | `e6e90cdd14ea6a0d468c54412c195fa7a689823e` |
| Studio | **v1.0.17** (release `392226823`) |
| Functions | `enqueueAiEnrichment`, `reprocessReadyDesignWithAi`, `onCatalogReprocessJobWritten`, `promoteStaffArtworkToAiReview`, `createStaffArtworkUpload`, `updateStaffArtwork` |

### Proven root cause (preserved)

1. Correct AI title lived in `aiSuggestions.title`; wrong title in canonical `designs.title`.
2. Catalog autonomy trusted mis-stamped `catalogTitleSource: "staff"` hex/placeholder roots.
3. `finalCatalogFields` could overwrite Staff-origin helper writes.
4. Earlier **119/119** local PASS did not prove the deployed runtime path (Functions were stale on DEV).

### Explicitly not done

Legacy Staff Artwork reconciliation/backfill was **never** run. Portal was not redeployed. Rules and Storage Rules were unchanged.

Artifacts: `docs/workflow/plans/2026-09-19-studio-staff-artwork-ai-review-corrective-plan.md` and matching reviews/signoff under `docs/workflow/reviews/`.

## PREVIOUS — STUDIO INTAKE PROMOTION REVERSAL — CLOSED

**Last updated:** 2026-09-18

Goal `studio-intake-review-efficiency-and-customer-upload-promotion-reversal` closed via PR **#104** / production `e6e90cdd` / Studio **v1.0.16**.
