# Manual QA Checklist: Stage 1b Algolia catalog search (dev)

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Status | **Blocked on secrets/deploy checkpoint** — run only after Algolia is configured and Functions sync is live on `fresh-prints-dev` |
| Checkpoint | `docs/workflow/reviews/2026-08-07-stage-1b-algolia-dev-secrets-checkpoint.md` |
| Environment | localhost Portal → `fresh-prints-dev` |

---

## Prerequisites

- [ ] Algolia Grow app + `portal_catalog_ready_dev` index created
- [ ] Admin key in Secret Manager; search-only key in Portal env
- [ ] `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH=true`
- [ ] Functions `syncPortalCatalogDesignToAlgolia` + reconcile deployed
- [ ] Reconcile completed (`dryRun: false`)
- [ ] Generated publisher still alive (expected until Stage 4)

---

## Generated-read proof (Algolia path active)

With Firebase Debug / network tracing on `/catalog`:

- [ ] Free-text does **not** fetch `generated/portal-catalog/**` search shards
- [ ] Multi-tag does **not** fetch tag ID list assets for search
- [ ] Global facets do **not** fetch `tags-facet.json`
- [ ] Narrowed facets do **not** fetch generated facet/ID assets

---

## Search / tags / facets

- [ ] Free-text finds titles
- [ ] Tag names / aliases searchable
- [ ] Tags A+B use **AND** (not OR)
- [ ] Search + multi-tag combines
- [ ] Category ∩ search/tags works
- [ ] Pagination stable; order matches Algolia after FS hydrate
- [ ] Empty search returns to Firestore browse
- [ ] Typing debounced (no request per keystroke storm)
- [ ] Global facet counts present; zero-use tags absent
- [ ] Narrowed facet counts update after selecting tags

## Sync

- [ ] Approve → appears in search
- [ ] Edit ready metadata/tags → search updates
- [ ] Archive → disappears from search promptly
- [ ] Restore/reapprove → returns

## Regression (Firestore)

- [ ] Ordinary Library browse
- [ ] Category
- [ ] Single-tag
- [ ] Discover / Home / New This Week (`readyAt`)
- [ ] Favorites / details / share / Add to Request
- [ ] Algolia outage → browse still works; search shows unavailable

## Explicit non-goals this QA

- Do **not** retire publisher
- Do **not** delete generated assets
- Do **not** promote production
