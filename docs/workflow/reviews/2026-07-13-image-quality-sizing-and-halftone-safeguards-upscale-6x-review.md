# Remediation Review — Raise automated upscale ceiling to 6×

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Goal | `image-quality-sizing-and-halftone-safeguards` |
| Plan | `docs/workflow/plans/2026-07-13-image-quality-sizing-and-halftone-safeguards-upscale-6x-plan.md` |
| Status | **approved_with_changes** — proceed under owner FAIL directive |

## Decision

Raise the single-pass automated upscale ceiling from 2× to 6× while preserving the 12″ target, one-pass rule, request defaults, envelopes, and human-only halftone workflow. Mark >2× as extended for staff visibility only.

## Required implementation

1. `MAX_UPSCALE_FACTOR = 6`; add `EXTENDED_UPSCALE` warning when applied factor > 2
2. Shared tests including Achy Breaky 641×597 regression
3. Soft-quality import warning threshold aligned to >2×
4. ADR-FP-080, DATA_MODEL, manual checkpoint
5. No production deploy; no migration
