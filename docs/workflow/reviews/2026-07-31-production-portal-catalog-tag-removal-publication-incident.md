# Incident / audit: Production Portal catalog tag removal not publishing

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Slice | `production-portal-catalog-tag-removal-publication` |
| Environment | `fresh-prints-prod` / hosted Portal |
| Status | root cause evidenced; Plan + Formal Review next |

---

## Symptom (owner)

1. Ready design visible on Portal.
2. Staff removed one tag in Studio.
3. Removed tag continued appearing on Portal.
4. Staff changed the same design’s category.
5. Category change appeared correctly on Portal.

## Sanitized production evidence (read-only, 2026-07-31)

Affected design id prefix: `s9Yi7i8u…` (same Stage 1C / Class D fixture family).

| Layer | Observation |
|-------|-------------|
| Firestore `designs/{id}.tags` | `[funny]` only |
| Firestore `updatedAt` | `2026-07-31T23:41:57Z` |
| Firestore `categoryId` | `fUk0KczGkORw9RLxbIBM` (matches Portal category filter) |
| Portal manifest | `generation=8`, `contentVersion=8-c8c37201de17f034`, `generatedAt≈23:41:15Z`, **`cardOverrides` absent** |
| Discover / ready-index card tags | `[funny, sarcastic]` — **stale** |
| Tag filter `filters/tags/sarcastic.json` | still lists design — **stale** |
| Tag filter `filters/tags/funny.json` | lists design — expected |
| Tag facet | both `funny` and `sarcastic` count 1 — **stale** |
| Search shard `sa` term `sarcastic` | still lists design — **stale** |
| `snapshotPublicationState/portal-catalog` | `requestedGeneration=9`, `publishedGeneration=8`, **`status=failed`**, `lastErrorCode=FetchError`, `lastErrorAt≈23:42:15Z`, `lastPublishedAt≈23:41:19Z` |

### Timeline (UTC)

```text
23:41:15  Full portal-catalog publish completes → generation 8 (still had funny+sarcastic)
23:41:19  Coordination lastPublishedAt for generation 8
23:41:57  Firestore design updated → tags become [funny] only (tag removal)
≈23:42:xx Trigger marks dirty → requestedGeneration=9, attempts republish
23:42:15  Republish fails → status=failed, lastErrorCode=FetchError
          publishedGeneration remains 8 → Portal keeps stale generated assets
```

## Answers to required questions (evidence-backed)

1. **Did the removed tag disappear from Firestore?** Yes — canonical doc has `[funny]` only.
2. **Tag storage shape?** `designs.tags: string[]` lowercase names (not taxonomy UUIDs). Taxonomy lives in `tags/{id}`.
3. **Studio remove every canonical field?** Yes — `designService.updateDesign` **replaces** `tags` via `normalizeDesignTags` (`designService.ts` ~851–857).
4. **Publisher handle adds but not removals?** No — full `publishPortal` rebuilds tag assets from scratch from ready cards. Stale tags remain only because **generation 9 never published**.
5. **Incremental merge of tag arrays?** Full publish replaces. Card-override path merges **cards by id**, not tag-array union (secondary risk; not active on current prod manifest).
6. **Reverse index retain removed IDs?** Yes on **current published** generation 8 assets; would be omitted after a successful generation ≥9 rebuild.
7. **Independent surfaces?** Card buckets, discover, tag filters, facet, search shards, ready-index — all rebuilt together on full publish; all currently stale together for tags.
8. **Category path different from tags?** Classifier treats both as `index-filter` (`INDEX_FILTER_FIELDS` includes `categoryId` and `tags`). Category looked correct because generation 8 already contained the new category; tag removal landed **after** that publish and failed to republish.
9. **Tag removal missing from invalidate set?** No — classified `index-filter` same as category (`portalCatalogChangeClassifier.ts` 17–24, tests 36–49).
10. **New generation published but Portal cached?** No — generation 9 never published; Portal correctly serves generation 8.
11. **Hard refresh / Incognito?** Would still show stale tags until a successful republish (manifest still points at gen 8). `[NEEDS OWNER CONFIRM]` if tried.
12. **Which surfaces stale?** Card tags, tag filter, facet, search shard — all stale for removed tag. Category filter correct.
13. **Final tag removal different?** Not required to explain this incident; Firestore allows empty `tags: []` and publisher rebuilds from card.tags.
14. **Aliases reconstructing tag?** No evidence — Firestore lacks `sarcastic`; stale copy is in generated JSON only.
15. **Studio vs Function assets?** Function-generated Portal catalog Storage assets are stale; Studio may look correct via session override / Firestore (`reconcileAuthoritativeDesign`).
16. **Category overwrite retaining stale tags?** Not a field-merge bug — whole generation 8 snapshot is frozen; category was already correct in that snapshot.

## Ranked root cause

### Primary (proven on production)

**Failed portal-catalog republish after tag removal**, leaving `requestedGeneration > publishedGeneration` with `status=failed` / `FetchError`. Generated catalog (cards, tag filters, facets, search shards) remains on the last successful generation, which still includes the removed tag. Category appeared updated because it was already present in that successful generation.

### Secondary (code risk; not the current prod smoking gun)

**`cardOverrides` race:** card-only publishes can overlay card payloads without rebuilding tag/category indexes; full publish clears overrides from the new manifest (`buildPortalCatalogManifest` omits `cardOverrides`). Current prod manifest has **no** overrides, so this did not cause the live mismatch, but it remains a real asymmetry risk for future incidents.

### Disproven

- Tags omitted from change classifier
- Studio failing to write Firestore tags
- Portal serving a newer generation from cache while Storage is correct

## Stale layer

**Function-generated Portal catalog Storage projection** (generation 8), stuck because coordination republish to generation 9 **failed** and was not recovered.

## Explicit non-actions this audit

No implement, deploy, `rebuildCatalogSnapshots`, data repair, Stage 2, or domain work.
