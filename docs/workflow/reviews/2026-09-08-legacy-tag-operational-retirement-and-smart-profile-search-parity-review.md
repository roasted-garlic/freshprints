# Formal Review — Legacy Tag Operational Retirement and Smart Profile Search Parity

| Field | Value |
|---|---|
| Date | 2026-09-08 |
| Plan | `docs/workflow/plans/2026-09-08-legacy-tag-operational-retirement-and-smart-profile-search-parity-plan.md` |
| Review type | Plan + Formal Review only |
| Checkout | `development`; pre-existing worktree preserved |
| Verdict | **approved_with_changes — owner implementation authorization required** |
| Implementation | **Not authorized** |

## Review boundary

This review assesses the retirement plan only. It authorizes no application change, data or tag
deletion, migration/backfill, Firebase/Algolia settings action, reindex/reconcile, provider call,
deployment, publish, commit, push, or production activity. The completed Pass 1 work remains
unchanged: it retired AI-produced tag authority, not staff tag operations, catalog discovery,
Algolia materialization, or historical data.

## Executive verdict

**Conditional approval.** Tags are still an active operational dependency in both client apps,
Firestore, taxonomy materialization, and the Algolia record contract. Existing Smart Profile data
has the right durable semantic fields for structured discovery, but it is not a demonstrated
one-for-one substitute for legacy tag names, aliases, filters, staff editing, or Halftone.

The staged plan is the safe direction because it stops operational use before considering physical
cleanup, retains historical fields/documents for rollback, and keeps Algolia as the normal text,
category, and Smart Filter provider. Implementation may begin only after the conditions below and
the owner's explicit authorization are recorded.

## Evidence reviewed

| Finding | Evidence | Review result |
|---|---|---|
| Pass 1 boundary | 2026-09-07 Pass 1 plan/release review; `functions/src/ai/aiEnrichmentPipeline.ts`; `functions/src/ai/aiEnrichmentCandidateCore.ts` | Confirmed: AI tag authority is retired already; staff/search taxonomy is not. |
| Smart Profile contract | `packages/shared/src/types/catalog/smartProfile.types.ts`; shared Algolia record contract | Confirmed: eight customer facets are only a subset; `objects`, `visibleText`, and `searchConcepts` are searchable but not facets. |
| Tag search/index reliance | `packages/shared/src/catalog-search/portalCatalogAlgoliaRecord.ts`; `functions/src/algolia/buildPortalCatalogAlgoliaRecord.ts`; `syncPortalCatalogDesignToAlgolia.ts` | Confirmed: tags participate in `tagIds`, `tagFacetKeys`, aliases/names in `searchText`, and tag-change index work. |
| Portal operations | `CatalogPageContent.tsx`; Portal Algolia/catalog services; show catalog DTO/hook | Confirmed: tag UI/filter state, tag facets, direct featured-tag reads, display/share DTOs, and show discovery remain active. |
| Studio operations | `DesignLibraryPage.tsx`; Studio tag service/management; design service; AI Review service | Confirmed: tag filtering/deep links, management, ordinary edit writes, AI Review writes, and Halftone synchronization remain active. |
| Taxonomy compatibility | shared taxonomy materialization types; rebuild/source trigger; Studio materialization/disk-cache consumers | Confirmed: schema-v1 materializes categories and tags together. A category-only transition needs a versioned compatibility plan, not a field omission. |
| Firestore constraints | `firestore.rules`; `firestore.indexes.json` | Confirmed: `design.tags` is currently structurally required. There are 18 `designs.tags` composite indexes plus one `tags`-collection featured-query index. |
| Independent architecture review | Architecture review completed for this phase | Conditional approval: require DEV parity evidence, no-profile policy, Halftone decision, taxonomy/cache transition, and client-zero-query ordering. |
| Independent security review | Security review completed for this phase | Future Maintenance Mode must protect direct client writes and Admin SDK callable paths; its identity/Auth boundary needs an owner decision. |

## Required formal answers

### Is Smart Profile a proven parity replacement today?

**No.** It provides the intended semantic dimensions and the existing Smart Filter query path, but
the feature flags default off and it has no automatic equivalent for every tag name or alias. A
DEV corpus must compare legacy free-text/tag-alias recall, tag-only records, incomplete profiles,
multi-value AND filtering, category narrowing, exact-ID search, Portal shows, Studio archive
fallback, and the Algolia-off path before any tag search contribution is removed.

### Does tag retirement retire Algolia?

**No.** Algolia remains the configured normal search path for Portal and Studio. The reviewed
scope removes only tag-specific record attributes, text terms, facets, taxonomy hydration, and
tag-change indexing after client tag queries reach zero. Search, category, pagination/ranking,
and Smart Filter work remain.

### Can tag fields/documents/indexes be deleted in the first implementation?

**No.** `design.tags` must remain at least as an inert empty list where the current Rules require
it. Historical arrays, tag documents, materialization data, index definitions, and deployed
Functions remain untouched until a later zero-consumer audit and separate owner-authorized
migration/cleanup plan. Removing an exported deployed Function or a Firestore index is an
external-state action, never incidental cleanup.

### Are tag writers and tag search consumers safe to remove in one change?

**No.** Safe order is baseline/parity evidence; owner decisions and replacement staff semantics;
removal of user-facing tag writers/UI/query state; then tag fields from Algolia and a separately
authorized DEV reconcile; then taxonomy/cache, Rules, and index consideration. The shared
materialization contract must retain backwards compatibility while existing Studio cache readers
could still receive the old shape.

### Is Halftone covered by Smart Profile?

**No.** `halftone` is currently a canonical tag synchronized from the existing
`halftoneStaffDecision.value`; no Smart Profile dimension represents it. The owner must decide
whether to retire the filter or preserve it as a dedicated non-tag filter projected from the
existing staff decision. Background color is not a substitute.

### Are Studio legacy tag links safely replaceable?

**Not without an owner decision.** Studio reads/writes `?tags=` and accepts legacy `?tag=`. The
safe default is a tested non-crashing no-filter fallback. A new Smart Filter URL contract must be
designed and reviewed separately; no tag identifier may be silently mapped to an unrelated Smart
Profile value. Portal has no equivalent tag URL contract today.

### Is a production Smart Profile backfill authorized?

**No.** The outline is correctly deferred. A later goal must first audit AI Processing and Ready
Library coverage/version provenance, eligibility, staff/import protection, existing job suitability,
cost/write/index volume, idempotence, bounded concurrency, resume/retry/pause behavior, progress,
dry run, and rollback. Production must receive a separate owner authorization for every mutation.

### Is Maintenance Mode authorized or fully designed?

**No.** It is an outline marked **[NEEDS REPO CHECK]**. Its later audit must use a fresh,
server-authoritative active-owner decision; enforce the mode for direct customer Firestore writes,
Storage uploads, and every Portal-mutating callable; and perform callable/transaction checks
inside trusted transactions to avoid enable-versus-commit races. Direct Firebase Auth email
verification cannot be frozen by a Firestore/Callable-only guard, so its inclusion or exclusion is
an **[NEEDS OWNER DECISION]** for that future phase. Studio and carefully reviewed backfill paths
must be deliberately scoped rather than accidentally frozen.

## Conditions before implementation authorization

1. The owner resolves the Halftone and Studio legacy-link decisions recorded in the Plan.
2. The implementation plan preserves `tags: []` compatibility writes until a separate Rules/data
   migration is approved; it may not treat structural compatibility as semantic tag authority.
3. A deterministic DEV parity artifact and acceptance threshold are agreed before removing tag
   names/aliases from free-text search, tag facets, or client UI.
4. A complete source/compiled/deployed-consumer inventory defines the zero-query gate for both
   clients, Functions, DTOs, taxonomy materialization/caches, Rules, and indexes.
5. The no-profile/new-Ready-design policy and staff semantics are explicit. The existing manual
   Smart Profile editor is Ready-only and existing-profile-only, so it is not silently assumed to
   replace all staff tag editing.
6. Smart Filters are enabled only through a separately authorized DEV configuration/build
   checkpoint after parity evidence; this review changes no flag.
7. No Algolia record/settings change or reconcile occurs until client tag requests are zero and
   the free-text corpus passes. Rollback must retain prior record/settings source and reconcile
   from preserved historical Firestore data.
8. Cost claims use measured traces, logs, record byte samples, and provider metrics. No dollar
   savings may be asserted from this review.
9. A separate Implementation Review and owner DEV deployment authorization are required before
   any external action. Production, reprocess/backfill, tag deletion, Rules/index deletion, and
   Function deletion remain separately gated.

## Phase result

| Item | Result |
|---|---|
| Plan | Complete |
| Formal Review | Complete — approved with required conditions |
| Application/data/configuration changes | **None** |
| Provider calls / settings changes | **0 / none** |
| Deployment / migration / deletion | **None** |
| Commit / push / production | **None** |
| Next step | Owner decision and implementation authorization |

`[NEEDS OWNER AUTHORIZATION: IMPLEMENT LEGACY TAG OPERATIONAL RETIREMENT + SMART PROFILE SEARCH PARITY]`
