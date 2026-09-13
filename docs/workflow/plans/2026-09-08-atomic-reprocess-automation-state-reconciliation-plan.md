# Corrective Plan — Atomic Reprocess Automation-State Reconciliation

| Field | Value |
|---|---|
| Date | 2026-09-08 |
| Parent | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Child | `explicit-content-stale-state-and-smart-profile-terms-corrective` |
| Environment | DEV source planning only |
| Review type | Plan + Formal Review; implementation authorized by owner amendment |
| Production | Not in scope |

## Goal and invariant

Every AI reprocess must follow one lifecycle:

```text
preserve prior persisted AI/automation state
  -> stage only operational processing state
  -> compute a complete candidate
  -> atomically reconcile automation-owned state on success
```

The implementation must satisfy both sides of the invariant:

- A provider, parser, validation, settings, or pipeline failure must not erase
  the last successful AI/automation result.
- A valid successful result must replace current replace-on-success fields and
  deliberately clear omitted automation-owned fields. Staff, import-preset,
  catalog, Explicit-lock, and other human authority must remain intact.

This is a persistence/lifecycle corrective. It does not change Pass 1
semantics, provider selection, prompts, category policy, Explicit vocabulary,
Pass 2, tag retirement, or Autonomous settings.

## Mechanically confirmed current defect

The following existing paths destructively clear AI output before the pipeline
can succeed:

| Entry point | Current destructive staging | Later pipeline |
|---|---|---|
| `resetAiEnrichmentForProcessing.ts` | Deletes `aiSuggestions`, `aiAnalysis`, `smartProfile`, review notes, and confidence. | Studio calls enqueue afterward. |
| `enqueueAiEnrichment.ts` | Deletes `aiSuggestions`, `aiAnalysis`, review actor/notes, and confidence before direct pipeline execution. | `runAiEnrichmentPipeline(..., mode: "queue")`. |
| `ai/reprocessReadyDesignWithAiCore.ts` | Deletes `aiSuggestions`, `aiAnalysis`, review actor/notes, and confidence. | Owner callable invokes queue pipeline. |
| `catalogReprocess/catalogReprocessAiClear.ts` | AI Review Queue mode deletes AI blobs including `smartProfile` and notes. | Catalog worker invokes queue pipeline. |
| `catalogReprocess/catalogReprocessAiClear.ts` | Ready Catalog mode deletes suggestions, analysis, and confidence. | Catalog worker invokes `ready_backfill`. |

`aiEnrichmentPipeline.ts:markAiFailure` then writes an error-shaped
`aiSuggestions` map and does not restore any pre-cleared output.

Separately, a valid `developmentAiEnrichmentProvider` result does not include
`analysis.smartProfileEnrichmentParse`. The candidate therefore omits
`smartProfile`, skips the current Explicit classification guard, and success
persistence conditionally omits the old Smart Profile, snapshot, provenance,
preview, category-gap evidence, and automation-owned Explicit root fields.

## Architecture comparison

### Option A — preserve current result until success (recommended)

Change each staging payload to update only the operational fields required to
enter Processing. Keep prior AI/automation maps and human-owned fields in the
document while the new attempt runs. On success, one `designs/{id}` update
reconciles the current candidate. On failure, update only failure metadata and
processing lifecycle.

Benefits:

- Directly satisfies non-destructive failure without a snapshot or restore job.
- Makes the existing `markAiSuccess` boundary the single replacement point.
- Avoids large duplicate snapshots and crash recovery for temporary state.
- Works for normal enqueue, review reset, Ready reprocess, AI Review Queue, and
  Ready Catalog backfill.

Costs/controls:

- The UI must distinguish retained prior output from the active attempt using
  processing stage/attempt metadata.
- Success must explicitly delete omitted replace-on-success fields rather than
  relying on prior staging deletes.
- Stale worker writes require a persisted attempt identity and guarded stage/
  success/failure writes.

### Option B — snapshot before destructive staging

Write an exact previous-state snapshot before each existing clear, restore it
on failure, and discard it on success.

Rejected for this corrective because it duplicates large nested AI maps,
creates crash/orphan recovery work, makes concurrent attempts harder to reason
about, and still requires a complete success omission reconciliation contract.
It also risks retaining a snapshot after a stale worker finishes out of order.

### Option C — new job framework or alternate persistence store

Not justified. Existing callables, catalog job leases, pipeline invocation
traces, and `aiProcessingStage` provide the required execution surfaces. A new
job framework would expand scope without solving the field-ownership problem.

## Chosen architecture

Use Option A across all five reprocess classes. Centralize the persistence
contract in the existing Functions pipeline and make every entrypoint call the
same attempt-aware staging/pipeline boundary.

Implementation should add a persisted run/attempt identity to the design
processing lifecycle only if the current code audit confirms no existing field
can safely serve it. The identity must be generated at staging, passed through
`runAiEnrichmentPipeline`, and checked before stage, failure, and success writes.
Do not create a second job queue. A stale completion must become a no-op for
design output and lifecycle rather than overwriting a newer attempt.

## Field ownership and reconciliation contract

| Field/group | Owner | While Processing | On successful current result | On omission | On failure |
|---|---|---|---|---|---|
| `aiSuggestions.title`, `description`, provider/model/prompt/version/cost metadata | AI, replace-on-success | Preserve prior map; mark attempt active. | Replace the entire sanitized map. | Delete omitted replace-on-success keys; do not merge old optional values. | Preserve prior map; record failure separately. |
| `aiSuggestions.categoryId/categoryName` | AI exact category suggestion | Preserve. | Replace with exact active-category resolution. | Clear from the new map when unresolved. | Preserve prior map. |
| Root `design.categoryId` | Human/catalog authority | Never change. | Never change in Pass 1 reprocess. | Not applicable. | Never change. |
| `aiAnalysis.visibleText`, VCP, current metadata | AI, replace-on-success | Preserve. | Replace the sanitized current analysis map. | Clear omitted replace-on-success keys. | Preserve prior map. |
| Smart Profile dimensions | AI merged with import/staff authority | Preserve prior effective profile. | Build current AI profile, merge import presets and staff-edited dimensions, then replace the effective profile. | Omitted dimensions clear from the AI side; import/staff values and explicit staff removals remain authoritative. | Preserve prior profile. |
| Smart Profile category, alternatives, gap evidence | AI/current enrichment evidence | Preserve. | Replace from current successful profile. | Clear when a current profile is successfully written without them. | Preserve. |
| Smart Profile provenance, automation decision, Explicit preview | AI provenance with human suppression | Preserve. | Replace current provenance after authority application. | Clear stale current-run provenance/preview when the successful contract says no profile/preview. | Preserve. |
| `smartProfileAiSnapshot` | Functions-owned raw AI baseline | Preserve. | Replace with the current raw AI dimension snapshot when a profile exists. | Explicitly clear when a valid successful result has no profile, unless the final reviewed fallback contract says otherwise. | Preserve. |
| Explicit root fields | Automation merged with staff/lock authority | Preserve. | Positive match replaces automation-owned terms; successful no-match clears only prior automation-owned root fields; staff, locked, and unknown-source legacy records remain protected. | Explicit classification must be evaluated independently of Smart Profile when artwork evidence/settings are available. | Preserve prior Explicit fields; settings failure remains fail-closed. |
| Explicit preview | AI provenance/observability | Preserve. | Replace with the current classifier result after human authority. | Clear stale preview when the successful result has no current preview/profile. | Preserve. |
| `aiReviewConfidence` | Current AI review metadata | Preserve during attempt. | Write current confidence when supplied. | Delete old confidence when a successful result omits it. | Preserve old confidence unless owner decides review metadata is reset. |
| `aiReviewVersion` | Current AI review metadata | Preserve during attempt. | Write current version when supplied. | Delete old version when replace-on-success semantics require it. | Preserve old version unless owner decides review metadata is reset. |
| `aiReviewStatus`, `aiReviewed`, `aiProcessed`, processing stage | Lifecycle/system authority | Apply existing mode-specific Processing state and attempt identity. | Set the existing success terminal state. | Not an AI map omission. | Set failed lifecycle truthfully without deleting prior AI maps. |
| `aiReviewNotes`, approval actor/timestamps | Human/lifecycle authority | Preserve throughout staging. | Fresh-review success clears prior current-review notes/approval actor/timestamps; Ready Catalog backfill preserves them. | Not applicable. | Preserve prior values. |
| Retired AI tag fields / `design.tags` | Retired compatibility / staff authority | Preserve existing `design.tags`; do not reactivate AI tags. | Strip retired nested AI fields from the new `aiSuggestions` map; do not rewrite staff tags. | Clear retired fields from successful replacement map only. | Preserve prior map and staff tags. |
| Failure diagnostic | Operational system metadata | Clear prior attempt error when a new attempt starts. | Delete/resolve the current attempt failure marker. | Not applicable. | Write separate failure metadata so the prior `aiSuggestions`/`aiAnalysis` remain readable. |

The later implementation must update the documented data/type/UI read path for
separate failure metadata; putting a new error object into `aiSuggestions`
would violate the replacement and failure-preservation contract.

## Development fallback/no-Smart-Profile contract

The current development fallback is a valid successful enrichment result, so
this plan does not silently change provider validity or add a provider call.
Formal Review must confirm the following explicit behavior:

- A valid no-Smart-Profile result still replaces `aiSuggestions` and
  `aiAnalysis` on success.
- The old `smartProfile`, `smartProfileAiSnapshot`, category evidence,
  provenance, and Explicit preview are not allowed to survive merely because
  the new result omitted the profile.
- Explicit classification must run from its required current artwork evidence
  and settings independently of Smart Profile construction. A no-match clears
  prior automation-owned Explicit root fields under ADR-FP-173; a match writes
  current terms; settings failure preserves prior root fields.
- `smartProfileAiSnapshot` and profile-owned provenance are explicitly deleted
  on successful no-profile output unless Formal Review establishes a narrower
  compatibility exception.

If implementation discovers that a provider result without Smart Profile is
not semantically valid for production enrichment, that is a separate provider
contract decision. It must not be inferred during persistence implementation.

## Reprocess entrypoint parity

All entrypoints must use the same state-safety contract:

1. Normal AI Processing / `enqueueAiEnrichment`.
2. AI Review `resetAiEnrichmentForProcessing` followed by enqueue.
3. Owner Ready-design `reprocessReadyDesignWithAi`.
4. Catalog reprocess `ai_review_queue` mode.
5. Ready Catalog `ready_catalog` backfill mode.

Queue mode may continue its existing `imported` + `pending` lifecycle and
Ready backfill must continue to preserve `ready` + `approved`, `readyAt`, and
approval audit metadata. The difference is lifecycle-only; none may delete
current AI maps before success.

## Concurrency, retry, and idempotency contract

The current invocation UUID is used for traces but is not persisted on the
design, and `updateAiProcessingStage` is unconditional. The implementation
must therefore:

- persist one attempt/run identity at the point the design enters queued;
- pass that identity to stage updates, candidate persistence, failure writes,
  and direct-call response reconciliation;
- guard each terminal write so a stale worker cannot overwrite a newer attempt;
- retain the existing active-stage/stale-stage eligibility rules;
- make duplicate enqueue/retry calls idempotent for the current attempt;
- keep catalog worker lease/job identity separate from the design attempt while
  associating the worker call with the same design attempt;
- preserve Ready Catalog lifecycle on failure and success;
- treat retry/duplicate trigger delivery as safe re-entry, not permission to
  clear current output;
- avoid a destructive migration or bulk backfill.

Firestore transaction/batch boundaries must be verified during implementation.
The final success reconciliation should be one guarded design-document update
for all automation-owned fields and terminal lifecycle fields. If Firestore
cannot conditionally update on the attempt identity with the current API
shape, use a transaction that rereads the design and no-ops when the attempt
is no longer current.

## Exact implementation scope for a later authorized phase

Expected runtime/type/UI files to inspect and modify only as justified:

- `functions/src/resetAiEnrichmentForProcessing.ts`
- `functions/src/enqueueAiEnrichment.ts`
- `functions/src/reprocessReadyDesignWithAi.ts`
- `functions/src/ai/reprocessReadyDesignWithAiCore.ts`
- `functions/src/catalogReprocess/catalogReprocessAiClear.ts`
- `functions/src/catalogReprocess/catalogReprocessWorker.ts`
- `functions/src/ai/designAiFields.ts`
- `functions/src/ai/aiEnrichmentCandidateCore.ts`
- `functions/src/ai/aiEnrichmentPipeline.ts`
- `functions/src/ai/providers/developmentAiEnrichmentProvider.ts` only if the
  reviewed fallback contract requires an explicit parse marker; no provider
  behavior change is authorized by this Plan alone.
- `functions/src/ai/simpleCatalogEnrichmentResponse.ts` only if needed to make
  the current structured success contract explicit.
- `functions/src/ai/smartProfileEnrichmentWrite.ts`
- `packages/shared/src/utils/smartProfileStaffEdit.ts`
- `packages/shared/src/utils/smartProfileImportPresets.ts`
- shared/Studio AI processing and design types/mappers/status display needed to
  read separate failure metadata without treating retained output as current.
- `docs/architecture/DATA_MODEL.md` and `docs/WORKFLOWS.md` for the accepted
  persistence/lifecycle contract.
- `docs/project/DECISIONS.md` for the accepted ADR amendment.

Do not modify prompts, model/provider selection, category governance, Explicit
vocabulary, Pass 2, Autonomous settings, tags, Portal, Rules, indexes,
migrations, Node runtime, or Firebase dependencies.

## Required regression matrix

Tests must cover pure update builders, pipeline persistence, and materially
distinct entrypoint wiring:

### Failure preservation

- Queue enqueue: old successful AI state → attempt → provider failure.
- Review reset + enqueue: old AI state → attempt → failure.
- Owner Ready reprocess: old Ready state → attempt → failure; Ready lifecycle
  and approval audit remain safe.
- Catalog AI Review Queue worker: old state → failure; worker records outcome.
- Ready Catalog backfill: old Ready state → failure; status/review/readyAt and
  prior AI state remain safe.

### Successful replacement and omission

- Result A → result B replaces title, description, provider, model, version,
  analysis, and category suggestion.
- Optional fields present in A but omitted in B are cleared on success.
- Old confidence → successful result without confidence clears old confidence.
- Retired AI tag fields do not return; staff `design.tags` is untouched.

### Smart Profile authority

- Current dimensions are replaced when AI writes a new profile.
- Import presets remain present.
- Staff-edited dimensions remain present.
- Staff-cleared dimensions are not resurrected.
- Category alternatives and gap evidence from A do not survive a successful B
  omission.
- Snapshot is replaced on profile success and cleared on reviewed no-profile
  success.
- Failed attempts preserve profile and snapshot.

### Explicit

- Automation A → successful no-match clears automation-owned root fields.
- Automation A → automation B replaces terms.
- Staff-owned, locked, and unknown-source legacy records remain unchanged.
- Settings failure preserves prior Explicit state.
- No-Smart-Profile success still performs the reviewed Explicit reconciliation.

### Attempt ordering and lifecycle

- Stale worker completion cannot overwrite a newer attempt.
- Duplicate delivery is idempotent.
- Failure metadata is separate from retained prior AI maps.
- Queue and Ready backfill lifecycle contracts remain distinct.
- Review-note/approval metadata tests are added only after the owner decision
  below is recorded.

## Owner decision amendment — resolved

The owner resolved the prior ambiguity and authorized implementation. Review
notes and approval audit metadata are preserved during staging and on every
failure. For queue/reset flows and Ready-design reprocesses that intentionally
start a fresh review cycle, the prior current-review notes and approval
actor/timestamp fields are cleared only inside the guarded successful
reconciliation, alongside the new review lifecycle. Ready Catalog backfill
preserves those fields on both success and failure because it remains
`ready` + `approved` maintenance. No historical audit subsystem is added.

Additional review fields discovered during implementation must map to this
contract mechanically; otherwise implementation stops at a new owner decision
marker rather than guessing.

Owner authorization marker:

`[NEEDS OWNER AUTHORIZATION: IMPLEMENT ATOMIC REPROCESS AUTOMATION-STATE RECONCILIATION]`

## Safety boundary

This phase performs no runtime implementation, provider call, live AI QA,
settings mutation, vocabulary mutation, deployment, migration, commit, push,
Autonomous enablement, Pass 2 activation, or production action.
