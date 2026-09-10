## FreshForge State

| Field | Value |
|---|---|
| Status | **PAUSED — PRODUCTION MAINTENANCE MODE PREREQUISITE — OWNER REQUESTED PAUSE** |
| DONE | no |
| Signoff Status | pending — awaiting the single owner DEV-QA journey |
| Current Mode | managed-phase |
| Parent program | Coordinated production promotion and release readiness |
| Current Goal | `production-maintenance-mode-prerequisite` |
| Current Phase | DEV QA checkpoint — paused at owner request after approved DEV dependency deployment |
| Plan Status | complete — reviewed and owner-accepted |
| Review Status | complete — `approved_with_changes` |
| Implementation Status | complete — reviewed maintenance capability implemented in DEV source |
| Test Status | complete — targeted contracts, Portal typecheck, Functions build, ESLint, and full Rules suite pass; Studio repo-wide typecheck and Portal production build retain documented baseline/environment blockers |
| Human Checkpoint Required | yes — owner DEV QA only; production remains separately blocked |
| Human Checkpoint Reason | Owner requested a pause before DEV QA. No further implementation, deployment, QA, signoff, commit/push, activation, or parent rollout is authorized until the owner resumes. |
| Environment | Reviewed maintenance dependencies deployed to `fresh-prints-dev`; owner DEV QA only; `fresh-prints-prod` mutations forbidden |
| Production | untouched |
| Commit/push | Studio print-time estimate polish: owner PASS; commit/push authorized for this polish only; maintenance still paused |
| Last updated | 2026-09-10 |
| Last Completed Step | Studio print-time estimate owner visual QA PASS; signoff approved; commit/push of polish only |
| Next Required Step | Maintenance remains paused until owner resume; then single DEV-QA journey |
| Parallel polish | Show Queue / Internal Sheet print-time estimate — **approved** (PASS + commit/push) |

**Decision Log:**

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

**Allowed Actions:** None beyond preserving the paused state; resume only on an explicit owner
instruction. After resume, the single owner DEV-QA journey and workflow-artifact updates needed to
record it are allowed. Production, parent-rollout, candidate-freeze, unrelated polish, and
unapproved deployment/settings mutations remain separately gated.

**Forbidden Actions:** Any further QA, implementation, DEV deployment or settings mutation,
production Functions/Rules/Storage/Hosting deploy or settings mutation; production maintenance
activation; parent coordinated-release implementation/freeze; unrelated refactors; destructive data
changes; commit/push; force push.

## Next Required Step

`[PAUSED BY OWNER — DEV DEPENDENCIES DEPLOYED; DO NOT CONTINUE UNTIL RESUMED]`
