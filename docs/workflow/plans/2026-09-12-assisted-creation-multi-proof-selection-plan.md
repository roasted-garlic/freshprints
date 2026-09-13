# Plan: Assisted Creation Multi-Proof Selection

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Workflow | FreshForge managed phase |
| Goal | `assisted-creation-multi-proof-selection` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Related (signed off) | Staff Artwork projection; Assisted retention-sentinel; Assisted progress/re-add; Assisted final-artwork-ready-email |
| Status | **`amended_classification_b_awaiting_owner_accept`** |
| Formal Review | `docs/workflow/reviews/2026-09-12-assisted-creation-multi-proof-selection-review.md` |
| Source-delta reconciliation | `docs/workflow/reviews/2026-09-12-assisted-creation-multi-proof-selection-source-delta-reconciliation.md` |
| Classification-B amendment record | `docs/workflow/reviews/2026-09-12-assisted-creation-multi-proof-selection-classification-b-amendment.md` |
| Authorization | **PLAN AMENDMENT ONLY**; **implementation is not authorized** until owner accept |

---

## Classification-B Plan Amendment (2026-09-12) — CURRENT SOURCE

This section is the authoritative pre-implement contract. It does **not** redesign multi-proof.
Original Formal Review Decisions **A–E** remain binding. This amendment rebases the Plan onto
**current repository source** after the signed-off progress/re-add, sentinel, and
final-artwork-ready-email children.

### Parent / sibling status (updated)

| Sibling | Status |
|---|---|
| `portal-staff-artwork-neutral-projection-corrective` | **CLOSED** (signed off) |
| `portal-assisted-final-artwork-add-retention-sentinel-corrective` | **CLOSED** (signed off `approved_with_notes`) |
| `portal-assisted-final-artwork-progress-and-readd-corrective` | **CLOSED** (signed off) |
| `assisted-final-artwork-ready-email` | **CLOSED** (signed off `approved`) |
| This child | **ONLY remaining pre-freeze child** before parent M0/freeze prep |

Staff Artwork and sentinel are no longer sequencing blockers. Multi-proof may proceed to Implement
**only after** owner accept of this amendment.

### Architecture preserved (unchanged)

- Retain `proofs[]` (no second mutable `rounds[]`)
- Add `proofRoundId`, `optionOrder`, server-derived `optionLabel`
- Add request `currentProofRoundId`
- History linkage: `proofRoundId`, `selectedProofId`, `selectedOptionOrder`
- Legacy proofs without round metadata = implicit one-option rounds
- No migration/backfill
- One authoritative `approvedProofId`
- Final source remains independent and authoritative after final upload
- One proof-ready notification/email **per round** (not per option)
- Decisions A–E from original Formal Review remain binding

### Current-source overlap findings (bounded read-only)

| Surface | Classification | Notes |
|---|---|---|
| Shared `AssistedCreationAddToRequestProgress*` + `addToRequestProgress` | **B** | Multi-proof types must be additive; do not replace/narrow progress DTO |
| Portal `parseRequestDoc` / `parseAssistedAddToRequestProgress` (stale guard) | **B** | Merge round/proof parsing; preserve whitelist stages + 15m stale guard |
| `AssistedCreationDetailPanels` direct Add + progress wiring | **B** | Rebase round/history UI onto current card; no consent modal restoration |
| `AssistedAddToRequestProgressModal` (+ CSS) | **A** | Reuse as-is; no second modal; no fake %/ETA/client stages unless tiny compatibility edit justified pre-implement |
| Sentinel / `customerAddAssistedApprovedProofToPrintRequest` | **A** (boundary) | **Off allowlist.** If Implement needs edits → **STOP** for overlap Formal Review |
| `assistedCreationApprovedProofDownload` resolver | **A** (boundary) | Same STOP rule if edit required |
| `functions/src/assistedCreationRequests.ts` | **B** | Shared file: extend proof send/respond; **preserve** `staffAddAssistedCreationFinalSource` final-artwork email+notification path |
| `emailJobIdentity.ts` | **B** | Round-scope proof-ready job id; **keep** `createFinalArtworkEmailJobId` intact |
| `customerNotifications` types/utils | **B** | Round-scope proof-ready id/helpers; **keep** `assisted_final_artwork_ready` kind/title/body/href/id |
| `assistedCreationHistory.ts` | **B** | Additive round/selection history helpers; **keep** final-artwork email sent note recognition |
| `onEmailDeliveryJobCreated` | **A** | Already handles `assisted_proof_ready` + `assisted_final_artwork_ready`; no template collapse. Touch only if proof-job claim fields need `proofRoundId` logging — prefer keep worker unchanged |
| Rules / Storage / indexes | **A** | Still expect **no** change; if needed → STOP Formal Review |

**Material conflict (C):** **None found.** Architecture remains valid. Formal Review need **not** be reopened for redesign; this Classification-B amendment + owner accept is sufficient.

### Progress / re-add preservation (mandatory)

Current source includes:

- `AssistedCreationAddToRequestProgressStage`
- `AssistedCreationAddToRequestProgress`
- `AssistedCreationRequest.addToRequestProgress`
- Portal parser with stage whitelist + stale-after-15m protection
- Detail panel wiring `serverProgress={request.addToRequestProgress}`
- Existing `AssistedAddToRequestProgressModal` (trusted stages, elapsed time, Step N of M, remaining steps, stale completion)

Multi-proof **must**:

- Keep progress and round/option state as **independent** concepts
- Merge parser changes; **do not** wholesale-replace the Plan-era parser
- Preserve remove/re-add idempotency and final-source preference on the approved card
- **Not** create a second Add-to-Request progress modal
- **Not** introduce fake percent, simulated progress, ETA countdown, or client-invented stages

### Sentinel preservation (mandatory)

Preserve signed-off sentinel behavior:

- Direct Assisted Add-to-Request (no catalog permission modal)
- No `catalogUseAcknowledged` on Assisted path
- No Assisted consent/retention sentinel episode on fresh create
- Assisted origin lineage
- `catalogReviewStatus: "not_eligible"`
- No automatic Design creation/publication
- Final-source-first resolver authority
- Ordinary upload/donation/Ask Again/Allow/Decline/Restore/staff-promotion unchanged

Multi-proof **must not** absorb or rewrite the sentinel corrective. Editing
`customerAddAssistedApprovedProofToPrintRequest.ts` or its shared final-source resolver during
Implement → **STOP** for overlap review.

### Final-artwork-ready-email coexistence (mandatory — NEW vs original reconciliation)

Signed-off behavior that must remain intact:

- Final-source upload enqueues one `assisted_final_artwork_ready` email job
  (`createFinalArtworkEmailJobId` → `assisted-final-{sha256}`)
- In-app `assisted_final_artwork_ready` notification
- Shared `assistedProofEmailOptIn` opt-out for proof **and** final notices
- History note `Final artwork email sent` / recognition helpers
- CTA via existing Portal status URL resolver

Multi-proof proof-ready changes:

- One `assisted_proof_ready` email + one in-app notification **per `proofRoundId`**
- Round-scoped dedupe identity; first/only `proofId` retained only for legacy worker compatibility
- Retries/transaction replay remain idempotent
- **No** option metadata in email/push payloads
- **Do not** overwrite, rename, or collapse with `assisted_final_artwork_ready`

Expected identity design:

```text
createProofEmailJobId → round-scoped digest (requestId + proofRoundId)
  + optional legacy proofId field on job for worker compatibility
createFinalArtworkEmailJobId → unchanged (requestId + finalSourceId)
buildAssistedProofReadyNotificationId → round-scoped
buildAssistedFinalArtworkReadyNotificationId → unchanged
```

---

## 1. Gate and isolation

This amendment turn updates Plan/Review docs only. **No** runtime edit, Rules/Storage/index change,
migration, backfill, deployment, staging, commit, push, freeze, publication, parent M0, or
production action.

Original Plan + Formal Review history remains; this Classification-B amendment supersedes
pre-implement allowlist, test gate, Owner QA focus, and next checkpoint text where they conflict.

## 2. Goal and non-goals

Owner/admin staff must send one proof as today or multiple proof options in one proof round. A
customer must select exactly one option when a round has more than one option, then approve or
request revisions against it. Existing status, final-source, Add-to-Request, maintenance, sentinel,
progress modal, and final-artwork email contracts remain authoritative.

Non-goals:

- no parallel custom-request system;
- no replacement of `proofs[]` or `finalSource` with a new collection;
- no customer upload/replace path for staff proofs;
- no rewrite of sentinel or final-artwork-ready-email behavior;
- no new Storage bucket, public URL, or client-trusted approval field;
- no migration/backfill unless a later review proves legacy interpretation is impossible;
- no second Add-to-Request progress modal or client-simulated progress.

## 3. Repository evidence (current behavior — abbreviated)

See original Plan §3 for baseline. **Current-source deltas since original review:**

1. Shared request types include Add-to-Request progress DTO (progress/re-add Signoff).
2. Portal parser parses `addToRequestProgress` with stale protection (progress/re-add).
3. Detail panels: direct no-consent Add; progress modal wired; remove/re-add idempotent (sentinel + progress/re-add).
4. `staffAddAssistedCreationFinalSource` enqueues final-artwork email + notification
   (final-artwork-ready-email Signoff).
5. `emailJobIdentity` / notifications / history recognize both proof-ready and final-artwork-ready.
6. `staffAddAssistedCreationProof` still attaches **one** proof and keys email/notification by
   `(requestId, proofId)` — this is what multi-proof changes to round-scoped.

## 4. Recommended additive data model

Unchanged from original Plan §4 / Decisions A–C:

- Optional on proof: `proofRoundId`, `optionOrder`, server-derived `optionLabel`
- Optional on request: `currentProofRoundId`
- Optional on history: `proofRoundId`, `selectedProofId`, `selectedOptionOrder`
- Legacy missing fields = implicit one-option round; no backfill

## 5. Callable and transaction design

### 5.1 Staff send

Extend existing `staffAddAssistedCreationProof` (no parallel callable):

- accept `proofs[]` (1..N) + normalize legacy singular `proof`;
- validate every ID/path/type/size; reject duplicate ID/path;
- bound option count and total round bytes in shared constants;
- server-created round ID; server-derived order/labels;
- one transaction: append entire batch, `proof_ready`, set `currentProofRoundId`, one history event,
  **one** proof-ready email job, **one** proof-ready notification;
- return all IDs + legacy `proofId` (first/only);
- Studio uploads all objects first; failure → no attach call + best-effort Storage cleanup;
- **no partial Firestore round**.

Do **not** alter `staffAddAssistedCreationFinalSource` email/notification enqueue except to avoid
accidental breakage when editing the same module.

### 5.2 Customer response

Extend response with `proofRoundId` + `selectedProofId` (required for multi-option current round).
Transactional checks: Portal customer, ownership, maintenance, `proof_ready`, current round,
membership, not purged, one-response; reject stale/foreign/duplicate/already-responded.

- Approval: exactly one `approvedProofId`; proof_image → `final_source_needed`; catalog_share → `approved`
- Revision: selected proof as basis + required note → `revision_requested`
- Clear `currentProofRoundId` after response; retain immutable proof/history rows
- One-option: UI may omit selection; server may infer sole option; supplied id must still match

## 6. Studio UX

Unchanged intent from original Plan §6: multi-file chooser, previews, reorder, stable Option A/B/C,
one round-level note, atomic send, helpers read-only, final-source upload only in
`final_source_needed`.

## 7. Portal UX

Unchanged intent from original Plan §7 for proof selection, **plus** Classification-B constraints:

- Rebase onto current `AssistedCreationDetailPanels` / status panel source
- Preserve direct Add-to-Request + progress modal
- Do not restore catalog permission modal or consent payload

## 8–9. Approval / history / security

Unchanged from original Plan §8–9 and Decisions C–D. Client-provided labels/order/historical round
IDs are not trusted.

## 10. Notifications (amended coexistence)

| Kind | Trigger | Identity | Payload |
|---|---|---|---|
| `assisted_proof_ready` | Staff proof-round attach | Round-scoped job + notification id | Generic proof-ready copy; status deep-link; **no** option metadata |
| `assisted_final_artwork_ready` | Staff final-source attach | Unchanged final-source identity | Unchanged final-artwork copy/CTA |
| `assisted_catalog_share_ready` | Existing catalog suggest | Unchanged | Unchanged |

Proof-ready batch send creates **one** email job and **one** in-app notification per
`proofRoundId`. Opt-out remains `assistedProofEmailOptIn` for both proof and final notices.

## 11. Rules, Storage, retention, migration

- Firestore Rules: **no change expected**
- Storage Rules: **no change expected**
- Indexes: **no change expected**
- Retention: option-aware only as needed; keep `approvedProofId` window; unselected image options
  may purge under existing rules; catalog-share non-Storage; final source unchanged
- Migration/backfill: **none**
- If Implement requires Rules/Storage/index/migration/backfill → **STOP** Formal Review

## 12. Implementation allowlist (amended — current source)

### In allowlist

**Shared**

- `packages/shared/src/types/assistedCreation/assistedCreation.types.ts` — **additive** round fields; preserve progress types
- `packages/shared/src/types/assistedCreation/assistedCreationActions.types.ts`
- `packages/shared/src/constants/assistedCreation/assistedCreation.constants.ts`
- `packages/shared/src/utils/assistedCreationHistory.ts` — additive; preserve final-artwork email notes
- `packages/shared/src/utils/assistedCreationApprovedProofRetention.ts`
- `packages/shared/src/utils/customerNotifications.ts` — round-scope proof-ready helpers; preserve final-artwork
- `packages/shared/src/types/customerNotifications/customerNotifications.types.ts` — only if needed for optional round linkage; do not remove `assisted_final_artwork_ready`

**Functions**

- `functions/src/assistedCreationRequests.ts` — proof send/respond + round-scoped proof-ready notify; preserve final-source email path
- `functions/src/lib/assistedCreationProofPurge.ts`
- `functions/src/lib/email/emailJobIdentity.ts` — round-scope proof job id; preserve `createFinalArtworkEmailJobId`
- Notification create helper only if required for round-scoped proof-ready identity

**Studio**

- `apps/studio/.../assistedCreationRequestsService.ts`
- `apps/studio/.../AssistedCreationRequestsSection.tsx`

**Portal**

- `apps/portal/features/assisted-creation/services/assistedCreationService.ts` — merge into current parser
- `apps/portal/features/assisted-creation/components/AssistedCreationStatusPanel.tsx`
- `apps/portal/features/assisted-creation/components/AssistedCreationDetailPanels.tsx` — rebase; preserve Add/progress
- `apps/portal/features/assisted-creation/utils/assistedCreationDisplay.ts`
- `apps/portal/styles/assisted-creation.css` only if needed for option grid

### Preserve without rewrite (prefer touch-free)

- `AssistedAddToRequestProgressModal.tsx` (+ related CSS) — reuse; if a small compatibility edit is
  required, explain why in Implement notes **before** changing it

### Explicitly off allowlist (STOP if needed)

- `functions/src/customerAddAssistedApprovedProofToPrintRequest.ts`
- Shared final-source download/resolver if edit would be required
- Ordinary customer-upload / donation / permission-follow-up callables and helper rewrite
- Firestore Rules, Storage Rules, indexes
- Staff Artwork surfaces
- Collapsing or renaming `assisted_final_artwork_ready` templates/kinds

## 13. Coordination with signed-off correctives

Sentinel and Staff Artwork are **signed off**. Multi-proof keeps a separate FreshForge history and
does not fold their Signoffs into this feature. Final-artwork-ready-email is signed off and must
**coexist** in shared modules via additive edits only.

## 14. Amended test gate

Implement → Test must cover **all** of:

1. legacy one-proof render/respond
2. multi-option send and ordering
3. server-derived labels
4. bounded option count/bytes
5. partial-upload cleanup
6. no partial Firestore round
7. exact selected-proof approval
8. selected-proof revision linkage
9. required revision notes
10. immutable previous rounds
11. stale round rejection
12. foreign proof rejection
13. purged proof rejection
14. duplicate/already-responded rejection
15. ownership
16. maintenance blocking
17. owner/admin mutation
18. helper read-only
19. one proof-ready email per round
20. one proof-ready in-app notification per round
21. retry/replay notification idempotency
22. final-source-needed transition
23. final upload → approved
24. final-source-first download
25. final-source-first Add-to-Request
26. selected approved-proof fallback
27. existing Add-to-Request progress parser survives
28. stale Add-to-Request progress guard survives
29. existing progress modal survives
30. remove/re-add idempotency survives
31. direct no-consent Assisted Add survives
32. no consent/retention sentinel regression
33. final-artwork-ready email survives
34. final-artwork-ready in-app alert survives
35. ordinary upload permission workflows unchanged
36. cancel/restore/messages unchanged
37. retention/purge behavior
38. signed-URL-first/bounded preview behavior
39. Functions build
40. Portal typecheck
41. Studio validation/typecheck/build as repo-supported
42. targeted lint
43. relevant existing Rules/Storage regression suites
44. `git diff --check`

Server-side rejection cases (stale/foreign/duplicate/purged) are primarily automated unless a live
owner check is genuinely needed.

## 15. Amended Owner DEV QA (user-visible focus)

Before Signoff, Owner QA should include:

- one proof round behaves as before
- 2–3 proof options uploaded together
- Studio reorder → stable Option A/B/C
- Portal shows all options; customer selects exactly one
- Approve Selected works
- Request Changes against selected option works
- next send forms a new round
- history shows selected option/decision
- final artwork upload still works
- final artwork ready email/Alert still works
- Add-to-Request uses final artwork
- existing Add-to-Request progress UI still works
- remove/re-add remains idempotent
- only one proof-ready notification/email per round
- helper remains read-only
- induced upload failure does not create a partial visible round

## 16. Exact next owner checkpoint

> **OWNER ACCEPT MULTI-PROOF PLAN AMENDMENT + AUTHORIZE IMPLEMENT**

Until that exact decision is explicit: **STOP**. Do not implement, deploy, stage, commit, push,
freeze, publish, migrate, backfill, rerun parent M0, or perform production action.

---

## Appendix — Original Plan body (historical)

The sections above incorporate and supersede the original 2026-09-12 Plan for pre-implement
execution. Original Formal Review text remains in
`docs/workflow/reviews/2026-09-12-assisted-creation-multi-proof-selection-review.md`
(Decisions A–E unchanged). Source-delta reconciliation remains at
`docs/workflow/reviews/2026-09-12-assisted-creation-multi-proof-selection-source-delta-reconciliation.md`
and is extended by the Classification-B amendment record.
