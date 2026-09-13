# Formal Review Amendment: Coordinated production promotion and release readiness (Strategy B)

| Field | Value |
|---|---|
| Date | 2026-09-10 |
| Reviewer | FreshForge Review Agent |
| Plan | `docs/workflow/plans/2026-09-10-coordinated-production-promotion-release-readiness-plan.md` |
| Verdict | **approved_with_changes — accepted** |

---

## Summary

The Plan is evidence-backed and covers the required production layers, source/runtime reconciliation, data work, RC strategy, lean QA, ordering, rollback, and human gates. Targeted review verified the live Portal revision/build, published Studio release, production Function/index counts, ADR-FP-151 hard-delete gate, current indexed-reader behavior, Algolia dry-run/apply semantics, and the repository's non-`--force` index precedent. This amendment records the owner's Strategy B decision: the signed-off maintenance capability is a required layer of the one frozen coordinated candidate, not a standalone production release. The parent is accepted; implementation remains bounded by M0 preparation and the child hard-delete UI-gate review.

## Strategy B amendment review

The original parent Plan required a separately promoted maintenance prerequisite before the main
candidate freeze. The owner rejected that isolation strategy and selected Strategy B. The parent
Plan is amended accordingly; its earlier protections remain in force.

### 1. Amended rollout sequence

1. Resolve scope and working-tree disposition on `development`.
2. Create one committed candidate through the normal reviewed source path, generate the complete
   manifest and transitive Function closure, and freeze one exact SHA/tree.
3. Capture immutable production rollback baselines, including remote Firestore and Storage Rules
   exports/IDs/hashes, before any mutation.
4. Run candidate regression, Studio prerelease/install/update checks, five DEV journeys and only
   approved bounded/read-only rehearsals.
5. Obtain the main production-readiness GO/NO-GO.
6. Deploy additive indexes, then the reviewed Firestore/Storage Rules, then the explicit
   transitive-closure Function allowlist. This Rules-before-Functions order is safer than the
   proposed reverse order because direct writes and callable guards become enforceable together.
7. Apply only approved non-disruptive settings/data prerequisites; leave
   `settings/portalMaintenance` absent/OFF.
8. Deploy Portal from the frozen SHA and verify normal-mode compatibility.
9. Publish the one coordinated Studio release from the same SHA after Portal smoke; no
   maintenance-only Studio release.
10. Pass `FULL MAINTENANCE CAPABILITY READY` while OFF.
11. At a separate owner checkpoint, optionally enable maintenance for the remainder of the rollout;
    run only owner-approved maintenance-dependent data operations and the safe-write smoke.
12. Run final production smoke, turn maintenance OFF, verify normal recovery, and defer destructive
    cleanup.

### 2. `FULL MAINTENANCE CAPABILITY READY` checkpoint

This checkpoint occurs only after the frozen candidate's Rules, Functions, Portal and Studio are
live and verified while the production setting remains absent/OFF. At that exact point all of the
following are deployed from the same SHA and are available if the owner later enables maintenance:

- Studio owner/admin can load the control and eligible active linked tester selection excludes
  merged/disabled accounts.
- Portal reads the runtime state and has the reviewed full-screen wall, tester normal-access path
  and yellow banner.
- The maintenance control callables and all 34 guard-bearing customer callables are present,
  authenticated and covered by the explicit production allowlist.
- Firestore Rules and Storage Rules enforce the maintenance guard on direct customer writes.
- The absent document still resolves to OFF, so ordinary customers remain in normal mode and no
  production activation has occurred.

The checkpoint proves deployment/readiness, not an ON transition. No production ON test or write is
authorized before this checkpoint; the subsequent ON decision is a separate owner checkpoint.

### 3. Studio-before-Portal compatibility finding

Studio's maintenance Settings service calls the three backend maintenance Functions and shared
constants; it does not depend on the Portal bundle. A Studio-before-Portal release is technically
compatible after backend/Rules deployment, but it is unnecessary and would expose a live toggle
while the old Portal cannot render the reviewed wall/banner. The reviewed default is therefore one
coordinated Studio release after Portal smoke. If the owner later requires Studio first, the same
SHA, backend probes and an explicit OFF hold are mandatory.

### 4. Backend/Rules-before-Portal exposure finding

The interval after backend/Rules deployment and before Portal rollout is safe only because the
production document remains absent/OFF. An ON transition in that interval would make stale Portal
clients receive conservative callable failures without the full-screen UX. That degraded emergency
behavior is not accepted for this release; maintenance remains OFF until the readiness checkpoint.

### 5. Source integrity and rollback requirements

The candidate is one immutable SHA/tree with generated Function closure, Rules/Storage, index,
Portal, Studio, config and data manifests. Any runtime/config/package/lockfile/build change after
freeze invalidates the candidate and repeats RC gates; only mechanically verified documentation-only
workflow records may follow. Capture before mutation: production Git/source, current Portal
build-003, Studio `v1.0.9`, every live Function revision/hash, immutable Firestore/Storage Rules
exports and IDs/hashes, 77 live indexes plus additions, settings, Algolia, Auth metadata and secret
names/versions (never values). DEV revision IDs are not production rollback targets.

### 6. Production safe-write fixture proposal

During release preparation, select one named configured maintenance-test customer and one reversible,
low-impact customer mutation already covered by the Portal contract (for example, an owner-approved
profile-field update on that tester account). Record the customer UID, field, before/after values,
operator, exact callable, rollback/restore action and verification query. Present this fixture to
the owner for approval immediately before the production write; if it is not approved, record an
honest NO-GO for the write proof. No production write is authorized by this review.

### 7. Revised human checkpoints

- Owner accepts this Strategy B parent Plan amendment. **Accepted 2026-09-10.**
- Owner approves the clean source disposition and exact candidate SHA freeze.
- Owner accepts immutable production baseline/Rules snapshots.
- Owner approves RC readiness and the main GO/NO-GO before the first production mutation.
- Owner approves indexes, Rules, Functions, Portal traffic and Studio publication separately.
- Owner accepts `FULL MAINTENANCE CAPABILITY READY` while OFF.
- A separate explicit owner decision authorizes any production ON transition and the named safe-write
  fixture.
- Owner approves final smoke, OFF readback and release completion.

## Checklist

| Area | Status | Notes |
|---|---|---|
| Scope clear and bounded | pass | Plan-only review; no deploy, implementation, data apply, candidate freeze, commit, or push. Destructive cleanup, autonomous AI/Pass 2, hard-delete production enablement and historical tag cleanup remain excluded/deferred. |
| Architecture alignment | pass | Preserves two-app boundary, Firebase authority, request/allocation lifecycle, customer-upload promotion boundary, compatibility readers, and no design production status. |
| Security impact addressed | pass with changes | ADR-FP-151 revealed a partial production hard-delete workflow: Apply fails closed on prod but preview and Studio UI were not project-gated. Plan now excludes both callables and the current UI path from this candidate and requires a separately reviewed dev-only gate before any future exposure. |
| Data model impact addressed | pass with changes | Lifecycle mirror backfill is conditional on shipping the indexed reader; queueTab historical backfill is deferred because the compatibility reader admits absent fields. Algolia full rebuild semantics are explicit. |
| Backend impact addressed | pass with changes | Explicit Function allowlist now requires transitive import-closure analysis, not only defining-file diffs; broad Functions deploy and deletion remain forbidden. |
| Test strategy adequate | pass with changes | Owner QA reduced to five DEV journeys and four production smoke checks; automated suite supplies breadth. Studio RC/install/update checks remain mandatory. |
| Human checkpoints identified | pass with changes | Strategy B removes the standalone maintenance production gate; the amended plan adds the main GO/NO-GO, per-layer approvals, `FULL MAINTENANCE CAPABILITY READY` while OFF, and a separate owner ON/write checkpoint. |
| Roadmap alignment | pass with notes | Open Node.js 20 migration and `sharp` risk remain tracked; documentation drift is listed for resolution and not silently expanded into this release. |
| Documentation plan | pass with changes | Later workflow records are allowed only as documentation-only commits under a mechanical frozen-runtime tree contract. |
| No silent scope expansion | pass | DEV fixtures, destructive account operations, source-only Functions, index deletion and physical cleanup are explicitly excluded/deferred. |

## Architecture Review

**Findings:**

- The source/history distinction is correct: production's tree matches the `6b023a48` development snapshot even though merge history diverges; current development is not treated as an automatic candidate.
- Portal and Studio remain separate release surfaces with backend compatibility preceding client rollout.
- The original order placed a standalone maintenance production promotion before the main GO/NO-GO. Strategy B removes that separate release and places maintenance inside the frozen candidate, with readiness and ON checkpoints after both clients are live.

**Required changes:**

- [x] The signed-off DEV maintenance implementation/QA is a required layer of the one frozen coordinated candidate; no standalone maintenance-only production promotion is required.
- [x] The main GO/NO-GO is before order M5, the first coordinated production mutation, and `FULL MAINTENANCE CAPABILITY READY` follows Portal and Studio verification while OFF.

## Security Review

**Findings:**

- `hardDeleteCustomerAccount` calls `assertHardDeleteAllowedProject()` and fails closed outside `fresh-prints-dev`; `previewHardDeleteCustomerAccount` does not perform that project gate.
- `UserManagementPage`/`CustomerDirectoryTable` expose the owner hard-delete dialog in ordinary user management, so deploying the current Studio UI while omitting the callable would leave a preview-then-fail production path.
- Existing `isOperationalWipeUiEnabled` provides a repository-supported dev-only UI gate pattern, but applying it is implementation work and is not present on the current user-management path.

**Required changes:**

- [x] Exclude both hard-delete callables and the current hard-delete UI path from this production candidate. Keep reversible disable/restore/tombstone and non-destructive identity features separately classified.
- [x] Require a separate reviewed implementation/test before any future production Studio build can expose hard-delete; do not infer production authorization from ADR-FP-151's DEV gate.

**Human approval needed before production:**

- [x] Any future hard-delete production enablement would require a separate destructive-data/security checkpoint.
- [x] Main production Rules/Functions/Portal/Studio/data actions remain individually owner-gated.

## Data Model Review

**Findings:**

- The lifecycle reader is compile-time constant-driven (`PRINT_REQUEST_HISTORY_INDEXED_READER_ENABLED=true` in current development) and has no runtime fallback in that branch. Therefore a production mirror backfill is genuinely required only if that reader is shipped; a compatibility-first candidate can defer it.
- The lifecycle backfill has a corrected DEV dry-run/apply history but the runner is DEV-pinned. A production-safe runner is not established and cannot be invented during rollout.
- QueueTab filtering explicitly admits legacy documents with absent `queueTab`; a historical queueTab backfill is not a prerequisite for the initial compatibility release.
- Algolia reconcile supports `dryRun`, but its apply path clears and rewrites the full ready corpus in 100-record chunks. It is not a bounded canary or alias swap.

**Required changes:**

- [x] Lifecycle mirror backfill is conditional on indexed-reader inclusion, with compatibility reader preferred for the minimum-operation path.
- [x] QueueTab historical backfill is **NOT REQUIRED / DEFERRED** unless a targeted production audit finds a correctness defect; the DEV-only runner cannot be used against production.
- [x] Algolia rehearsal now requires DEV dry-run → read-only production dry-run → owner-approved full clear/rebuild → independent zero-drift verification, without claiming bounded apply support.

## Backend Review

**Findings:**

- The 48 added, 52 direct-update, 67 direct-unchanged, seven source-only and one removed export inventories are useful but direct defining-module diffs cannot identify transitive Function changes.
- Production live count is 113 while the production source export surface is 120; a broad deploy would change historical source-only exclusions.
- Existing production index precedent records that deploy without `--force` did not delete remote indexes absent from the local file; `--force` remains unsafe.

**Required changes:**

- [x] Frozen-SHA closure audit now resolves each exported Function through local Functions/shared/provider/config imports and emits an `export → closure → changed path → action` manifest.
- [x] Final Function action remains explicit allowlist only; no broad deploy and no deletion.
- [x] Index deployment now requires a reviewed union of the 77 live definitions plus additions, no `--force`, and a stop if the CLI proposes deletion.

## Testing Review

**Findings:**

- Six DEV journeys contained overlapping identity/admin read checks. Production smoke also repeated public/read and customer proof as separate checks.
- The owner still needs one safe production write proof if backend correctness cannot be established otherwise, but every production fixture/account/write must be named and approved.

**Required changes:**

- [x] DEV QA is five journeys: Portal request/upload/edit; Studio catalog-to-Ready/search; Studio request/show/gang-sheet; combined identity/User Info + admin queue; maintenance gate.
- [x] Production smoke is four checks: public plus safe customer proof, admin queue, packaged Studio, and maintenance toggle.
- [x] Automated validation, RC packaging, installer/update verification, and documented baseline-failure comparison remain mandatory; no test pass is claimed by the Plan.

## Documentation Review

**Findings:**

- FreshForge naturally creates test reports, deployment records, production-readiness records and signoffs after a runtime candidate is frozen. A blanket prohibition on all documentation changes after freeze would conflict with that workflow.

**Required changes:**

- [x] The Plan now freezes a runtime candidate tuple (SHA/tree/build inputs/manifests) and permits only mechanically verified documentation-only commits in `docs/**`, `.cursor/workflow/**`, and handoff state/review paths afterward.
- [x] Any application, Function, Rules, index, Portal, Studio, shared package, lockfile, build-config, secret/config or generated-asset change invalidates the freeze and repeats RC gates.

## Blocking findings carried into implementation/release

These are not unresolved review contradictions, but they block any implementation or production action until closed:

1. The frozen parent candidate must include and reconcile the already signed-off maintenance source locations, setting/read path, callable guard inventory, cache/failure semantics and recovery access; no standalone production maintenance release may be substituted.
2. The main candidate cannot include the current production-visible hard-delete UI/callable pair. The candidate scope must prove the UI is excluded or a separately reviewed dev-only gate is implemented and tested.
3. The frozen-SHA packet must contain the transitive Function closure manifest, Rules/Storage Rules snapshot, index union/non-deletion proof, Algolia counts/settings, and production-safe lifecycle runner decision.
4. The owner must disposition the two inherited untracked documents before the main runtime freeze.

## Non-blocking findings and watch items

These do not reject Formal Review, but they remain visible release-readiness watch items:

1. The Node.js 20 Functions migration deadline (2026-10-30) and the tracked `sharp` 0.33.5
   vulnerability remain open technical risks; neither is silently added to this promotion.
2. Older documentation still conflicts with current provider/catalog runtime evidence (Gemini-only /
   OpenAI removed versus OpenAI Luna, and Algolia pending versus Algolia live). Reconcile the durable
   docs before final readiness, using the frozen-runtime documentation-only contract where applicable.
3. The known Windows Portal `.next/trace` EPERM build issue and unrelated Studio typecheck baseline
   failures are acceptable only if reproduced as unchanged, documented baselines; any regression is
   a release blocker.
4. Smart Profile provider cost/quota and exact Algolia production counts/settings remain conditional
   evidence items until the candidate's data scope is selected.

## Required Changes (all incorporated into the Plan)

1. Incorporate the signed-off maintenance capability as the first compatible safety layer of the full frozen candidate; move the main GO/NO-GO to before M5 and add the OFF-only `FULL MAINTENANCE CAPABILITY READY` checkpoint.
2. Correct immediate rollback targets: Portal build-003; Studio `v1.0.9`. Keep build-002 and `v1.0.8` as secondary fallbacks only.
3. Define the frozen runtime SHA/tree contract with an explicit documentation-only continuation allowlist.
4. Exclude hard-delete callables/UI from this candidate and preserve ADR-FP-151's DEV-only contract.
5. Require transitive Function closure audit and explicit allowlist deployment.
6. Preserve the legacy index, forbid `--force`, and stop on a deletion proposal.
7. Defer queueTab backfill; make lifecycle backfill conditional; accurately describe Algolia full rebuild semantics.
8. Reduce owner QA to five DEV journeys and four production smoke checks.

## Verdict Rationale

**approved_with_changes** is appropriate because the Strategy B amendment resolves the standalone-isolation contradiction while preserving the prior release-safety controls. The owner accepted this amended parent Plan on 2026-09-10. That acceptance does not authorize candidate freeze, rehearsal apply, Portal rollout, Studio publish, production mutation or maintenance activation; M0 blockers and the child hard-delete gate remain.

## M0 follow-up after accepted review (2026-09-10)

The reviewed hard-delete child is now closed with
`docs/workflow/reviews/2026-09-10-studio-hard-delete-production-ui-gate-signoff.md`:
`CustomerDirectoryTable` gates the hard-delete menu/callback with
`isOperationalWipeUiEnabled()`, focused contracts pass 12/12, and both hard-delete Function
exports remain excluded from the production allowlist. The inherited request-design parity Plan is
explicitly excluded for separate review. The Portal admin Show Queue signoff is explicitly included
as approved-with-notes evidence for the scoped read-only admin runtime. The parent M0 preparation
rerun and exact M1 proposal are recorded in
`docs/workflow/reviews/2026-09-10-coordinated-production-candidate-preparation.md` and
`docs/workflow/reviews/2026-09-10-coordinated-production-candidate-freeze-proposal.md`.

Read-only runtime/dependency closure reconciliation is now complete at the dirty snapshot. The
deterministic Function, Rules/index, Portal/Studio input, and config/data manifests are linked from
`docs/workflow/reviews/2026-09-10-coordinated-production-m0-reconciliation.md`. The remaining M0
blocker is one clean committed candidate SHA (followed by manifest regeneration); no candidate SHA
is frozen, and no production action is authorized by this follow-up.

## Next Step

The owner accepted this Strategy B parent Plan amendment. The child maintenance-promotion goal is
closed as `superseded_by_coordinated_candidate` (not as a production deployment); the hard-delete
UI-gate child is now signed off. Continue from the M0 reconciliation packet only after the owner
authorizes the reviewed commit/push and a clean candidate exists; then use the prepared M1 proposal.
Do not freeze the candidate or execute production actions from this review artifact until the clean
candidate and its owner checkpoints are closed.
