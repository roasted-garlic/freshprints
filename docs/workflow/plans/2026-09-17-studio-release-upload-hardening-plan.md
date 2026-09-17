# Studio `v1.0.15` Release Upload Hardening Plan

## Objective

Unblock the existing Studio `v1.0.15` GitHub Release workflow after transient GitHub release-asset upload failures, while preserving the exact production SHA, release ID, canonical eight-asset set, draft-only finalize gate, signing policy, and stable publication checkpoint.

## Approved scope

- Modify `.github/workflows/studio-release.yml` only for release-asset upload resilience and Mac release-artifact compression.
- Keep uploads addressed by the exact `RELEASE_ID` and existing `UPLOAD_URL`.
- Replace all-assets deletion with per-asset idempotent handling: retain a same-name asset when its size matches; otherwise delete only that same-name asset from the exact release before retrying/replacing it.
- Retry only transient HTTP `429/500/502/503/504` responses and curl/network failures with a bounded backoff. Fail closed on non-transient `4xx` responses and after retry exhaustion.
- Verify the expected same-name asset exists on the exact release after a successful upload, and retain the final eight-asset verification.
- Set Mac `actions/upload-artifact@v4` `compression-level: 0` for already-compressed release binaries. Do not change Windows compression without evidence.
- Keep the hardened logic in the existing inline `upload_release_asset()` workflow function because the finalizer checks out the exact production build SHA; add/update narrowly related workflow contract tests for retry classification, bounded exhaustion, exact-release cleanup, canonical verification, SHA/release-ID safety, and validation-only non-mutation.

## Explicit non-goals

No Studio runtime, Firebase, Portal, version semantics, asset names, production SHA, signing policy, dual-platform requirements, production data, or release publication behavior changes. Do not bump the Studio version.

## Validation and release sequence

1. Run focused workflow contract tests and release lint/diff checks.
2. Run the required existing Studio/package/type/build checks that are relevant to this workflow-only correction.
3. Commit and push the narrow correction on `development` through the established reviewed branch policy.
4. Rerun only the required stable Studio release workflow for the production SHA; do not redeploy Firebase or Portal.
5. Confirm the exact draft has eight canonical assets and remains pinned to the production SHA. Publish `v1.0.15` once at the separate human checkpoint, then verify the stable release and Latest state.

## Rollback

Revert the workflow/test commit. Existing releases and non-target drafts remain untouched by the workflow because all cleanup and upload operations are constrained to the exact verified `RELEASE_ID`.
