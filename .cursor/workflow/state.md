## FreshForge State

| Field | Value |
|---|---|
| Status | **BLOCKED — production rollout partially complete; Studio stable publication blocked by repeated GitHub macOS runner/upload failures** |
| DONE | **no** |
| Signoff Status | **approved_with_notes — production infrastructure deployed; Studio stable release pending** |
| Current Mode | managed-phase |
| Parent program | Pre-production reliability / safety |
| Current Goal | `print-request-length-surcharge-and-customer-navigation` |
| Current Phase | **PRODUCTION ROLLOUT BLOCKED — Studio `v1.0.15` stable publication** |
| Plan Status | **complete — amended for owner-directed cross-origin invariant and unqueue corrective** |
| Review Status | **approved — amended Formal Review found no unresolved product decision** |
| Implementation Status | **complete — protected PR #101 merged; production Rules, exact 25 Functions, and Portal deployed; Studio stable publication blocked** |
| Test Status | **complete with documented baseline/environment limitations** |
| Human Checkpoint Required | **yes — Studio release publication requires the external CI blocker to clear** |
| Human Checkpoint Reason | Protected PR and production infrastructure rollout completed. Stable Studio `v1.0.15` remains unpublished because repeated GitHub macOS packaging stalls and GitHub Release asset-upload 500/502 failures prevented verified eight-asset publication. |
| Blocked | **yes — repeated external GitHub Actions/Release failures; no application or production-data blocker** |
| Allowed Actions | Retry the exact production Studio release workflow after GitHub macOS packaging/upload service recovers; then verify/publish `v1.0.15`, run final smoke, and close Signoff. |
| Forbidden Actions | Claim Studio publication or full goal completion without eight verified `v1.0.15` assets; production data changes; migrations/backfills/merges/cleanup; scope expansion. |
| Last Completed Step | Protected PR #101 merged as production `e6e7eaf7b47e714414572a986611afa124bb8a8b`; production Firestore Rules, exact reviewed 25 Functions, and Portal App Hosting rollout `build-2026-09-17-002` completed and smoke-checked. Studio release attempts built Windows successfully, but macOS packaging stalled repeatedly and asset upload returned HTTP 500/502. |
| Next Required Step | Retry the exact production Studio release once GitHub macOS packaging is healthy; publish stable `v1.0.15` only after eight-asset verification, then update this state and handoff to DONE. |
| Decision Log | 2026-09-17 — Started `print-request-length-surcharge-and-customer-navigation`. Original pricing Plan/Review completed; owner amendment explicitly approved immutable pricing snapshots, surcharge fields/labels, Portal projection, stable Users link, and no-backfill compatibility. Urgent amendment traced the incident to Portal exclusion of `studio_customer` drafts plus the parking helper’s origin-only blocker. Amended Plan/Review approved origin-neutral active Working uniqueness, Studio draft Portal reuse, origin-neutral park/archive/restore, parked-draft exclusion, and a race-safe staff Studio-create callable. Owner then authorized reviewed DEV-only deployment and QA preparation: 25 allowlisted Functions and Firestore Rules only; no Storage, indexes, Portal/Studio publishing, production, migration, or data mutation. 2026-09-17 — Owner DEV QA found intermittent Portal “not in a continuable state (active)” after Add-to-Show then browse/add; hardened client Working-id trust + flush cancel/retry (Studio allocate path does not share this cache). 2026-09-17 — Owner DEV QA: Studio Add-to-Show left parked Working drafts stranded and Queued list hung; Design/Staff same-path preview caches stale. Corrective implemented locally (allocate restore + safety net + UI reconcile + preview cache). 2026-09-17 — Owner DEV QA: after unpark, restored Working showed empty items and Library Add disabled until refresh. Root cause: `resetWorkingCart()` (post-queue) cleared cart ref while live restore already selected the parked draft — ownership effect did not rebind. Fixed with `cartResetGeneration` rebind + detail empty-cart `isReady` guard + silent-reload loading clear. |
| Prior Completion Log | The prior `portal-show-rails-design-description-parity` goal was already signed off and remains historical context; it is not the current goal. |
| Artifacts | Plan/Review; `docs/workflow/reviews/2026-09-17-print-request-length-surcharge-and-customer-navigation-test-report.md`; `docs/workflow/reviews/2026-09-17-print-request-length-surcharge-and-customer-navigation-implementation-review.md` |
| Files Created | Plan/Review amendments; pricing/projection/callable shared types and helpers; test report; independent implementation review. |
| Files Modified | Application/Functions/shared/Rules/docs files for pricing snapshots, Portal projection, cross-origin request lifecycle, stable Users navigation, and workflow state. |
| Tests Run | 76/76 focused pass; 40/40 global pricing/compositor pass; 8/8 snapshot-first total pass; Functions build pass; Studio/Portal typechecks pass; Studio Vite build pass; targeted ESLint pass; diff check pass; canonical Portal production build rerun pass; live DEV pricing projection pass; protected callable unauthenticated-boundary checks pass. Rules matrix remains 22/23 due to the reproducible baseline expression-limit failure; repository lint has unrelated baseline diagnostics. |
| Signoff | **approved_with_notes, rollout blocked** — production infrastructure is live and verified; current Studio stable remains `v1.0.14`; no data action, migration, or fixture mutation occurred. |
