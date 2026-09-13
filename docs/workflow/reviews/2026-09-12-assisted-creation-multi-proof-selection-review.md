# Formal Review: Assisted Creation Multi-Proof Selection

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Workflow | FreshForge managed phase |
| Goal | `assisted-creation-multi-proof-selection` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Plan | `docs/workflow/plans/2026-09-12-assisted-creation-multi-proof-selection-plan.md` |
| Authorization | **PLAN + FORMAL REVIEW ONLY** |
| Verdict | **`approved_with_changes` — conditional; implementation not authorized** |

## Review boundary

The source audit confirms a real, bounded feature gap: Assisted Creation has proof history but not
proof rounds/options or authoritative customer selection. This review evaluates the additive plan
only. No runtime, Rules, Storage, index, data, migration/backfill, deployment, staging, commit,
push, freeze, publication, or production action occurred. Shared workflow state/handoff files were
not modified because another corrective child owns them.

## 1. Confirmed current behavior

1. `AssistedCreationRequest.proofs` is a flat append-only array. A proof image has an opaque Storage
   path under `assisted-creation/{customerUid}/{requestId}/proofs/{objectId}`; catalog-share rows
   are separate metadata rows with an empty Assisted Creation path.
2. `customerRespondToAssistedCreationProof` in `functions/src/assistedCreationRequests.ts` chooses
   `proofs[proofs.length - 1]` on proof-image approval. Revision history does not identify the proof
   or the response round.
3. Portal `AssistedCreationStatusPanel` and Studio `AssistedCreationRequestsSection` both treat the
   latest flat row as the active proof. Portal response payload has no selection or round identity.
4. The current transition helper and maintenance guard are correct and reusable; they must remain
   the server authority.
5. `staffAddAssistedCreationFinalSource` stores a separate final source only after proof approval.
   The approved-proof download resolver and Add-to-Request callable prefer final source when present
   and otherwise use `approvedProofId`. The retention-sentinel defect occurs later in a fresh
   customer-upload create payload and is not part of this feature.
6. Existing Firestore and Storage Rules already give staff/customer request access and owner/admin
   proof-object mutation. The wildcard path supports multiple opaque option objects without a new
   bucket or rule shape.

## 2. Review decisions and required changes

### Decision A — additive logical rounds are approved

Keep `proofs[]` as the option-record store. Add server-owned `proofRoundId`, `optionOrder`, and
`optionLabel` to proof rows, `currentProofRoundId` to the request, and optional round/selected-proof
fields to revision history. Do not add a second mutable `rounds[]` array that can diverge from
proofs. Missing fields on existing records must render as implicit one-option rounds.

**Required change:** the implementation must document and test the legacy fallback and must never
allow the client to choose or rewrite server labels/order.

### Decision B — extend, do not fork, the staff callable

Extend `staffAddAssistedCreationProof` to accept a validated `proofs[]` batch and normalize the
existing singular `proof` input. Attach the entire batch in one transaction, with one new round ID,
one status/history event, and one notification/email event. Return all IDs plus the legacy `proofId`.

**Required change:** shared constants must bound option count and total round bytes. The client must
upload all objects before invoking the callable and best-effort delete objects if a later upload or
attach step fails. A partially uploaded Storage object may be orphaned, but a partially visible
Firestore round is prohibited.

### Decision C — selection is transactionally authoritative

Extend the customer response request with `proofRoundId` and `selectedProofId`. For multi-option
rounds both are required; the server verifies current status, ownership, current round membership,
non-purged option, and one-response semantics inside the transaction. A one-option legacy/current
round may infer its only option, preserving the current UI.

**Required change:** stale, foreign, purged, duplicate, and already-responded submissions must fail
without a partial status/history write. Approval writes exactly one `approvedProofId`; revision
history records the selected basis and required note. No other option receives an approval marker.

### Decision D — final source and Add-to-Request remain unchanged in authority

The selected proof identifies customer intent and approval evidence only. Proof-image approval still
transitions to `final_source_needed`; staff final upload still produces the independent `finalSource`.
The existing resolver still chooses final source first for download/Add-to-Request and the approved
proof only when no final source exists. The sentinel corrective must remain a separate change and
must not be folded into this feature.

**Required change:** tests must assert both branches, including selected proof lineage when no final
source exists and final-source preference when it does.

### Decision E — one notification per round

The current code keys proof-ready email jobs and in-app notifications by proof ID. A multi-option
send must use a round-scoped identity so three options do not create three customer alerts. Retain
the first/only proof ID in legacy job fields only as a compatibility bridge for the current email
worker; add round identity for dedupe/history.

**Required change:** implement and test round-scoped job/notification idempotency, including retries
and transaction replays. Do not place option metadata in email/push payloads.

## 3. UX and history review

The Studio proposal reuses the existing Add Proof control, previews, JPEG/PNG/WebP validation,
Storage upload, and owner/admin mutation boundary. It adds multi-select, order, per-file error
visibility, and an all-or-nothing send action. The Portal proposal preserves the one-proof card and
adds a current-round option grid/radio selection, bounded signed-URL-first previews, and explicit
selected/approved/history states. This satisfies the brief without introducing a parallel workflow.

The history model is understandable if round grouping is derived from immutable proof metadata and
history linkage. Previous rounds/options must remain read-only; the active round is distinct. The
implementation must avoid using array position as identity after a reorder.

## 4. Security and Rules review

**Pass with conditions.** Firestore request reads remain staff/owner-customer only, and all writes
remain Admin SDK callable writes. Owner/admin is the only staff mutation role; helpers stay
read-only. The customer callable must preserve `requirePortalCustomer`, request ownership, and
`assertPortalMaintenanceAllowsCustomerMutation` before any mutation. Storage path prefixes and image
metadata remain server-validated. The Portal does not gain access to Staff Artwork or any new
library endpoint.

No Firestore Rules, Storage Rules, bucket, or index change is expected. If implementation finds that
Rules need a change, it must stop and return to Formal Review rather than widening the phase silently.

## 5. Retention and migration review

The existing purge helper currently keeps `approvedProofId` and purges sibling image proofs. It must
be made round-aware only insofar as all unselected options are siblings; catalog-share rows remain
non-Storage and non-purgable. The existing approved-proof retention window and final-source behavior
do not change.

No migration/backfill is approved. Legacy flat proofs are valid implicit one-option rounds. Any need
to rewrite existing documents, repair ambiguous ordering, or add a production cleanup job is a new
human checkpoint and cannot be inferred from this plan.

## 6. Overlap with the retention-sentinel corrective

The sibling corrective is expected to change only the customer-upload catalog-confirmation helper,
the fresh assisted Add-to-Request callable write site, and focused tests. This feature is expected to
change Assisted Creation shared types/actions/history/retention, `functions/src/assistedCreationRequests.ts`,
notification/email identity, and Portal/Studio proof UI/service files. No source-file overlap is
expected.

If both branches later need `customerAddAssistedApprovedProofToPrintRequest.ts` or its resolver,
the sentinel corrective must be implemented and signed off first, then this plan must be re-reviewed
against its final source. Their Plan/Review/Implement/Test/Signoff records must remain separate.

## 7. Required test gate

The plan is acceptable only if Implement → Test covers:

- legacy one-proof read/respond and no-selection friction;
- multi-option validation, labels/order, complete-batch attach, partial-upload cleanup, and no partial
  Firestore round;
- approval/revision selection, required notes, exact linkage, immutable prior rounds, stale/foreign/
  purged/duplicate response rejection, and customer ownership;
- final-source-needed → final upload → approved; final-source-first download/Add-to-Request and
  approved-proof fallback;
- owner/admin vs helper permissions, maintenance blocking, Storage prefix/type validation, and
  signed-URL-first bounded previews/downloads;
- one email/in-app notification per round and dedupe on retry;
- cancel, restore, messages, retention/purge, Functions build, Portal typecheck, Studio validation,
  targeted lint, relevant Rules/Storage suites, and `git diff --check`.

Owner DEV QA is required before Signoff and must exercise both one-option and multi-option rounds,
each response path, stale/duplicate attempts, final artwork, notification dedupe, maintenance mode,
helper read-only behavior, and induced upload failure.

## 8. Verdict and next decision

**Formal Review verdict: `approved_with_changes` — conditional; implementation not authorized.**

The additive round/option design is compatible with the current flat proof history, Storage paths,
state machine, final-source resolver, and permission boundary. Before implementation, the changes
listed in Decisions A–E and the required test gate are mandatory. No owner authorization to implement
is implied by this review.

> **OWNER ACCEPT PLAN + FORMAL REVIEW AND AUTHORIZE IMPLEMENT**

Until that exact decision is explicit, stop here. Do not implement, deploy, stage, commit, push,
freeze, publish, migrate, backfill, or perform any production action.

---

## Classification-B source-aware amendment (2026-09-12)

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Amendment record | `docs/workflow/reviews/2026-09-12-assisted-creation-multi-proof-selection-classification-b-amendment.md` |
| Amended Plan | `docs/workflow/plans/2026-09-12-assisted-creation-multi-proof-selection-plan.md` (status `amended_classification_b_awaiting_owner_accept`) |
| Prior reconciliation | `docs/workflow/reviews/2026-09-12-assisted-creation-multi-proof-selection-source-delta-reconciliation.md` |
| Runtime / deploy this amendment | **None** |
| Material architectural conflict (C) | **None** |
| Reopen Formal Review for redesign | **Not required** |
| Amended verdict | **`approved_with_changes` (Classification-B amendment applied; Implement still not authorized)** |

### What remains binding

Original Decisions **A–E** above remain the architectural authority. This amendment does **not**
redesign multi-proof, introduce `rounds[]`, authorize migration/backfill, change Rules/Storage/
indexes, or fold sentinel/final-artwork email into the multi-proof feature history.

### Sibling correctives now signed off

Staff Artwork projection, Assisted retention-sentinel, Assisted progress/re-add, and Assisted
final-artwork-ready-email are **CLOSED**. Multi-proof is the **only** remaining pre-freeze child
before parent M0/freeze preparation. Prior sequencing blockers in §6 are cleared for **planning**;
Implement still requires the checkpoint below.

### Current-source findings (A/B only)

1. **Progress/re-add (B):** Shared progress DTO + Portal stale-aware parser + detail-panel progress
   wiring + existing `AssistedAddToRequestProgressModal` must survive. Round/option state is
   independent. No second progress modal; no fake %/ETA/client stages.
2. **Sentinel (A boundary):** Direct no-consent Add, no `catalogUseAcknowledged`, no Assisted
   retention sentinels, origin + `not_eligible`, no auto Design publish, final-source-first
   resolver — preserve. `customerAddAssistedApprovedProofToPrintRequest` and shared resolver remain
   **off allowlist**; edit requires STOP + overlap Formal Review.
3. **Final-artwork-ready-email (B — new since original reconciliation):** Shared
   `assistedCreationRequests.ts`, `emailJobIdentity.ts`, customer notification types/utils, and
   history helpers now carry `assisted_final_artwork_ready`. Multi-proof must round-scope
   **proof-ready** identity only and leave final-artwork kind/template/CTA/history intact.
4. **Rules/Storage/indexes (A):** Still expect no change; otherwise STOP.

### Amended allowlist / test / Owner QA

See amended Plan §§12–15 for the full current-source allowlist, 44-item test gate (including
progress/sentinel/final-email regressions), and user-visible Owner DEV QA focus (server rejection
cases primarily automated).

### Amended Formal Review status

**`approved_with_changes`** — Classification-B Plan amendment recorded; original Decisions A–E
intact; no Classification-C conflict; **implementation not authorized**.

### Exact next owner checkpoint

> **OWNER ACCEPT MULTI-PROOF PLAN AMENDMENT + AUTHORIZE IMPLEMENT**

Until that exact decision is explicit, stop. Do not implement, deploy, stage, commit, push, freeze,
publish, migrate, backfill, rerun parent M0, or perform production action.
