# Review: Amendment 1 — Owner QA FAIL, Stale 15 MB Enforcement on Live Submit

| Field | Value |
|-------|-------|
| Date | 2026-07-29 |
| Reviewer | Independent FreshForge Review Agent |
| Plan | `docs/workflow/plans/2026-07-29-assisted-creation-reference-image-mb-limit-increase-plan.md`, Amendment 1 |
| Verdict | **approved** |

---

## Summary

The amendment's root-cause analysis is independently re-verified as correct: the reported symptom
(Portal picker accepts a 15–40 MB file; live Submit rejects it with the stale 15 MB message) is fully
explained by an undeployed Cloud Functions artifact, not a source-code defect. The amendment
correctly identifies that no application code needs to change to fix the underlying architecture —
only a targeted Functions redeployment, which it correctly does not execute itself and instead
prepares as a separate Human Checkpoint. The added regression-test scope is proportionate and closes
a real gap: the original Implement phase's tests proved the *validators* were correct but never
proved anything about *deployment state*, which is exactly the dimension that failed.

---

## Independent Verification

Re-derived the root cause from source rather than accepting the amendment's narrative:

- `functions/src/assistedCreationRequests.ts:252-266` — confirmed `submitAssistedCreationRequest`
  calls `parseAssistedCreationReferenceImageInputs(data.referenceImages, {...})` directly; confirmed
  `customerUpdateAssistedCreationRequest` (line 409) calls the update-path equivalent. Both are
  `onCall` Cloud Functions — separately built and deployed from Storage Rules.
- `packages/shared/src/utils/assistedCreationValidation.ts:487,552` — confirmed both parser functions'
  error string is template-interpolated (`` `Each reference image must be
  ${ASSISTED_CREATION_MAX_REFERENCE_BYTES / (1024 * 1024)} MB or smaller.` ``), not a hardcoded "15" —
  confirming current source is correct and would emit "40 MB" if actually running.
- `functions/lib/packages/shared/src/constants/assistedCreation/assistedCreation.constants.js:16` —
  confirmed the local build artifact (from prior verification runs during Goal #10's original
  Implement phase) correctly compiles `ASSISTED_CREATION_MAX_REFERENCE_BYTES` to `40 * 1024 * 1024` —
  proving the *local build* is correct; the defect is specifically that this build was never pushed to
  `fresh-prints-dev`.
- Repo-wide grep for `15 * 1024 * 1024`, `15MB`, `15728640`, and the literal error string across
  `apps/`, `functions/src/`, `packages/shared/src/` — zero stale hardcoded occurrences found. This
  independently confirms the amendment's claim that no duplicated/forgotten validator exists.
- `git log --oneline -- functions/src/assistedCreationRequests.ts
  packages/shared/src/utils/assistedCreationValidation.ts` — no commit since before Goal #10 began;
  confirms these files' current (correct) state has never been part of any deployed Functions build.
- Cross-checked against the Goal #10 dev-rules-deployment-checkpoint record: the only deployment
  action taken for Goal #10 to date was `firebase deploy --only storage` — confirmed via that
  document's own command log, which shows no `functions` deploy target anywhere.

This is airtight: current source is correct, the local build compiles correctly, and the only
missing step is pushing that build to the live Functions environment. The amendment's "deployment
gap, not a source-code defect" conclusion is correct and independently confirmed, not merely
asserted.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Explicitly declines to touch any source beyond adding tests; the concrete fix (redeploy) is deferred to its own checkpoint, not folded into Implement |
| Architecture alignment | pass | No architectural change proposed or needed |
| Security impact addressed | pass | No security-relevant change; Storage Rules (the authoritative gate) already correctly deployed and unaffected |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass with condition | The redeploy command must be scoped narrowly — see Required Change below |
| Test strategy adequate | pass | Composed tests correctly target the exact functions the live callables invoke, acknowledging the real limitation (no live-callable integration harness exists in this repo) rather than overclaiming coverage it can't provide |
| Human checkpoints identified | pass | Functions deployment correctly flagged as a separate, not-yet-executed checkpoint |
| Roadmap alignment | pass | Does not start Goal #11 or Signoff |
| Documentation plan | pass | Amendment recorded in-place in the existing Plan document, consistent with this repo's amendment convention (e.g. Goal #9's ADR, Wave C's R-013 amendment) |
| No silent scope expansion | pass | Explicitly out-of-scope: any source fix beyond tests, Storage Rules redeployment, value changes |

---

## Backend Review

**Findings:**
- The proposed redeploy command,
  `firebase deploy --only functions:submitAssistedCreationRequest,functions:customerUpdateAssistedCreationRequest`,
  correctly targets only the two callables whose behavior is actually stale, rather than a blanket
  `--only functions` redeploy of the entire Functions project. This matters: a blanket redeploy would
  push every other pending/uncommitted Functions change currently sitting in the dirty working tree
  (confirmed present from other in-flight goals per this session's own prior deployment-scope audit
  precedent for `storage.rules`) to `fresh-prints-dev` as an unintended side effect. A scoped
  `--only functions:<name>,<name>` deploy avoids that risk entirely.
- Firebase's `--only functions:<name>` deploy syntax requires each named function to be a currently
  exported member of `functions/src/index.ts` (or wherever the entry point re-exports from) — both
  `submitAssistedCreationRequest` and `customerUpdateAssistedCreationRequest` are confirmed exported
  (`functions/src/assistedCreationRequests.ts:252,409`, re-exported via `functions/src/index.ts`).

**Required changes:**
- [x] **Required change (binding, informational only — does not block this Review's approval of the
  test/investigation work, but must be satisfied before the redeploy checkpoint itself is executed):**
  before running the redeploy command, re-confirm via `git status`/`git diff` on `functions/src/`
  that no *other* uncommitted, unreviewed change exists in
  `submitAssistedCreationRequest`/`customerUpdateAssistedCreationRequest` or their transitive imports
  beyond this goal's own reference-image validation change — i.e., prove the scoped deploy carries
  exactly this goal's fix and nothing else. This is the Functions-deployment equivalent of the
  Storage-Rules deployment-scope audit already performed earlier in this goal, and should be done
  with the same rigor before that separate checkpoint is approved.

---

## Testing Review

**Findings:**
- The amendment is honest about a real limitation: no live-callable integration-test harness (mocked
  `onCall` context, Firestore, Storage) exists anywhere in this repository's Functions test suite.
  Composed tests against the parser functions directly are the closest available proof without
  introducing new test infrastructure, which is correctly flagged as out of scope for a narrow
  amendment.
- This is not a weakening of the required regression coverage — it is the same testing approach the
  original Implement phase already used successfully (`assistedCreationValidation.test.ts`), extended
  with the specific boundary cases the QA failure exposed as gaps: the *exact* 15 MB+1 byte boundary
  (previously implicitly covered by "accepts <40MB" tests but not explicitly named at this specific
  historically-significant boundary) and an explicit assertion that the error message contains "40
  MB" and never "15 MB" (previously the tests checked acceptance/rejection but did not assert against
  the literal string "15" being absent from any produced message).

**Required changes:**
- [x] None beyond the Backend Review item above.

---

## Documentation Review

**Findings:**
- Recording the amendment in-place within the existing Plan document (rather than a new Plan file)
  matches this repository's established convention for narrow amendments to an already-approved Plan
  (e.g., the Wave C R-013 budget amendment recorded in `docs/project/DECISIONS.md` under the existing
  ADR-FP-120 rather than a new ADR).
- The amendment does not require a new ADR — ADR-FP-124 already documents the 40 MB decision and
  architecture; this amendment fixes a deployment-execution gap, not a decision, so no ADR content
  needs to change.

**Required changes:**
- [x] None.

---

## Required Changes

1. **(Backend, binding on the future deployment checkpoint, not on this Review's approval of the
   test/investigation Implement work):** before executing the scoped Functions redeploy, confirm via
   `git diff` that `submitAssistedCreationRequest`, `customerUpdateAssistedCreationRequest`, and their
   transitive imports carry only this goal's reference-image validation change — no other unrelated
   in-flight Functions work should ride along in the scoped deploy.

---

## Blockers

None for the Implement work this amendment authorizes (composed regression tests only). The Functions
redeployment itself remains blocked on a separate, explicit owner approval — this Review does not
authorize that deployment; it only approves the investigation and the tests that prove the fix is
already correct in source.

---

## Verdict Rationale

**approved.** The root-cause investigation is independently re-verified as accurate and complete —
this is a deployment-execution gap between two independently-deployed Firebase resource types
(Storage Rules vs. Cloud Functions), not a code defect, and the evidence trail (compiled build
artifact inspection, repo-wide literal search, git history, deployment-checkpoint command log)
supports that conclusion without gaps. The amendment correctly scopes Implement to test-only changes
and defers the actual fix (redeployment) to its own checkpoint, consistent with this repository's
established pattern of separating code changes from deployment actions.

---

## Next Step

Implement the composed regression tests described in the amendment. Do not touch `storage.rules`, do
not change the 40 MB/8-file/320 MB values, do not deploy anything. After an Implementation Review
approves the final diff, present the scoped Functions redeployment as its own Human Checkpoint
(satisfying the Backend Review's required change first), and prepare a reduced owner re-QA covering
only the previously-failing Submit flow.
