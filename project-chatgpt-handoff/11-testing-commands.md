# Testing and Commands

## Required checks before signoff

| Check | Command | When |
|-------|---------|------|
| Lint | `npm run lint` | TS/TSX changes |
| Typecheck | `npx tsc --noEmit` | Type changes |
| Build | `npm run build` | Release or build-affecting changes |
| Unit tests | Manual — no `npm test` yet | Logic changes with `*.test.ts` |

**Never claim tests passed unless actually run.**

## Dev workflow

```bash
npm run dev    # Start Electron app with hot reload
```

Manual testing required for: UI/UX, Electron IPC, Firebase integration, AI pipeline end-to-end.

## Unit test files (representative)

**Functions (AI pipeline):**
- `functions/src/ai/catalogEnrichmentResponse.test.ts`
- `functions/src/ai/catalogEnrichmentRetry.test.ts`
- `functions/src/ai/catalogTitleRules.test.ts`
- `functions/src/ai/pipelineTiming.test.ts`
- `functions/src/ai/visibleTextValidation.test.ts`

**Renderer (AI Review):**
- `features/ai-review/utils/aiReviewInbox.test.ts`
- `features/ai-review/utils/aiReviewInboxSelection.test.ts`
- `features/ai-review/utils/aiProcessingQueueSelection.test.ts`

**Designs:**
- `features/designs/utils/designReadyPathValidation.test.ts`
- `features/designs/utils/aiReviewState.test.ts`

Run a test file manually (example):
```bash
npx tsx functions/src/ai/catalogTitleRules.test.ts
```
(Exact runner may vary — verify in repo if tsx/node test harness exists.)

## AI enrichment test baseline

v15 plan: **49/49 tests pass** locally — see `docs/workflow/reviews/2026-06-26-ai-catalog-enrichment-v15-test-report.md`

## Manual test checkpoints

Use for UI changes, deploy verification, visual design:

1. Define steps with expected results
2. Record PASS / FAIL / PASS WITH NOTES
3. Document in workflow signoff

**Phase 0 smoke test (current blocker):**
1. Deploy Firebase functions
2. Open AI Review in Studio
3. Re-run AI on one design
4. Confirm `promptVersion: catalog-enrich-openai-v15`
5. Confirm `provider: openai` (not development)

## Setup guides (repo)

- `docs/workflow/setup/auth-testing-guide.md`
- `docs/workflow/setup/firebase-project-setup.md`
- `docs/workflow/setup/firebase-functions-setup.md`

## CI

`[TBD]` — not yet configured. Local commands should mirror future CI.

## FreshForge test phase

In managed workflow: Test Agent runs checks, records exact commands + exit codes in test report before signoff.
