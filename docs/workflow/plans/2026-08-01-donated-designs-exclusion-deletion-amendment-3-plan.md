# Donated Designs exclusion/deletion Amendment 3 plan

## Goal

Finalize reversible exclusion/restore semantics and make permanent deletion complete, schema-driven, fail-closed, and safely retryable.

## Scope

- Confirm owner/admin/helper exclusion and restoration are actor-independent metadata transitions.
- Replace the deletion helper's ad-hoc four-value list with an authoritative manifest of every current `CustomerUpload` Storage-path field.
- Validate every stored path as a canonical object owned by the exact upload/customer before deletion.
- Block deletion when dependency inspection or path validation cannot complete reliably.
- Treat missing Storage objects as already clean, continue across independent object failures, and retain the upload document if any confirmed asset fails deletion.
- After complete asset cleanup, transactionally remove the upload document and its upload-specific ZIP manifest/counter reference when present. Never delete a batch archive or batch document.
- Preserve owner/admin delete authorization and helper denial in both Studio and trusted callables.

## Current schema finding

`CustomerUpload` currently persists exactly four upload-owned Storage paths: `sourceStoragePath`, `productionStoragePath`, `previewStoragePath`, and `thumbnailStoragePath`. Trimmed/normalized processing writes the canonical production/source outputs and does not persist a separate derivative path. The manifest will be the single reviewed runtime source of truth and will fail closed when a future `*StoragePath` field appears without being approved.

## Safety and data boundaries

- No force deletion or reference detachment.
- No user-text-derived or guessed paths.
- No shared assets, batch ZIP archives, requests, designs, allocations, users, or unrelated uploads are deleted.
- Firestore/Storage actions remain Admin-SDK callable operations guarded by trusted role checks.
- Production deployment and production data are out of scope.

## Verification

Add focused tests for cross-role restore semantics, role authorization, blockers, authoritative asset enumeration, unexpected/malformed/shared paths, partial cleanup behavior, batch reference cleanup, and source-level execution ordering. Run focused tests, Functions build, Studio TypeScript/build, lint, and `git diff --check`.
