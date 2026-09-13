# Implementation Review — Atomic Reprocess Automation-State Reconciliation

| Field | Value |
|---|---|
| Date | 2026-09-08 |
| Plan | `docs/workflow/plans/2026-09-08-atomic-reprocess-automation-state-reconciliation-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-08-atomic-reprocess-automation-state-reconciliation-review.md` |
| Checkout | `development`; existing working tree preserved |
| Implementation status | **Complete locally and deployed to DEV** |
| DEV deployment | **Complete for exactly the four authorized Functions; Owner QA passed** |
| Provider calls | 0 |
| Settings/vocabulary mutation | 0 |
| Commit/push | 0 |
| Production | untouched |

## Result

The owner-authorized Option A implementation is complete locally and is now
deployed to DEV. All five
reprocess entrypoint classes now stage operational state without pre-clearing
the last successful AI result. A persisted `aiProcessingAttemptId` is passed
through the pipeline and guards stage, failure, and success writes. Successful
output is reconciled in one guarded transaction; stale attempts no-op.

Failure diagnostics are stored separately in `aiProcessingError`. Existing
`aiSuggestions`, `aiAnalysis`, Smart Profile, confidence, and review context
remain available on failure. Successful queue-mode fresh review clears prior
review notes and prior approval audit only inside the guarded success path, then
applies the new lifecycle. Auto-approved success retains its new system actor
and timestamp. Ready Catalog backfill preserves `ready` + `approved` and its
approval audit on success and failure.

Explicit classification now runs independently of Smart Profile construction.
Successful no-match/omission paths clear current automation-owned state while
staff, locked, unknown-source, import-preset, and root catalog authority remain
protected. Successful omitted confidence/version and profile-owned snapshots are
explicitly cleared; failures preserve them.

## Implementation inventory

Runtime and type changes are limited to the approved persistence boundary:

- `functions/src/resetAiEnrichmentForProcessing.ts`
- `functions/src/enqueueAiEnrichment.ts`
- `functions/src/reprocessReadyDesignWithAi.ts`
- `functions/src/ai/reprocessReadyDesignWithAiCore.ts`
- `functions/src/catalogReprocess/catalogReprocessAiClear.ts`
- `functions/src/catalogReprocess/catalogReprocessWorker.ts`
- `functions/src/ai/designAiFields.ts`
- `functions/src/ai/aiEnrichmentPipeline.ts`
- `functions/src/ai/aiEnrichmentCandidateCore.ts`
- `functions/src/ai/aiEnrichmentRuntimeCache.ts`
- `functions/src/ai/smartProfileEnrichmentWrite.ts`
- `packages/shared/src/types/ai/aiProcessing.types.ts`
- Studio processing output/status and design AI-field mapping/types needed to
  distinguish retained output from separate failure metadata.

Regression coverage was added or amended for staging preservation, failure
metadata, attempt guards, Ready lifecycle preservation, Smart Profile staff /
import authority, no-profile fallback, and independent Explicit wiring.

Durable documentation was updated in `DATA_MODEL.md`, `WORKFLOWS.md`, and
`ADR-FP-183` in `docs/project/DECISIONS.md`.

## Validation evidence

| Check | Result |
|---|---|
| Functions TypeScript build (`functions/npm run build`) | **PASS** |
| Focused Functions tests | **PASS — 38 / 38** |
| Focused Studio AI processing/reconciliation tests | **PASS — 78 / 78** |
| Targeted ESLint on atomic runtime/type/test files | **PASS** |
| `git diff --check` | **PASS** |
| Full Studio build | **BLOCKED by existing unrelated TypeScript errors** |

The Studio build reached TypeScript compilation but did not complete. Reported
errors include pre-existing/unrelated errors in PNG validation, export tests,
companion helpers, print-request services, staff inbox, upcoming shows, and
shared test fixtures. It also reports existing working-tree errors in
`useAiReviewInbox.ts` and the prior Explicit corrective test fixtures. No error
was reported in the focused atomic Studio tests or the Functions build.

## DEV deployment verification

The authorized Firebase command targeted exactly these four Functions. The CLI
timed out after two minutes without returning its normal summary, so deployment
completion was verified read-only through Firebase Functions listing and Cloud
Run service state. No deletion proposal appeared.

| Function | State | Revision | Source hash | Project / region | Runtime | Newest traffic |
|---|---|---|---|---|---|---:|
| `enqueueAiEnrichment` | ACTIVE | `enqueueaienrichment-00118-hoc` | `157d0398af52d92709775c9b824a8d33f0f37e2c` | `fresh-prints-dev` / `us-central1` | `nodejs20` | 100% |
| `resetAiEnrichmentForProcessing` | ACTIVE | `resetaienrichmentforprocessing-00047-kip` | `8422e3f5d23fb619be61d9cfbebd1cf86eebb8cc` | `fresh-prints-dev` / `us-central1` | `nodejs20` | 100% |
| `reprocessReadyDesignWithAi` | ACTIVE | `reprocessreadydesignwithai-00024-wuz` | `157d0398af52d92709775c9b824a8d33f0f37e2c` | `fresh-prints-dev` / `us-central1` | `nodejs20` | 100% |
| `onCatalogReprocessJobWritten` | ACTIVE | `oncatalogreprocessjobwritten-00030-kav` | `157d0398af52d92709775c9b824a8d33f0f37e2c` | `fresh-prints-dev` / `us-central1` | `nodejs20` | 100% |

Deployment boundary verification:

- Exactly four authorized Functions deployed: **YES**.
- Unauthorized Functions deployed: **NO**.
- Function deletions: **NO**.
- Firestore Rules, Storage Rules, indexes, migrations, settings, Explicit
  vocabulary, secrets, Algolia, Portal, Studio installer/publish, and
  production: **unchanged / untouched**.
- Provider calls by Codex: **0**.
- Commit/push: **NO**.

`onCatalogReprocessJobWritten` is the catalog worker trigger and carries the
AI Review Queue and Ready Catalog worker changes. No Studio deployment,
settings update, Rules/index update, migration, Node runtime upgrade,
Firebase dependency upgrade, Autonomous enablement, or Pass 2 activation was
included.

## Owner QA procedure after DEV authorization

1. Verify only the four Functions above are deployed to `fresh-prints-dev` and
   record revision, runtime, traffic, and source hash. Confirm no settings or
   vocabulary mutation.
2. Select a Needs Review design with known prior suggestions, analysis, Smart
   Profile, confidence, and review notes. Start **Re-run AI Suggestions** and
   confirm the active Processing stage changes immediately while the prior
   fields remain in Firestore and the UI does not present them as current.
3. Exercise a controlled failure (for example a fixture with no usable preview)
   and confirm `aiProcessingStage: failed`, a matching `aiProcessingError`, and
   unchanged prior AI maps/profile/confidence/review context.
4. Reprocess the same design successfully. Confirm the new suggestions and
   analysis replace the old values, omitted optional values do not survive,
   prior fresh-review notes/approval audit are cleared, and the resulting
   lifecycle is `imported` + `needs_review` unless the separately enabled
   catalog policy explicitly auto-approves it.
5. Trigger multiple eligible designs back-to-back. Confirm each receives a
   distinct attempt, no stale completion changes a newer attempt, and each
   list updates after its own terminal result without a stuck “Sending…” state.
6. Use the owner Ready-design reprocess and Ready Catalog backfill paths. Confirm
   `status: ready`, `aiReviewStatus: approved`, `readyAt`, approval actor/time,
   and notes remain intact for Ready backfill on both success and failure.
7. Verify a successful current no-match Explicit result clears only prior
   automation-owned Explicit state, while staff-owned/locked/unknown-source
   records remain unchanged. Confirm the Smart Profile remains independently
   visible and its durable human/import terms are retained.

Live AI/provider QA is intentionally not performed by this deployment turn.

## Owner DEV QA

| Checkpoint | Result | Approved by |
|---|---|---|
| Atomic reprocess automation-state reconciliation DEV QA | **PASS** | Owner, 2026-09-08 |

This records the owner-provided QA result. Codex did not perform additional
live provider-backed QA.

## Next checkpoint

Signoff approved; production remains untouched and requires a separate authorization.
