## FreshForge State

| Field | Value |
|---|---|
| Status | **DONE — production rollout and Studio `v1.0.15` stable publication complete** |
| DONE | **yes** |
| Signoff Status | **approved — Studio stable release published and verified** |
| Current Mode | managed-phase |
| Parent program | Pre-production reliability / safety |
| Current Goal | `studio-1.0.15-release-upload-hardening` |
| Current Phase | **SIGNOFF COMPLETE — Studio `v1.0.15` stable publication verified** |
| Plan Status | **complete — narrow retry/idempotency plan approved** |
| Review Status | **approved — bounded release correction approved for implementation** |
| Implementation Status | **complete — protected PR #103 merged to production; exact production-SHA workflow/helper promoted** |
| Test Status | **complete — focused release contracts 35/35; release lint current 15/baseline 25/new 0; diff and Bash syntax checks pass** |
| Human Checkpoint Required | **no — owner-authorized publication completed and verified** |
| Human Checkpoint Reason | Studio `v1.0.15` was published once after exact production SHA/release identity, eight canonical assets, and Latest verification. |
| Blocked | **no** |
| Allowed Actions | FreshForge is idle; future work requires a new scoped Plan/Review. |
| Forbidden Actions | Production data changes, migrations/backfills/merges/cleanup, or scope expansion without a new approved phase. |
| Last Completed Step | Protected PR #103 merged as production `5ab1f46977f9f6290351a8baf621fc14b7755f75`; final Studio run `35284913045` passed, and release `391114948` was published as `v1.0.15`/Latest with eight canonical assets. |
| Next Required Step | None — goal signed off. |
| Decision Log | 2026-09-17 — Started `print-request-length-surcharge-and-customer-navigation`. Original pricing Plan/Review completed; owner amendment explicitly approved immutable pricing snapshots, surcharge fields/labels, Portal projection, stable Users link, and no-backfill compatibility. Urgent amendment traced the incident to Portal exclusion of `studio_customer` drafts plus the parking helper’s origin-only blocker. Amended Plan/Review approved origin-neutral active Working uniqueness, Studio draft Portal reuse, origin-neutral park/archive/restore, parked-draft exclusion, and a race-safe staff Studio-create callable. Owner then authorized reviewed DEV-only deployment and QA preparation: 25 allowlisted Functions and Firestore Rules only; no Storage, indexes, Portal/Studio publishing, production, migration, or data mutation. 2026-09-17 — Owner DEV QA found intermittent Portal “not in a continuable state (active)” after Add-to-Show then browse/add; hardened client Working-id trust + flush cancel/retry (Studio allocate path does not share this cache). 2026-09-17 — Owner DEV QA: Studio Add-to-Show left parked Working drafts stranded and Queued list hung; Design/Staff same-path preview caches stale. Corrective implemented locally (allocate restore + safety net + UI reconcile + preview cache). 2026-09-17 — Owner DEV QA: after unpark, restored Working showed empty items and Library Add disabled until refresh. Root cause: `resetWorkingCart()` (post-queue) cleared cart ref while live restore already selected the parked draft — ownership effect did not rebind. Fixed with `cartResetGeneration` rebind + detail empty-cart `isReady` guard + silent-reload loading clear. |
| Prior Completion Log | The prior `portal-show-rails-design-description-parity` goal was already signed off and remains historical context; it is not the current goal. |
| Artifacts | Upload-hardening Plan/Review/Signoff; `docs/workflow/reviews/2026-09-17-studio-release-upload-hardening-signoff.md`; prior pricing/rollout evidence |
| Files Created | Plan/Review amendments; pricing/projection/callable shared types and helpers; test report; independent implementation review. |
| Files Modified | Application/Functions/shared/Rules/docs files for pricing snapshots, Portal projection, cross-origin request lifecycle, stable Users navigation, and workflow state. |
| Tests Run | Prior production rollout checks plus final release contracts 35/35; release lint current 15/baseline 25/new 0; Bash syntax and diff checks pass; final run `35284913045` passed Windows, Mac, artifact verification, and finalizer. Rules matrix remains 22/23 due to the reproducible baseline expression-limit failure; repository lint has unrelated baseline diagnostics. |
| Signoff | **approved, complete** — production infrastructure and Studio `v1.0.15` are live and verified; no data action, migration, or fixture mutation occurred. |
