# Customer Upload Follow-up Catalog Permission — Child Signoff

| Field | Value |
|---|---|
| Goal | `customer-upload-follow-up-catalog-permission` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Signoff date | 2026-09-10 |
| Verdict | **approved_with_notes** |

## Signoff decision

The accepted Plan/Formal Review was implemented within scope and the focused Test gate passed.
Original customer denial remains immutable for audit, request use remains available, one opaque-token
follow-up is customer-authoritative, and Allow/Decline have no automatic catalog side effects.
Server-side restore, promotion, ownership, and maintenance checks remain authoritative. Donations,
Rules/index changes, production actions, and data operations remain out of scope.

## Evidence

* Implementation review: `2026-09-10-customer-upload-follow-up-catalog-permission-implementation-review.md`
* Test report: `2026-09-10-customer-upload-follow-up-catalog-permission-test-report.md`
* Focused tests: **36/36** and maintenance contracts **9/9** passed.
* Functions build, Portal typecheck, targeted ESLint, and `git diff --check` passed.
* Unrelated Studio typecheck/full-lint baselines and local Portal `.next/trace` build lock are
  documented; they are not child regressions.

## Parent handback

This child changes runtime source and therefore invalidates the parent dirty-snapshot freeze
preparation. Parent M0 must add the three callable exports and all changed shared/Functions/Portal/
Studio paths, rerun Function export/transitive closure plus maintenance-guard inventory, regenerate
Rules/Storage/index/Portal/Studio/config/data/maintenance/exclusion manifests, and reconcile a new
reviewed development candidate SHA. The parent must not reuse or freeze the prior provisional SHA
`04b9637470a16b0f4d4a1ba9f822fe9df7acca2d`.

No commit, push, candidate freeze, production deployment/publication, maintenance activation,
migration, backfill, or production data operation was performed. Owner DEV QA may begin only after
the parent supplies its reassembled M0 evidence; this child Signoff does not authorize parent M1.

**Exact next parent checkpoint:** `RERUN COORDINATED-PRODUCTION M0 PREPARATION — CUSTOMER UPLOAD FOLLOW-UP CHILD SIGNED OFF; REASSEMBLE AND RECONCILE A NEW REVIEWED DEVELOPMENT CANDIDATE SHA`.
