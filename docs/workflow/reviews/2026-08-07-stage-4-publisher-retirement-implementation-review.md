# Implementation Review: Stage 4 publisher retirement (source only)

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Reviewer | Implementation Review |
| Plan | `docs/workflow/plans/2026-08-07-stage-4-publisher-retirement-plan.md` |
| Plan review | **approved_with_changes** |
| Test report | `docs/workflow/reviews/2026-08-07-stage-4-publisher-retirement-test-report.md` |
| Verdict | **APPROVED** — STOP before live Function delete |

---

## Verification (required checklist)

| Item | Status |
|------|--------|
| A. No Portal runtime call to generated search/facet assets | **PASS** — call sites removed; stub throws |
| B. Ordinary Firestore browse paths preserved | **PASS** — `listReadyDesignsPageWithSortFallback` / home pool unchanged |
| C. Algolia per-design sync preserved | **PASS** — sync + reconcile exports remain; classifier relocated |
| D. Classifier independent of `catalogSnapshots/` | **PASS** — `functions/src/algolia/portalCatalogChangeClassifier.ts` |
| E. Six publisher Functions absent from source/export | **PASS** |
| F. Live `fresh-prints-dev` Functions **not** deleted this pass | **PASS** — no deploy |
| G. Stage 5 Storage cleanup not started | **PASS** |
| H. Production untouched | **PASS** |

---

## Six Functions removed from source

1. `onCategorySnapshotSourceWritten`
2. `onTagSnapshotSourceWritten`
3. `onPortalCatalogSnapshotSourceWritten`
4. `onPortalCatalogPublicationStateWritten`
5. `rebuildCatalogSnapshots`
6. `retryPortalCatalogPublication`

## Classifier relocation

`functions/src/catalogSnapshots/portalCatalogChangeClassifier.ts`  
→ `functions/src/algolia/portalCatalogChangeClassifier.ts`

---

## Portal behavior

| Flag | Behavior |
|------|----------|
| Algolia ON | Search / multi-tag / facets via Algolia; FS ordinary browse unchanged |
| Algolia OFF | FS Library / category / single-tag / Discover work; managed search/facets unavailable (no Storage fallback) |

---

## Confirmations

- No live Function deletion
- No Storage deletion
- No Stage 5/6
- No production
- No PR merge
- Changes **not committed / not pushed** this pass

---

## Next human checkpoint

```text
APPROVE DEV FUNCTIONS DELETE: STAGE 4 PUBLISHERS
```

After that phrase: scoped deploy to remove the six Functions from `fresh-prints-dev`, then owner QA.

---

## Verdict

**APPROVED** for source Implement. **STOP.**
