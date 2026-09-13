# Formal Review — Atomic Reprocess Automation-State Reconciliation

| Field | Value |
|---|---|
| Date | 2026-09-08 |
| Plan | `docs/workflow/plans/2026-09-08-atomic-reprocess-automation-state-reconciliation-plan.md` |
| Review type | Plan + Formal Review followed by owner-authorized implementation |
| Checkout | `development`; existing working tree preserved |
| Verdict | **approved; owner lifecycle decision resolved; implementation authorized** |
| Implementation | **Authorized by owner amendment; implementation phase now active** |

## Review boundary

This review validates the proposed architecture and implementation scope. The
original review boundary did not authorize runtime code changes, provider calls,
live AI QA, settings mutation, Explicit vocabulary mutation, deployment,
migration, commit, push, Autonomous enablement, Pass 2 activation, or production
action. The owner amendment below subsequently authorized the implementation
phase; DEV deployment remains separately gated.

The previously deployed Explicit corrective remains a historical DEV fact. The
post-deploy audit established that it does not by itself satisfy atomic
reprocess state safety.

## Executive verdict

Option A — preserve the current persisted AI/automation result until a valid
new candidate succeeds — is the smallest safe architecture. Option B would
duplicate nested state and add crash/orphan restore behavior without removing
the need for a complete success reconciliation contract. A new job framework is
not justified by the evidence.

The plan is approved at the architecture level with these non-negotiable
constraints:

1. No reprocess entrypoint may delete current AI/automation output before
   candidate success.
2. Success must reconcile the entire current automation-owned contract,
   including deliberate clearing for omitted replace-on-success fields.
3. Explicit classification must not depend on Smart Profile object existence
   when the required current evidence/settings are available.
4. Import presets, staff-edited Smart Profile dimensions, explicit staff
   removals, root catalog category, Explicit locks, staff Explicit ownership,
   and unknown-source legacy protection remain authoritative.
5. A persisted attempt identity or equivalent guarded transaction must prevent
   stale workers from overwriting newer attempts.
6. Failure diagnostics must be separate from retained `aiSuggestions` and
   `aiAnalysis`; writing an error-shaped replacement map would violate the
   invariant.
7. Review notes and approval audit are preserved during staging/failure,
   cleared only on successful fresh-review reconciliation, and preserved for
   Ready Catalog backfill.

## Evidence reviewed

| Finding | Evidence | Review result |
|---|---|---|
| Pre-success destructive clears | `resetAiEnrichmentForProcessing.ts:74-90`, `enqueueAiEnrichment.ts:153-202`, `reprocessReadyDesignWithAiCore.ts:53-77`, `catalogReprocessAiClear.ts:12-46` | Confirmed. Remove from later implementation staging. |
| Failure does not restore state | `aiEnrichmentPipeline.ts:59-94` | Confirmed. Failure must write separate metadata. |
| No-profile successful fallback | `developmentAiEnrichmentProvider.ts`; `aiEnrichmentCandidateCore.ts:159-188` | Confirmed valid current result can omit Smart Profile. |
| Conditional profile/Explicit persistence | `aiEnrichmentPipeline.ts:166-208, 256-348`; `aiEnrichmentCandidateCore.ts:257-321` | Confirmed stale omission path. |
| Staff/import Smart Profile authority | `smartProfileEnrichmentWrite.ts`; `packages/shared/src/utils/smartProfileStaffEdit.ts`; `smartProfileImportPresets.ts` | Existing merge rules are reusable and must remain. |
| Ready lifecycle preservation | `catalogReprocessAiClear.ts:36-46`; `catalogReprocessWorker.ts:1288-1290`; ADR-FP-146 | Ready backfill must remain `ready` + `approved`. |
| Attempt identity gap | `aiEnrichmentPipeline.ts` uses invocation UUID for traces; `designAiFields.ts` stage updates are unconditional | Persist/guard the active attempt in implementation. |
| Review-note contract | Owner amendment preserves notes/audit during staging and failure; fresh-review success clears them; Ready Catalog preserves them. | Resolved and authorized. |

## Required formal answers

### 1. Does the plan eliminate destructive pre-clear before success?

**Yes for AI/automation output.** All five reprocess entrypoint classes move to
operational-only staging. The exact current clear builders and reset/enqueue
payloads are listed in the Plan and must no longer delete suggestions,
analysis, Smart Profile, snapshot, or confidence before candidate success.

Review notes and approval audit fields follow the owner amendment: preserve
during staging/failure, clear only on guarded successful fresh-review
reconciliation, and preserve for Ready Catalog backfill.

### 2. Can provider/pipeline failure preserve the prior successful AI result?

**Yes, under the approved architecture.** Prior AI maps remain persisted; the
failure path updates stage/lifecycle and separate failure metadata only. A
failure must not replace `aiSuggestions` with an error-shaped object.

### 3. Does successful new output replace prior automation output?

**Yes, subject to implementation tests.** `markAiSuccess` remains the shared
reconciliation boundary, but must be changed from conditional omission to an
explicit complete update/delete contract for each automation-owned field group.

### 4. Are omitted replace-on-success fields cleared?

**Required: yes.** The success update must explicitly delete omitted confidence,
version, analysis fields, category evidence, profile-owned provenance/preview,
snapshot, and other replace-on-success fields according to the Plan. Prior
values must not be carried forward by object omission.

### 5. Is the no-Smart-Profile successful fallback contract explicit?

**Yes in the Plan.** The current development fallback remains a valid success;
it replaces current suggestions/analysis, clears stale profile-owned state, and
still performs Explicit reconciliation from current evidence/settings. No
provider validity change is authorized by this review.

### 6. Can stale Smart Profile survive successful fallback?

**Not after the corrective implementation.** A successful no-profile result must
explicitly clear the old profile and snapshot, subject to the reviewed staff /
import authority rules. A failed result preserves them.

### 7. Can stale Explicit automation state survive successful fallback?

**Not after the corrective implementation.** Move the Explicit classifier out
of the current `smartProfile && automationDecision` dependency when its current
artwork evidence and settings are available. Apply ADR-FP-173: current match
writes automation terms, current no-match clears only automation-owned unlocked
fields, and settings failure preserves prior fields.

### 8. Can stale `aiReviewConfidence` survive successful omission?

**Not after the corrective implementation.** A successful result without
confidence must delete the prior replace-on-success confidence. A failed run
preserves it unless the owner separately decides review metadata is reset.

### 9. Are import presets preserved?

**Yes.** Existing `parseImportPresetSeed` and
`mergeQueueSmartProfileWithImportPresets` behavior remains. Preset values are
merged into the effective successful profile and are not deleted by omission.

### 10. Are staff Smart Profile edits/removals preserved?

**Yes.** Existing staff-edited dimension keys and `mergeReadyBackfillSmartProfile`
rules remain authoritative. A new AI run must not resurrect a value staff
intentionally removed. Regression tests must cover both retention and removal.

### 11. Is root catalog category authority unchanged?

**Yes.** Root `design.categoryId` remains catalog/human authority and is not
written by Pass 1 reprocess. AI category suggestion fields are replaced in
`aiSuggestions` and Smart Profile evidence follows the current profile.

### 12. Are Pass 1 semantics outside persistence unchanged?

**Yes.** This corrective changes staging, guarded persistence, omission cleanup,
and failure diagnostics. It does not change title/description trust, category
exact resolution, VCP, visible text, objective gates, or provider prompts.

### 13. Is Pass 2 unchanged and parked?

**Yes.** No Pass 2 caller, setting, provider path, or manual Playground behavior
is in scope.

### 14. Are retired tags still non-authoritative?

**Yes.** Successful AI maps continue stripping retired nested tag/reranker/
Suggestion Author fields, while staff `design.tags` remains untouched. No tag
AI behavior is restored.

### 15. Is Autonomous still OFF?

**Yes.** No settings mutation or lifecycle-policy change is part of the plan.
The current `shadow` / `catalogAutonomousLiveEnabled=false` posture remains.

### 16. Are concurrent, stale, and retry writes safe?

**Required by the architecture; not yet implemented.** The current trace UUID
is not a persisted design attempt identity and stage writes are unconditional.
Implementation must persist an attempt identity at staging and guard stage,
failure, and success writes. A stale worker must no-op rather than overwrite a
newer attempt. Existing stale-stage reclaim and catalog worker lease behavior
must remain.

### 17. Is a migration required?

**No.** Existing records are repaired lazily on their next successful
reprocess. No bulk backfill, destructive migration, or data rewrite is
authorized.

### 18. Are production and runtime upgrades out of scope?

**Yes.** Production, Node runtime upgrade, and `firebase-functions` dependency
upgrade remain out of scope.

## Owner decision amendment — resolved

The owner authorized the following lifecycle contract:

- preserve `aiReviewNotes`, `aiReviewedBy`, `aiReviewedAt`, and current approval
  metadata during staging and on every failure;
- for queue/reset and Ready-design fresh-review success, clear the prior
  current-review notes and approval actor/timestamp fields only inside the
  guarded successful reconciliation, then apply the new review lifecycle;
- for Ready Catalog backfill, preserve the approval lifecycle and notes on both
  success and failure because the design remains `ready` + `approved`;
- do not add a historical audit subsystem.

The implementation is authorized under the approved architecture. If an
additional review field is discovered that cannot be mapped to this contract,
stop and create a new owner decision marker rather than guessing.

## Later implementation acceptance gates

Before any DEV deployment, implementation must provide:

- updated entrypoint staging contracts with no AI-output pre-clear;
- complete success replacement/deletion logic;
- independent no-profile Explicit reconciliation;
- separate failure metadata and Studio/type compatibility;
- persisted attempt guard and stale-worker tests;
- the full failure, replacement, omission, Smart Profile authority, Explicit,
  confidence, lifecycle, and retired-tag matrix from the Plan;
- updated `DATA_MODEL.md`, `WORKFLOWS.md`, and ADR documentation;
- local tests/build/lint evidence with failures reported honestly;
- a separate reviewed implementation review before any owner QA or deployment.

## Phase result

| Item | Result |
|---|---|
| Corrective Plan | Complete |
| Formal Review | Complete — architecture approved, owner decision required |
| Runtime implementation | **Authorized by owner amendment; results covered by separate Implementation Review** |
| Provider calls | **0** |
| Settings mutation | **NO** |
| Deployment | **NO** |
| Commit/push | **NO** |
| Production touched | **NO** |
| Owner QA | **Blocked** pending DEV deployment authorization |

This Formal Review is complete. The workflow proceeds through the owner-authorized
implementation and stops at the separate DEV deployment authorization gate.
