# Plan: Stage 1b-C initial Algolia facet count mismatch

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase (corrective) |
| Managed goal | `post-launch-catalog-and-processing-stability` |

---

## Goal

Unselected Tags-modal counts must match live Algolia facet distribution (e.g. `cartoon (4)` before select), not a stale page-load cache that undercounts until selection triggers a fresh narrowed fetch.

---

## Investigation (completed)

### Live Algolia probe (`portal_catalog_ready_dev`, search-only)

| Check | Result |
|-------|--------|
| Global `tagFacetKeys` `cartoon::cartoon` | **4** |
| Filter `tagIds:cartoon` `nbHits` | **4** |
| Per-hit `tagFacetKeys` on those 4 | all `cartoon::cartoon` |
| Index size | **46** (was 45 at reconcile) |

**Index data is correct now.** Not A (stale index as sole cause of live probe). Not D (no duplicate facet keys). Not B (global facet semantics return 4).

### Client path

| State | Data source |
|-------|-------------|
| Modal open, no tags/q/category | `approvedTags` from `useCatalogTags` — **loaded once on page mount** (`useEffect` deps `[]`) |
| After selecting a tag | Fresh `listNarrowedApprovedTags` → Algolia |

Owner symptom (3 → 4 on select) matches **E/F: stale client global tags** after index grew (46th design / cartoon sync after mount). Selecting forces a new Algolia facet call; unselected path does not.

Classification: **E (stale client state)**, possibly after **F (sync timing)** updated the index. Not primarily wrong query construction for global vs narrowed on current index.

---

## Scope

### In Scope

- Tags modal always loads facets from catalogService when opened (global or constrained)
- Discriminating test for “unselected path must not rely solely on mount-cached approvedTags”
- Keep prior narrowed q/tags/category behavior

### Out of Scope

- Reindex-only “fix” without addressing stale UI (insufficient alone)
- Stage 4/5/6, production, PR merge, publisher retirement

---

## Approach

1. In `CatalogTagFilterModal`, on open always call `listNarrowedApprovedTags` (empty constraints → `listTagFacets` fresh).
2. Use fetched modal facet list as `activeTagSource` whenever open (not mount-time `approvedTags` for counts).
3. Keep loading / error UX; `approvedTags` may remain prop for optional fallback only if needed — prefer not to show stale counts.
4. Discriminating wiring/unit test: when `isOpen` and no draft tags, still invokes listNarrowed/listApproved refresh path.
5. No Functions deploy unless probe later proves index corruption (not the case now).

---

## Test Strategy

- Focused modal/service tests + Stage 1b containment
- Portal tsc, eslint, diff-check
- Owner re-QA: open Tags, search `cartoon`, expect **(4)** before select

---

## Risks

| Risk | Mitigation |
|------|------------|
| Extra Algolia call on each modal open | Acceptable; same as select path; kills stale counts |
| Flash of empty while loading | Existing “Updating tags…” pattern |

Rollback: revert Portal modal change.

---

## Open Questions

None — live probe + code path confirm client stale global tags.
