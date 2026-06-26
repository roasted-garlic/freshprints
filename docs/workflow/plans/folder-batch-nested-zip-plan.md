# Folder Batch Import — Nested ZIP Discovery Plan

**Date:** 2026-06-24  
**Goal:** Recursively import PNGs from a selected folder including nested subfolders and `.zip` archives.

## Scope

| In scope | Out of scope |
|----------|--------------|
| Folder scan finds loose PNGs + `.zip` files | JPG/WebP |
| Extract PNGs from each ZIP (safe limits) | Multiple outer ZIP picker |
| Nested ZIP-in-ZIP up to `MAX_NESTED_ZIP_DEPTH` (3) | Upload/Firestore flow changes |
| Discovery summary: PNGs, ZIPs processed/skipped, nested ZIPs not opened | |

## Approach

1. Extend `folderScanner` to collect ZIP candidates alongside PNG candidates.
2. Extend `zipExtractor` with nested ZIP recursion and shared byte/candidate budgets.
3. Add `folderZipProcessor` to extract PNGs from folder ZIPs into job temp dir.
4. Orchestrate in `folderBatchDiscovery` (loose PNGs + ZIP PNGs → validate).
5. Extend `BatchDiscoveryCompleteEvent.folderDiscovery` + UI summary.

## Limits

| Constant | Value | Notes |
|----------|-------|-------|
| `MAX_NESTED_ZIP_DEPTH` | 3 | New |
| `MAX_FOLDER_ZIPS` | 50 | New — cap ZIP files processed per folder job |
| Existing | `MAX_BATCH_FILES`, `MAX_ZIP_SIZE_BYTES`, etc. | Unchanged |

## Security

Reuse zip-slip protection, compression ratio limits, symlink rejection, no nested ZIP beyond depth N.

## Impact

Starter surface: no. Electron main + shared types + imports UI summary.
