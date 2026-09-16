# Plan: Coordinated production promotion — 2026-09-16

| Field | Value |
|-------|-------|
| Date | 2026-09-16 |
| Goal | `coordinated-production-promotion-2026-09-16` |
| Status | `testing_with_hold` |
| Workflow | FreshForge managed phase: Plan → Review → Implement → Test → Signoff |
| Source inventory | `docs/workflow/reviews/2026-09-pre-production-promotion-manifest.md` |
| Formal Review | `docs/workflow/reviews/2026-09-16-coordinated-production-promotion-formal-review.md` |
| Current execution boundary | Candidate preparation and verification only. The latest owner instruction says do not merge to `production` or deploy. |

---

## Objective

Reconcile every DEV-closed, production-pending goal since the current production
baseline; produce one exact, reviewable production candidate; and prepare the
ordered Firebase, Portal App Hosting, and Studio stable-release actions. The
candidate must preserve live production behavior that is not explicitly in the
reconciled manifest, avoid unapproved data repair, and retain deterministic
rollback anchors.

This plan does not authorize a new product decision, secret change, broad IAM
change, automatic backfill, or any behavior outside the accumulated source and
signoff record.

## Baselines and candidate

At plan creation:

- `origin/production`: `840d596b058b3f7bef2dae886154aa667f9e2a57` (`v1.0.12`).
- `origin/development`: `7c7c65d78d3b408526f28cd3501f9f79b8518d58`, which includes
  Studio fix `37655dcd52760992cc2892e096bac30cbaa797ba` and its reconciliation
  inventory commit.
- The final candidate SHA is not frozen yet. It must be recorded after the
  reviewed export/version corrections, all tests, and final documentation are
  committed and pushed to `origin/development`.
- The reviewed export/version corrections are now present in the working tree;
  the candidate remains unfrozen because the full Rules suite is 179/182 rather
  than a clean pass. See the [Test Report](../reviews/2026-09-16-coordinated-production-promotion-test-report.md).

The source candidate is the complete `origin/development` tree relative to
`origin/production`, not a hand-selected subset of recent commits. The
cumulative manifest and each linked Plan/Review/Test/Signoff provide the intent
classification; the actual Git diff and live inventories determine the final
deployment closure.

## Reconciled production surface

| Surface | Candidate requirement | Current evidence / boundary |
|---------|-----------------------|-----------------------------|
| Functions | Explicit allowlist derived from source closure and live inventory. | Initial audit: 191 current exports, 186 production exports, 545 unique local closure paths; 6 ADD, 51 UPDATE, 115 RETAIN LIVE VERSION, 10 EXCLUDE, 9 NO ACTION. After the reviewed export correction: 192 current exports, 186 production exports, 546 unique local closure paths; 6 ADD, 52 UPDATE, 115 RETAIN LIVE VERSION, 10 EXCLUDE, 9 NO ACTION. `completeStaffGangSheetAndOpenNext` is retained as an UPDATE. |
| Firestore Rules | Deploy only the reviewed `firestore.rules` source if final Rules tests pass. | Candidate source differs from production branch for `catalogTitleSource` validation and the owner/admin-read, write-denied `settings/portalDevCustomerAccess` match. The latter must not grant DEV customer access or broaden customer access. Latest Firestore production release is recorded by audit evidence as ruleset `dbd35333-5156-4ebe-ae48-92cb7b829741`, source hash `dc4fc83dcf36382aa7d2273dc4e35bd6e41b3da02b33e85a3bd21c710204d2ee`. |
| Storage Rules | None. | Candidate and production-branch source are identical; no Storage Rules deploy is planned. |
| Firestore indexes | None unless the final semantic comparison changes. | Candidate has 95 JSON entries including a duplicate `designs/status+updatedAt` representation; live has 94 semantic composites, all READY, plus the same three explicit field overrides. Raw count is not a deployment delta. |
| Production data | None. | Do not run historical reconciliation Apply, backfill, repair, or Algolia rebuild. A read-only Preview/VERIFY may be used only as evidence; a non-zero APPLY requirement is a hard stop. |
| Portal App Hosting | Required after compatible backend source is promoted. | Backend `fresh-prints-portal` serves production App Hosting revision `fresh-prints-portal-build-2026-09-14-001` at 100% traffic from older production source commit `f1001332574b8891b2a59c14985e5c00cdbceb09`. Roll out the exact final production candidate only when execution is authorized. |
| Studio | Required: one new stable release from the exact final production SHA. | Published stable is `v1.0.12`; the corrected candidate package and workflow guard are `1.0.13`. Use `stable`, `internal-unsigned`, and `smart_filters=on` from the exact production SHA only after the candidate is frozen and execution is authorized. |

## Included goal families

The candidate must retain the production classification for all current signed-off
work, including the cumulative entries for Print Request count parity and
unqueue/cancel parity; Studio Print Request download/intake navigation and the
new dirty-preset fix; staff artwork upload and AI-review flows; lifecycle/image
parity; Show Queue quota and capacity overrides; historical reconciliation and
DEV-access hardening; contextual Smart Filters and catalog title authority; and
request-scoped Print Request live sync. No entry is promoted solely because it is
present in a signoff: the final closure is reconciled against the actual source,
live Functions, Rules, indexes, App Hosting, and release metadata.

The dirty-preset fix is client-only and has no ordering dependency on the other
Studio candidates or on Functions, Rules, indexes, or Portal. It must be present
in the exact SHA used for the single stable Studio build; a build from any SHA
before `37655dcd` is incomplete. The other Studio candidates likewise coalesce
into that same release rather than producing an intermediate package.

## Reviewed deterministic corrections before candidate freeze

These are mechanical release-integrity corrections, not scope expansion:

1. Re-add the existing `completeStaffGangSheetAndOpenNext` export to
   `functions/src/index.ts`. Keep its reviewed implementation and response
   change; do not delete or replace the live callable.
2. Bump `apps/studio/package.json` from `1.0.12` to `1.0.13` and update the
   matching workspace entry in the root `package-lock.json`.
3. Update the stable Studio workflow's `1.0.12` release guard/message and the
   corresponding signing-policy contract assertion to `1.0.13`. Keep the
   internal-unsigned Mac policy and all secret names unchanged.
4. Re-run the Function closure audit, Rules/index semantic comparison, source
   manifest, typechecks, focused contracts, and release-policy tests after the
   corrections. Results are recorded in the [Test Report](../reviews/2026-09-16-coordinated-production-promotion-test-report.md).
   The Rules suite is not clean, so the exact candidate SHA is not frozen.

No correction may remove an unexplained live Function, change a secret, enable
AI settings, add a migration, or broaden IAM/access.

## Execution order when separately released

The following is the prepared order; the current turn stops before the first
production mutation:

1. Review and implement the deterministic corrections above on `development`.
2. Freeze the clean candidate and create a reviewed `development` → `production`
   PR. Do not bypass branch protection or force-push.
3. After merge, fetch the exact production merge SHA and deploy only the final
   Firestore Rules artifact if required, then the explicit Function allowlist.
   No Storage Rules or index command is expected from the current semantic delta.
4. Verify the backend and runtime health, then roll out the Portal App Hosting
   backend from the exact production source SHA.
5. Dispatch `.github/workflows/studio-release.yml` from the exact production SHA
   with `release_type=stable`, `distribution_mode=internal-unsigned`, and
   `smart_filters=on`. Verify the draft has the same SHA, version `1.0.13`,
   eight canonical assets, and both platform/architecture results.
6. Only after the applicable release authorization and smoke gate, invoke the
   canonical stable publish helper. Never publish via a raw PATCH or an
   ambiguous tag upload.
7. Run read-only machine verification, preserve the current AI settings, and
   report `PRODUCTION ROLLOUT COMPLETE - OWNER PRODUCTION SMOKE PENDING` before
   handing off the bounded owner smoke checklist.

## AI, IAM, and data safety

- Read the live `settings/aiEnrichment` values immediately before any future
  rollout and preserve them. Current read-only evidence is catalog mode
  `shadow`, Autonomous AI `false`, and model `gemini-2.5-flash-lite`; do not
  enable Autonomous AI or Pass 2 as part of this goal.
- Read-only IAM evidence currently shows no self-binding on the production
  Compute runtime service account. Before any future Staff Artwork signed-URL
  smoke, confirm the actual deployed runtime service account and whether
  `iam.serviceAccounts.signBlob` is required. Only the exact previously reviewed
  self-binding may be applied; no broader IAM grant is permitted. Under the
  current “do not deploy” instruction, no IAM mutation is performed.
- Do not invoke historical reconciliation Apply, backfills, catalog reprocess,
  repairs, or other production writes. If the release cannot be verified
  without one, stop and document the hard stop.

## Verification and rollback anchors

Before candidate freeze, require a clean `git diff --check`, complete closure
report, Functions build/tests, a clean Rules test result, Portal typecheck/build
checks, Studio contracts/typecheck, and release workflow/publish-helper tests. Capture
the exact production merge SHA, Functions changed-ID allowlist, Rules hashes and
ruleset IDs, live index readiness, Portal previous/current revisions, and Studio
draft release ID/assets.

Immediate rollback anchors are the current production Function versions and
`840d596b058b3f7bef2dae886154aa667f9e2a57`; Firestore Rules rollback is the
known production ruleset/source recorded in the Rules cutover review; Portal
rollback is App Hosting revision `fresh-prints-portal-build-2026-09-14-001`;
Studio rollback is published `v1.0.12`. Do not claim rollback readiness until
each anchor is read back from live state.

## Current hold

Plan/Review, candidate corrections, validation, and documentation may proceed.
Production PR merge, Firebase deployment, Portal rollout, IAM mutation, Studio
stable workflow dispatch/publication, and production smoke are held both by the
latest owner instruction and by the non-clean Rules gate; they must not be
performed in this continuation.
