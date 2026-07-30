# Implementation Review — Increase the MB Limit for Custom-Request Reference Images

**Scope:** independent review of the actual final diff against the approved Plan, the Formal
Review's two binding requirements, and the owner's exact decision (40 MB/file, 8 files unchanged,
320 MB combined) — not a review of the implementation's own narrative claims.

## Verdict: APPROVED

All required checklist items pass, independently re-verified against the real diff.

## Files reviewed

- `packages/shared/src/constants/assistedCreation/assistedCreation.constants.ts`
- `storage.rules`
- `packages/shared/src/utils/assistedCreationValidation.ts` (+ test)
- `packages/shared/src/constants/storageRulesAlignment.test.ts`
- `apps/portal/features/assisted-creation/services/assistedCreationService.ts`
- `apps/portal/features/assisted-creation/components/AssistedCreationUpdateModal.tsx`
- `apps/portal/features/assisted-creation/utils/assistedCreationReferenceFilesValidation.ts` (+ test, new)
- `packages/shared/src/utils/withTimeout.ts` (+ test, new)
- `apps/studio/src/renderer/src/features/customer-requests/services/assistedCreationRequestsService.ts`
- `docs/project/DECISIONS.md` (ADR-FP-124)

## Findings

1. **Exact owner values implemented — PASS.** Confirmed `ASSISTED_CREATION_MAX_REFERENCE_BYTES = 40
   * 1024 * 1024` and `ASSISTED_CREATION_MAX_REFERENCE_IMAGES` left at `8` (zero diff on that line).
   Confirmed `ASSISTED_CREATION_MAX_REFERENCE_TOTAL_BYTES` is computed as
   `ASSISTED_CREATION_MAX_REFERENCE_IMAGES * ASSISTED_CREATION_MAX_REFERENCE_BYTES` (not a separately
   hand-typed `320 * 1024 * 1024` literal), which both matches the owner's stated 320 MB value and
   guarantees the two constants can never drift apart from each other.
2. **All four enforcement layers updated and consistent — PASS.** Traced each layer to its exact
   40 MB check: Portal client (`assistedCreationReferenceFilesValidation.ts`, imports the constant
   directly), submit-path parser and update-path parser (both call the same new
   `assertReferenceImageTotalWithinCeiling` helper — no duplicated logic), and `storage.rules`
   (`<= 40 * 1024 * 1024`). All four are reachable from the same import chain rooted at
   `assistedCreation.constants.ts`.
3. **Boundary consistency — PASS, and a real pre-existing bug was fixed.** Independently confirmed
   the prior `storage.rules` used `<` (exclusive) while the TS validators used `>` for rejection
   (i.e., inclusive accept-at-limit) — a genuine, previously-unnoticed inconsistency. The fix
   (`<=`) correctly aligns Storage Rules with the TS validators' semantics. This was not required by
   the Formal Review or the resume prompt explicitly, but is directly required by the prompt's own
   binding requirement 1 ("A file exactly at the limit must be accepted") — the fix was necessary to
   satisfy that requirement at the Storage Rules layer, not scope creep.
4. **Required change 1 (mandatory Rules-to-constant drift test) — PASS, verified functionally, not
   just present.** Independently re-derived what the new `storageRulesAlignment.test.ts` test does:
   it extracts the literal `request.resource.size <= <expr> &&` text from `storage.rules`, parses the
   arithmetic factors, multiplies them, and asserts numeric equality against the live imported
   `ASSISTED_CREATION_MAX_REFERENCE_BYTES`. This is a genuine cross-check, not two independently
   hardcoded assertions of "40" — confirmed by tracing that the test would fail if either side
   changed without the other (the assertion compares two independently-derived values, not two
   copies of the same source literal).
5. **Required change 2 (client-side pre-upload total check, not server-only) — PASS, and the
   upload-order guarantee is real, not merely asserted.** Traced the actual call sequence in both
   paths:
   - Submit path: `useAssistedCreationWizard.setReferenceFiles` validates before calling
     `setReferenceFilesState`; an invalid/over-ceiling selection never enters `referenceFiles` state;
     `submitRequest` (called later, on a separate user action) uploads whatever is in that state —
     so an over-ceiling selection can never reach `uploadPendingReferences`/`uploadBytes` at all.
   - Update path: `AssistedCreationUpdateModal`'s file-picker `onChange` and the kept-reference
     "Remove" button both call `validateReferenceFiles(files, keptBytes)` and set `uploadError`
     before/instead of calling `setNewFiles`; the Save button is `disabled={... || Boolean(uploadError)}`,
     a second independent guard.

   Zero uploads occur on an over-ceiling selection in either path — confirmed by code-path tracing,
   not by trusting the test report's claim alone.
6. **Removed/replaced files not double-counted — PASS, verified against real state transitions.**
   `AssistedCreationUpdateModal`'s "Remove" handler computes `nextKept` (the array *after* removal)
   and passes its sum as `existingRetainedBytes` — the removed image's bytes are excluded from the
   very next validation call, not merely "eventually." The three new
   `parseAssistedCreationReferenceImageUpdateInputs` tests (removal, replacement, retained-plus-new)
   independently prove the server-side parser has the same correct exclusion behavior.
7. **Preview/download timeout protection — PASS, and the consolidation is a genuine, verified
   no-op refactor.** Diffed both `assistedCreationService.ts` and
   `assistedCreationRequestsService.ts`: each had `withTimeout` deleted and replaced with an import
   of the identical logic now in `packages/shared/src/utils/withTimeout.ts` — confirmed byte-for-byte
   logical equivalence (same `setTimeout`/`clearTimeout`/`.then()` structure). Studio's full
   `build:studio` (tsc + vite + electron-builder) passing confirms the Electron/renderer import
   resolves correctly, which is the real risk in this kind of cross-package extraction. The 12-second
   bound remains unchanged in both call sites (`STORAGE_DOWNLOAD_TIMEOUT_MS = 12_000`, untouched).
8. **No customer-upload, Goal #9, or catalog-derivative code touched — PASS.** `git status` confirms
   the complete file list above; no `customerUploads`, `finalizeCustomerUpload*`,
   `boundedConcurrencyQueue`, or catalog `Design`/derivative file appears anywhere in the diff. The
   `generated/catalog-reference/...` block present in the current `storage.rules` diff view belongs
   to unrelated pre-existing dirty-worktree content from a different goal (confirmed it sits below
   this goal's one-line hunk, unrelated match blocks) — correctly left untouched.
9. **No new dependency — PASS.** No `package.json`/`package-lock.json` change in the diff.
10. **Test coverage matches every required item — PASS.** Cross-checked the resume prompt's 21-item
    required-test list against the actual 44 passing tests; every item has direct coverage (see the
    test report's requirement-coverage table, independently spot-checked here for the two most
    security-relevant items: "an over-ceiling selection causes zero uploads" — confirmed via code-path
    tracing in Finding 5 above, not merely a passing unit test; "ownership and path restrictions
    remain unchanged" — confirmed via diff inspection showing zero lines changed in
    `assistedCreationReferencePromote.ts` or any `requirePortalCustomer`/prefix-check logic).

## Residual Risk

None blocking. One item worth flagging for awareness (not a defect): the
`parseAssistedCreationReferenceImageUpdateInputs`'s `raw == null` early-return branch (a no-op update
that only touches non-reference fields) does not re-run `assertReferenceImageTotalWithinCeiling`
against the unmodified `existingImages` list. This is correct behavior, not a gap — those images were
already validated when first accepted, and re-validating an unchanged list on every unrelated edit
would be wasted work with no security benefit (Storage Rules remains the authoritative per-file gate
regardless).

## Recommendation

Proceed to Signoff-adjacent workflow steps once the deployment checkpoint below is reviewed. Do not
deploy `storage.rules` without explicit owner approval — the Rules change is real and required for
the new limit to take effect anywhere outside local/emulated testing.
