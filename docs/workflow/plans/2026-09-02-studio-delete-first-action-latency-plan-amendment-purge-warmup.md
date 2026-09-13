# Plan Amendment: Design Library purge warmup

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Goal | `studio-delete-first-action-latency` |
| Status | **approved** (owner decision) |
| Parent plan | `docs/workflow/plans/2026-09-02-studio-delete-first-action-latency-plan.md` |
| Audit | `docs/workflow/reviews/2026-09-02-studio-delete-first-action-latency-priority-surface-audit.md` |
| Owner decision | `APPROVE PURGE WARMUP AMENDMENT` |

---

## Amendment summary

1. **Internal Gang Sheets** — no additional Function; reuse Upcoming Show `previewUpcomingShowDeletion` / `deleteEligibleUpcomingShow`.
2. **Design Library soft archive** — client Firestore only; **not** a Gen2 warmup target.
3. **Design Library permanent image purge** — was the uncovered priority surface; owner approved adding same-service `{ warmup: true }` to **`purgeArchivedDesignAssets`**.
4. Owner idle warmup bound: **≤6** callables per session (was ≤5).

## Implementation (this amendment)

- Functions: warmup branch on `purgeArchivedDesignAssets` after owner assert; no Storage/Firestore purge on warmup.
- Studio: idle list includes `purgeArchivedDesignAssets` when `canPurgeArchivedDesignAssets`; dialog open calls `warmPurgeArchivedDesignAssetsCallable()`.
- Deploy list adds `purgeArchivedDesignAssets`.
