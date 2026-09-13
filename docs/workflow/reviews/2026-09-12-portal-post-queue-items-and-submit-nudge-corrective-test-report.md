# Test Report — Portal post-queue items + submit nudge

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `portal-post-queue-items-and-submit-nudge-corrective` |
| Disposition | **passed** (automated); Owner DEV QA pending |

## Focused tests

```text
npx --no-install tsx --test ^
  apps/portal/features/print-requests/utils/addDesignRuntime.test.ts ^
  apps/portal/features/print-requests/utils/printRequestDetailPostQueueHydration.contract.test.ts ^
  apps/portal/features/print-requests/utils/workingItemsSubscribeMerge.contract.test.ts ^
  apps/portal/features/print-requests/utils/mergeServerWorkingItemsWithLocal.test.ts
```

Result: **`# tests 17` / `# pass 17` / `# fail 0`**

## Portal typecheck

`npx tsc --noEmit -p apps/portal/tsconfig.json` → **PASS**

## Targeted ESLint

Scoped amendment files → **PASS** (`--max-warnings 0`)

## `git diff --check`

**PASS** (CRLF warnings only)

## Not claimed

- Portal production `next build` (Windows `.next/trace` EPERM baseline)
- Owner DEV QA
