# Studio Taxonomy Materialization Read Smoke — Result

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Owner reply | `STUDIO TAXONOMY MATERIALIZATION READ: PASS WITH NOTES` |
| Project | **fresh-prints-dev** |
| Surface used | Design Library (warm-cache path) |
| Verdict | **PASS WITH NOTES** |
| Checkpoint | `docs/workflow/reviews/2026-08-07-taxonomy-studio-materialization-read-smoke-checkpoint.md` |

---

## Owner-observed Firebase Debug (after Reset, then Design Library)

| Metric | Value |
|--------|--------|
| Total read operations | 2 |
| Documents returned | 45 |
| Approx billable document reads | 46 |
| `/tags` collection reads | **0** |
| `/categories` collection reads | **0** |
| `taxonomyMaterialization/meta` (after Reset) | **0** |
| `taxonomyMaterialization/chunk-0` (after Reset) | **0** |
| Fallbacks | **0** |
| Errors / permission-denied | **0** |
| Writes | **0** |
| Callables | **0** |
| Listeners | **0** |

Observed reads attributed to Design Library design queries only:
- `listDesignsPage` — 45 ready designs
- `countDesigns` — count query

---

## Interpretation (binding notes)

1. Result is consistent with the **WARM-CACHE** path: Debug Reset ran immediately before Design Library open, while Studio taxonomy state/disk cache may already have been initialized earlier in the session.
2. After Reset, **zero** materialization meta/chunk reads is expected if taxonomy was not re-fetched for this navigation.
3. Critical spike proof is direct and sufficient for this checkpoint:
   - **0** `/tags` collection reads (no 500+500+121 hydrate)
   - **0** `/categories` collection reads (no 18-doc hydrate)
   - **0** fallbacks / permission errors
4. Design Library smoke is accepted as Studio materialization read-path proof for this checkpoint.
5. **No artificial cold-cache retest required.**
6. AI Review-specific picker behavior deferred to later controlled batch validation.
7. Stale/revision refresh (meta + chunk on revision change) deferred to the **controlled mutation smoke** (revision 1 → 2).

---

## Pass criteria mapping

| Criterion | Result |
|-----------|--------|
| No old listTags 1121 hydrate | **PASS** (0 tags reads) |
| No listCategories 18 hydrate | **PASS** (0 categories reads) |
| No permission-denied | **PASS** |
| Materialization path viable under live Rules | **PASS WITH NOTES** (warm; meta/chunk not re-hit after Reset) |
| Disk cache / warm short-circuit | **Inferred PASS** from 0 taxonomy FS reads after Reset |

---

## Confirmations

- NO taxonomy mutation this pass
- NO deploy
- NO production
- NO PR merge

**Next:** controlled taxonomy mutation smoke (revision 1 → 2) — prepared separately; not executed.
