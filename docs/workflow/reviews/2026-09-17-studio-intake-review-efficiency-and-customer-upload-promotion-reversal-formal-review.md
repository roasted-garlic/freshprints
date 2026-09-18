# Formal Review — Studio intake review efficiency and customer-upload promotion reversal

Date: 2026-09-17  
Plan: `docs/workflow/plans/2026-09-17-studio-intake-review-efficiency-and-customer-upload-promotion-reversal-plan.md`  
Verdict: **approved_with_changes — owner acceptance required before implementation**

## Review basis

The review reconciled the requested behavior against the current HEAD (`75980e36`), the existing
Customer Upload promotion/exclusion/restore callables, the generic permanent design and upload
delete guards, the AI attempt-identity pipeline, the process-local sequential queues, the shared
intake component/hook, the AI Review `a`/`r` shortcut convention, and the existing AI Review
multi-selection helpers.

The root cause is confirmed: `deleteEligibleUnapprovedDesign` deliberately rejects any design
with `sourceCustomerUploadId`. That guard must remain unchanged. A dedicated provenance-aware
staff callable is the correct boundary for reversal.

## Required bounded conditions

1. **No generic-delete weakening.** The new callable must never call or broaden
   `deleteEligibleUnapprovedDesign`. Its active staff authorization must remain aligned with the
   existing Customer Upload intake callables. The generic customer-upload Delete Upload flow and
   its request/allocation blockers remain unchanged.
2. **Recoverable lifecycle.** Invalidate the AI attempt before cleanup, use strict idempotent
   canonical design-asset cleanup, then perform a final transaction that rechecks provenance and
   downstream references before deleting the derived design and unlinking the upload. Storage
   failure leaves the link/design available for retry; it must not report success with silent
   partial cleanup.
3. **Narrow eligibility.** Server validation must reject Ready/approved/archived designs,
   imports/staff artwork, mismatched links, and any print-item/show-allocation/companion reference.
   The callable must preserve the original upload, all source/production/preview/thumbnail
   objects, request/allocation history, consent evidence, and technical fields. It starts the
   canonical 14-day `staff_review` retention episode and clears only the active promoted-design
   backlink after successful retirement; retain `promotedAt`.
4. **Stale AI safety.** Pending background and AI Review queue IDs may be removed/skipped. There is
   no provider-cancel claim. Active provider work is allowed to settle only through existing
   attempt-identity guards, which must prove that stale stage/success/failure writes do not
   resurrect or recreate a design.
5. **UI scope.** Ordinary intake Exclude is immediate and reversible; permanent Delete Upload and
   Restore confirmations remain. The AI Review reversal is a dedicated single-item action with
   explicit impact copy, not a permanent-delete dialog or bulk action. Use the exact label
   **Undo Promotion & Exclude** unless Owner changes it before implementation.
6. **Keyboard and selection.** Reuse `a`/`r` for intake Send-to-AI/Exclude, keep guarded
   ArrowUp/ArrowDown navigation, and reuse the existing multiple-select toggle/range/clear model.
   Bulk intake actions are serial and report partial results truthfully; selection must reconcile
   on filters, tabs, live row removal, and failures.
7. **Preview.** Enlarge the existing derivative preview responsively with intrinsic aspect ratio,
   no crop/overflow, and preserve Auto/Light/Dark/Halftone controls. Do not add an original-image
   fetch or derivative.
8. **Deployment boundary.** No Rules, index, schema, migration, Portal, production, or release
   work is authorized by this review. Later DEV deployment requires explicit owner approval and a
   narrow Functions allowlist, followed by Owner DEV QA.

## Review result

**Approved with the conditions above.** The plan is sufficiently bounded to implement after Owner
acceptance. The implementation phase must stop and return for review if it requires a new durable
audit field, a change to the generic deletion guard, a Ready/downstream reversal, a new composite
index, or a change to the existing 14-day retention semantics.

## Owner acceptance gate

Owner acceptance is required before any app or Function implementation begins. This Plan/Review
pass intentionally stops before implementation and before any DEV or production deployment.
