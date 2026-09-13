# Signoff Preparation — Coordinated production cutover prerequisites

> **Superseded by final Signoff:** Owner DEV QA reported
> `OWNER DEV QA: coordinated-production-cutover-prerequisites - PASS`; see
> `2026-09-12-coordinated-production-cutover-prerequisites-signoff.md`.

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `coordinated-production-cutover-prerequisites` |
| Plan | `docs/workflow/plans/2026-09-12-coordinated-production-cutover-prerequisites-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-12-coordinated-production-cutover-prerequisites-review.md` |
| Implementation Review | `docs/workflow/reviews/2026-09-12-coordinated-production-cutover-prerequisites-implementation-review.md` |
| Test Report | `docs/workflow/reviews/2026-09-12-coordinated-production-cutover-prerequisites-test-report.md` |
| Status | **Superseded by final Signoff — Owner DEV QA PASS recorded** |

## Evidence ready for review

- Rules transition/final artifacts and generator parity are present; the final ruleset is
  projection-only for customer reads and the transition artifact keeps canonical reads available
  until population and verification converge.
- Portal reads are projection-preferred with bounded, stable-ID canonical fallback and no direct
  `staffArtworks` document hydration.
- The production runner is hard-pinned to `fresh-prints-prod`, clean candidate SHA/byte-manifest
  gated, one-page/cursor bounded, dry-run by default, and separately confirms pre-APPLY delta,
  post-APPLY exact equality, and post-APPLY zero-diff dry-run semantics.
- Studio release metadata and policy checks target `1.0.10`; SECURITY, FIREBASE, and the risk
  register record the accepted authenticated known-ID preview/thumbnail residual risk.
- Automated checks and documented baseline/environment failures are recorded in the Test Report.

## Required owner checkpoint

Owner DEV QA must exercise the projection-first, canonical-fallback, delayed/stale, duplicate/order,
error-fallback, and Staff Artwork preview/thumbnail cases in DEV/local only. Use the transition Rules
config for canonical-fallback checks and the final Rules config for converged projection-only checks;
neither path touches production. A PASS is required before the child Signoff may be created. This
preparation does not authorize production reads,
runner execution, APPLY/backfill, Rules or Functions deployment, Portal/Studio publication, staging,
commit, push, freeze, maintenance activation, or any other release action.
