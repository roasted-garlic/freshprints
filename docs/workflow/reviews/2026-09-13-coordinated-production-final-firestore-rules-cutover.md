# Coordinated Production Final Firestore Rules Cutover

Date: 2026-09-13
Parent goal: `coordinated-production-promotion-release-readiness`
Frozen candidate: `7b8462a0fe60e484a937a7c88fc37e7c938fff6d`
Production merge: `f615c38dbe15c37c494ce057544463843ead866e`

## Authorization and scope

Owner authorized the final Firestore Rules cutover for `fresh-prints-prod`. Only the reviewed
`firestore.rules` artifact was deployed. Storage Rules were not redeployed; Functions, indexes,
Portal, Studio, Auth, secrets, settings, maintenance state, and production data were not changed.

## Pre-deploy guards

All read-only guards passed:

- project: exactly `fresh-prints-prod`;
- `HEAD`: exact frozen candidate; the candidate-bound `firestore.rules` Git object matched;
- final source SHA-256: `dc4fc83dcf36382aa7d2273dc4e35bd6e41b3da02b33e85a3bd21c710204d2ee`;
- Portal rollout `build-2026-09-13-001`: succeeded, 100% traffic on
  `fresh-prints-portal-build-2026-09-13-001`;
- maintenance document: absent/OFF;
- projection producer Functions: ACTIVE, including both projection triggers;
- canonical/projection counts: 1,680 / 1,680;
- exact projection VERIFY: 1,680/1,680 correct, missing/stale/malformed/unsafe/errors all 0;
- zero-diff projection DRY RUN: CREATE 0, UPDATE 0, errors 0, `hasMore=false`.

## Deployment identity

`npx --no-install firebase deploy --only firestore:rules --project fresh-prints-prod` completed
successfully. The Rules API export of the deployed `firestore.rules` source reproduced the expected
SHA-256 exactly:

`dc4fc83dcf36382aa7d2273dc4e35bd6e41b3da02b33e85a3bd21c710204d2ee`

- ruleset: `projects/fresh-prints-prod/rulesets/dbd35333-5156-4ebe-ae48-92cb7b829741`;
- ruleset create time: `2026-09-13T16:24:54.211679Z`;
- release: `projects/fresh-prints-prod/releases/cloud.firestore`;
- release target: the ruleset above;
- release update time: `2026-09-13T16:24:55.378046Z`.

Rollback evidence remains the reviewed transition artifact SHA-256
`8a50d5bb85fa41fca82652582730940fb1a936cb0aae059a0b05e59099db9945`, with prior release
`cloud.firestore`, ruleset `42adfbb5-9f5d-4d22-a07b-e38078aba074`, and source SHA-256
`cdd4a3154733cfdceea53be9a785e39e4ea526a27da5e1046a802e33557defad`.

## Post-cutover smoke and boundary evidence

- Portal public smoke: `/`, `/catalog`, `/robots.txt`, and `/sitemap.xml` each returned HTTP 200;
  no `fresh-prints-dev` marker was observed.
- Production maintenance remains OFF/absent.
- Projection-backed population remains converged (1,680/1,680 exact equality).
- Rules emulator contract passed 7/7 (including projection ALLOW, same-customer canonical
  `printRequestItems` DENY, customer `staffArtworks` DENY, and cross-customer projection DENY).
  The emulator emitted the existing expression-budget baseline warnings; all assertions passed.
- No live authenticated customer session was available to independently replay the signed-in
  Portal modal in this shell. The owner’s prior production Studio QA PASS and the read-only
  population/equality evidence remain authoritative for historical and projection-backed data.
- Studio stable `1.0.10` remains published and healthy per the owner-approved production QA record.

Canonical customer reads are retired: final Rules permit customer reads from
`portalPrintRequestItems` only when the projection belongs to that customer; canonical
`printRequestItems` and `staffArtworks` remain staff-only.

## Boundary and rollback disposition

Final Rules deployment passed without fallback. No transition rollback was needed. A rollback would
restore the reviewed transition ruleset only if a post-cutover Portal permission regression were
observed; weakening Rules is not permitted.

No maintenance activation, Smart Profile or Algolia operation, legacy-tag cleanup, unrelated deploy,
production data mutation, staging, commit, push, or candidate freeze occurred in this cutover turn.

## Tooling hygiene note

An earlier local command inherited `DEBUG=release` and emitted a process-environment diagnostic dump
to tool output. No values were copied into repository evidence or workflow records; subsequent
commands cleared `DEBUG`. Rotate any credentials/tokens that may have appeared in that diagnostic
output as a precaution.

## Next checkpoint

**OWNER AUTHORIZE PRODUCTION MAINTENANCE ON**

This artifact does not authorize maintenance activation or any deferred backfill/reconciliation.
