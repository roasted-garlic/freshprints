# Implementation Review — Studio Editing → Re-add Show Queue Corrective

Date: 2026-09-09
Goal: `user-info-print-request-lifecycle-activity-ordering`
Corrective: `studio-editing-readd-show-queue-permissions-corrective`
Review status: **Implementation complete; stop before DEV deploy**

## Implemented scope

* Ran Phase 0 against realistic post-unqueue documents before choosing the implementation path.
* Added the narrow `staffCanActivateEditingPrintRequest` Rules fast path. It permits only
  `editing → active` with `status`, `updatedBy`, and `updatedAt` changed; lifecycle mirrors,
  queue/parking fields, bidding acknowledgement, and identity snapshots remain client-immutable.
* Added the exact trusted callable export `allocateStudioPrintRequestToShow`.
  It authenticates active staff, validates request origin/status, show eligibility/capacity, all
  remaining item quantities, and split legs, then creates allocations, recomputes each affected
  show total, activates the request, clears editing/requeue parking, and recomputes `queueTab` in
  the same trusted workflow. A retry or fully allocated `editing` row repairs status/parking
  without fabricating allocation quantity.
* Replaced the Add to Show modal's N sequential client allocation calls with one callable request.
  Partial plans are blocked in the UI and server; complete plans may contain multiple destination
  show legs. Allocation failure and success paths now reconcile request/allocation state through the
  existing reload helpers before presenting server-derived UI.
* Left the Portal `queuePortalPrintRequestToShow` path unchanged; its Admin transaction remains
  the trusted Portal queue path.

## Exact callable contract

`allocateStudioPrintRequestToShow({ printRequestId, legs })`, where each leg is
`{ upcomingShowId, quantitiesByItemId }`. Export: `functions/src/index.ts`.

## Explicit non-actions

No Functions, Rules, indexes, Storage Rules, hosting, Studio/Portal publish, DEV/production deploy,
backfill, data repair, commit, or push was performed. The known DEV partial row is repaired only
when an authorized callable invocation is later made; no direct data mutation occurred here.

Next required marker:

`[NEEDS OWNER AUTHORIZATION: DEV DEPLOY STUDIO EDITING RE-ADD SHOW QUEUE CORRECTIVE]`
