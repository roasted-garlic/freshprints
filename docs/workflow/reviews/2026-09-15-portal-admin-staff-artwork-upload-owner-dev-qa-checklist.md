# Owner DEV QA — Portal Admin Staff Artwork Upload + Studio AI Review

Status: **Owner DEV QA PASS** after the recorded Staff Artwork bulk 400 and Design Library
hybrid-lifecycle FAIL and successful corrective retests. The three exact Workstream B DEV Functions
are deployed and ACTIVE. Signoff is recorded in `2026-09-15-portal-admin-staff-artwork-upload-signoff.md`.

DEV runtime preflight already completed: unauthenticated smoke calls to
`promoteStaffArtworkToAiReview`, `reprocessReadyDesignWithAi`, and `enqueueAiEnrichment` returned
the expected `401 UNAUTHENTICATED`, with no data or AI mutation attempted.

## Owner DEV QA result — PASS — 2026-09-15

Owner confirmed all required corrective retests passed:

- Portal Admin navigation, valid PNG queueing, upload progress, Ready completion, Studio visibility,
  and the prior silent no-op correction.
- Staff Artwork Multiple Select, full-card select/deselect, modal/preview suppression, restoration
  on exit, valid clean Ready/unreferenced bulk promotion, safety blockers, owner/admin authority,
  single-item parity, and Auto-process ON/OFF.
- Design Library Multiple Select, full-card select/deselect, Design Details suppression/restoration,
  canonical Ready → imported/pending AI Review → approval → Ready lifecycle, normal AI Review
  controls, Auto-process ON/OFF, no hybrid visibility, and no false Retry failed classification.

Owner DEV QA is complete with **PASS**. The checklist below remains the detailed evidence matrix;
no production action was included in the approval.

## Workstream B corrective retest — required first

The historic Staff Artwork 400 cannot be tied to an exact selected ID because DEV logs did not
retain request bodies. Use a fresh or known clean **ready, unreferenced** Staff Artwork record;
the five current blocker records reported in the Test Report are not valid promotion candidates
and must not be mutated. Confirm the visible bulk error includes a bounded callable code/message if
you intentionally test a blocked record.

## Corrective retest — Portal Admin upload

- [ ] As active owner/admin, open `/admin/staff-artwork` through localhost plus the
      `myprintrequest.dev` tunnel; confirm the page is reachable and the file chooser accepts PNG.
- [ ] Select one valid PNG under 80 MB; confirm the file row appears immediately as **Queued** and
      **Start upload** becomes enabled.
- [ ] Click **Start upload** once; confirm the row visibly progresses through **Uploading** (with
      progress), **Processing**, and **Ready**, and that the ready confirmation names the Studio
      Staff Artwork destination.
- [ ] Try an invalid type and an oversized file; confirm each is rejected with visible bounded
      feedback and never becomes an upload row.
- [ ] Select multiple valid PNGs; confirm they process one at a time in order, a second click does
      not duplicate work, and any failure shows **Failed** plus a visible error and retries only that
      failed file.

The prior symptom was a valid-file selection appearing to do nothing. If any retest step fails,
stop and record the exact file, browser/origin, visible state, and console/network error; do not
continue to Studio AI QA.

## Portal Admin

- [ ] As active owner/admin, open `/admin/staff-artwork`; confirm Admin navigation shows Show Queue
      and Staff Artwork Upload separately, with the active destination highlighted.
- [ ] Confirm helper, customer, anonymous, and inactive sessions are denied; confirm admin login
      return-to preserves `/admin/staff-artwork`.
- [ ] Upload a valid PNG under 80 MB; confirm progress, completion, and ready result. Try an invalid
      type/oversized file and confirm it is rejected before upload.
- [ ] Upload multiple files; confirm one-at-a-time progress/order, no duplicate on double click,
      and Retry failed retries only the failed item while reusing its created ID.
- [ ] Confirm this page has no Staff Artwork library/listing and no derivative/production preview
      surface; confirm existing Show Queue behavior remains intact on desktop and mobile widths.

## Studio Design Library

- [ ] As owner, enter the separate AI Multiple Select mode; select/deselect eligible Ready,
      approved, non-archived cards while search/filter/load-more and Design Details still work.
- [ ] In Multiple Select, click the image, title, card background, and ordinary card content; each
      full-card click selects/deselects without opening Design Details. Confirm selected styling and
      selected state are obvious. If a card is keyboard-interactive, Enter and Space must toggle it.
- [ ] Exit Multiple Select; confirm a normal card click immediately opens Design Details again. No
      existing Shift+click range behavior exists in this library, so there is no range gesture to
      validate.
- [ ] Confirm selected count, Cancel, partial-success handling, and failed-only retry. Confirm
      Print Request selection and archive/purge selection remain separate.
- [ ] With Auto-process on and off, send selected designs to AI Review. Confirm raw
      `status: "ready"` + `aiReviewStatus: "approved"` is replaced by the normal
      `status: "imported"` + `aiReviewStatus: "pending"` lifecycle and the item leaves the normal
      Design Library browse while processing. Auto on begins through the existing queue; Auto off
      waits for normal manual Start AI.
- [ ] In AI Review, confirm the Ready item appears in Processing/Needs Review as appropriate,
      is usable by normal retry/reprocess/delete/archive/multi-select controls, and normal approval
      returns it to `status: "ready"` + `aiReviewStatus: "approved"` and the Design Library.

## Studio Staff Artwork

- [ ] As owner and admin, use the separate AI Multiple Select mode on ready, non-archived artwork;
      confirm existing per-item promotion runs once and already-promoted items are idempotent.
- [ ] In Multiple Select, click anywhere on the image, title, card background, or ordinary card
      content to select/deselect. Confirm the Staff Artwork preview/details behavior is suppressed,
      selected state is visible and exposed, and Enter/Space toggles the keyboard-interactive card.
- [ ] Exit Multiple Select; confirm normal image preview/modal behavior immediately returns. No
      existing Shift+click range behavior exists in this library, so there is no range gesture to
      validate.
- [ ] Confirm Auto-process on/off uses the existing preference, no forced enqueue occurs, successful
      source cards reconcile, and partial failure retry includes only failed IDs.
- [ ] With a clean ready/unreferenced record, confirm bulk promotion does not return HTTP 400 and
      follows the same callable result as the existing single-item action. With a deliberately
      blocked record, confirm the failure is truthful and includes bounded `failed-precondition`
      details without bypassing the safety guard.
- [ ] Confirm helper has no AI promotion action and normal Print Request selection is unaffected.
- [ ] Confirm the existing single-item Staff Artwork Send to AI Review path still works without a
      forced queue override.

## AI Review safety

- [ ] Confirm Processing, Needs Review, and Rejected tabs retain their existing behavior, including
      manual Start AI and failed/stale retry for eligible items.
- [ ] Confirm no duplicate active attempt is created by repeated clicks or an already-processing
      request.

Record the result as `DEV ... QA: PASS` or `PASS WITH NOTES` before Signoff. Production deployment,
Portal publication, Studio release, Rules deployment, and data mutation remain separately gated.
