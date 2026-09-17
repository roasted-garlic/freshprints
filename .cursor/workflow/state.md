## FreshForge State

| Field | Value |
|---|---|
| Status | **OWNER DEV QA — reviewed DEV deployment and preparation complete; stop for interactive Owner DEV QA/Signoff** |
| DONE | **no** |
| Signoff Status | **pending — Owner DEV QA required; no Signoff** |
| Current Mode | managed-phase |
| Parent program | Pre-production reliability / safety |
| Current Goal | `print-request-length-surcharge-and-customer-navigation` |
| Current Phase | **OWNER DEV QA — pricing + cross-origin Working-request corrective** |
| Plan Status | **complete — amended for owner-directed cross-origin invariant and unqueue corrective** |
| Review Status | **approved — amended Formal Review found no unresolved product decision** |
| Implementation Status | **complete locally — reviewed DEV Functions/Rules deployed; no Portal/Studio publish or Signoff** |
| Test Status | **complete with documented baseline/environment limitations** |
| Human Checkpoint Required | **yes — after Test and Independent Implementation Review** |
| Human Checkpoint Reason | Owner DEV QA remains required before Signoff. Production mutation, cleanup, migration, Portal/Studio publishing, and production promotion remain separately gated. |
| Blocked | **no** |
| Allowed Actions | Owner DEV QA of the deployed DEV target; record interactive results; request a separate Signoff/deployment decision. |
| Forbidden Actions | Production deploys or data changes; Portal/Studio publishing; migrations/backfills/merges/cleanup; Signoff before Owner DEV QA; scope expansion beyond the amended Plan. |
| Last Completed Step | Owner DEV QA corrective: post-unpark empty Working + disabled Library Add — Portal cart rebind after `resetWorkingCart` while restored draft already selected (`cartResetGeneration`); detail empty-cart sync waits for limit `isReady`; silent reload always clears `isLoadingItems`. Contract tests pass. |
| Next Required Step | Owner DEV QA retest: park Working A → pull/edit B → queue B to show → open restored A without refresh — items and Library Add must work; then continue Signoff decision. Redeploy touched DEV Functions if not already (`allocateStudioPrintRequestToShow`, `onPrintRequestEditingExitRestoreParked`). |
| Decision Log | 2026-09-17 — Started `print-request-length-surcharge-and-customer-navigation`. Original pricing Plan/Review completed; owner amendment explicitly approved immutable pricing snapshots, surcharge fields/labels, Portal projection, stable Users link, and no-backfill compatibility. Urgent amendment traced the incident to Portal exclusion of `studio_customer` drafts plus the parking helper’s origin-only blocker. Amended Plan/Review approved origin-neutral active Working uniqueness, Studio draft Portal reuse, origin-neutral park/archive/restore, parked-draft exclusion, and a race-safe staff Studio-create callable. Owner then authorized reviewed DEV-only deployment and QA preparation: 25 allowlisted Functions and Firestore Rules only; no Storage, indexes, Portal/Studio publishing, production, migration, or data mutation. 2026-09-17 — Owner DEV QA found intermittent Portal “not in a continuable state (active)” after Add-to-Show then browse/add; hardened client Working-id trust + flush cancel/retry (Studio allocate path does not share this cache). 2026-09-17 — Owner DEV QA: Studio Add-to-Show left parked Working drafts stranded and Queued list hung; Design/Staff same-path preview caches stale. Corrective implemented locally (allocate restore + safety net + UI reconcile + preview cache). 2026-09-17 — Owner DEV QA: after unpark, restored Working showed empty items and Library Add disabled until refresh. Root cause: `resetWorkingCart()` (post-queue) cleared cart ref while live restore already selected the parked draft — ownership effect did not rebind. Fixed with `cartResetGeneration` rebind + detail empty-cart `isReady` guard + silent-reload loading clear. |
| Prior Completion Log | The prior `portal-show-rails-design-description-parity` goal was already signed off and remains historical context; it is not the current goal. |
| Artifacts | Plan/Review; `docs/workflow/reviews/2026-09-17-print-request-length-surcharge-and-customer-navigation-test-report.md`; `docs/workflow/reviews/2026-09-17-print-request-length-surcharge-and-customer-navigation-implementation-review.md` |
| Files Created | Plan/Review amendments; pricing/projection/callable shared types and helpers; test report; independent implementation review. |
| Files Modified | Application/Functions/shared/Rules/docs files for pricing snapshots, Portal projection, cross-origin request lifecycle, stable Users navigation, and workflow state. |
| Tests Run | 76/76 focused pass; 40/40 global pricing/compositor pass; 8/8 snapshot-first total pass; Functions build pass; Studio/Portal typechecks pass; Studio Vite build pass; targeted ESLint pass; diff check pass; canonical Portal production build rerun pass; live DEV pricing projection pass; protected callable unauthenticated-boundary checks pass. Rules matrix remains 22/23 due to the reproducible baseline expression-limit failure; repository lint has unrelated baseline diagnostics. |
| Signoff | **pending** — Owner DEV QA is required; DEV Functions/Rules deployment is complete, but no data action, Portal/Studio publish, or final Signoff was performed. |
