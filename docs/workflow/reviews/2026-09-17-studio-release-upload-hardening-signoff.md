# Signoff: Studio `v1.0.15` Release Upload Hardening

## Result

**Complete.** Studio `v1.0.15` was published once from the verified production branch/SHA after the release workflow was hardened and promoted through protected PR #103.

## Production and release evidence

- Production branch/SHA used for the final run: `production` / `5ab1f46977f9f6290351a8baf621fc14b7755f75`.
- Production matched `origin/production` before dispatch.
- Both release files existed on that exact SHA: `.github/workflows/studio-release.yml` and `.github/scripts/upload-studio-release-asset.sh`.
- Protected promotion: PR #103, `ci: harden Studio v1.0.15 release uploads`.
- Final workflow: run `35284913045`, with Windows, Mac, and finalizer successful.
- Finalizer evidence: `ARTIFACT_VERIFY_OK sha=5ab1f46977f9f6290351a8baf621fc14b7755f75 version=1.0.15` and `FINALIZE_OK release_id=391114948 ... draft=true`.
- Published release: ID `391114948`, tag `v1.0.15`, name `1.0.15`, `draft=false`, `latest=true`, exact target SHA, eight canonical assets.
- The earlier draft ID `391027008` for the prior SHA remains a separate draft with its assets; it was not published or modified by the final publication.

## Validation

- Focused release-contract tests: 35/35 pass.
- `npm run lint:release`: current 15, baseline 25, new 0.
- `git diff --check` pass.
- Git Bash syntax validation pass for the upload helper and extracted workflow Bash block.
- No Firebase, Portal, data, migration, version, signing, or unrelated production deployment action was performed.

## Signoff

The release blocker is resolved. No further Studio release action is pending for `v1.0.15`.
