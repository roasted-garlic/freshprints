# Deployment Checkpoint Prep — Production Home/Discover population fix

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Status | **PREPARED — NOT EXECUTED** |
| Managed goal | `prod-portal-home-discover-population-regression` |
| Implementation Review | **APPROVED** |
| Current production build | `build-2026-08-08-001` @ `1e65a43e131b3b5709a8870b1a24a40f8a004978` |
| Corrective branch | `fix/prod-home-discover-population` |

---

## Binding: do not execute in this pass

This document prepares gates only. **No** `firebase deploy`, **no** App Hosting rollout, **no** production mutation.

---

## Proposed production sequence (Plan-aligned)

1. **Promote corrective source** through normal protected Git workflow  
   Merge / PR `fix/prod-home-discover-population` → `production` (exact SHA after merge becomes the App Hosting source).  
   Owner phrase: `APPROVE PROD HOME DISCOVER FIX PROMOTION` (or repo-equivalent merge phrase).

2. **Deploy the four PR #40 `readyAt` composites** to `fresh-prints-prod` from current `firestore.indexes.json`  
   Owner phrase: `APPROVE PROD INDEXES DEPLOY: PR40 READYAT`  
   Wait until all four report **READY/ENABLED** before treating readyAt ordering as available.

3. **App Hosting rollout** of Portal from the **exact corrected production SHA**  
   Owner phrase: `APPROVE APP HOSTING ROLLOUT`  
   Wait for rollout **SUCCEEDED** and traffic on the new build.

4. **Owner content QA** (not HTTP-200 alone)  
   Checklist: `docs/workflow/reviews/2026-08-08-prod-portal-home-discover-population-regression-owner-qa-checklist.md`  
   Reply: `HOME DISCOVER CONTENT QA: PASS` or `FAIL: …`

5. **Optional later (separate):** `APPROVE PROD READYAT BACKFILL` — **not** required to restore Home population after source fix + createdAt fill.

### Why this order

- Source fix alone restores Home while metric short-circuit remains; index-only deploy is **insufficient** on current data (0 docs with `readyAt`).
- Indexes still required for preferred readyAt ordering / New This Week once fields exist.
- App Hosting must ship the corrected Portal bundle; current live build still has the early-return bug.

---

## Exact four production readyAt indexes (repo definitions — unchanged)

Source: `firestore.indexes.json` (collection group `designs`, `COLLECTION` scope). **Not modified** in this implement pass.

| # | Fields |
|---|--------|
| 1 | `status` ASC, `readyAt` DESC, `__name__` DESC |
| 2 | `categoryId` ASC, `status` ASC, `readyAt` DESC, `__name__` DESC |
| 3 | `tags` CONTAINS, `status` ASC, `readyAt` DESC, `__name__` DESC |
| 4 | `categoryId` ASC, `tags` CONTAINS, `status` ASC, `readyAt` DESC, `__name__` DESC |

Production live today: **0 / 4**.

---

## Confirmations

- NO index deploy executed
- NO App Hosting rollout executed
- NO Rules / Functions / Algolia / backfill
