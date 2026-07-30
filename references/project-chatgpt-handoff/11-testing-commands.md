# Testing and Commands

## Required checks before signoff

| Check | Typical command | When |
|-------|-----------------|------|
| Lint | `npm run lint` | TS/TSX changes |
| Typecheck | Portal: `npm run typecheck --workspace @fresh-prints/portal`; Studio/functions similarly | Type changes |
| Build | `npm run build:portal` / `build:studio`; `cd functions && npm run build` | Build-affecting |
| Unit tests | `npx tsx --test <glob>` | Logic with `*.test.ts` |
| Firestore / Storage Rules | `npm run test:rules` | Rules or authorization changes; requires a compatible JDK |

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
npx tsx --test tests/firebase/printRequestCompletion.rules.test.ts
npx tsx --test packages/shared/src/utils/operationalWipeTargets.test.ts packages/shared/src/utils/operationalWipeTargetsUiSafety.test.ts
```

Canonical list: `docs/standards/TESTING.md`.

## Manual checkpoints

Owner replies `PASS` / `FAIL` / `PASS WITH NOTES` on docs under `docs/workflow/reviews/`.

Most recent completed checkpoint:
`2026-07-29-studio-test-data-print-limit-wipe-audit-qa-checkpoint.md` — owner **PASS**

## FreshForge test phase

Test Agent records exact commands + exit codes before signoff.
