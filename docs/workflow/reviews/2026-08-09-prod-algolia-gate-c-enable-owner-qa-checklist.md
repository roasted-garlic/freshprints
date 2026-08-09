# Owner QA Checklist: Production Algolia Portal enable

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Environment | Production Portal (`https://myprintrequest.com`) |
| Live build | **`build-2026-08-09-001`** @ tip `f5c0bdb` |
| Index | `portal_catalog_ready_prod` (46 records reconciled) |
| Reply phrase | Owner: **`PROD ALGOLIA ENABLE QA: PASS`** (2026-08-09) |
| Result | **PASS WITH NOTES** — filter transition briefly shows “Loading your account...” → **TD-032** |
| Signoff | `docs/workflow/reviews/2026-08-09-prod-algolia-gate-c-enable-signoff.md` |

---

## Why manual

Managed search UX, relevance, and facet behavior need a signed-in (or public catalog) human pass; automated HTTP only confirms env bake-in.

---

## Steps

1. Open `/catalog` (hard refresh) → **Expected:** page loads; no error banner about search
2. Run a text search for a known ready design title → **Expected:** matching hits (Algolia path)
3. Exercise at least one facet/filter if shown → **Expected:** results update without blanking the catalog permanently
4. Navigate Home / Discover browse → **Expected:** ordinary Firestore browse still works
5. Confirm you did **not** configure Admin API key in Portal

### Pass criteria

- [ ] Search returns sensible hits
- [ ] No `_dev` index behavior suspected
- [ ] Browse still usable
- [ ] No secrets pasted into chat

---

## Please reply with

- `PROD ALGOLIA ENABLE QA: PASS`
- `FAIL: [description]`
- `PASS WITH NOTES: [notes]`
