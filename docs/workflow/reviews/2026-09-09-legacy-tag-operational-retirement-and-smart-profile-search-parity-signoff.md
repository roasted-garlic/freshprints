# Signoff — Legacy tag operational retirement and Smart Profile search parity

| Field | Result |
|---|---|
| Date | 2026-09-09 |
| Goal | `legacy-tag-operational-retirement-and-smart-profile-search-parity` |
| Plan | `docs/workflow/plans/2026-09-08-legacy-tag-operational-retirement-and-smart-profile-search-parity-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-08-legacy-tag-operational-retirement-and-smart-profile-search-parity-review.md` |
| Implementation Review | `docs/workflow/reviews/2026-09-08-legacy-tag-operational-retirement-and-smart-profile-search-parity-implementation-review.md` |
| DEV checkpoint | `docs/workflow/reviews/2026-09-09-legacy-tag-retirement-smart-profile-dev-cutover.md` |
| Durable decision | ADR-FP-186 in `docs/project/DECISIONS.md` |
| Owner DEV QA | **PASS** |
| Final DEV disposition | **approved** |
| Production | **untouched** |
| Commit / push | **not authorized** |

## Verdict

**CLOSED — signoff approved.** The reviewed source implementation and owner-authorized DEV
cutover are complete. The Owner DEV QA checkpoint passed on 2026-09-09. This closes the
managed child goal; it does not authorize commit, push, production promotion, publish, physical
tag cleanup, or deletion of retained compatibility exports.

## Delivered behavior

- Portal and Studio no longer expose active legacy tag filters, tag management, tag display, tag
  facet reads, tag URL mapping, or tag search-corpus terms.
- Smart Profile search/facets, category narrowing, exact-ID lookup, pagination, zero-count
  behavior, and incomplete-profile discovery remain available.
- Halftone remains a dedicated filter backed by `halftoneStaffDecision.value`.
- Studio `?tag=` and `?tags=` are safe no-ops without mapping or crashes.
- Studio AI Review no longer seeds or writes regular tags; censored-term editing remains separate.
- Algolia records/settings no longer emit or index `tagIds` or `tagFacetKeys`; preserved searchable
  fields include `objects`, `searchConcepts`, and `visibleText`.

## DEV evidence

- Firebase project: `fresh-prints-dev`; Algolia app/index: `WQ6OPP2E6Z` /
  `portal_catalog_ready_dev`.
- Exactly six reviewed Functions were deployed, with 0 errors:
  `enqueueAiEnrichment`, `getPortalDesignShareOpenGraph`, `listPortalShowCatalogDesigns`,
  `syncPortalCatalogDesignToAlgolia`, `reconcilePortalCatalogAlgoliaIndex`, and
  `reconcilePortalCatalogAlgoliaIndexScheduled`.
- The existing owner/admin reconcile mechanism processed 350 ready records in dry-run and apply
  (`scanned=350`, `upserted=350`; apply `cleared=true`). No unfiltered deploy or one-off reindex
  script was used.
- Post-cutover settings contain the eight Smart Profile facets and no `tagIds`/`tagFacetKeys`.
- The deterministic read-only corrective audit re-derived the same 20 former tag-name/alias
  samples: all 20 map to preserved historical tag documents, all corresponding historical tag
  IDs have zero preserved Ready-design associations, and all current Algolia term queries return
  zero. Classification: **20 NO BASELINE READY DESIGNS; 0 full parity; 0 semantic parity;
  0 material regression; 0 missing IDs**.
- Field-isolated live proofs passed for `objects`, `searchConcepts`, and `visibleText`; each
  resolved the expected design while remaining absent from title/description/category fields.

| Isolated field | Query | Live proof |
|---|---|---|
| `objects` | `leash` | `sLQJtNGoTimOfLaNxqmW`, 1 hit at position 0 |
| `searchConcepts` | `Dolly Parton I Will Always Love You` | `q2XQJJsXJC7Iy5WOARjm` present in 4 hits, position 0 |
| `visibleText` | `GET BEER GET BEER GET BEER` | `lp50tTJKdbpTLd63emAj`, 1 hit at position 0 |

- DEV identity was mechanically confirmed as `fresh-prints-dev`; the corrective audit made no
  source, configuration, or external-state changes.

## Validation

- Portal focused retirement/search suite: **82/82 passed**.
- Studio focused retirement/search suite: **39/39 passed**.
- Functions/shared retirement contract suite: **45/45 passed**.
- Portal TypeScript: **pass**.
- Functions build: **pass**.
- `git diff --check`: **pass** (normal Windows CRLF warnings only).
- Studio TypeScript retains only documented unrelated baseline errors.
- Portal Next production build remains blocked by the known Windows `.next/trace`/timeout issue.
- Owner DEV QA: **PASS**; final DEV disposition: **approved**.

## Retained compatibility and deferred work

Historical `design.tags`, `tags/*` documents, schema-v1 taxonomy materialization/chunks, Rules,
indexes, tag normalizers/import helpers, compatibility fields, and deployed tag-trigger/archive
Functions remain preserved. In particular, `onTagTaxonomySourceWritten` and
`archiveTagWithGuards` remain active compatibility exports. No tag deletion, migration,
backfill, Smart Profile reprocess, provider call, Rules/index deployment, or physical cleanup was
performed.

Autonomous remains **OFF**; automatic Pass 2 is **PARKED**; WS6 is **NOT STARTED**. Parent
program work remains open with parked/deferred items, but there is no active child goal.

## External boundaries

Portal App Hosting was not published, Studio was not published, production was not touched, and
no commit or push was performed. The next human checkpoint is:

`[NEEDS OWNER AUTHORIZATION: COMMIT/PUSH CLOSED TAG RETIREMENT GOAL]`

## Workspace inventory at signoff

The working tree contains 108 unique paths: 66 current-goal source files, 25 current-goal test
files, 5 current-goal workflow artifacts, and 10 current-goal handoff/permanent documentation
files. Two unrelated dirty files are intentionally excluded from this goal:

- `packages/shared/src/utils/portalBiddingAcknowledgmentCopy.test.ts`
- `packages/shared/src/utils/portalBiddingAcknowledgmentCopy.ts`

The checkout is on `development` at existing local commit `76884b96` (`fix(portal): clarify
Whatnot in show pricing and limits copy`), one commit ahead of `origin/development`; this pass
did not alter, commit, or push it. The six untracked paths are the five current-goal workflow
artifacts plus `functions/src/algolia/algoliaTagRetirement.contract.test.ts`.

## Workflow completion

- Plan: complete.
- Formal review: approved with changes.
- Implementation: complete.
- Test and DEV cutover evidence: recorded.
- Owner DEV QA: PASS.
- Signoff: approved.
- `.cursor/workflow/state.md` and `references/project-chatgpt-handoff/CURRENT-STATE.md`: updated
  in this pass.
- FreshForge: **IDLE** pending the next owner-authorized action.
