# Review: Import soft-upscale quality warning

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Plan | docs/workflow/plans/2026-07-13-import-soft-upscale-warning-plan.md |
| Verdict | **approved** |

## Summary

Narrow, reversible messaging change. Keeps 15″ headroom; adds soft-quality warning at ≥ 3× upscale. No schema, auth, or deploy impact.

## Required changes
None.

## Notes
- Soft threshold 3× ≈ sources under ~5″ at 300 DPI after trim.
- Do not reject imports; warn only.
