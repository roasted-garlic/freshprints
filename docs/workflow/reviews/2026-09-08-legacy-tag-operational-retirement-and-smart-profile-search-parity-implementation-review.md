# Implementation Review — Legacy tag operational retirement and Smart Profile search parity

| Field | Value |
|---|---|
| Date | 2026-09-08 |
| Plan | `docs/workflow/plans/2026-09-08-legacy-tag-operational-retirement-and-smart-profile-search-parity-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-08-legacy-tag-operational-retirement-and-smart-profile-search-parity-review.md` |
| Checkout | `development` |
| Verdict | **source implementation complete; external DEV checkpoint required** |
| Signoff | **not started** |

## Authorization and boundary

The owner authorized the reviewed source-only implementation. The three owner decisions were
applied:

- Halftone remains available as a dedicated filter sourced only from
  `halftoneStaffDecision.value`; it is not a Smart Profile field, a legacy tag, a background
  color inference, or an AI restoration path.
- Studio `?tags=` and legacy `?tag=` are retired contracts. They are ignored without a crash or
  silent mapping, while unrelated search/category parameters continue to work.
- Ready designs with missing or incomplete Smart Profiles remain discoverable through title,
  description, category, exact ID, and other non-tag copy. No tag fallback, invented facet, or
  new manual Smart Profile authoring surface was added.

No deployment, publish, provider call, Algolia setting change, reconcile/reindex, Firebase Rules
or index change, migration/backfill, data deletion, production action, commit, or push occurred.

## Implemented source slices

### Portal

- Removed the tag drawer, selected-tag state, featured/approved tag reads, tag facet requests,
  tag display sections, and tag-bearing public show/share/Open Graph DTO fields.
- Retained Smart Profile facets and category narrowing. Algolia managed search now uses title,
  description/category/ID-compatible Smart Profile search inputs without `tagIds` or
  `tagFacetKeys`.
- Added explicit Halftone filtering through `halftoneStaffDecision.value` for Firestore, local
  fallback, exact-ID lookup, and managed-result hydration.
- Kept the Portal tag hook/modal as inert compatibility exports and removed the final generated
  asset tag-facet methods because no active caller remains.
- Preserved a structural `tags: []` on the show-card-to-`CatalogDesign` mapper only where the
  existing client type still requires it; no public DTO carries historical tags.

### Studio

- Removed tag filter state/UI, tag chips, tag facets, tag URL writing, and active `?tags=`/`?tag=`
  behavior. Smart Profile facets, category narrowing, pagination, exact-ID lookup, and the
  existing Halftone dock filter remain.
- Replaced the tag filter and tag-management components/hooks with inert compatibility exports;
  accidental stale calls fail closed and issue no Firestore reads or writes.
- Removed regular design tag editing/writes, AI Review tag seeding/approval writes, Halftone tag
  synchronization, and tag display sections. Censored-term editing remains separate and intact.
- Studio local text search now uses design ID/title/description (including existing AI title/
  description display fallback) and never historical tag values or aliases.

### Shared, Functions, and Algolia source contract

- `PortalCatalogAlgoliaRecord` and its builder/sync/classifier/reconcile source no longer emit or
  consume tag IDs, tag facet keys, tag aliases, or tag-specific index-change work. Smart Profile
  fields, category, title, description, and other non-tag search content remain.
- AI taxonomy runtime loading is category-only; compatibility materialization shapes may still
  carry `tags: []` for old schema readers.
- Public show/share/OG records no longer expose tags. Historical `design.tags` remains intact.
- Functions/shared 45-test retirement contract suite and Functions TypeScript build pass.

## Deliberately retained compatibility / deferred external work

These items are not active Portal/Studio consumers and were not deleted because deletion or
deployed-export changes are separate owner-authorized actions:

- Firestore Rules, composite indexes, historical `design.tags`, tag documents, and schema-v1
  taxonomy materialization/chunks remain unchanged.
- `catalogTagService`, tag normalizers/import helpers, old AI tag compatibility types, and
  compatibility `tags` fields remain as dormant/deletion candidates after a compiled import-graph
  audit.
- The deployed `onTagTaxonomySourceWritten` export, taxonomy rebuild compatibility, and guarded
  tag archive callable remain until the explicit DEV deployment/deletion checkpoint.
- No Smart Profile backfill, reprocess, provider configuration, Algolia settings update, or
  DEV index reconcile was attempted.

## Verification

- Portal focused retirement/search suite: **82/82 passed**.
- Studio focused retirement/search suite (filters, Smart facets, exact ID, AI Review search,
  taxonomy short-circuit/cache contracts): **39/39 passed** after the final source cleanup.
- Portal TypeScript: **pass** (`npx tsc -p apps/portal/tsconfig.json --noEmit`).
- Functions/shared retirement tests: **45/45 passed** (including the shared Algolia record
  contract); Functions build: **pass** (`npm --prefix functions run build`).
- `git diff --check`: **pass** (only normal Git LF/CRLF warnings were emitted).
- Studio TypeScript: **blocked by pre-existing unrelated errors only** in the PNG validator,
  print-request trace metadata, staff-inbox unused symbols, and shared test typings; no
  retirement-slice source error remained.
- Portal production build: **not green locally**. The Windows Next build encountered the known
  `.next/trace`/build-process problem and the final retry timed out after 124 seconds; no source
  or external state was changed by that attempt.

## External checkpoint — completed in DEV; Owner QA pending

The owner subsequently authorized the exact checkpoint below. Execution evidence is recorded in
the dedicated deployment artifact; this source-review artifact does not itself claim Owner QA or
signoff:

`[NEEDS OWNER AUTHORIZATION: DEV SMART FILTER CONFIG + TAG-RETIREMENT DEPLOY/ALGOLIA RECONCILE]`

That later checkpoint must separately authorize and verify:

1. Deploy the reviewed Functions source allowlist in `fresh-prints-dev`, including the Algolia
   record/sync/reconcile and category-only AI taxonomy changes; decide separately whether retired
   tag-trigger/archive exports are removed.
2. Apply the DEV Algolia Smart Profile `attributesForFaceting`/searchable-attribute settings and
   preserve the prior record/settings revision for rollback.
3. Reconcile/reindex ready records in the DEV index, then run the agreed deterministic parity
   corpus for text, aliases, Smart Filter AND semantics, category narrowing, incomplete profiles,
   exact IDs, and Portal/Studio query behavior.
4. Capture read/index/query deltas and rollback evidence. Do not infer dollar savings from counts.

DEV checkpoint artifact:
`docs/workflow/reviews/2026-09-09-legacy-tag-retirement-smart-profile-dev-cutover.md`

The active next marker is:
`[NEEDS OWNER DEV QA: LEGACY TAG RETIREMENT + SMART PROFILE SEARCH PARITY]`

Production, migration/backfill, Rules/index cleanup, and physical tag deletion remain separately
gated.
