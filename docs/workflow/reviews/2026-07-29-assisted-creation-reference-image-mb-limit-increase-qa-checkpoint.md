# Assisted Creation Reference-Image MB Limit Increase — Owner QA

- **Goal:** `assisted-creation-reference-image-mb-limit-increase` (Goal #10)
- **Phase:** Test complete — Implementation Review **`APPROVED`**
  (`docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-implementation-review.md`)
- **Deployment:** dev Storage Rules deployed to `fresh-prints-dev` 2026-07-29T22:22:31Z
  (`docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-dev-rules-deployment-checkpoint.md`)
- **What changed:** custom-request (Assisted Creation) reference-image per-file limit is now **40 MB**
  (was 15 MB); file count stays **8**; a new **320 MB combined ceiling** is checked client-side before
  any upload begins.

---

## What was wrong, and what changed

Reference images customers attach to a custom-design request (Assisted Creation) were capped at
15 MB each. The owner selected 40 MB as the new per-file limit, keeping the 8-file count unchanged,
and specified that all 8 files together should never exceed 320 MB (8 × 40 MB exactly).

The limit is enforced in four places that all now agree at exactly 40 MB: the Portal upload screen,
the two server-side checks that run when you submit or update a request, and Firebase's own storage
security rules (the last line of defense, now live in the dev environment). A file exactly at 40 MB
is accepted everywhere; one byte over is rejected everywhere. While making this change, a small
pre-existing inconsistency was found and fixed: the storage security rule used to reject a file that
was *exactly* at the old 15 MB limit, even though every other layer accepted it — that inconsistency
is now resolved the same way at every layer.

The new 320 MB combined check runs on your device before any file starts uploading — if your
selection would push the total over 320 MB, nothing uploads and you see an error immediately.

Nothing about how large files preview or download changed in behavior — the same "try a fast preview
link first, fall back to a slower download with a 12-second safety timeout" approach that was already
protecting against a known past hang bug is unchanged, just shared between Portal and Studio now
instead of duplicated.

## Automated verification already performed (do not re-run these yourself)

- Repository lint, Functions build, Portal typecheck, Portal build, Studio build, changed-file lint,
  `git diff --check` — **all exit 0**.
- 44/44 focused automated tests pass, covering every boundary (exactly 40 MB, one byte over, exactly
  320 MB, one byte over, 8 files, a 9th file, removing/replacing a saved reference).
- A new automated test specifically checks that the storage security rule and the app's shared limit
  can never silently drift apart from each other.
- Independent Implementation Review: **APPROVED**, no issues found.
- Storage Rules deployment: Firebase CLI confirmed successful compile and release, exit 0, targeting
  `fresh-prints-dev` only. No Functions, Firestore Rules, indexes, App Hosting, or production
  resource was touched.

---

## What you need to test (only what genuinely requires a live, deployed session)

Use the smallest practical file set — you do not need eight real 40 MB files. A couple of
purpose-made test files plus normal everyday images is enough to prove the real behavior.

### Test 1 — Submit path: normal upload still works

1. Start a new custom-design (Assisted Creation) request in Portal.
2. Attach one ordinary reference image well under 40 MB (a normal phone photo is fine).
3. Submit the request.
4. Confirm the upload succeeds and the image appears on the request (in Portal's own view of the
   request you just submitted).

### Test 2 — Near-limit acceptance

1. Prepare (or find) one image file that is close to 40 MB — it does not need to be exactly 40 MB,
   just large enough to meaningfully exercise the new ceiling (e.g., 35–40 MB).
2. Attach it to a new or in-progress request and submit/save.
3. Confirm it is accepted — no error, upload completes, image appears on the request.

### Test 3 — Over-limit rejection

1. Prepare one file larger than 40 MB (any format/content is fine, as long as it's over the size
   limit).
2. Attempt to select it as a reference image.
3. Confirm you see a clear error telling you the file is too large — before or during upload, not
   after.
4. Confirm the request does **not** end up with a reference entry for that oversized file (check the
   request detail view).

### Test 4 — Combined 320 MB ceiling

You do not need to actually upload hundreds of megabytes for this test. The easiest way to trigger
it in the update flow: attach a small number of files whose sizes, added together (including any
already-saved references you're keeping), would exceed 320 MB, or — if easier — use a handful of
large (30–40 MB range) files that add up past the ceiling with only 2–3 files rather than needing
eight.

1. On an existing request (or a fresh one), select a combination of files that together exceed
   320 MB.
2. Confirm the app rejects the selection with a clear error **before any file starts uploading** —
   watch for any upload progress indicator or network activity; there should be none for a rejected
   over-ceiling selection.
3. Confirm no partial reference images were saved to the request.

### Test 5 — Update path: add, remove, replace

1. Open an existing Assisted Creation request you can edit (status must still allow customer edits —
   before staff starts work).
2. **Add** a new reference image — confirm it saves and appears alongside existing ones.
3. **Remove** one of the already-saved (retained) reference images — confirm it's gone after saving,
   and confirm doing so doesn't cause any size-related error even if you were previously close to a
   limit.
4. **Replace** a reference image (remove one, add a different one in the same edit) — confirm the
   final saved set is correct and no leftover/duplicate entry appears.

### Test 6 — Portal preview

1. Open a request with at least one reference image attached.
2. Confirm the reference image preview loads normally.
3. If you can simulate a slow/blocked connection (optional — skip if not practical), confirm the
   preview settles to a "preview unavailable" message within about 12 seconds rather than spinning
   forever.

### Test 7 — Studio staff access

1. In Studio, open the same customer request.
2. Confirm staff can view the reference image thumbnail/preview.
3. Confirm staff can download the reference image.
4. Confirm nothing about who can see/download changed — this should work exactly as it did before.

### Test 8 — Regression: proofs and customer uploads unaffected

1. If there's an existing request with a staff-added proof image, open it and confirm the proof
   image still previews normally (proofs have their own separate 25 MB limit, unchanged by this
   goal).
2. Separately, do one normal customer-upload artwork action (uploading print-request artwork, not
   Assisted Creation references) and confirm it behaves exactly as before — this feature was not
   touched by this goal, but it's worth one quick confirmation since it shares some underlying
   Storage infrastructure.

---

## How to report results

For each test above, reply with:

- `PASS` — worked exactly as expected
- `PASS WITH NOTES: <what you noticed>` — worked, but something was slightly off or worth mentioning
- `FAIL: <what happened instead>` — did not work as expected

A single overall result covering all 8 tests is fine if everything passed; call out any test
individually if it didn't.

**Signoff will not proceed until this QA checkpoint returns a result.**

---

## Owner QA Result — 2026-07-29

**Overall: FAIL**

### Test 2 (near-limit acceptance) / Test 1 (submit path): **FAIL**

**Reproduction:**
1. Portal Assisted Creation — selected one valid reference image larger than 15 MB but smaller than
   40 MB.
2. Reference picker accepted it, displayed "1 file(s) selected."
3. Clicked "Submit request."
4. Submission was **blocked** with: *"Each reference image must be 15 MB or smaller."*

Screenshot evidence provided by the owner.

**Owner-supplied evidence:**
- Storage Rules were successfully deployed to `fresh-prints-dev` — do not assume the problem is
  Storage Rules.
- The initial file-selection validator (picker) correctly accepted the larger file.
- The failure occurs later, at or after the final Submit action, and displays stale 15 MB copy —
  proving at least one live submit-path validation source or error-message source was missed,
  duplicated, stale, or not part of the running Portal build.

**Next action:** goal reopened; root-cause investigation and a narrow Plan amendment are required
before any further implementation. See the dated state.md entry and the Plan amendment document for
the full trace and fix.

---

## Root Cause and Fix — Amendment 1

**Root cause (confirmed, not a source-code defect):** Storage Rules were deployed for Goal #10, but
the two Cloud Functions callables that also enforce this limit server-side
(`submitAssistedCreationRequest`, `customerUpdateAssistedCreationRequest`) were never redeployed —
they were still running pre-Goal-#10 compiled code with the old 15 MB check. The application source
itself has been correct since the original Implement phase.

**Fix:** a scoped Cloud Functions redeployment (no application code change) — see
`docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-amendment-1-functions-deployment-checkpoint.md`
for the full deployment checkpoint, awaiting separate owner approval.

**New regression tests** added to `packages/shared/src/utils/assistedCreationValidation.test.ts`
specifically prove the 15–40 MB boundary the owner's reproduction hit, and that the error message
never mentions "15 MB" — see Amendment 1's Implementation Review for full detail.

---

## Reduced Owner Re-QA (after the Functions deployment checkpoint is approved and executed)

Once the scoped Functions deployment completes, only this narrower re-test is needed — not the full
original 8-test checkpoint above:

1. In Portal, attach a reference image between 15 MB and 40 MB (the same size class that failed
   before) to a new or existing Assisted Creation request.
2. Click "Submit request" (or "Save updates" if using the update path).
3. Confirm the submission **succeeds** — no "15 MB" error.
4. Confirm the reference image appears on the submitted/updated request.
5. Select a file above 40 MB and confirm it is still correctly rejected, with copy naming **40 MB**
   (not 15 MB).

Report using the same `PASS` / `PASS WITH NOTES: ...` / `FAIL: ...` format as before.

**Signoff will not proceed until this reduced re-QA checkpoint returns a result.**

---

## Reduced Owner Re-QA Result — 2026-07-29

**Overall: PASS**

The scoped Cloud Functions deployment
(`submitAssistedCreationRequest`, `customerUpdateAssistedCreationRequest`, deployed
2026-07-30T00:23:55Z per
`docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-amendment-1-functions-deployment-checkpoint.md`)
resolved the stale 15 MB deployed-callable behavior. Owner confirmed:

1. A reference image between 15 MB and 40 MB was attached and Submit/Save succeeded — no "15 MB"
   error.
2. The reference image appears correctly on the request.
3. A file above 40 MB is still correctly rejected, with copy naming 40 MB (not 15 MB).

**This closes the QA loop for Goal #10.** Proceeding to Signoff.
