# Fresh Prints — Current State Snapshot

**Last updated:** 2026-09-16

## CURRENT AUTHORITATIVE PHASE — COORDINATED PRODUCTION PROMOTION CORRECTIVE VERIFIED

Owner release instruction lifted the previous production hold for managed goal
`coordinated-production-promotion-2026-09-16` and authorized the reviewed
rollout. The Studio release lint blocker has been resolved under the bounded
corrective authorization and is ready for protected promotion.

The frozen candidate merged to production as
`3802ff8564efb0d24e6c783a23c4b4b65d7cef8f` and includes the required Studio
fix `37655dcd52760992cc2892e096bac30cbaa797ba`. Rules and the reviewed
58-function allowlist were deployed, the exact reviewed IAM self-binding was
applied, and Portal App Hosting rollout `build-2026-09-16-001` is healthy with
100% traffic on revision `fresh-prints-portal-build-2026-09-16-001`.

Studio stable remains `v1.0.12`. Workflow run `35138234015` used the exact
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
tests pass, with no candidate-only regression identified. The final frozen
candidate must still confirm the same three failures, the 1,000-expression
signature, passing candidate-specific Rules contracts, and no access broadening.

Current next step: commit/push the bounded corrective on development, promote
it through the protected development → production path, prove the already-live
non-Studio surfaces are byte/semantically unchanged, and dispatch Studio
v1.0.13 from the new exact production SHA. Do not redeploy Rules, Functions,
Portal, IAM, indexes, or Storage for this corrective. No production data
repair, AI setting change, secret change, or broader IAM change is authorized.

The prior `selected-print-request-live-sync-studio-portal` DEV QA record remains
included in the cumulative promotion manifest and its signoff evidence.
