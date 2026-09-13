# Implementation Review — Coordinated production cutover prerequisites

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Plan | `docs/workflow/plans/2026-09-12-coordinated-production-cutover-prerequisites-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-12-coordinated-production-cutover-prerequisites-review.md` |
| Verdict | **implemented within approved scope; automated Test complete; Owner DEV QA PASS; Signoff authorized** |
| Production | untouched; no production runner invocation or Firebase deployment |
| Git promotion | no staging, commit, push, freeze, tag, or publish |

## Scope delivered

- Final `firestore.rules` remains the authoritative deny-canonical-read state; a generated,
  byte-stable `firestore.transition.rules` plus `firebase.transition.json` preserves customer-owned
  canonical reads during projection convergence. The generator and parity tests prove the intended
  boundary delta.
- Portal print-request reads prefer `portalPrintRequestItems`, merge bounded canonical fallback rows
  by stable ID, preserve deterministic ordering, and never hydrate `staffArtworks` directly.
- `reconcile-portal-print-request-items-prod.ts` is hard-pinned to `fresh-prints-prod`, requires a
  clean candidate SHA/manifest, is one-page/cursor bounded, defaults to zero-write DRY RUN, requires
  two exact APPLY confirmations, and exposes distinct pre-APPLY delta, post-APPLY exact, and
  post-APPLY zero-diff modes. The existing DEV-only runner guard is unchanged.
- `generate-commit-byte-manifest.mjs` hashes committed Git-object bytes and rejects dirty/mismatched
  inputs; the companion `commit-byte-manifest.mjs` audit remains the parent-compatible array-shaped
  manifest path. The production runner accepts either shape and verifies the cutover/runtime bytes;
  focused tests cover SHA, duplicate/missing members, and dirty-tree guards.
- Studio authoritative package/lock/release checks now target `1.0.10`; no release workflow was run.
- `SECURITY.md`, `FIREBASE.md`, and `RISK_REGISTER.md` describe projection ownership, final Rules,
  preview/thumb-only Storage access, the owner-accepted known-ID residual risk, and the signed-URL
  alternative.

## Required review clarification applied

The implementation distinguishes expected missing/stale projections in pre-APPLY VERIFY from the
post-APPLY exact-equality VERIFY and the subsequent zero-diff DRY RUN. Unsafe, malformed, private,
unclassified, or manifest-drift findings still fail closed before APPLY.

## Validation outcome

Focused local suites and Functions build are complete; the Test Report records 87/87 focused tests,
Portal typecheck, targeted lint, and the documented Portal build, full Rules, Studio typecheck, and
whole-repository lint baseline/environment failures. Owner DEV QA subsequently reported
`OWNER DEV QA: coordinated-production-cutover-prerequisites - PASS`; the child Signoff is authorized
and recorded separately.
