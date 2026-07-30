# Implementation Review — Amendment 1 (Owner QA FAIL, Stale 15 MB Enforcement)

**Scope:** independent review of the actual final diff against Amendment 1's Formal Review — not a
review of the amendment's own narrative claims.

## Verdict: APPROVED

## Files reviewed

- `packages/shared/src/utils/assistedCreationValidation.test.ts` (the only file changed by this
  amendment)

## Findings

1. **Root cause independently re-confirmed as a deployment gap, not a source defect — PASS.**
   Re-traced the same evidence chain the Formal Review verified: `functions/src/assistedCreationRequests.ts:252,409`
   calls the exact parser functions in `packages/shared/src/utils/assistedCreationValidation.ts` that
   were updated during Goal #10's original Implement phase; the local compiled build
   (`functions/lib/packages/shared/src/constants/assistedCreation/assistedCreation.constants.js:16`)
   correctly shows `40 * 1024 * 1024`; `git log` shows no commit/deploy of these files since before
   Goal #10 began; and the only deployment action taken for this goal to date
   (`firebase deploy --only storage`) does not touch Cloud Functions. This fully and consistently
   explains the reported symptom without requiring any source code to be wrong.
2. **No source code changed — PASS, confirmed by diff, not by claim.** `git status`/`git diff --stat`
   confirm the only file touched in this amendment is the test file. `assistedCreation.constants.ts`
   and `storage.rules` show as modified in `git status` but their diff line counts are unchanged from
   before this amendment session — they are Goal #10's original, already-reviewed changes, not new
   edits.
3. **Composed regression tests target the real boundary the QA failure hit — PASS.** The new
   `describe("Goal #10 Amendment 1 — 15 MB/40 MB boundary regression (submit + update parity)")`
   block specifically tests `FIFTEEN_MB + 1` (the owner's exact reproduction size class — "larger than
   15 MB but smaller than 40 MB"), not merely a generic "below 40 MB" case that the original test
   suite already covered. This is a meaningfully different, more targeted test than what existed
   before the QA failure.
4. **Message-content assertions are real, not tautological — PASS.** The two "names 40 MB and never
   mentions 15 MB" tests use `assert.doesNotMatch(error.message, /15 ?MB/)` in addition to
   `assert.match(error.message, /40 MB/)` — this is the exact assertion shape that would have caught
   the reported symptom class (a message that happens to still say "15 MB") had it been a source
   defect rather than a deployment gap. Confirmed these tests would fail against the pre-Goal-#10
   source (which produces exactly "Each reference image must be 15 MB or smaller.") by manually
   checking the old literal against both regex assertions — `/40 MB/` would not match and
   `/15 ?MB/` would match, so both assertions would correctly fail.
5. **Submit/update parity test is genuinely comparative, not two independent assertions — PASS.**
   The "submit and update paths produce identical accept/reject decisions" test drives both parser
   functions with the *same* input array across 4 boundary cases and asserts three things per case:
   submit path matches expected, update path matches expected, AND submit path equals update path.
   This would catch a future regression where only one of the two paths gets fixed/updated, which is
   exactly the class of "one path patched, the other forgotten" risk this amendment is about.
6. **"No partial upload / no partial reference entry" claim is honestly scoped — PASS.** The test
   comment explicitly acknowledges this proves the property "at the parser level" and points to
   `assistedCreationService.uploadPendingReferences` as the reason a thrown parser is sufficient
   proof (the real Storage upload only ever runs after the parser has already succeeded client-side).
   This does not overclaim end-to-end proof it cannot actually provide without a live-callable
   integration harness (correctly noted as absent from this repo, per the Formal Review's Testing
   Review finding).
7. **320 MB ceiling and 8-file count re-asserted — PASS.** Both explicitly re-tested within the new
   regression suite, not merely assumed to still be covered by the pre-existing suite (defense against
   a future edit to this file accidentally deleting or weakening those cases without anyone noticing).
8. **No value changed — PASS.** `ASSISTED_CREATION_MAX_REFERENCE_BYTES`, the 8-file count, and
   `ASSISTED_CREATION_MAX_REFERENCE_TOTAL_BYTES` are read from the actual shared constants import in
   every new test (e.g., `assert.equal(ASSISTED_CREATION_MAX_REFERENCE_IMAGES, 8)`), not hardcoded
   literals that could silently drift from the real values.
9. **Verification matrix — PASS.** All required commands re-run and confirmed exit 0: Portal
   typecheck, Portal build, repository lint, changed-file lint, `git diff --check`, and 49/49 focused
   tests (33 in the amended file, 16 across the two adjacent test files that must remain passing).

## Residual Risk

None blocking. The Formal Review's one binding condition (confirm via `git diff` that the scoped
Functions redeploy carries only this goal's change) applies to the **future deployment checkpoint**,
not to this Implement pass — it is correctly not yet satisfied here because the deployment has not
been prepared/executed in this pass.

## Recommendation

Proceed to preparing the scoped Functions deployment checkpoint (satisfying the Formal Review's one
binding condition first) and the reduced owner re-QA. Do not deploy without a separate, explicit
owner approval. Do not sign off Goal #10, start Goal #11, or touch production.
