## FreshForge State

| Field | Value |
|---|---|
| Status | **PARENT M0 RERUN COMPLETE — CANDIDATE COMMIT/PUSH AUTHORIZATION REQUIRED** |
| DONE | no |
| Signoff Status | child `customer-upload-follow-up-catalog-permission` **approved_with_notes**; prior hard-delete child **approved_with_notes**; parent candidate Signoff pending |
| Current Mode | managed-phase |
| Parent program | Coordinated production promotion and release readiness |
| Current Goal | `coordinated-production-promotion-release-readiness` |
| Current Phase | Parent M0 reconciliation complete at dirty snapshot; candidate assembly boundary |
| Plan Status | parent M0 preparation resumed; child Plan complete |
| Review Status | parent `approved_with_changes` accepted; child `customer-upload-follow-up-catalog-permission` **approved_with_notes** |
| Implementation Status | complete within reviewed scope |
| Test Status | focused gate passed; unrelated baselines documented |
| Human Checkpoint Required | **yes** |
| Human Checkpoint Reason | Parent candidate reassembly and M1 freeze remain later checkpoints; no production action is authorized. |
| Blocked | **no** — M0 evidence is reconciled; owner candidate commit/push checkpoint is next |
| Environment | DEV `getPortalMaintenanceState` redeployed with public invoker; `fresh-prints-prod` forbidden |
| Production | untouched |
| Commit/push | Not authorized unless owner asks |
| Last updated | 2026-09-10 |
| Last Completed Step | Parent M0 rerun: inventory, closure, guard, Rules/Storage, indexes, Portal/Studio, config/data, and hard-delete audits |
| Next Required Step | **Owner authorization for the reviewed post-child candidate commit/push; then regenerate immutable manifests at the new SHA** |
| Parallel polish | Show Queue / Internal Sheet print-time estimate — **approved** (PASS + commit/push) |

**Decision Log:**

- 2026-09-10 — Parent M0 rerun completed after the signed-off customer-upload follow-up child.
  The current worktree is 59 status entries (43 tracked, 16 untracked); the child runtime and
  documentation are classified in the rerun packet, while the request-design parity Plan remains
  separately reviewable and excluded. The deterministic Function audit reports 173 current exports,
  120 production exports, 513 closure paths, digest
  `32cce483f02b8d69d2fcb1e7b98daf544f33095a977cb0d80cfa161c5e7dfb1e`, and both hard-delete exports
  EXCLUDE. Guard inventory, whole-file Rules/Storage hashes, 87-index union, Portal/Studio inputs,
  and config/data dispositions reconcile with no child index or Rules change. M0 is complete only at
  the dirty preparation boundary; a new candidate commit/push is not authorized. No freeze,
  deployment, publication, maintenance activation, backfill, data mutation, or production action
  occurred. Next checkpoint is owner authorization for the exact reviewed post-child candidate
  commit/push.

- 2026-09-10 — Customer-upload follow-up implementation and focused Test gate completed within the
  accepted Plan/Formal Review. Original denial, one opaque-token customer follow-up, maintenance-
  guarded response, Studio state/action gate, and Portal modal are implemented. Functions build,
  Portal typecheck, targeted lint, and focused contracts passed; unrelated Studio/full-lint and local
  Portal `.next/trace` build baselines are documented. Child Signoff is `approved_with_notes`.
  Parent M0 must reassemble and reconcile a new reviewed candidate SHA. No commit, push, freeze,
  deployment, publication, maintenance activation, migration, backfill, or production action occurred.

- 2026-09-10 — Owner accepted the reviewed Plan/Formal Review for
  `customer-upload-follow-up-catalog-permission` (`approved_with_changes`) and authorized
  Implement → Test. Scope is limited to the typed denial/follow-up state, existing Portal Alerts,
  trusted request/context/response callables, Studio Excluded UX, restore/promotion enforcement,
  ADR/data-model/workflow documentation, and focused validation. The previous candidate
  `04b9637470a16b0f4d4a1ba9f822fe9df7acca2d` is stale and must not be frozen/reused; no freeze, deployment, migration,
  backfill, production action, or unrelated change is authorized.

- 2026-09-10 — Owner hosted DEV guest homepage **PASS** after `getPortalMaintenanceState`
  public-invoker redeploy. Maintenance public-read fail-open signoff **approved**.
  Catalog-permission Formal Review remains waiting on owner acceptance.

- 2026-09-10 — Maintenance public-read corrective complete: `invoker: "public"` on
  `getPortalMaintenanceState`; Portal wall only when status is ready + ON + non-tester. Contracts
  7/7. DEV Function update succeeded. Catalog-permission Formal Review unpaused (still needs
  owner acceptance). Production untouched.

- 2026-09-10 — Owner paused `customer-upload-follow-up-catalog-permission` to fix hosted DEV
  guests seeing the maintenance wall while OFF. Cause: fail-closed UI on callable error plus
  missing Gen2 `invoker: "public"` on `getPortalMaintenanceState`. Catalog-permission Plan/Review
  stay accepted-pending and resume after this corrective.

- 2026-09-10 — New managed child goal `customer-upload-follow-up-catalog-permission` opened under
  `coordinated-production-promotion-release-readiness`. Read-only source reconciliation found that
  explicit customer catalog denial currently remains `not_eligible` and the generic staff restore
  callable does not check exclusion reason. Plan and Formal Review propose an additive typed
  follow-up state, one opaque-token Portal Alert, trusted Allow/Decline callables, server-enforced
  restore/promotion gates, and donation exclusion in v1. Verdict is `approved_with_changes`; owner
  acceptance is required before implementation. Current candidate `04b9637470a16b0f4d4a1ba9f822fe9df7acca2d`
  is provisional and must not be frozen. No app code, deploy, data operation, commit, push, or
  production action occurred.

- 2026-09-10 — Owner DEV QA: maintenance tester logout still showed full-screen maintenance.
  Fix: `AuthProvider.logout` always `router.replace('/login')`; confirm copy updated; login
  “Browse designs” hidden while maintenance ON/unknown; maintenance state refreshes on auth
  identity change. Awaiting re-check.

- 2026-09-10 — Owner DEV-QA corrective feedback and clarification received: Studio/Portal customer
  copy must share one source of truth; Studio maintenance controls must use native Settings
  primitives; merged and disabled accounts must not appear as maintenance testers. Read-only source
  and DEV data tracing proved the copy divergence and identified the selected Chris hawkins merged
  source with an inactive linked user. Corrective Plan Amendment and Formal Review are complete with
  verdict `approved_with_changes`; no implementation, deployment, setting mutation, Owner QA,
  Signoff, commit, push, or production action occurred. Owner acceptance is required.

- 2026-09-10 — Owner explicitly accepted the corrective amendment and authorized `Continue
  FreshForge` into Implement. Scope is limited to the shared heading/body copy contract, native
  Studio Settings primitives, trusted maintenance tester eligibility/candidate list, focused tests,
  and narrow DEV redeployment. Production, parent rollout, candidate freeze, unrelated work,
  settings mutation, commit/push, and Signoff remain forbidden.

- 2026-09-10 — Owner visual QA **PASS** for Est. print time (label band + ceil inches + ft
  parentheses; status-row placement). Authorized commit/push of print-time polish only.
  Signoff **approved**. Maintenance pause unchanged.

- 2026-09-10 — Orthogonal Studio polish implemented: Est. print time on Show Queue / Internal
  Sheet glance (Standard packing, 8 s/in). Plan/review under `docs/workflow/*show-queue-print-time-estimate*`.
  Automated tests 7/7. Awaiting owner visual QA before commit/push. Maintenance pause unchanged.

- 2026-09-10 — Owner visual QA **PASS** for Portal Request totals modal Size tiers primary
  button; authorized commit/push.

- 2026-09-10 — Owner visual QA **PASS** for Studio Show Queue / Internal Sheet / CR-IR dollar
  totals and glance stats. Authorized commit/push without stopping. Signoff **approved**.
  Maintenance prerequisite remains paused at Formal Review until owner acceptance.

- 2026-09-10 — Owner accepted per-PR `$` totals and asked for glance stats (replacing Whatnot
  metadata), rail `$` totals, CR/IR list `$` pills, pill styling, size mix `P x N`, and layout
  tweaks. Implemented locally with sync sheet-count estimates from existing packing planners.

- 2026-09-10 — Owner requested Studio visual tweak during maintenance pause: add `$` totals using
  existing gang-sheet pricing. Plan + Review **approved**; implemented locally.

- 2026-09-10 — Owner accepted the reviewed maintenance prerequisite Plan and explicitly authorized
  `Continue FreshForge` into Implement. DEV-side implementation and verification are authorized;
  production deployment/activation, parent rollout, candidate freeze, and unrelated work remain
  forbidden.

- 2026-09-10 — Maintenance prerequisite implementation and automated Test completed in DEV
  source. Full Firebase Rules regression is 179/179 across 24 suites; targeted maintenance Rules
  coverage is 5/5; shared/contract tests are 6/6; Portal typecheck, Functions build, and changed
  source ESLint pass. Studio repo-wide typecheck retains unrelated baseline errors and Portal
  production build is blocked by EPERM on the existing `.next/trace` while a dev server is active.
  Ready for the single owner DEV-QA journey; production remains forbidden.

- 2026-09-10 — Owner DEV-QA block diagnosed as a DEV source mismatch: both maintenance callables
  were absent from `fresh-prints-dev` and the public callable returned HTTP 404 while Portal and
  Studio local source targeted DEV. Deployed the two maintenance callables, the 34 guard-bearing
  customer callable revisions, and the reviewed Firestore and Storage Rules to `fresh-prints-dev`.
  All 36 allowlisted Functions are ACTIVE; the absent `settings/portalMaintenance` document returns
  public-safe OFF. Deployment evidence:
  `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-dev-deployment.md`.
  Owner DEV QA may resume; Signoff and production remain blocked.

- 2026-09-10 — Owner requested a pause while making a small change. Maintenance prerequisite is
  paused after DEV dependency deployment and before Owner DEV QA; no further QA, deployment,
  signoff, commit/push, production activation, or parent rollout is authorized until resumed.

- 2026-09-10 — Owner resumed `Continue FreshForge` with DEV-QA feedback requiring an amendment
  before Signoff: centered admin Access Denied polish, full-screen customer maintenance UX, and
  one trusted maintenance-test customer. Plan Amendment and Formal Review are complete with no
  app/source/runtime changes; owner acceptance is required before Implement. Production remains
  untouched and forbidden.

- 2026-09-10 — Owner accepted the amended Plan and explicitly authorized `Continue FreshForge`
  into Implement. Implement is DEV-only and limited to the reviewed tester exception, full-screen
  customer maintenance replacement/banner, and Admin Show Queue denial polish. Test and narrow
  dependency deployment remain required before Owner DEV QA; production remains forbidden.

- 2026-09-10 — Amendment Implement and Test completed. Targeted shared/Functions/Portal/Admin
  contracts passed 16/16; the paired Firestore/Storage Rules regression passed 182/182; Portal
  typecheck, Functions build, changed-source lint, and `git diff --check` passed. Studio retains
  25 unrelated baseline typecheck diagnostics; Portal production build retains the existing
  Windows `.next/trace` EPERM condition. After the Test gate, exactly 36 named DEV Functions were
  deployed and verified ACTIVE, followed by Firestore and Storage Rules only. The live DEV
  maintenance document is owner-controlled and currently ON with no tester; it was not changed.
  Amendment implementation, Test, and DEV deployment evidence are recorded in the three dated
  amendment review artifacts. Owner DEV QA is now the only next action; Signoff and production
  remain forbidden.

- 2026-09-10 — Trusted resolver integration caught a Firestore API misuse when clearing optional
  fields (`FieldValue.delete()` in non-merge `set()`). The write path now uses replacement
  semantics, integration validation passes 2/2 (including invalid/inactive/deleted/disabled target
  rejection and immediate clear), and only `updatePortalMaintenanceState` was explicitly
  redeployed to DEV as revision `updateportalmaintenancestate-00003-zaf` (ACTIVE). No Rules or
  other Function changed in this follow-up.

- 2026-09-10 — Corrective Implement/Test completed and the reviewed exact 37-Function allowlist
  was deployed to `fresh-prints-dev`; `firebase functions:list` verified 37/37 present and ACTIVE.
  Key maintenance revisions are `getportalmaintenancestate-00003-kil`,
  `updateportalmaintenancestate-00004-qub`, and `listportalmaintenancetestcustomers-00001-tez`.
  No Rules/indexes/hosting or production action occurred. The live maintenance document remains
  owner-controlled and present/ON; the public callable returned the safe ON projection without a
  UID, and the unauthenticated candidate-list endpoint returned 401. Owner DEV QA is now the only
  next action; Signoff, commit/push, and production remain forbidden.

- 2026-09-10 — Owner reported final corrective DEV QA **PASS**: Studio styling and separate copy
  fields, runtime saved-copy convergence, merged/disabled exclusion, valid active tester, ordinary
  customer full-screen maintenance, tester banner and safe mutation, admin Show Queue access and
  centered denial, and OFF recovery all passed. Signoff is now **approved_with_notes**. The
  prerequisite is closed in DEV; production deployment/activation, parent rollout, publish,
  commit, and push remain separately gated.

- 2026-09-10 — New managed goal `production-maintenance-mode-prerequisite-production-promotion`
  started. Read-only reconciliation found no immutable maintenance-only revision: 56 tracked and
  40 untracked working-tree entries, 1,877 committed paths versus `origin/production`, 28 modified
  guard-bearing source files (18 with nontrivial unrelated deltas), whole-file Rules drift, and no
  selective Portal App Hosting or Studio publication mechanism. Production has 113 ACTIVE Functions,
  no maintenance callables, absent `settings/portalMaintenance` (safe OFF), Portal build-003, and
  Studio v1.0.9. Plan and Formal Review are complete; verdict **blocked** pending owner selection of
  Strategy A (explicit production-based patch exception) or Strategy B (maintenance as first layer
  of the full coordinated candidate). No implementation, branch, commit, merge, deploy, publish,
   setting mutation, or production action occurred.

- 2026-09-10 — Owner selected Strategy B for `production-maintenance-mode-prerequisite-production-
  promotion`: no production-based hotfix branch/worktree and no standalone maintenance-only
  release. The signed-off DEV maintenance capability is now a required first safety layer of the
  full frozen `coordinated-production-promotion-release-readiness` candidate. Parent Plan and
  Formal Review were amended with the reconciled Rules/Functions/Portal/Studio sequence,
  `FULL MAINTENANCE CAPABILITY READY` OFF checkpoint, separate ON checkpoint, source-integrity and
  rollback requirements, and the safe-write fixture proposal. Formal Review is
  `approved_with_changes`; owner acceptance was then recorded. No implementation, candidate freeze,
  commit, push, merge, deploy, publish, setting mutation, maintenance activation, or production
  action occurred. The child goal was closed as `superseded_by_coordinated_candidate`; this does
  not represent a production deployment.

 - 2026-09-10 — Owner accepted the Strategy B parent Plan/ Formal Review. The child maintenance-
  promotion goal is closed as `superseded_by_coordinated_candidate` (not a production deployment).
  M0 preparation mechanically inventoried 100 pre-report
  working-tree entries (101 after this documentation report), preserved all user work, and found
  the current Studio customer-directory hard-delete action remains production-visible. A narrow
  child Plan/Review for reusing the existing DEV-only project/build gate was prepared with verdict
  `approved_with_changes`; owner acceptance is required before Implement → Test. Inherited request-
  design parity and Portal admin signoff documents remain explicitly unresolved for freeze
  disposition. No runtime implementation, candidate freeze, commit, push, merge, deploy, publish,
 setting mutation, maintenance activation or production action occurred.

- 2026-09-10 — Owner accepted the hard-delete child Plan/Review and authorized Implement → Test.
  `CustomerDirectoryTable` now gates the hard-delete menu/callback with
  `isOperationalWipeUiEnabled()`. Focused users/identity contracts passed 12/12; targeted ESLint,
  Studio Vite build, and `git diff --check` passed. Studio repo typecheck retains the documented
  unrelated baseline diagnostics. The DEV source still retains both hard-delete exports, while the
  parent production allowlist excludes both. Child Signoff is `approved_with_notes` and recorded
  at `docs/workflow/reviews/2026-09-10-studio-hard-delete-production-ui-gate-signoff.md`.
  No customer mutation, deploy, publish, freeze, commit, push, or production action occurred.

- 2026-09-10 — Parent M0 rerun completed after child closure. The request-design parity Plan is
  explicitly excluded for separate review; the Portal admin Show Queue signoff is explicitly
  included as approved-with-notes evidence for the scoped read-only admin runtime. The exact M1
  candidate-freeze proposal is prepared, but runtime transitive closure and a clean committed
  candidate are still required before owner freeze approval.

- 2026-09-10 — Read-only M0 runtime reconciliation completed at the dirty snapshot. Deterministic
  Function closure covers 170 current exports/120 production exports and 509 local closure paths
  (hash `a045c0514e855a08469cffadb81b487d4f5fbfb15e5757a9a588f5b8a3720a90`), with both hard-delete
  exports explicitly `EXCLUDE`. Whole-file Rules hashes, the 77+10 index union (legacy index
  restored), Portal/Studio build-input manifests, and config/data dispositions are recorded in
  `docs/workflow/reviews/2026-09-10-coordinated-production-m0-reconciliation.md` and its linked
  artifacts. The worktree is now 115 status entries (59 tracked/56 untracked); no commit, push,
  freeze, deploy, publish, setting mutation, or production action occurred. Owner authorization is
  required before staging only the reviewed path set, creating/pushing one clean development SHA,
  and regenerating the manifests at that SHA.

**Allowed Actions:** Parent coordinated-production M0 reconciliation may resume using the signed-off
customer-upload follow-up child disposition. Regenerate read-only closure/guard and release
manifests, reconcile a new reviewed development candidate, and prepare (but do not execute) the M1
freeze proposal. No production action is implied.

**Forbidden Actions:** Production Functions/Rules/Storage/Hosting deploy or setting mutation;
production maintenance activation; Owner QA on the owner's behalf; parent coordinated-release freeze
without explicit owner approval; candidate commit/push/merge/PR without the separate owner checkpoint;
any data migration/backfill or customer mutation; unrelated refactors; force push.

## Next Required Step

`RERUN COORDINATED-PRODUCTION M0 PREPARATION — CUSTOMER UPLOAD FOLLOW-UP CHILD SIGNED OFF; REASSEMBLE AND RECONCILE A NEW REVIEWED DEVELOPMENT CANDIDATE SHA`
