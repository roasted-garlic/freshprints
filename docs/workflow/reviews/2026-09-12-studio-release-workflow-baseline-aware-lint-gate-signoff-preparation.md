# Signoff Preparation — Studio release workflow baseline-aware lint gate

| Field | Value |
|---|---|
| Corrective child | `studio-release-workflow-baseline-aware-lint-gate` |
| Date | 2026-09-12 |
| Disposition | **BLOCKED_PENDING_STUDIO_TYPECHECK_BASELINE_DECISION** |
| Implementation | complete within approved workflow/tooling scope |
| Automated tests | **49/49 PASS** |

The deterministic baseline-aware gate is implemented and locally validated. The exact manifest has
25 findings (20 errors, 5 warnings); new findings, malformed output, and process failure fail
closed; baseline removals pass without auto-write. Studio runtime behavior is unchanged.

Corrective Signoff cannot yet be completed because the real Studio prerelease workflow reached the
new lint gate successfully but both platform packaging jobs then failed at the existing Studio
TypeScript baseline before producing artifacts. The source changes are limited to the approved
workflow/tooling files; no runtime defect was found and no automatic patch was attempted. Windows
and macOS install/update evidence therefore does not exist.

Validation branch: `rc/studio-release-lint-gate-validation`; SHA
`b8d8d80cc1cab5bdb2aed1889730205e0a8046f3`; workflow run `34738737103`.

No production action occurred. Rules snapshot access remains a separate read-only 403 blocker.

## Next owner checkpoint

**`OWNER DECIDE EXISTING STUDIO TYPECHECK BASELINE / CORRECTIVE SIGNOFF PATH`**
