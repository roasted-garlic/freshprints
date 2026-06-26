# Plan: Batch File Limit + Discovery Summary UX

| Date | 2026-06-25 |
| Goal | `MAX_BATCH_FILES` 500, `MAX_ZIP_ENTRIES` 2000; honest discovery summary |

## Product decisions (confirmed)

- `MAX_BATCH_FILES` = 500
- `MAX_ZIP_ENTRIES` = 2000
- Design library `DEFAULT_LIST_LIMIT` 100 documented only (no pagination in this phase)

## Approach

1. Constants in `batchImportLimits.constants.ts`
2. `shared/utils/batchDiscoverySummary.ts` — `processed`, `skippedByLimit`, limit warning copy
3. Extend types; populate in `batchDiscoveryHelpers.ts`
4. Split ZIP skips: `zipsSkippedByLimit` vs `zipsSkippedOther` in `folderZipProcessor`
5. Update `BatchImportDiscoverySummary.tsx` + `batchImportProgressMappers.ts`
6. Tests + WORKFLOWS.md + DECISIONS.md
