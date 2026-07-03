# AI Processing Navigation Guard Signoff

## Status

Signed off locally.

## Summary

AI Processing now uses the shared app-shell leave/quit confirmation flow while AI work is active. Leaving the page or quitting the app prompts staff to either stay and continue processing or stop the AI queue. Confirming stop requests that the client queue stop after the current in-flight image; the server-side callable already in progress is allowed to finish.

The existing Imports guard remains on the same provider with its original upload-specific copy.

## Verification

- `npx tsx src/renderer/src/features/ai-review/utils/aiProcessingQueue.test.ts` passed: 5/5.
- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `git diff --check` passed with only Git CRLF conversion warnings.

## Deployment

No Firebase, Functions, rules, secrets, data, migration, AI provider, or dependency action applies.
