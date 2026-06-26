# Plan: Raise ZIP Import Limit to 2.1 GB

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | ready_for_review |
| Workflow | managed-phase |

---

## Goal

Allow compressed ZIP archives up to **2.1 GB** for Select ZIP, folder-discovered ZIPs, and nested ZIP extraction — matching Google Drive multi-part download sizes (~2 GB per part).

## Scope

**IN:** `MAX_ZIP_SIZE_BYTES`, constant-driven messages, tests, `WORKFLOWS.md`, `DECISIONS.md`

**OUT:** `MAX_BATCH_FILES`, `MAX_ZIP_ENTRIES`, `MAX_EXTRACTED_BYTES`, PNG/storage limits

## Approach

1. Set `MAX_ZIP_SIZE_BYTES = Math.floor(2.1 * 1024 * 1024 * 1024)` (integer bytes for comparisons)
2. Verify `importLimitMessages`, `selectImportZipFile`, `zipExtractor`, `folderScanner` use constant (already do)
3. Update `importLimitMessages.test.ts` — expect 2.10 GB messaging; add over-limit boundary note
4. Update docs with Drive use case

## Test Strategy

- `npx tsx --test shared/utils/importLimitMessages.test.ts`
- `npx tsc --noEmit`, `npx eslint .`

## Human Checkpoints

- None (desktop-only constant change; no Firebase deploy)
