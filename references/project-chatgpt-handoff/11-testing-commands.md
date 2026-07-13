# Testing and Commands

## Required checks before signoff

| Check | Typical command | When |
|-------|-----------------|------|
| Lint | `npm run lint` | TS/TSX changes |
| Typecheck | Portal: `npm run typecheck --workspace @fresh-prints/portal`; Studio/functions similarly | Type changes |
| Build | `npm run build:portal` / `build:studio`; `cd functions && npm run build` | Build-affecting |
| Unit tests | `npx tsx --test <glob>` | Logic with `*.test.ts` |

**Never claim tests passed unless actually run.**

## Dev

```bash
npm run dev:portal   # http://localhost:3100
npm run dev:studio
```

Manual testing required for UI/UX, Electron IPC, Firebase integration, upload finalize E2E, show queue.

## Useful unit test globs

```bash
npx tsx --test packages/shared/src/utils/printRequestItemSizing*.test.ts
npx tsx --test packages/shared/src/utils/customerUploadProgressLabel.test.ts
npx tsx --test apps/studio/src/renderer/src/features/print-requests/utils/*.test.ts
npx tsx --test functions/src/lib/customerUpload*.test.ts
npx tsx --test functions/src/ai/*.test.ts
```

Canonical list: `docs/standards/TESTING.md`.

## Manual checkpoints

Owner replies `PASS` / `FAIL` / `PASS WITH NOTES` on docs under `docs/workflow/reviews/`.

Current open checkpoint (as of handoff refresh):  
`2026-07-12-portal-upload-limits-speed-confirmations-dpi-r7-manual-checkpoint.md`

## FreshForge test phase

Test Agent records exact commands + exit codes before signoff.
