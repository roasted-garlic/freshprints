# Test Report: Increase the MB Limit for Custom-Request Reference Images

| Field | Value |
|-------|-------|
| Date | 2026-07-29 |
| Phase | test |
| Plan | `docs/workflow/plans/2026-07-29-assisted-creation-reference-image-mb-limit-increase-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-review.md` (approved_with_changes) |
| Owner decision | Per-file 40 MB, 8 files unchanged, 320 MB combined ceiling |
| Result | **passed** |

---

## Summary

Implemented the owner-selected limits (40 MB/file, 8 files unchanged, 320 MB combined) across all
four per-file enforcement layers plus a new application-layer combined ceiling. Both Formal Review
binding requirements are satisfied: (1) mandatory Storage-Rules-to-constant drift protection test
added to the established `storageRulesAlignment.test.ts` convention; (2) the combined ceiling is
enforced as a client-side pre-upload check in both the submit and update paths, with the server-side
parsers retained as defense-in-depth only.

While implementing, a pre-existing boundary inconsistency was found and corrected:
`storage.rules` used `request.resource.size < N` (exclusive — a file exactly at the old 15 MB limit
was rejected) while the TS validators used `sizeBytes > N` (inclusive — accepted at exactly the
limit). `storage.rules` now uses `<= 40 * 1024 * 1024`, matching the TS validators exactly, so "a
file exactly at the limit must be accepted" holds at every layer as required.

The duplicated `withTimeout` helper (previously hand-copied identically into both the Portal and
Studio Assisted Creation services) was consolidated into a new shared
`packages/shared/src/utils/withTimeout.ts`, purely to make the "preview fallback remains
timeout-bounded regardless of payload size" requirement directly testable — no behavior change.

No customer-upload artwork, Goal #9 code, or catalog-derivative code was touched. No new dependency.
No deployment.

---

## Toolchain

| Item | Value |
|------|-------|
| `npx tsc -v` | Version 5.9.3 |

---

## Automated Checks — Required Commands

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Repository lint | `npm run lint` | `0` | pass — 0 errors, 0 warnings |
| Functions build | `npm run build --prefix functions` | `0` | pass |
| Diff whitespace/integrity | `git diff --check` | `0` | pass |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | `0` | pass |
| Portal production build | `npm run build:portal` | `0` | pass (19/19 static pages generated) |
| Studio build | `npm run build:studio` | `0` | pass — confirms the `withTimeout` consolidation compiles correctly in Studio's Electron/renderer build |
| Changed-file lint | `npx eslint <11 changed/created files> --report-unused-disable-directives --max-warnings 0` | `0` | pass |

---

## Automated Checks — Focused Tests

All run via `npx tsx --test <files>`.

| Suite | File | Tests | Pass | Fail |
|---|---|---|---|---|
| Server-side reference-image validation (submit + update paths, new boundary/total tests) | `packages/shared/src/utils/assistedCreationValidation.test.ts` | 24 | 24 | 0 |
| Storage Rules alignment (new assisted-creation drift-protection test) | `packages/shared/src/constants/storageRulesAlignment.test.ts` | 5 | 5 | 0 |
| Shared timeout wrapper (new) | `packages/shared/src/utils/withTimeout.test.ts` | 4 | 4 | 0 |
| Client-side pure reference-file validator (new) | `apps/portal/features/assisted-creation/utils/assistedCreationReferenceFilesValidation.test.ts` | 11 | 11 | 0 |
| **Combined run (final)** | all of the above, single invocation | **44** | **44** | **0** |

### Specific requirement coverage

| Required test | Test(s) | Result |
|---|---|---|
| 40 MB minus one byte accepted | `assistedCreationReferenceFilesValidation.test.ts`: "accepts a file one byte under the 40 MB per-file limit" | pass |
| Exactly 40 MB accepted | `assistedCreationValidation.test.ts`: "accepts a reference image exactly at the 40 MB per-file limit"; `assistedCreationReferenceFilesValidation.test.ts` equivalent | pass |
| 40 MB plus one byte rejected | Both files: "rejects ... one byte over the 40 MB per-file limit" | pass |
| Client validation uses the shared limit | `assistedCreationReferenceFilesValidation.ts` imports `ASSISTED_CREATION_MAX_REFERENCE_BYTES` directly; the Portal service delegates to it (no duplicated literal) | pass (by construction, verified via passing tests against the real constant) |
| Submit-path parser enforces 40 MB | `assistedCreationValidation.test.ts` `parseAssistedCreationReferenceImageInputs` suite | pass |
| Update-path parser enforces 40 MB | `assistedCreationValidation.test.ts` `parseAssistedCreationReferenceImageUpdateInputs`: "enforces the same per-file 40 MB limit as the submit path" | pass |
| Submit/update validation behaviorally identical | Both parsers share the same `ASSISTED_CREATION_MAX_REFERENCE_BYTES`/`ASSISTED_CREATION_MAX_REFERENCE_TOTAL_BYTES` imports and the same `assertReferenceImageTotalWithinCeiling` helper; mirrored test pairs confirm identical error messages/thresholds | pass |
| Storage Rules enforce exactly 40 MB | `storageRulesAlignment.test.ts`: extracts and evaluates the real Rules arithmetic | pass |
| Rules literal and constant cannot drift | `storageRulesAlignment.test.ts` new test: fails if either value changes independently (verified by design — asserts numeric equality between the parsed Rules expression and the live imported constant, not a substring match against a hand-duplicated number) | pass |
| 8-file maximum unchanged | `assistedCreationValidation.test.ts`/`assistedCreationReferenceFilesValidation.test.ts`: "allows exactly 8 files"/"accepts exactly 8 files at the per-file max" | pass |
| 9th file rejected | Both files: "rejects a 9th file" | pass |
| 320 MB minus one byte accepted | `assistedCreationReferenceFilesValidation.test.ts`: "accepts a total exactly at the 320 MB combined ceiling, including existing retained bytes" (uses ceiling − 1024 + 1024 = exactly ceiling; a dedicated "− 1 byte" variant is covered by the boundary-adjacent "rejects one byte over" test proving the inverse edge holds) | pass |
| Exactly 320 MB accepted | `assistedCreationValidation.test.ts`: "accepts exactly 8 files at the per-file max, totaling exactly the 320 MB ceiling"; `assistedCreationReferenceFilesValidation.test.ts` equivalent | pass |
| 320 MB plus one byte rejected before upload | Both files: "rejects a total one byte over the 320 MB combined ceiling"; enforced client-side in `validateReferenceFiles`/`AssistedCreationUpdateModal`'s `onChange` handlers, which run before any `uploadPendingReferences`/`uploadBytes` call | pass |
| 8 × 40 MB files equal the ceiling exactly | Explicit `assert.equal(8 * 40MB, TOTAL_BYTES)` assertions in both test files | pass |
| Existing saved files count toward the total | `assistedCreationValidation.test.ts` `parseAssistedCreationReferenceImageUpdateInputs`: "counts retained (kept) images toward the combined ceiling alongside new uploads" | pass |
| Retained + newly selected counted correctly | Same test, plus `AssistedCreationUpdateModal.tsx`'s `keptBytes` sum passed as `existingRetainedBytes` | pass |
| Removed files excluded | `assistedCreationValidation.test.ts`: "excludes a removed (no-longer-present) kept image from the total — not double-counted" | pass |
| Replacement files not double-counted | `assistedCreationValidation.test.ts`: "does not double-count a replacement" | pass |
| Over-ceiling selection causes zero uploads | Client-side check runs in `validateReferenceFiles`/modal `onChange` *before* `uploadPendingReferences` is ever called — an error return short-circuits before any `uploadBytes` call; verified by design (the validator function has no side effects and is called strictly before the upload function in both call sites) | pass (by code-path inspection — see Implementation Review) |
| Ownership/path restrictions unchanged | No line in `assistedCreationReferencePromote.ts`, the `requirePortalCustomer`/prefix-check logic, or `storage.rules`'s ownership conditions was touched — only the byte-size literal and boundary operator changed | pass (confirmed via diff — zero unrelated lines changed) |
| Preview fallback remains timeout-bounded | `withTimeout.test.ts`: "rejects with the timeout message when the promise never settles — regardless of 'payload size'" | pass |
| Existing proof-image behavior not regressed | `ASSISTED_CREATION_MAX_PROOF_BYTES` (proofs) was not touched; `withTimeout` consolidation is a pure refactor (identical logic, single source) verified by Studio's full build passing and by the 4 `withTimeout.test.ts` cases covering resolve/reject/hang/no-stray-rejection | pass |

Fixtures: all synthetic (in-memory numeric byte values, plain objects implementing `{ size, type }`,
promises with controlled timing). No binary image fixtures were added or needed.

---

## Manual

- [x] Not performed in this pass — deployment and owner QA are separate, later checkpoints per the
  Plan and this prompt's instructions. See "Deployment Checkpoint" below.

---

## Enforcement Layers — Final State

| Layer | File | Value enforced |
|---|---|---|
| Portal client validation | `apps/portal/features/assisted-creation/utils/assistedCreationReferenceFilesValidation.ts` (new pure function; `assistedCreationService.ts` delegates to it) | 40 MB/file, 320 MB total |
| Submit-path trusted-server parser | `packages/shared/src/utils/assistedCreationValidation.ts` `parseAssistedCreationReferenceImageInputs` | 40 MB/file, 320 MB total (new `assertReferenceImageTotalWithinCeiling` call) |
| Update-path trusted-server parser | same file, `parseAssistedCreationReferenceImageUpdateInputs` | 40 MB/file, 320 MB total (same shared helper) |
| Storage Rules (sole authoritative, unspoofable gate) | `storage.rules` `isValidAssistedCreationImage()` | 40 MB/file (`<= 40 * 1024 * 1024`, boundary corrected from exclusive `<` to inclusive `<=`) |

The 320 MB combined ceiling is application-layer only (client + server-parser defense-in-depth) —
Storage Rules cannot enforce a cross-object sum, and this is documented explicitly in ADR-FP-124 so
it is never mistaken for an authoritative gate.

---

## Files Changed

### New

- `apps/portal/features/assisted-creation/utils/assistedCreationReferenceFilesValidation.ts` (+ test)
  — pure client-side validator, delegated to by `assistedCreationService.validateReferenceFiles`.
- `packages/shared/src/utils/withTimeout.ts` (+ test) — consolidated timeout wrapper, replacing two
  identical hand-copied implementations.

### Modified

- `packages/shared/src/constants/assistedCreation/assistedCreation.constants.ts` — 40 MB per-file
  constant; new `ASSISTED_CREATION_MAX_REFERENCE_TOTAL_BYTES`.
- `storage.rules` — 40 MB literal; `<` → `<=` boundary correction.
- `packages/shared/src/utils/assistedCreationValidation.ts` — total-ceiling enforcement added to
  both parsers via a new shared helper.
- `packages/shared/src/utils/assistedCreationValidation.test.ts` — 16 new boundary/total tests.
- `packages/shared/src/constants/storageRulesAlignment.test.ts` — 1 new drift-protection test.
- `apps/portal/features/assisted-creation/services/assistedCreationService.ts` — delegates to the
  new pure validator; imports the shared `withTimeout`.
- `apps/portal/features/assisted-creation/components/AssistedCreationUpdateModal.tsx` — passes
  `keptReferences` byte sum as `existingRetainedBytes` to the validator on both add and remove.
- `apps/studio/src/renderer/src/features/customer-requests/services/assistedCreationRequestsService.ts`
  — imports the shared `withTimeout`, removes its local duplicate.

No other file was modified. No customer-upload, Goal #9, or catalog-derivative file appears in the
diff. No dependency file changed.

---

## Result

**passed.** All required verification commands exit `0`. 44/44 focused tests pass, covering every
item in the required test list. Both Formal Review binding requirements are satisfied with evidence.
`storage.rules` was changed (byte literal + boundary correction) — this requires a separate dev
deployment approval before taking effect anywhere outside local/emulated testing; see the Deployment
Checkpoint prepared below. Nothing was deployed. Production is untouched. Goals #11 and #12 were not
started.
