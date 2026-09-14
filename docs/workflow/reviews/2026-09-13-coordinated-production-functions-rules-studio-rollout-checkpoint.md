# Coordinated Production Functions, Transition Rules, and Studio 1.0.10 Checkpoint

**Date:** 2026-09-13
**Parent goal:** `coordinated-production-promotion-release-readiness`
**Frozen candidate:** `7b8462a0fe60e484a937a7c88fc37e7c938fff6d`
**Production merge:** PR #93, merge commit `f615c38dbe15c37c494ce057544463843ead866e`

## Secret metadata

`OPENAI_API_KEY` exists in `fresh-prints-prod` with one enabled version. Metadata-only commands
were used; the secret value was never read, printed, logged, copied, or documented.

## Functions deployment

The reviewed explicit allowlist deployment completed successfully. Post-deploy reconciliation
reports **167/167 Gen2 Functions ACTIVE**: 164 reviewed targets plus 3 retained live versions.
All 164 reviewed targets are present and ACTIVE; both projection triggers are present and ACTIVE:

- `onPrintRequestItemPortalProjectionWritten`
- `onStaffArtworkPortalProjectionRefreshWritten`

All 10 excluded Functions remain absent. No broad Functions deployment was used, and the frozen
candidate/allowlist classification remains unchanged (54 ADD, 110 UPDATE, 3 RETAIN, 10 EXCLUDE,
9 NO ACTION).

## Transition Rules

`firestore.transition.rules` deployed successfully to `fresh-prints-prod` using SHA-256
`8a50d5bb85fa41fca82652582730940fb1a936cb0aae059a0b05e59099db9945`. Firebase reported
`Deploy complete`; compilation warnings are the documented existing Rules baseline.

## Production integration

PR #93 promoted the exact frozen candidate into `production`. `origin/production` now contains
the frozen candidate as an ancestor and `apps/studio/package.json` is `1.0.10`.

## Stable Studio release

Canonical workflow run `34762807770` ran from production SHA `f615c38dbe15c37c494ce057544463843ead866e`
with `release_type=stable` and `distribution_mode=internal-unsigned`. Windows, macOS, and
finalization all passed. Draft release `v1.0.10-f615c38` contains 8 verified dual-platform assets.
It remains a **draft** by contract and has not been published.

## Required owner QA stop

The release workflow requires human production Studio smoke before publishing the draft. Automated
workflow guards and artifact verification passed, but this checkpoint does not claim manual
installer install/launch or live production sign-in. Do not publish the draft, roll out Portal,
activate maintenance, run the projection runner, or proceed to DRY RUN/VERIFY until the owner
confirms production Studio QA.

**Next owner checkpoint:** `OWNER QA: PROD STUDIO 1.0.10 INSTALL / LAUNCH / PRODUCTION FIREBASE — PASS`
