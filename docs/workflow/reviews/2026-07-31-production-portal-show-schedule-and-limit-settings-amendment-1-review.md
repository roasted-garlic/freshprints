# Formal Review: All-status customer schedule visibility amendment 1

| Field | Value |
|---|---|
| Date | 2026-07-31 |
| Plan | `docs/workflow/plans/2026-07-31-production-portal-show-schedule-and-limit-settings-amendment-1-plan.md` |
| Verdict | **approved_with_changes** |

## Review

The defect is demonstrated by current source, not inferred from the predeployment symptom. Separating schedule retrieval from timer polling is the narrow architecture-correct repair: it reuses the existing ownership-bounded sanitized callable and does not broaden Firestore access. Client chunking is required because the server cap is intentional and the full history list is not otherwise bounded to 50.

## Required changes

1. Reuse the same shared schedule formatter/model on card and details paths; do not duplicate privacy-sensitive mapping.
2. Detail schedule loading must run once per request/reload and must not enable continuous timer polling for terminal states.
3. Batch chunk merge must reject/handle partial failures deterministically without erasing successful chunks.
4. Tests must prove the schedule is independent of list tab and details progress stage, not merely test the formatter again.
5. Preserve `Schedule unavailable` only for positive allocations whose show record is missing/unreadable.

## Verdict rationale

**approved_with_changes**. Implementation may proceed only with the five requirements above. No backend authorization, Rules, or production action is approved.
