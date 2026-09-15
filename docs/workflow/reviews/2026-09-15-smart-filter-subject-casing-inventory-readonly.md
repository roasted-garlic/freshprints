# Smart Filter Subject casing inventory — read-only

Captured `2026-09-15T00:22:27.035Z` from Firestore with Application Default Credentials; no writes,
reprocessing, or Algolia mutations were performed.

| Project | Designs | Smart Profiles | Designs with non-canonical Subject casing/whitespace | Mixed canonical value groups | Duplicate canonical entries within one profile |
|---|---:|---:|---:|---:|---:|
| `fresh-prints-dev` | 546 | 403 | 145 | 106 | 0 |
| `fresh-prints-prod` | 4,463 | 2,520 | 1,858 | 769 | 0 |

Canonical grouping trims, collapses internal whitespace, and lowercases the complete token. DEV
examples include `Highland Cow`/`Highland cow`/`highland cow` (12 occurrences) and `Dolly Parton`
(13). Production includes `Cow`/`cow` (167), `Girl`/`girl` (153), and
`Highland Cow`/`Highland cow`/`highland cow` (141). These are inventory observations only.

The DEV search-only Algolia probe at `2026-09-15T00:22:45.837Z` found 296 Subject facet values,
94 values needing lowercase/whitespace canonicalization, and no duplicate case-variant groups in
the current derived index. The production search-only credential is not present in this checkout,
so production Algolia facet variants were not queried; no credential was guessed or exposed.

The deployed DEV sync/reconcile Functions also predate this change (`syncPortalCatalogDesignToAlgolia`
revision `syncportalcatalogdesigntoalgolia-00007-baw`; `reconcilePortalCatalogAlgoliaIndex`
revisions `reconcileportalcatalogalgoliaindex-00005-heq` / scheduled `-00005-yoc`). A read-only
classifier probe confirms a case-only Firestore change is classified as operational because the
projected comparison already lowercases both sides; deployment alone therefore cannot repair old
mixed-case index records.

## Repair disposition

- New AI, staff, import-preset, preservation/reset, and seed paths now canonicalize Subjects before
  persistence; the shared Algolia record builder defensively canonicalizes legacy rows on future
  indexing.
- DEV historical Firestore repair is intentionally not run in this phase. If required, use a
  bounded deterministic metadata-only repair over the 145 affected designs, previewing exact
  before/after Subject arrays and explicitly reconciling/reindexing only changed Ready records
  through the established owner-gated path (a case-only write will not trigger the current change
  classifier by itself).
- Production is read-only here. Defensive Algolia normalization is sufficient for newly written
  or reindexed records; a one-time deterministic Smart Profile Subject lowercase/dedupe repair is
  recommended for the 1,858 affected designs only after a separate owner-authorized production
  promotion/repair checkpoint. Full AI re-enrichment is not recommended solely for casing.
