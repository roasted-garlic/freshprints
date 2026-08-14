# Checkpoint: Prefinal A–H Track A — Production APPLY (bounded)

| Field | Value |
|-------|-------|
| Date | 2026-08-11 |
| Owner phrases | `APPROVE PROD APPLY: LEGACY PENDING FALSE-PENDING REPAIR` → `TRACK A APPLY: DONE` |
| Status | **COMPLETE — POST-APPLY VERIFY PASS** |
| Production SHA | `76205da8eeab43c545112f7399522e6b4106a03e` |
| Project | **`fresh-prints-prod`** |
| APPLY report | `docs/workflow/reviews/legacy-pending-false-pending-repair-apply-2026-08-11T22-56-56-033Z.json` |

---

## APPLY summary (owner CLI)

| Upload ID | Decision | Reason | Patch |
|-----------|----------|--------|-------|
| `kkD1yLR9UNFsleK4Bg4Z` | **patched** | `proven_false_pending` | `pending_staff_review` → `not_eligible` |
| `sTN1ewGYYpK8fWg6nU0s` | **patched** | `proven_false_pending` | `pending_staff_review` → `not_eligible` |

Summary from report: `patched: 2`, `skip: 0`. Agent did not execute APPLY (prior hook block).

---

## Post-APPLY verification (agent; read-only) — **PASS**

### Per repaired ID

| Check | `kkD1yLR9UNFsleK4Bg4Z` | `sTN1ewGYYpK8fWg6nU0s` |
|-------|------------------------|------------------------|
| Doc exists | **yes** | **yes** |
| `catalogReviewStatus` | **`not_eligible`** | **`not_eligible`** |
| `purpose` | `print_request` (unchanged) | `print_request` (unchanged) |
| `printRequestId` | `IF2zGUOvkeZjkM53q4P0` | `IF2zGUOvkeZjkM53q4P0` |
| `updatedAt` | ~`2026-08-11T22:56:48Z` | ~`2026-08-11T22:56:49Z` |
| In `pending_staff_review` inventory | **no** | **no** |
| `printRequestItems` (`customerUploadId`) | **1** present | **1** present |
| Storage objects (source/preview/thumb/production) | **4/4 present** | **4/4 present** |

### Linked request

| Check | Result |
|-------|--------|
| `printRequests/IF2zGUOvkeZjkM53q4P0` exists | **yes** |
| `status` | **`draft`** (unchanged) |

### Inventory integrity

| Metric | Pre-APPLY | Post-APPLY |
|--------|-----------|------------|
| Total `pending_staff_review` | 90 | **88** |
| Print-request Pending | 2 | **0** |
| Donation Pending | 88 | **88** |

Frozen IDs absent from Pending inventory. Donation Pending count unchanged. No evidence of unrelated customerUpload lifecycle edits beyond the two allowlisted status patches.

Studio Pending list/count: query-driven from `pending_staff_review` — these two IDs **no longer qualify** (cannot visually confirm Studio UI in this pass; data contract satisfied).

---

## TRACK A APPLY GATE: **COMPLETE**

### Next Plan checkpoint (#9)

Studio **1.0.3** package/publish.

Exact owner approval phrase: **[NEEDS REPO CHECK]** —  
`docs/workflow/plans/2026-08-11-prefinal-a-h-production-promotion-plan.md` lists “Studio 1.0.3 package/publish” but does **not** define an exact approval string.
