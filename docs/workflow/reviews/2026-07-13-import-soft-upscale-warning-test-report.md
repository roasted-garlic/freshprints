# Test Report: Import soft-upscale quality warning

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Plan | docs/workflow/plans/2026-07-13-import-soft-upscale-warning-plan.md |
| Result | **passed** |

## Commands

```bash
npx tsx --test packages/shared/src/utils/printSizeMath.test.ts packages/shared/src/utils/importPrintSizeMessages.test.ts
```

- Exit code: 0
- 26/26 pass (includes 4 new soft-quality cases + 1 message case)

## Notes

- Manual Studio import smoke optional; automated coverage covers 1.5× / 3× / 3.75× boundaries.
