# Plan: Workflow Artifact Closeout Cleanup

## Goal

Close the documentation gaps for actively worked managed phases whose implementation/test evidence exists but whose workflow artifacts are incomplete, superseded, or ambiguous.

This phase is documentation-only. It does not change application code, Firebase rules, data models, settings, secrets, or deployed infrastructure.

## Scope

In scope:

* Audit the June 29-30 managed-phase artifacts that were actively worked in recent sessions.
* Create missing signoff artifacts where test reports already support closure.
* Create explicit superseded/deferred notes where a plan was replaced by later implementation or intentionally left behind.
* Keep unresolved deploy/authenticated-smoke checkpoints documented as human-gated deferrals, not silent passes.
* Update `.cursor/workflow/state.md` to close this cleanup phase after the artifacts are written and verified.

Out of scope:

* Application code changes.
* New tests beyond documentation sanity checks.
* Firebase deploys, Functions deploys, Firestore rules deploys, index deploys, or seed writes.
* Reading or modifying files outside the repository.
* Resolving the larger dirty worktree or committing changes.
* Phase 7 or Portal work.

## Target Artifacts

Based on the audit, the cleanup should address these incomplete-looking artifacts:

| Item | Current evidence | Planned disposition |
| --- | --- | --- |
| `2026-06-29-ai-processing-direct-run-plan.md` | Plan exists; later wrap-up audit says direct callable behavior is part of completed AI Processing deltas | Mark as superseded/closed by later AI Processing signoff and wrap-up audit, unless evidence shows separate open work |
| `2026-06-29-ai-processing-playground-style-rebuild-plan.md` | Test report exists; no signoff | Add PASS WITH NOTES signoff, preserving deploy/authenticated-smoke as pending human checkpoint |
| `2026-06-29-ai-processing-status-card-ui-polish-plan.md` | Review exists; no test report/signoff | Add closure note or superseded note only if repo/audit evidence shows it was absorbed by later AI Review UI work |
| `2026-06-29-ai-review-rerun-and-playground-fix-plan.md` | Test report exists; no signoff | Add PASS WITH NOTES signoff; browser smoke remains not run |
| `2026-06-29-ai-vision-best-practice-prompt-plan.md` | Review exists; no test report/signoff | Add closure or superseded note only if later prompt v17/template artifacts cover the work |
| `2026-06-29-customer-creation-provisioning-bug-plan.md` | Test report says authenticated manual QA PASS and recommends signoff | Add PASS signoff |

## Verification Approach

This is a docs-only cleanup. Verification should include:

* Re-read each target plan/report before writing closure artifacts.
* Confirm every new signoff names the exact evidence it relies on.
* Run a read-only artifact matrix check for the June 29-30 target set.
* Optionally run `git diff --check` because docs are edited.

No TypeScript, lint, or build run is required unless application code changes, which this phase forbids.

## Risks

* Incorrectly marking an actually-open implementation as closed.
* Hiding a human checkpoint, especially deploy/authenticated smoke for AI Processing.
* Creating artifact churn that makes the workflow harder to read.

## Mitigations

* Use PASS WITH NOTES where automated or manual evidence is incomplete.
* Mark deploy/smoke requirements explicitly as deferred human checkpoints.
* Use "superseded" only when later artifacts clearly cover the same behavior.
* Keep each new artifact short and evidence-based.

## Human Checkpoints

Implementation requires user approval of this plan.

No production, Firebase, external service, secret, or out-of-repo action is approved by this plan.

## Success Criteria

* All target June 29-30 actively worked phases have either a signoff artifact or an explicit superseded/deferred closure artifact.
* The current workflow state shows this cleanup phase complete after verification.
* Remaining human-gated deploy/smoke work is visible and not represented as completed.
