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
npx tsx --test apps/studio/src/renderer/src/features/users/utils/buildPrintRequestHistoryCard.test.ts apps/studio/src/renderer/src/features/users/utils/resolveLogicalCustomerIds.test.ts
```

Canonical list: `docs/standards/TESTING.md`.

## Manual checkpoints

Owner replies `PASS` / `FAIL` / `PASS WITH NOTES` on docs under `docs/workflow/reviews/`.

Most recent completed checkpoints:
- WS4 Owner DEV QA — **PASS** (2026-08-30)
- Show Queue Did Not Print recovery — **PASS** (2026-08-30)

## Firestore Rules test disposition (preserve)

Show Queue scoped Rules suites passed where run. Full `npm run test:rules` is **not** claimed globally passing — unrelated suites have documented expression-budget failures.

## FreshForge test phase

Test Agent records exact commands + exit codes before signoff.
