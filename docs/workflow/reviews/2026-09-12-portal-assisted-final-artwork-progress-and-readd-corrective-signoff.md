# Signoff: Portal Assisted Final Artwork Progress and Re-add Corrective

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Signoff by | Signoff Agent |
| Goal | `portal-assisted-final-artwork-progress-and-readd-corrective` |
| Plan | `docs/workflow/plans/2026-09-12-portal-assisted-final-artwork-progress-and-readd-corrective-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-progress-and-readd-corrective-review.md` |
| Implementation Review | `docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-progress-and-readd-corrective-implementation-review.md` |
| Test Report | `docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-progress-and-readd-corrective-test-report.md` |
| DEV deployment | `docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-progress-and-readd-corrective-dev-deployment.md` |
| Final status | **approved_with_notes** |

## Owner DEV QA

The owner explicitly reported:

> **OWNER DEV QA: portal-assisted-final-artwork-progress-and-readd-corrective - PASS**

The owner exercised approved/final Assisted artwork Add to Request, real server processing stages,
elapsed time, Step N of M/remaining steps, successful first Add, removal, successful second Add,
absence of the empty-update error, no duplicate upload/item, no Assisted catalog-permission modal,
no fake consent, no denial/follow-up state, no Assisted retention episode, no automatic Design
Library publication, and unchanged ordinary customer-upload behavior.

## Final implementation

- Every existing-upload branch in `ensureIngestOnWorkingRequest` computes the upload patch and calls
  `Transaction.update` only when the patch is non-empty. A legacy upload missing the Assisted origin
  marker still receives the backfill; a ready upload with the marker no longer issues `update({})`.
- The callable publishes only server-owned ephemeral `addToRequestProgress` fields: current stage,
  `startedAt`, and `updatedAt`. The state is cleared in `finally` on success and failure.
- Real callable boundaries and image-pipeline callbacks drive progress. The deployed path uses
  `resolving_proof`, `downloading`, `checking_format`, `checking_transparency`, conditional
  `trimming`/`upscaling`, `checking_print_size`, `creating_previews`, `saving`, and `attaching`.
  Portal maps the whitelisted stages to customer-safe labels and renders a live elapsed clock,
  logical Step N of M, completed/remaining work, and duration variability. No percentage, countdown,
  or invented ETA is shown.
- Existing final-source-first selection, proof fallback, sizing, quantity, request limits,
  ownership, maintenance, idempotency, and direct no-consent Assisted Add-to-Request behavior remain
  authoritative.

## Evidence

- Focused corrective contracts: **10/10 passed**.
- Combined Assisted/customer-upload regressions: **25/25 passed**.
- Lineage and eligibility regressions: **28/28 passed**.
- Functions build: **PASS**.
- Portal typecheck: **PASS**.
- Targeted ESLint: **PASS**.
- `git diff --check`: **PASS** (existing line-ending normalization warnings only).
- DEV callable deployment: exactly one Function, `fresh-prints-dev`, ACTIVE revision
  `customeraddassistedapprovedprooftoprintrequest-00037-juk`.

## Disposition and boundaries

The corrective is **approved_with_notes**. Notes are limited to the documented Node.js 20 and
`firebase-functions` deployment warnings and the remaining parent-level release gates. The Portal
continues to use the localhost DEV path; no App Hosting deployment was performed.

Production, maintenance activation, migration/backfill, candidate freeze, staging, commit, push,
and parent M0 execution remain untouched. The separate Staff Artwork corrective and multi-proof
runtime were not implemented or signed off by this artifact.

## Workflow closure

- [x] Owner DEV QA PASS recorded
- [x] Implementation, Test, and DEV deployment evidence linked
- [x] Signoff recorded as `approved_with_notes`
- [x] Production remains untouched

The parent remains blocked on its other pre-freeze children and must not resume M0 yet.
