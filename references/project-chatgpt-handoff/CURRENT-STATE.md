# Fresh Prints — Current State Snapshot

**Last updated:** 2026-09-16

## CURRENT AUTHORITATIVE PHASE — STUDIO HOTFIX — SIGNED OFF (DEVELOPMENT ONLY)

The prior coordinated production rollout remains machine-complete with Owner
Production Smoke pending. A new owner-requested Studio-only hotfix is now the
active bounded goal: `studio-halftone-background-toggle-hotfix-2026-09-16`.

The hotfix plan and bounded review are recorded at:

- `docs/workflow/plans/2026-09-16-studio-halftone-background-toggle-hotfix-plan.md`
- `docs/workflow/reviews/2026-09-16-studio-halftone-background-toggle-hotfix-review.md`

The original hotfix implementation is complete and signed off with notes in
development only. The existing Studio client controls and save paths now synchronize the toggle:
Halftone ON seeds light black; Halftone OFF restores the default; subsequent
Artwork Background changes remain independent. Focused hotfix/shared contracts
pass 50/50; canonical release lint is `current=15`, `baseline=25`, `new=0`;
Studio typecheck and package build pass. Broader unrelated contract drift is
documented in the test report.

The owner added and approved a bounded Print Request rail-selection addition.
Clicking a second or later request could expose the new ID while retaining the
previous detail object, allowing route canonicalization to bounce the URL and
flicker. The fix enforces exact-ID detail readiness and clears stale detail state
at the start of a new selection load, with focused regression coverage. The
Print Requests rail remains mounted across the lifecycle tabs while the new detail
hydrates.

The combined hotfix is now signed off with notes in development only. Navigation
contracts pass 19/19; canonical release lint remains `current=15`, `baseline=25`,
`new=0`; Studio typecheck and package build pass. The broader Print Requests
directory sweep is 194/198, with four unrelated pre-existing contract failures
documented in the test report.

Do not merge to production, publish, deploy, change backend/runtime surfaces,
or perform data repair for either scope. A separate owner authorization and
reviewed production promotion remain required.

## PRIOR AUTHORITATIVE PHASE — PRODUCTION ROLLOUT COMPLETE — OWNER PRODUCTION SMOKE PENDING

Owner release instruction lifted the previous production hold for managed goal
`coordinated-production-promotion-2026-09-16` and authorized the reviewed
rollout. The Studio release lint blocker was resolved under the bounded
corrective authorization and the coordinated production rollout completed. The
remaining gate is Owner Production Smoke.

The frozen candidate merged to production as
`3802ff8564efb0d24e6c783a23c4b4b65d7cef8f` and includes the required Studio
fix `37655dcd52760992cc2892e096bac30cbaa797ba`. Rules and the reviewed
58-function allowlist were deployed, the exact reviewed IAM self-binding was
applied, and Portal App Hosting rollout `build-2026-09-16-001` is healthy with
100% traffic on revision `fresh-prints-portal-build-2026-09-16-001`.

Studio stable `v1.0.13` is published/latest. Workflow run `35138234015` used the exact
production SHA but failed both Windows and Mac jobs at the release-lint gate:
`current=21`, `baseline=25`, `new=6`, `removed=10`; no draft/release was
created. The six diagnostics are now resolved by the bounded corrective, with
canonical local lint `current=15`, `baseline=25`, `new=0`, `removed=10` and no
baseline edit. Release/lint contracts pass `40/40`, affected regressions pass
`75/75`, both app typechecks pass, and local Studio Windows packaging passes.

Formal Review is `approved_with_changes`; deterministic corrections are applied:
the live `completeStaffGangSheetAndOpenNext` callable is an UPDATE in the
Function closure, and Studio is version `1.0.13`.

The owner explicitly accepted the exact three Rules failures reproduced against
`firestore.transition.rules` as a known baseline emulator limitation: 179/182
tests pass, with no candidate-only regression identified. Final production
readback confirmed the same three failures, the 1,000-expression signature,
passing candidate-specific Rules contracts, and no access broadening.

Current next step: Owner Production Smoke, beginning with Autonomous AI Review.
Do not perform data repair/backfill/Apply, change AI settings beyond the bounded
smoke instructions, change secrets, broaden IAM, or redeploy Rules, Functions,
Portal, indexes, or Storage for this corrective.

Final automated readback: production merge
`ccad1920bf382947dbc5d48d997f16fa037a0277`; corrective commit
`2bf6c59c599ccd702eba4523a035e7d7954aab62`; Studio workflow
`35141319164` succeeded; stable `v1.0.13` is latest with eight verified assets.
All 179 production Functions are ACTIVE, all 94 indexes are READY, the exact
IAM self-binding is present, and the existing Portal revision
`fresh-prints-portal-build-2026-09-16-001` remains at 100% traffic. AI remains
shadow / Autonomous OFF / `gemini-2.5-flash-lite` / Pass 2 absent-OFF;
maintenance is OFF and the production DEV allowlist document is absent.

The prior `selected-print-request-live-sync-studio-portal` DEV QA record remains
included in the cumulative promotion manifest and its signoff evidence.

Hotfix artifacts:

- `docs/workflow/plans/2026-09-16-studio-halftone-background-toggle-hotfix-plan.md`
- `docs/workflow/reviews/2026-09-16-studio-halftone-background-toggle-hotfix-review.md`
- `docs/workflow/reviews/2026-09-16-studio-halftone-background-toggle-hotfix-test-report.md`
- `docs/workflow/reviews/2026-09-16-studio-halftone-background-toggle-hotfix-signoff.md`
