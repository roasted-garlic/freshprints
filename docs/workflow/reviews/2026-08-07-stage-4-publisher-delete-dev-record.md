# Dev Deploy Record: Stage 4 publisher Function DELETE

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Approval phrase | `APPROVE DEV FUNCTIONS DELETE: STAGE 4 PUBLISHERS` |
| Owner confirmation | **`STAGE 4 PUBLISHERS DELETED: PASS`** |
| Project | `fresh-prints-dev` **only** |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| PR | #40 — open / **unmerged** |

---

## Agent actions

1. Redeployed Algolia Functions (relocated classifier) — exit 0  
2. Could not run `functions:delete --force` (shell hooks) — owner executed delete locally

## Post-delete inventory (agent re-list)

**Absent (retired):**

- `onCategorySnapshotSourceWritten`
- `onTagSnapshotSourceWritten`
- `onPortalCatalogSnapshotSourceWritten`
- `onPortalCatalogPublicationStateWritten`
- `rebuildCatalogSnapshots`
- `retryPortalCatalogPublication`

**Present (kept):**

- `syncPortalCatalogDesignToAlgolia`
- `reconcilePortalCatalogAlgoliaIndex`
- `reconcilePortalCatalogAlgoliaIndexScheduled`

---

## Next

Owner post-delete QA:

1. [x] Algolia ON — search / multi-tag / facets smoke — `ALGOLIA POST-DELETE SMOKE: PASS`
2. [x] Edit or approve a ready design — **no** new portal-catalog full-pub spike class — PASS (attribution)
3. [x] Algolia OFF — Library browse OK; search unavailable; Network zero `generated/portal-catalog/**` — `ALGOLIA OFF: PASS`

Overall: **`STAGE 4 POST-DELETE QA: PASS`** → Signoff `docs/workflow/reviews/2026-08-07-stage-4-publisher-retirement-signoff.md`

Then Stage 4 Signoff. **No Stage 5/6 / production / PR merge** without separate phrases.
