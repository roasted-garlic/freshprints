# Plan: Whatnot show import update — incomplete existing record

| Field | Value |
|---|---|
| Date | 2026-08-01 |
| Goal | Goal #13 remediation `whatnot-show-import-update-incomplete-record` |
| Stage 2 | Paused |

## Evidence and root cause

- Modal/shell: `apps/studio/electron/ipc/whatnotImport/whatnotImportShell.html` + `whatnotImportShellRenderer.js`; opened from `UpcomingShowsPage.tsx` through `useWhatnotShowImport.ts`.
- Scanner: `whatnotImportWindow.ts` extracts visible card `{href,title,dateText}`, parser normalizes URL/show ID/title/date, then `planWhatnotShowImport` matches by `whatnotShowId`.
- Classification: `needs_review` for parser/ID failure; otherwise `create` when unmatched, `unchanged` when title/URL/time match, and `update` when matched but changed. Update entries already carry `existingShowId`.
- Executor defect: `useWhatnotShowImport.ts` ignores `entry.existingShowId` and calls the general `upsertUpcomingShow` with scanned fields only.
- General upsert re-lists all shows through strict `mapUpcomingShowData`, rather than resolving the scanner-matched document ID and validating a merged record. A legacy record rejected by that mapper can be skipped during rematching.
- Exact generic error source: `mapUpcomingShowData` in `upcomingShowService.ts`. It rejects any missing/invalid `source`, `whatnotShowId`, `status`, `syncStatus`, `isArchived`, `productionStatus`, `maxQuantityOverridden`, `allocatedQuantity`, `createdAt`, or `updatedAt`, but reports only `An upcoming show record is incomplete.`
- Validation is client-side after Firestore reads; no callable is involved. Firestore Rules authorize the write but do not produce this application error.
- Create validation and create defaults are separate and must remain strict/unchanged.

The exact field absent on the owner’s production record cannot be identified without reading or modifying production data, which this slice forbids. The defect is independently reproducible at the contract level: update identity is discarded, strict pre-merge mapping is reused, and known missing fields are hidden.

## Approved implementation scope

1. Add a pure import-update merge/validation helper that accepts the matched existing raw record plus scanned upstream fields.
2. Treat source, Whatnot ID, title/URL/scheduled time as upstream-owned only where current import already writes them.
3. Preserve all internal fields by using a narrow `updateDoc` payload; never rewrite capacity, allocated quantity, allocations, production status, lifecycle status, notes, or staff metadata.
4. Add a dedicated import-update service method taking `existingShowId` and expected Whatnot ID. Read that exact document, reject missing/mismatched identity with specific safe errors, merge/validate, update only upstream-owned fields, and reuse the same document ID.
5. Make the executor use the dedicated update method for `update`; keep the existing create path for `create`; keep `unchanged` no-op.
6. Replace known generic failures with field-specific safe messages. Keep a generic fallback only for unexpected malformed data.
7. Support legacy absence of optional/newer internal fields without migration or default-field writes. Truly create-required source/identity/timestamps remain enforced on create.

## Required tests

- Partial scan + existing record merges and updates same ID; title/time persist.
- Capacity, allocations (outside show doc), production/lifecycle status, notes, and metadata are absent from the write payload and preserved.
- Unchanged remains no-op; complete create still succeeds; incomplete create remains rejected.
- Legacy optional fields may be absent; required missing identity/timestamp cases yield precise errors.
- Unsupported timestamp and missing Whatnot ID are precise.
- Missing/mismatched matched document never falls back to create.
- No generic incomplete message for known field failures.

## Verification

Focused shared/importer/Studio tests; Studio typecheck; Studio production build; repository lint; `git diff --check`. Functions/Rules tests only if those layers change (not expected).

## Non-goals

No production data repair, migration, Functions/Rules/index change, deployment, installer build, production promotion, domain action, analytics, tag, or Stage 2 signoff.
