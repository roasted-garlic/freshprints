# Production Algolia reconcile — Studio access and Smart Filter readiness Plan

| Field | Value |
|---|---|
| Parent goal | `coordinated-production-promotion-release-readiness` |
| Goal | Expose the reviewed Algolia Preview/APPLY workflow in production Studio and complete Smart Filter release readiness |
| Date | 2026-09-13 |
| Phase | **Plan amendment → Formal Review** |
| Status | **Amended; Formal Review recorded; implementation not authorized** |
| Frozen source reviewed | `7b8462a0fe60e484a937a7c88fc37e7c938fff6d` |
| Production merge | `f615c38dbe15c37c494ce057544463843ead866e` |
| Production project | `fresh-prints-prod` |
| Production Algolia target | App `Z1FVCM5QUX`, index `portal_catalog_ready_prod` |
| Existing owner gate | `OWNER AUTHORIZE PROD ALGOLIA SMART PROFILE SEARCH RECONCILE/APPLY` |

## Authorization and boundary

The owner authorized amendment and Formal Review only:

`OWNER APPROVE PRODUCTION ALGOLIA RECONCILE STUDIO ACCESS CORRECTIVE PLAN + INCLUDE SMART FILTER PRODUCTION READINESS/RELEASE-SEQUENCING REVIEW + PROCEED TO FORMAL REVIEW`

This document does not authorize implementation, callable invocation, Algolia reads or writes,
index clear/rebuild, Firestore mutation, flag changes, Portal or Studio builds/publication,
deployment, staging, commit, or push. Existing maintenance, autonomy, and Pass 2 state remain
unchanged.

Final owner direction for this amendment: add the bounded Studio Print Requests duplicate-scroll
investigation/correction to this same Plan/Formal Review before implementation authorization. The
current Formal Review remains `approved_with_changes`; implementation is still not authorized.

## Current production state (carry-forward evidence)

- Studio `1.0.10` is live and passed historical Print Request History QA.
- Portal production rollout and smoke passed; final Firestore Rules and the projection are live.
- Maintenance is **ON**; Catalog Processing Mode is `shadow`; autonomous live and Pass 2 are **OFF**.
- Smart Profile production backfill is complete: 2,734/2,734 Ready + approved designs are current
  at `catalog-enrich-v39` / `smart-profile-normalizer-v7`; no rerun is allowed.
- Algolia reconcile remains owner-authorized but not executed. The exact target is
  `Z1FVCM5QUX` / `portal_catalog_ready_prod`.
- `NEXT_PUBLIC_USE_SMART_FILTERS` and `VITE_USE_SMART_FILTERS` remain absent/false in production.

No live production query was made in this Plan/Review turn; the state above is the accepted
rollout record. Live Algolia settings are not claimed from repository constants.

## Root cause and corrective direction

Root cause remains **B — the existing reconcile path is DEV/debug-only**. The existing service
calls the reviewed authenticated callable, but its only UI exposure is the `window.freshPrintsDev`
bridge. The shared gate requires a development build on `fresh-prints-dev`; packaged Studio also
hides DevTools and its Electron IPC rejects packaged DevTools. There is no normal production
owner/admin route.

The smallest correction is an owner/admin-only **Settings → AI Enrichment → Algolia Reconcile**
section. It reuses the existing service/callable and search-only client; it does not weaken the
debug gate, add a Function, or place an Algolia admin key in Studio.

## Final bounded amendment — Studio Print Requests duplicate-scroll corrective

This final Plan amendment is read-only and does not authorize implementation. It incorporates the
owner-reported production UI defect into this already-reviewed Studio corrective package; it does
not reopen the completed Algolia access or Smart Filter readiness investigation.

### A. Evidence-based root cause

The exact frozen-candidate hierarchy is:

```text
AuthenticatedLayout
  → AppShell
    → .app-shell (Sidebar + .app-main)
      → .app-main (AppHeader + .page-content-area.page-content-area--print-requests)
        → PrintRequestsPage <main class="page-layout page-layout-shell print-requests-page">
          → .print-requests-layout
            → .print-requests-rail → .print-requests-rail-list
            → .print-requests-main
```

`AppShell.tsx` adds the route modifier only for `/print-requests`; `PrintRequestsPage.tsx` has no
additional wrapper between the page root and the two-column workspace. `globals.css` gives
`html`, `body`, and `#root` full-height sizing but no page-level overflow rule. The shell itself
is `height: 100vh; min-height: 0; overflow: hidden`, and `.app-main` is `height: 100%;
min-height: 0; overflow: hidden`.

The current route therefore has two distinct vertical scroll contexts:

1. The base `.page-content-area` and the route rule
   `.page-content-area--print-requests` both use `overflow-y: auto`. Its direct page child is
   `flex: 0 0 auto; height: auto; min-height: 100%; overflow: visible`, so the page grows with
   detail content and the content-area scrollbar becomes the document/workspace scrollbar.
2. `.print-requests-rail-list` intentionally uses `flex: 1 1 auto; min-height: 0;
   overflow-y: auto` inside the bounded rail so request-list navigation remains available while
   the rail header/tabs remain visible.

The source has **no** `overflow-y: auto` on `.print-requests-main` in the frozen candidate. Thus
the owner’s “inner workspace/content” scrollbar cannot be attributed to that class from source;
the repository-proven second context is the rail-list scroller. The unintended outer context is
the content-area scroll introduced by `fe28bf98` (which moved detail scrolling outward to avoid
clipping), then generalized to both Print Requests and Show Queue by `35d80ec7`. The current
`min-height: 100%`/`height: auto` page-shell rule permits the content-area scroll to extend below
the fixed 100vh sidebar/app shell when detail content is long. No body/root overflow or Electron
BrowserWindow sizing defect is present in the source.

### B. Exact files and blast-radius classification

The bounded implementation surface is:

- `apps/studio/src/renderer/src/shared/components/AppShell.tsx` — traced only; no change is
  expected because the route class already exists.
- `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx` — traced
  only; no wrapper or JavaScript scroll hack is proposed.
- `apps/studio/src/renderer/src/styles/layout.css` — split the currently shared Print Requests /
  Show Queue content-area rule so only Print Requests removes the outer scroll and its page shell
  is constrained to the available app height. Show Queue keeps its current behavior until its own
  regression sample passes.
- `apps/studio/src/renderer/src/styles/components/print-requests.css` — give the constrained
  Print Requests workspace a flex/grid track that can shrink (`height: 100%`, `min-height: 0`,
  `minmax(0, 1fr)` where needed) and make the route-scoped `.print-requests-main` the detail
  workspace scroll owner (`overflow-y: auto; overscroll-behavior: contain`). Retain the bounded
  `.print-requests-rail-list` scroller.
- `apps/studio/src/renderer/src/features/print-requests/utils/printRequestPocketFullSizeCounts.contract.test.ts`
  — update the existing scroll contract assertions, which currently require outer scrolling and
  forbid a main scrollbar, to encode the corrected ownership and rail-list preservation.

This is a **Print Requests-only correction over a shared layout primitive**: the faulty selector is
shared with `/show-queue`, but the correction must be route-scoped rather than changing Show Queue
implicitly. Regression sampling of Show Queue is mandatory because it consumes the same
`.print-requests-layout`, `.print-requests-rail`, `.print-requests-rail-list`, and
`.print-requests-main` classes. No unrelated Studio workspace, Sidebar, body, root, Electron, data,
or service behavior is in scope.

### C. Smallest safe corrective design

The future implementation must:

1. Set only `.page-content-area--print-requests` to `overflow: hidden` and constrain its direct
   `.page-layout.page-layout-shell` child to `flex: 1 1 auto; height: 100%; min-height: 0;
   overflow: hidden`. Do not globally disable body scrolling.
2. Keep the existing page root and two-column structure. Give the Print Requests layout a
   shrinkable available-height track and keep `min-height: 0` through the flex/grid chain.
3. Scope `.print-requests-main` to the Print Requests route, make it stretch into that track,
   and assign it `overflow-y: auto` with the existing overscroll containment. This removes the
   outer page scrollbar without clipping long request detail, item cards, or controls.
4. Leave `.print-requests-rail-list` as the intentional bounded list scroller and keep the rail’s
   existing viewport-relative cap/sticky alignment. `overflow-y: auto` naturally produces no
   scrollbar for short or empty lists.
5. Use no fixed pixel height, JavaScript scroll-position workaround, sidebar restructure,
   BrowserWindow change, Algolia change, or data/service change.

The exact grid-track declaration and selector placement must be validated in the DEV renderer;
if the constrained track still clips content, implementation must stop rather than add an outer
scroll back. Any unresolved browser-only measurement is `[NEEDS REPO CHECK]` until DEV QA.

### D. DEV Test and Owner QA gate

No tests are claimed in this Plan/Review amendment. Before owner QA, update and run the existing
Print Requests scroll contract, the affected Print Requests utility/component contracts, Studio
TypeScript, targeted ESLint, the applicable renderer/Vite build, and `git diff --check`.
If the shared layout selectors are touched, include a Show Queue contract/regression sample and
verify its current list/detail behavior remains intentional.

Owner DEV QA is mandatory and must cover a long request (top-to-last item reachability, no outer
scroll below the workspace/sidebar, usable request navigation, Edit/overflow/Add Designs/Add
Private Design/Standard Sizes/quantity/Remove controls), a short or empty request (no duplicate
scrollbar or blank scroll region), shorter/taller Electron resize (no clipping and correct
sidebar/workspace alignment), and representative Show Queue sampling if shared selectors were
changed. Smart Filters remain OFF in the unpublished production-configured draft; this CSS-only
correction is independent of Algolia.

### E. Release integration

The correction can safely ride the existing sequence if DEV implementation, automated Test, and
Owner DEV QA PASS complete without changing the Algolia ordering: include it in the same
production-reachable source, verify it again in the unpublished production-configured stable
Studio draft with Smart Filters OFF, then publish it in the same final stable release (the next
available semver, recommended `1.0.11`). A separate production Studio hotfix is not warranted by
the repository evidence. Do not create a new production-configured RC mode.

## Frozen-source evidence

The relevant source blobs are byte-identical between the working tree and the frozen candidate.
The latest Smart Filter source commit in the candidate is `1c43f6e1` (retire legacy tag search
authority); no later candidate commit changes the reviewed Portal/Studio Smart Filter paths.

### Portal Smart Filter readiness

Implementation is present and functionally complete behind the exact build-time flag:

- `apps/portal/features/catalog/services/portalAlgoliaCatalogFlags.ts` reads
  `process.env.NEXT_PUBLIC_USE_SMART_FILTERS === 'true'`; configuration additionally requires
  the managed Algolia client.
- `apps/portal/features/catalog/pages/CatalogPageContent.tsx` gates the Smart Filters button and
  modal, counts active selections, and keeps category/Halftone controls separate.
- `apps/portal/features/catalog/components/CatalogSmartFilterModal.tsx` exposes the eight shared
  dimensions, handles loading/error/empty distributions, preserves selected values, and is
  responsive through the existing modal/sheet surfaces.
- `apps/portal/features/catalog/components/CatalogFilterBar.tsx` and
  `apps/portal/features/catalog/components/CatalogFiltersSheet.tsx` expose the control on desktop
  and mobile only when configured.
- `apps/portal/features/catalog/hooks/useCatalogDesigns.ts` requires managed Algolia for query or
  Smart Filter searches, keeps exact-ID fallback bounded, and does not use legacy tags.
- `apps/portal/features/catalog/hooks/useNarrowedCatalogCategoryOptions.ts` performs reciprocal
  category narrowing from query + Smart Filter facets and fails open to the full category list on
  facet-read errors.
- `apps/portal/features/catalog/services/portalAlgoliaCatalogSearchService.ts` imports the shared
  eight-facet list, builds AND facet groups, combines query + category + Smart Filters, and extracts
  facet distributions with empty/missing handling.

Category narrowing is reciprocal: category options are queried with query + Smart Filters while
the selected category is omitted from the category-facet query; result queries apply the selected
`categoryId`. Smart selections use the same exact-token helper and AND semantics as Studio. No
URL persistence exists for Smart Filter selections; search/category URL state remains unchanged.

**Portal flag injection finding:** the source reader is correct, but the production
`apps/portal/apphosting.yaml` currently has no `NEXT_PUBLIC_USE_SMART_FILTERS` mapping. Production
enablement therefore requires an owner-created Secret Manager value and a `BUILD` + `RUNTIME`
secret mapping before the post-reconcile App Hosting rollout. The existing `.env.example` already
documents the flag.

### Studio Smart Filter readiness

Implementation is present and functionally complete behind the exact build-time flag:

- `apps/studio/src/renderer/src/features/designs/services/studioAlgoliaCatalogFlags.ts` reads
  `import.meta.env.VITE_USE_SMART_FILTERS === "true"` and keeps the search-only client separate.
- `apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx` enables the Smart
  Filter UI only for non-archived Design Library browsing, and passes selections to managed search.
- `apps/studio/src/renderer/src/features/designs/components/DesignLibraryFilterControls.tsx` and
  `DesignLibrarySmartFilterModal.tsx` expose the eight dimensions with responsive existing UI,
  loading/error/no-match handling, selection, clear, and apply behavior.
- `apps/studio/src/renderer/src/features/designs/services/studioAlgoliaSmartFilters.ts` and
  `studioAlgoliaCatalogFacets.ts` use the shared dimensions, AND facet groups, exact-token search,
  and category disjunctive narrowing. Dedicated Halftone and Needs Companion controls remain
  separate from Smart Profile facets.
- `apps/studio/src/renderer/src/features/designs/services/studioAlgoliaCatalogSearchService.ts`
  is the search-only client used for managed IDs, `nbHits`, and facet distributions.
- `apps/studio/src/renderer/src/features/designs/hooks/useDesignLibraryManagedSearch.ts` uses
  managed Algolia IDs plus Firestore hydration, then applies the same Smart Filter consistency
  checks; it has no legacy tag authority.

**Studio flag injection finding:** the renderer reader is correct, but
`apps/studio/scripts/write-studio-release-env.mjs` does not currently emit `VITE_USE_SMART_FILTERS`,
and `.github/workflows/studio-release.yml` has no explicit Smart Filter build input. A narrow
implementation correction must add an explicit `off`/`on` stable-build choice, fail closed to
`false` for the access draft, and bake `true` only in the final post-reconcile stable build. This
is a build-input correction, not a runtime flag architecture or a new production RC mode.

**Small contract-copy correction:**
`apps/studio/src/renderer/src/features/designs/components/DesignLibrarySmartFilterModal.tsx`
currently says selected values apply “together with tags, category, and search.” The enabled path
does not use tags and the reviewed contract retires tag authority. Change only this copy to state
category and search (no filter redesign). Add a focused regression assertion for the absence of
legacy-tag wording in the enabled Smart Filter modal.

## Shared Algolia contract verification

`packages/shared/src/catalog-search/portalCatalogAlgoliaRecord.ts` is the source of truth. Both
consumers align to these eight Smart Profile facets:

`subjects`, `styles`, `themes`, `interests`, `professionsGroups`, `occasions`, `places`, `colors`.

The reviewed searchable attributes are:

`title`, `unordered(subjects)`, `unordered(professionsGroups)`, `unordered(occasions)`,
`unordered(places)`, `unordered(themes)`, `unordered(interests)`, `unordered(styles)`,
`categoryName`, `unordered(colors)`, `unordered(searchConcepts)`, `unordered(visibleText)`,
`unordered(objects)`, `searchText`.

Faceting is `categoryId` plus the eight dimensions. `tagIds` and `tagFacetKeys` are absent from the
shared record/settings contract. Neither enabled Smart Filter path hydrates or filters by those
legacy fields. Objects, searchConcepts, and visibleText remain searchable but are intentionally
not facet controls. Halftone remains a dedicated human/staff filter, not a Smart Profile facet.

## Algolia Reconcile Settings control

The future implementation must mount the control under the existing owner/admin
`canViewAdministrativeSettings` AI Enrichment surface. The server callable independently requires
an authenticated active staff profile with role `owner` or `admin`; helpers and customers fail
closed. This is an aligned UI/server authorization boundary.

Preview must:

1. call `reconcilePortalCatalogAlgoliaIndex({ dryRun: true })` through the existing service;
2. show `fresh-prints-prod`, `Z1FVCM5QUX`, and `portal_catalog_ready_prod` from validated config;
3. show callable scan/proposed counts and, when configured, a current hit count from the existing
   search-only client (`nbHits`); and
4. show searchable attributes/facets as **proposed APPLY contract**, explicitly omitting legacy
   tag fields.

The UI must not claim repository constants are live settings. The current callable does not return
live admin settings, and the search-only client cannot read them. No backend change is needed:
APPLY already calls `ensurePortalCatalogAlgoliaIndexSettings` before clear/rebuild, so the reviewed
contract is the deterministic post-APPLY state. A separate owner-provided read-only settings
snapshot may be attached as evidence, but it is not required to invent a new backend response.

Apply must call the same service with `{ dryRun: false }` only after a current Preview succeeds and
all identity/contract guards pass. Preview authorization is local and ephemeral: invalidate it on
target/config changes, errors, navigation/remount, reload, and timeout; never persist it across
application restart. Disable the button while a request is active, protect against double-clicks
and concurrent requests, require explicit confirmation, surface success/error state, and require
a fresh Preview before retrying after failure.

## Release-sequencing decision

The safest minimal sequence is **Option 2: one published stable Studio release plus one
unpublished production-configured stable draft for QA**.

Evidence:

- `.github/workflows/studio-release.yml` is manual-only and supports `release_type=stable`.
- Stable jobs reject refs not equal to `production` or an exact SHA reachable from
  `origin/production`; the workflow bakes `PROD_FIREBASE_*` and production search-only Algolia
  configuration, then finalizes a GitHub Release **draft** only. Publication is separately human
  gated after platform smoke.
- `release_type=prerelease` selects DEV configuration through the env writer and is validation-only;
  it is not a production-configured QA artifact.
- There is no runtime Smart Filter switch: Portal uses Next build/runtime env and Studio uses
  Vite compile-time env. No safe existing runtime alternative exists.

Therefore no new production RC mode is created. After implementation is merged to a
production-reachable source:

1. **Access draft (not published):** run the established stable workflow with Smart Filters
   explicitly OFF. Owner downloads the authenticated draft assets and performs production Studio
   sign-in/Settings QA and the reviewed Algolia Preview/APPLY gate. The draft is not a public stable
   release and does not expose Smart Filters.
2. **Algolia cutover:** use the existing owner authorization for Preview/APPLY, then verify exact
   source/projection parity, Smart Profile facets/search, no legacy tag settings, and zero unsafe or
   malformed drift. Maintenance stays ON.
3. **Final Studio stable release:** rerun the same stable workflow/source with Smart Filters ON,
   publish once through the existing owner-gated stable publish helper, and perform immediate
   production Studio QA. The prior 1.0.10 baseline remains historical; because it is already live,
   the corrective source must use the next available stable semver (recommended `1.0.11`) and update
   the workflow's hard-coded version guard in the implementation review. Do not republish the old
   `1.0.10` artifact.
4. **Portal rollout:** after Algolia verification, create/grant the
   `NEXT_PUBLIC_USE_SMART_FILTERS` production App Hosting secret, add its `BUILD` + `RUNTIME`
   mapping in `apps/portal/apphosting.yaml`, build from the production source, deploy only
   App Hosting to `fresh-prints-prod`, and smoke-test. The flag is enabled only in this final
   post-reconcile rollout.

One *published* Studio release is sufficient; the access draft is a reviewed production-configured
QA artifact, not a second published stable release. Portal has one post-reconcile rollout. This
sequence preserves the hard dependency that Smart Filters remain hidden until Algolia is converged.

## Files expected to change after owner implementation authorization

Algolia access control:

- `apps/studio/src/renderer/src/features/settings/pages/SettingsPage.tsx`
- `apps/studio/src/renderer/src/features/settings/components/PortalCatalogAlgoliaReconcileSettingsSection.tsx` **(new)**
- `apps/studio/src/renderer/src/features/settings/components/PortalCatalogAlgoliaReconcileSettingsSection.test.tsx` **(new)**
- `apps/studio/src/renderer/src/features/designs/services/portalCatalogAlgoliaReconcileAdminService.ts` (reuse only; preserve debug installer gate)
- `apps/studio/src/renderer/src/features/designs/services/studioAlgoliaCatalogSearchService.ts` (search-only count helper only if needed)
- `apps/studio/src/renderer/src/features/designs/services/portalCatalogAlgoliaReconcileAdminService.test.ts`

Smart Filter readiness corrections/configuration:

- `apps/studio/src/renderer/src/features/designs/components/DesignLibrarySmartFilterModal.tsx` (copy-only correction)
- `apps/studio/src/renderer/src/features/designs/services/studioAlgoliaCatalogSearchService.ts` (search-only count helper only if needed)
- `apps/studio/scripts/write-studio-release-env.mjs`
- `apps/studio/scripts/write-studio-release-env.test.ts`
- `.github/workflows/studio-release.yml`
- `.github/workflows/studio-release-signing-policy.test.ts` (workflow-input/flag guard coverage)
- `apps/portal/apphosting.yaml`
- `apps/portal/features/catalog/services/portalAlgoliaCatalogFlags.test.ts` (mapping/flag coverage only if needed)

No Functions, Rules, shared record contract, Algolia admin client, secrets values, or legacy data
deletion paths are in scope. A stylesheet path is **[NEEDS REPO CHECK]** only if the existing
Settings styles cannot host the new section without a dedicated class; no new styling architecture
is authorized.

## Future implementation, Test, and Owner QA gates

Implementation may begin only after the exact next owner checkpoint and must preserve:

- Component → Hook/Service → callable/search-client layering;
- server-only Algolia admin credentials;
- owner/admin UI and callable authorization parity;
- no direct renderer Algolia writes or Firebase calls;
- Smart Filters OFF in the access draft and ON only after verified reconcile;
- maintenance ON, autonomy OFF, Pass 2 OFF, and no unrelated deployment/data action.

Tests before owner QA:

- focused Settings component/service tests for permission, identity, Preview, ephemeral Apply guard,
  stale-preview invalidation, retry/error, and no-secret behavior;
- Portal and Studio Smart Filter flag, contract, category narrowing, facet, empty/error, mobile,
  and no-legacy-tag regression suites;
- env-writer and workflow tests proving stable production config, explicit OFF/ON input handling,
  and fail-closed invalid values;
- Functions build, Portal typecheck/build, targeted lint, `git diff --check`, and the applicable
  Studio release workflow gates; document existing environment/baseline limitations honestly;
- no production callable, Algolia, Firestore, or App Hosting action during local Test.

Manual owner QA before Algolia APPLY (access draft):

1. install/run the authenticated production-configured stable draft;
2. confirm Firebase project and Algolia target identity;
3. confirm Settings → AI Enrichment → Algolia Reconcile is visible to owner/admin only;
4. confirm Preview is read-only, counts are labeled, proposed settings are not called live, and
   Apply is disabled until current Preview/guards/confirmation;
5. confirm helpers/customers cannot see or invoke it; and
6. confirm Smart Filters button remains hidden while the draft flag is OFF.

After Algolia APPLY and before enabling flags, require exact parity/contract verification and a
zero-diff convergence proof. After final Studio/Portal releases, verify Smart Filters appear only
for the intended surfaces, all eight facets work with category/search combinations, empty/error
states remain safe, legacy tags have no authority, Studio remains healthy, and maintenance stays ON
until a later separately authorized checkpoint.

## Explicit non-actions for this Plan/Review turn

- no Algolia callable or search request;
- no Algolia settings read, clear, rebuild, or mutation;
- no Firestore/Storage/Auth/settings/secrets mutation;
- no Smart Filter flag change;
- no Portal build, rollout, or publication;
- no Studio build, release, or publication;
- no Functions/Rules deployment;
- no Smart Profile/provider call or backfill;
- no maintenance/autonomy/Pass 2 change;
- no legacy-tag physical deletion;
- no Print Requests CSS/layout implementation, renderer build, or Studio QA;
- no staging, commit, push, candidate freeze, or production merge.

## Next FreshForge checkpoint

Owner authorization is recorded as **`OWNER ACCEPT PRODUCTION ALGOLIA ACCESS + SMART FILTER +
PRINT REQUEST SCROLL FORMAL REVIEW / AUTHORIZE FINAL COMPANION AMENDMENT + SELF-REVIEW +
IMPLEMENT + TEST`**. Implementation and Test are complete under this bounded plan, and independent
Implementation Review found no blocking defect. The next gate is Owner DEV QA.

## Final bounded amendment — Portal companion Add feedback and quantity

Owner authorization also permits one final bounded Portal companion-design correction to the same
reviewed production-readiness source. Repository inspection proves the defect is a presentation and
action-state gap, not a new companion-selection contract:

- `CatalogMatchingDesignsSection` rendered companions with only Add/Adding feedback and had no
  quantity or remove controls.
- `CatalogDesignDetailsModal` supplied the parent design's quantity context, but did not pass the
  working-request quantity map or companion action callbacks to the companion section.
- `CatalogCompanionSuggestionModal` likewise lacked quantity/remove wiring.
- `addDesignFromCompanionSuggestion` used the shared `adjustQuantity` path with announcement
  disabled, but the previous `refreshCompanionSuggestionAfterAdd` path filtered/dismissed the card
  from optimistic state before the queued service flush completed. In the existing-request path
  the callback could run before the server write settled; in the create path it could run before
  `flushDesiredQuantity` completed. This produced missing success feedback and made duplicate taps
  and quantity divergence possible.

The bounded implementation therefore wires the existing shared quantity contract through both
companion surfaces and adds a per-design pending/added action state. Companion success is emitted
only after the existing callable/service quantity flush succeeds; failure clears the transient state
and leaves the existing error/sync path authoritative. The companion remains mounted so a successful
add transitions to the same quantity controls used by the primary design. No new callable, document
shape, lifecycle behavior, suggestion-ranking rule, or automatic add is introduced.

Exact implementation paths:

- `apps/portal/features/catalog/components/CatalogMatchingDesignsSection.tsx`
- `apps/portal/features/catalog/components/CatalogCompanionSuggestionModal.tsx`
- `apps/portal/features/catalog/components/CatalogDesignDetailsModal.tsx`
- `apps/portal/features/catalog/pages/CatalogHomePageContent.tsx`
- `apps/portal/features/catalog/pages/CatalogPageContent.tsx`
- `apps/portal/features/print-requests/hooks/useAddDesignToRequestFlow.ts`
- `apps/portal/features/print-requests/hooks/useAddDesignToRequestFlow.postAddSuggestion.test.ts`
- `apps/portal/styles/catalog.css`

The shared quantity controls remain the only mutation surface. Existing ready-companion filtering,
staff/import authority, explicit-content policy, request limits, lifecycle fields, and Firebase
callable authorization are unchanged. The same behavior is required in the catalog home suggestion
modal, catalog library suggestion modal, and Design Details matching-designs section, including
mobile-width layouts.

Required focused validation and Owner DEV QA cover: Add, Adding, server-success feedback, server
failure recovery, double-click/single-flight behavior, duplicate prevention, existing-request
increment, first-add request creation, quantity increase/decrease, remove/re-add, stale optimistic
state, both companion surfaces plus Design Details, narrow/mobile layout, direct Firebase-authoritative
quantity reconciliation, and regression of the existing lifecycle/request contract. No production
callable, Firestore, Algolia, Portal rollout, or Studio publication is part of this amendment.

The Settings control remains intentionally fail-closed when the search-only `nbHits` check cannot
be obtained, and its single-flight guard is per mounted Studio surface. Distributed locking of the
existing scheduled/manual reconcile callable is outside this bounded source amendment; the later
owner-gated APPLY must therefore avoid scheduled or parallel reconcile overlap as an operational
precondition.

This amendment is additive to the already approved Algolia/Smart Filter and Print Requests scroll
scope, uses the same release sequence, and does not require a new RC mode or separate release.

## Owner DEV QA correction cycle — 2026-09-13

Owner DEV QA returned **`OWNER DEV QA — CORRECTIONS REQUIRED`**. The Algolia Settings DEV guard
passed and the existing DEV Smart Filter behavior remained a regression PASS. The two bounded
corrections below remain inside this approved UI scope; no new Plan approval is required.

### Print Requests all-status scroll correction

Source tracing confirms there are no status-specific page wrappers: Customer Requests render
Working, Editing, Queued, Printing, and Printed through the same rail/main structure, while Internal
Requests render Working, Editing, Queued, and Printed. Working and Editing alone are editable and
unqueued, so their item-card editors (size, DPI/upscale, quantity, duplicate/remove, and autosave
controls) make the detail content substantially taller. At narrow/stressed widths, the existing
route-scoped `grid-template-rows: minmax(0, 1fr)` rule had higher specificity than the responsive
stacked layout rule; the implicit second row expanded and leaked scrolling to the outer shell. The
correction keeps the route scope, adds `height`/`max-height` constraints to the detail main, and
gives the Print Requests responsive rule matching specificity (`auto minmax(0, 1fr)`). Show
Queue keeps its generic responsive behavior. Diagnostic kind/tab attributes make every status
surface explicit in the contract tests; they do not change request behavior.

Changed paths:

- `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx`
- `apps/studio/src/renderer/src/styles/layout.css`
- `apps/studio/src/renderer/src/styles/components/print-requests.css`
- `apps/studio/src/renderer/src/features/print-requests/utils/printRequestPocketFullSizeCounts.contract.test.ts`

The contract covers all Customer and Internal status tabs, bounded detail ownership, no outer shell
scroll, narrow two-row sizing, and Show Queue non-regression. Owner DEV QA must still exercise
selected/empty states, long and short requests, desktop/narrow widths, resize, rail versus detail
scrollbars, and every listed status.

### Companion visual/action correction

The shared stepper's `minmax(3rem, 1fr)` center track exceeded compact companion card widths,
distorting the minus/value/plus alignment. The companion-only CSS override reuses the established
stepper classes with a `minmax(0, 1fr)` center, balanced 2.25rem buttons, centered icons/text, and
stretching input geometry. `CatalogCompanionSuggestionModal` now latches its footer from **Not
now** to **Done** only after a matching companion reaches confirmed `added` state from the
server-settlement path. Pending or failed Add leaves **Not now**; removal/re-add does not oscillate
the dismissal label, and first-mount state initialization honors an already-confirmed matching
`added` state.

Changed paths:

- `apps/portal/features/catalog/components/CatalogCompanionSuggestionModal.tsx`
- `apps/portal/features/catalog/components/CatalogCompanionSuggestionModal.test.ts`
- `apps/portal/styles/catalog.css`
- `apps/portal/features/catalog/components/CatalogMatchingDesignsSection.companionQuantity.test.ts`

Focused correction tests pass **61/61**; Portal typecheck, Studio TypeScript, Functions build,
targeted ESLint, Studio renderer/Vite build, and `git diff --check` pass. Portal production build
remains blocked by the existing `.next/trace` EPERM environment issue. Fresh independent
Implementation Review is complete with no blocking defect; only runtime browser smoke remains for
Owner DEV QA. No production action, deployment, publication, staging, commit, or push occurred.
