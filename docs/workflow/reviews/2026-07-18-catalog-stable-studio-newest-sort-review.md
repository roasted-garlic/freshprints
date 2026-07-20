# Review: Catalog/library stable sort — Studio newest first

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Plan | docs/workflow/plans/2026-07-18-catalog-stable-studio-newest-sort-plan.md |
| Verdict | **approved** |

---

## Checklist

- [x] Scope clear and bounded (client query sort + shared ranking for category rails)
- [x] Architecture alignment (Portal catalog service / hooks; no layer bypass)
- [x] Security impact none
- [x] Data model / migration none
- [x] Backend: no Functions deploy; indexes already exist; fallback retained
- [x] Test strategy adequate (unit + typecheck + owner manual)
- [x] Human checkpoints: manual library re-test after soft-reload
- [x] No silent scope expansion

## Notes

Root cause analysis in plan is correct: default `updatedAt` sort + popularity trigger bumping `updatedAt` causes requested designs to surface as “newest.” Switching default to `createdAt` matches owner rules without production deploy.

Leaving `onPrintRequestItemCreated` `updatedAt` bump for a later optional Functions change is acceptable.

## Required changes before implement

None.

## Verdict

**approved** — proceed to implement.
