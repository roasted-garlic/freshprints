# Index Deployment Gate — PR #40 readyAt composites (Home/Discover corrective)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Status | **COMPLETE — 4/4 READY** (see index-deploy-record) |
| Next owner phrase | `APPROVE PROD HOME DISCOVER APP HOSTING ROLLOUT` |
| Source on production | **YES** — merge `ccfc974` contains `f5e9cf6` |
| Live App Hosting | Still `build-2026-08-08-001` @ `1e65a43` (fix not live) |
| readyAt indexes live | **4/4 READY** |

---

## Why indexes still matter (and why they alone did not fix Home)

| Fact | Note |
|------|------|
| Source fallback | Restores Home even with **0** legacy `readyAt` fields (bounded createdAt fill) |
| Index-only deploy | **Would NOT have fixed** the regression: metric short-circuit returned ~1 design before createdAt ran |
| Still required | Preferred `orderBy(readyAt)` paths + category/tag readyAt variants need these composites once fields exist |

---

## Exact four definitions (`firestore.indexes.json` — unchanged)

Collection group: `designs` · scope: `COLLECTION`

1. `status` ASC + `readyAt` DESC + `__name__` DESC
2. `categoryId` ASC + `status` ASC + `readyAt` DESC + `__name__` DESC
3. `tags` ARRAY_CONTAINS + `status` ASC + `readyAt` DESC + `__name__` DESC
4. `categoryId` ASC + `tags` ARRAY_CONTAINS + `status` ASC + `readyAt` DESC + `__name__` DESC

Production live inventory (prior read-only): **0 / 4**.

---

## Exact command (do not run until owner phrase)

Per `docs/standards/DEPLOYMENT.md`:

```bash
firebase deploy --only firestore:indexes --project fresh-prints-prod
```

Then wait until all four report **READY/ENABLED** before treating preferred readyAt ordering as available.

**Do not** deploy Rules, Functions, or Storage in the same gate unless separately authorized.

---

## After indexes READY

Next: `APPROVE APP HOSTING ROLLOUT` from the **post-merge production SHA** that contains `f5e9cf6` (or its merge commit).

Then owner content QA:
`docs/workflow/reviews/2026-08-08-prod-portal-home-discover-population-regression-owner-qa-checklist.md`
