# Test Report (amendment): Purge warmup

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Goal | `studio-delete-first-action-latency` |
| Status | **passed_with_notes** |
| Amendment | purgeArchivedDesignAssets same-service warmup |

## Commands

| Check | Exit | Result |
|-------|------|--------|
| `npx tsx --test` warmup suites (shared + functions + studio contracts) | 0 | pass (see latest run) |
| `npm --prefix functions run build` | 0 | pass |
| Studio full `tsc` | baseline pre-existing failures | notes unchanged |

## Coverage added

- Purge callable warmup after owner assert, before validate/purgeOneDesign
- Studio idle `canPurgeArchivedDesignAssets` → `purgeArchivedDesignAssets`
- Purge dialog `warmPurgeArchivedDesignAssetsCallable`
- archiveDesign receives no warmup wiring
