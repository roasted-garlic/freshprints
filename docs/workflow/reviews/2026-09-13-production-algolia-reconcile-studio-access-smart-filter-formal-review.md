# Formal Review — production Algolia reconcile Studio access + Smart Filter readiness

| Field | Value |
|---|---|
| Parent goal | `coordinated-production-promotion-release-readiness` |
| Goal | `production-algolia-reconcile-studio-access-corrective` |
| Date | 2026-09-13 |
| Review basis | Owner-authorized Plan amendment and read-only frozen-source inspection |
| Plan | `docs/workflow/plans/2026-09-13-production-algolia-reconcile-studio-access-corrective-plan.md` |
| Frozen candidate | `7b8462a0fe60e484a937a7c88fc37e7c938fff6d` |
| Production merge | `f615c38dbe15c37c494ce057544463843ead866e` |
| Disposition | **approved_with_changes** |
| Implementation | **not authorized / not started** |

## Owner authorization

`OWNER APPROVE PRODUCTION ALGOLIA RECONCILE STUDIO ACCESS CORRECTIVE PLAN + INCLUDE SMART FILTER PRODUCTION READINESS/RELEASE-SEQUENCING REVIEW + PROCEED TO FORMAL REVIEW`

This review is Plan → Formal Review only. It authorizes no implementation, Algolia operation,
production read/write, flag change, deployment, publication, staging, commit, push, or candidate
freeze. The existing owner gate `OWNER AUTHORIZE PROD ALGOLIA SMART PROFILE SEARCH RECONCILE/APPLY`
remains separate and is not consumed here. The owner then directed one final bounded amendment for
the Studio Print Requests duplicate-scroll defect; this review records that amendment without
reopening the completed Algolia/Smart Filter investigation.

## Plan disposition

The existing corrective Plan remains valid with a bounded amendment; no material restructuring is
needed. The amendment adds Smart Filter readiness/release sequencing and records the two narrow
source/configuration corrections (explicit Studio flag injection and stale Studio copy), while
preserving the existing Settings-based callable reuse and zero-backend-change decision.

## Evidence captured

The Smart Filter and release-path source blobs were inspected at the frozen candidate and are
byte-identical to the current source. The latest relevant Smart Filter commit is `1c43f6e1`
(`feat(catalog): retire legacy tag search authority`); no later candidate commit changes these
Portal/Studio paths.

### Portal

- `portalAlgoliaCatalogFlags.ts` reads `NEXT_PUBLIC_USE_SMART_FILTERS` exactly and defaults OFF.
- `CatalogPageContent.tsx`, `CatalogFilterBar.tsx`, and `CatalogFiltersSheet.tsx` gate the desktop
  and mobile Smart Filters controls; category and Halftone remain distinct.
- `CatalogSmartFilterModal.tsx` exposes exactly the eight shared facets and has loading, error,
  empty, selection, and responsive modal behavior.
- `portalAlgoliaCatalogSearchService.ts` builds query + category + Smart Filter Algolia requests,
  eight-facet distributions, exact-token parameters, and AND groups from the shared contract.
- `useCatalogDesigns.ts` requires managed Algolia for text/Smart Filter searches and has only the
  bounded exact-ID fallback; no legacy tag filter is used.
- Production App Hosting currently has no `NEXT_PUBLIC_USE_SMART_FILTERS` mapping in
  `apps/portal/apphosting.yaml`; a production Secret Manager mapping is required for enablement.

### Studio

- `studioAlgoliaCatalogFlags.ts` reads `VITE_USE_SMART_FILTERS === "true"` exactly and defaults OFF.
- `DesignLibraryPage.tsx` and `DesignLibraryFilterControls.tsx` gate Smart Filters for the active
  ready Design Library; archived browsing disables the Smart UI.
- `studioAlgoliaSmartFilters.ts`, `studioAlgoliaCatalogFacets.ts`, and
  `useDesignLibraryManagedSearch.ts` use the same eight dimensions, exact-token search, AND groups,
  category narrowing, and Firestore hydration. Halftone and Needs Companion remain separate.
- `DesignLibrarySmartFilterModal.tsx` has safe loading/error/no-match handling and responsive UI.
- No enabled Smart Filter path reads `tagIds` or `tagFacetKeys`.
- The modal description still says “together with tags, category, and search”; this is stale copy
  against the retired tag authority and requires a copy-only correction.
- `write-studio-release-env.mjs` currently does not emit `VITE_USE_SMART_FILTERS`, and the release
  workflow has no explicit OFF/ON Smart Filter input.

### Shared contract and backend

`packages/shared/src/catalog-search/portalCatalogAlgoliaRecord.ts` defines the eight facets and the
reviewed searchable-attribute order. Both consumers import or alias the same facet list. Legacy
`tagIds`/`tagFacetKeys` are absent from the record/settings contract. The existing callable is
owner/admin-authenticated, keeps `ALGOLIA_ADMIN_API_KEY` server-side, and APPLY enforces settings
through `ensurePortalCatalogAlgoliaIndexSettings` before clear/rebuild. Its dry-run response does
not expose live settings; the search-only client can provide `nbHits` only.

### Release tooling

`.github/workflows/studio-release.yml` is manual-only. `release_type=stable` accepts only
`production` or an exact SHA reachable from `origin/production`; both platform jobs use the
production env writer; finalize mutates a GitHub Release **draft** only. `release_type=prerelease`
uses DEV configuration and is validation-only. The source contains no runtime Smart Filter flag
path: Portal and Studio flags are build-time environment inputs. The deployment standard explicitly
places Windows/macOS smoke before the separate stable publication checkpoint, so owner download and
manual use of the production-configured stable draft is an established QA path rather than a new RC
mode.

## Final bounded amendment review — Studio Print Requests duplicate scrolling

### A. Root-cause finding

The frozen source proves the route hierarchy `AuthenticatedLayout → AppShell → .app-shell →
.app-main → .page-content-area.page-content-area--print-requests → PrintRequestsPage →
.print-requests-layout → (.print-requests-rail/.print-requests-rail-list,
.print-requests-main)`. `globals.css` sizes `html`, `body`, and `#root` but does not create a
document overflow context. `.app-shell` and `.app-main` are 100%-height/min-height-zero with
`overflow: hidden`.

The duplicate contexts are the route’s outer `.page-content-area--print-requests { overflow-y:
auto }` plus the intentional `.print-requests-rail-list { overflow-y: auto }`. The direct page
shell is currently `flex: 0 0 auto; height: auto; min-height: 100%; overflow: visible`, so long
detail content grows the content-area scroll range below the viewport/sidebar. The frozen source
has no `.print-requests-main` vertical overflow rule; the owner’s observed “inner workspace” bar
therefore cannot be attributed to that class from source and needs DEV visual confirmation.

`fe28bf98` introduced the outer-scroll choice while removing the former main scrollbar to avoid
clipping long detail/attached-request content; `35d80ec7` generalized that rule to Show Queue.
This is a bounded CSS ownership defect, not a body/root overflow, Sidebar, or Electron
BrowserWindow-sizing defect.

### B. Approved bounded correction for future Implement

Scope the correction to `/print-requests`:

1. Set only `.page-content-area--print-requests` to `overflow: hidden` and constrain its direct
   page shell to `flex: 1 1 auto; height: 100%; min-height: 0; overflow: hidden`.
2. Preserve the existing page/rail/detail DOM. Give the Print Requests grid a shrinkable
   available-height track (`min-height: 0`, `height: 100%`, and a `minmax(0, 1fr)` track where
   required by DEV layout verification).
3. Make the route-scoped `.print-requests-main` stretch into that track and own detail scrolling
   with `overflow-y: auto; overscroll-behavior: contain`.
4. Retain `.print-requests-rail-list` as the bounded request-list scroller; short/empty content
   naturally has no scrollbar. Do not change Show Queue implicitly, globally disable body scroll,
   add fixed pixel heights, add JavaScript scroll hacks, clip content, restructure the Sidebar, or
   alter BrowserWindow dimensions.

### C. Blast radius and regression requirement

The faulty layout selector is shared with `/show-queue`, but the proposed change is route-scoped
to Print Requests. `AppShell.tsx` and `PrintRequestsPage.tsx` require no wrapper or behavior
change. Because Show Queue consumes the same `.print-requests-layout`, `.print-requests-rail`,
`.print-requests-rail-list`, and `.print-requests-main` classes, its current list/detail behavior
must be sampled as a regression if shared CSS selectors are touched. No other workspace, service,
data, Algolia contract, Smart Profile, flag, maintenance, autonomy, or Pass 2 behavior is in scope.

### D. Automated and owner QA gate

Update the existing `apps/studio/src/renderer/src/features/print-requests/utils/printRequestPocketFullSizeCounts.contract.test.ts`:
replace its current assertions that forbid a main scrollbar and require outer route scrolling with
assertions for route-scoped outer `overflow: hidden`, constrained shell sizing, main
`overflow-y: auto`, and preserved rail-list `overflow-y: auto`. Run the affected Print Requests
contracts, Studio TypeScript, targeted ESLint, applicable renderer/Vite build, and
`git diff --check`; no test passes are claimed in this amendment.

Owner DEV QA remains mandatory: long request top-to-last-item reachability; no outer scroll below
workspace/sidebar; usable list navigation; Edit, overflow, Add Designs, Add Private Design,
Standard Sizes, quantity, and Remove controls; short/empty request without duplicate or blank
scrolling; shorter/taller window resize without clipping; sidebar/workspace alignment; and Show
Queue regression sampling if shared selectors changed. The correction is independent of Algolia,
and Smart Filters remain OFF in the unpublished production-configured draft.

### E. Release integration decision

The correction may safely ride the already-reviewed sequence: implement and test on development,
obtain Owner DEV QA PASS, include it in the same production-reachable source, verify it again in
the unpublished production-configured stable Studio draft with Smart Filters OFF, then publish it
in the same final stable Studio release using the next available semver (recommended `1.0.11`).
Repository evidence does not justify a separate production hotfix or a new production-configured RC
mode.

## Required changes for implementation

1. Add the owner/admin Settings → AI Enrichment → Algolia Reconcile section and tests, reusing the
   existing callable service and search-only hit-count client.
2. Keep Preview authorization ephemeral and invalidate it on target/config changes, error,
   navigation/remount, reload, timeout, or stale state; prevent double-click/concurrent APPLY;
   require explicit confirmation and a fresh Preview after failure.
3. Add explicit stable workflow/env-writer Smart Filter OFF/ON handling. Access-draft builds must
   be explicitly OFF; the final post-reconcile stable build may be ON; invalid values fail closed.
4. Add the production Portal App Hosting `NEXT_PUBLIC_USE_SMART_FILTERS` Secret Manager mapping
   (`BUILD` + `RUNTIME`) without committing its value. Create/grant the secret only at the later
   owner-gated rollout checkpoint.
5. Correct only the stale Studio modal text so it no longer describes tags as a matching authority.
6. Resolve the next stable Studio version before release. The coordinated `1.0.10` artifact is
   already live; the corrective source should use the next available stable semver (recommended
   `1.0.11`) and update the workflow hard gate. Do not republish the old `1.0.10` artifact.
7. Correct the Print Requests duplicate-scroll ownership in DEV first: remove only the
   route-scoped outer content-area scroll, constrain the Print Requests shell/grid with the
   existing flex/grid `min-height: 0` chain, restore a route-scoped `.print-requests-main`
   detail scrollbar, and retain the bounded rail-list scroller. Update the existing scroll
   contract and complete the required long/short/empty/resize and Show Queue regression QA before
   production inclusion.

No backend change, new Function, debug-gate weakening, runtime flag architecture, tag deletion,
shared contract rewrite, or Smart Filter UX redesign is required.

## Formal Review questions

1. **Is the Settings control architecturally correct?** Yes. It belongs under the existing
   owner/admin AI Enrichment Settings surface and preserves Component → Service → callable/search
   client layering.
2. **Is authorization aligned?** Yes. `canViewAdministrativeSettings`/`canManageSettings` admits
   active owner/admin users, matching the callable's authenticated `owner`/`admin` check. Helpers
   and customers are excluded by both layers.
3. **Can the search-only client obtain count?** Yes. Its `searchSingleIndex` response exposes
   `nbHits`; this is a read-only hit count and never an admin-settings read.
4. **Can backend changes remain at zero?** Yes. Reuse the existing callable; APPLY already enforces
   the deterministic settings contract server-side.
5. **Is the proposed contract sufficient without live settings?** Yes for this clear/rebuild
   operation. The UI must label it **proposed APPLY contract**, never current live settings. An
   optional owner-provided read-only settings snapshot can supplement evidence but is not required
   to add a backend metadata response.
6. **Is Portal Smart Filter implementation present?** Yes. The flag gates existing UI and managed
   search/facet logic; only production env mapping remains.
7. **Is Studio Smart Filter implementation present?** Yes. The flag gates existing Design Library
   UI and managed search/facet logic; explicit release env injection remains.
8. **Do consumers match the contract?** Yes. Both use the same eight shared facets and reviewed
   searchable fields; category behavior is aligned.
9. **Is legacy tag authority present in enabled paths?** No. No active Smart Filter query, facet,
   or hydration path uses `tagIds`/`tagFacetKeys`. One Studio description is stale copy only.
10. **Are corrections required?** Yes, two narrow readiness corrections: explicit Studio flag
    injection and the stale “tags” description. No functional filter rewrite is required.
11. **How are flags injected?** Portal requires a Secret Manager-backed `apphosting.yaml` mapping
    with BUILD + RUNTIME availability. Studio requires the release env writer/workflow to bake
    `VITE_USE_SMART_FILTERS` at build time; it is not a runtime variable.
12. **Can two stable releases be avoided with an existing production-configured workflow?** Yes.
    The existing stable workflow produces a production-configured, owner-accessible GitHub Release
    draft without publishing it; prerelease is DEV-configured and is not suitable.
13. **Is two published stable releases safest?** No. One published stable release is sufficient
    when the stable draft is used for access QA and then rebuilt/replaced with the ON flag after
    Algolia convergence. This avoids a second published release without inventing an RC mode.
14. **Exact Portal sequence?** After Algolia APPLY/VERIFY/zero-diff: create/grant the exact
    `NEXT_PUBLIC_USE_SMART_FILTERS` secret, merge the YAML mapping through the reviewed production
    source, deploy App Hosting to `fresh-prints-prod`, and run production smoke. Keep the flag OFF
    until the Algolia gate is complete.
15. **Exact Studio sequence?** Merge corrective source to a production-reachable SHA; run stable
    workflow with flag OFF and keep its draft unpublished; owner uses draft assets for authenticated
    Algolia Preview/APPLY. After exact Algolia verification, rerun stable workflow from the same
    source with flag ON, replace/finalize the draft, publish once via the owner-gated helper, and
    perform Studio QA. Use the next stable semver (recommended `1.0.11`).
16. **Tests before owner QA?** Focused Settings/service and flag-injection tests; Portal/Studio
    Smart Filter contract/category/facet/empty/error/mobile/no-tag suites; env-writer/workflow
    tests; Functions build; Portal typecheck/build; targeted lint; `git diff --check`; and the
    applicable stable draft workflow gates.
17. **Manual QA before Algolia APPLY?** In the unpublished production-configured draft, owner/admin
    confirms Firebase/project and Algolia identity, Settings control visibility, read-only Preview,
    proposed-contract labels, disabled Apply until current guards, helper/customer denial, and
    Smart Filters hidden with the OFF build input.
18. **What is required after APPLY before flags?** Verify 2,734-record source/projection parity,
    searchable attributes and all eight facets, absent legacy tag authority, zero missing/stale/
    malformed/unsafe/errors, and zero-diff DRY RUN. Only then may flags be enabled.
19. **What is required after enabled releases?** Portal and Studio smoke; Smart Filter visibility;
    all eight facet combinations with search/category; safe empty/error states; no tag authority;
    Studio health; and maintenance still ON.
20. **Additional owner checkpoints?** Yes. The existing Algolia APPLY authorization remains separate;
    the owner must authorize implementation at the next checkpoint, approve the next stable version
    and the unpublished production draft QA, approve/publish the final stable Studio release, and
    authorize the post-reconcile Portal flag/App Hosting rollout. No checkpoint authorizes production
    mutation until explicitly stated.
21. **Does the Print Requests amendment change the Algolia sequence or require a separate release?**
    No. It is a bounded renderer CSS/layout correction that can ride the same DEV → production-
    reachable source → unpublished Smart Filters-OFF stable draft → final stable release sequence,
    provided the updated scroll contract, renderer checks, and mandatory Owner DEV QA PASS succeed.
    No production-configured RC mode or standalone hotfix is created.

## Release decision

**Approved sequence: one published stable Studio release plus one unpublished production-configured
stable draft.** This is the minimal safe sequence supported by existing tooling:

```text
Implement + test on development
  → reviewed production-reachable source
  → stable workflow, Smart Filters OFF, draft only
  → owner production Studio QA + Algolia Preview/APPLY gate
  → exact Algolia VERIFY + zero-diff DRY RUN
  → stable workflow, Smart Filters ON, same source, publish once
  → Portal App Hosting flag mapping/rollout
→ Studio + Portal production smoke
```

The Print Requests scroll correction is inserted in the existing `Implement + test on
development` step and must receive Owner DEV QA PASS before the production-reachable source is
used. It does not reorder or consume the Algolia Preview/APPLY, VERIFY, zero-diff, or Smart Filter
flag gates.

The draft is not a new production RC mode. It uses the existing `release_type=stable` path and
production ref guard. Prerelease remains DEV-only. Maintenance remains ON throughout this sequence.

## Acceptance checklist for the future Implement/Test gates

- [ ] Settings control is owner/admin-only and reuses the existing callable/service.
- [ ] Preview is read-only, target identity is validated, and current count is search-only `nbHits`.
- [ ] Proposed settings are labeled proposed; no live-settings claim or admin secret exposure.
- [ ] APPLY is ephemeral-preview-gated, confirmation-gated, single-flight, and fail-closed.
- [ ] Portal and Studio use the shared eight-facet contract; no legacy tag authority.
- [ ] Studio stale “tags” copy is removed.
- [ ] Stable workflow/env writer explicitly bakes Smart Filters OFF/ON and rejects invalid values.
- [ ] Portal App Hosting mapping is Secret Manager-backed and BUILD + RUNTIME.
- [ ] Print Requests has no outer content-area scrollbar; corrected detail/rail ownership is
      covered by the updated contract and DEV owner QA.
- [ ] Production draft QA passes with Smart Filters hidden; Algolia APPLY/VERIFY/zero-diff passes.
- [ ] Final stable Studio release and post-reconcile Portal rollout each receive separate owner QA.
- [ ] Maintenance ON, autonomy OFF, Pass 2 OFF, and no unrelated production action throughout.

## Production boundary for this review

During this Plan/Formal Review turn:

- no Algolia callable or search request occurred;
- no Algolia settings read, clear, rebuild, or mutation occurred;
- no Firestore/Storage/Auth/settings/secrets mutation occurred;
- no Smart Filter flag changed;
- no Portal build, rollout, or publication occurred;
- no Studio build, release, or publication occurred;
- no Print Requests layout implementation or DEV/production UI QA occurred;
- no Functions/Rules deployment occurred;
- no Smart Profile/provider call or backfill occurred;
- maintenance remains ON; autonomy and Pass 2 remain OFF;
- no legacy-tag deletion, staging, commit, push, freeze, or production merge occurred.

## Review disposition and next checkpoint

**Disposition: `approved_with_changes`.** The required changes are the explicit Studio flag
injection, Portal production mapping, stale-copy correction, ephemeral APPLY safeguards, stable
version resolution, and the bounded Print Requests scroll-ownership correction described above.
These changes are directly tied to production readiness, remain route-scoped where applicable,
and do not reopen backend or product design.

Stop at:

Owner authorization is recorded as **`OWNER ACCEPT PRODUCTION ALGOLIA ACCESS + SMART FILTER +
PRINT REQUEST SCROLL FORMAL REVIEW / AUTHORIZE FINAL COMPANION AMENDMENT + SELF-REVIEW +
IMPLEMENT + TEST`**. The bounded implementation/Test gate is authorized; after independent
Implementation Review, stop at Owner DEV QA.

## Final bounded amendment review — Portal companion Add feedback and quantity

Owner direction authorizes one final bounded companion-design amendment under this existing review;
it does not create a new managed goal. Source tracing confirms the root cause: companion cards in
`CatalogMatchingDesignsSection` had no quantity/remove props, the details and suggestion modals did
not forward shared working-request quantities, and the prior non-announcing add callback trimmed or
dismissed optimistic companion state before the queued server quantity write had settled. This
explains missing Add success feedback, duplicate-tap exposure, and quantity divergence without
implicating companion eligibility, lifecycle ordering, or customer authorization.

Reviewed exact files are `CatalogMatchingDesignsSection.tsx`, `CatalogCompanionSuggestionModal.tsx`,
`CatalogDesignDetailsModal.tsx`, `CatalogHomePageContent.tsx`, `CatalogPageContent.tsx`,
`useAddDesignToRequestFlow.ts`, its focused `postAddSuggestion` contract test, and the existing
Portal catalog stylesheet. The amendment reuses `CatalogRequestQuantityControls`, the existing
`setQuantity`/`removeDesign` callbacks, and the existing callable/service flush. It adds only a
per-design pending/added feedback state and success callback after server settlement. The
companion remains visible and becomes quantity-editable; it is never auto-added, and no new backend
contract or collection write is introduced.

Adversarial self-review questions and required answers:

1. **False Added before persistence?** No; success is called only after the existing quantity
   flush/callable resolves, while failure clears the transient state and runs the existing sync.
2. **Duplicate Add/double click?** Per-design pending state plus the existing busy/generation
   guards reject duplicate in-flight actions; the shared absolute quantity write remains the
   source of truth.
3. **Existing quantity or divergence?** The current aggregate quantity map drives the stepper;
   increments/decrements/removes use the existing shared callbacks, not a companion-local counter.
4. **Create versus existing request?** Both branches route through the same service flush, with
   callbacks held until request creation and quantity persistence complete.
5. **Failure, stale state, remove/re-add?** Failure clears pending/added state and preserves the
   existing error/reload path; the mounted card can be removed and re-added through the same
   contract.
6. **Both surfaces and mobile?** Home suggestion, library suggestion, and Design Details all
   receive the same props; existing responsive grid and stepper styles remain bounded and are
   included in Owner DEV QA.
7. **Direct Firebase truth and lifecycle?** No client-local companion quantity is authoritative;
   the existing Firebase callable/service response and working-item sync remain the source of
   truth, and no lifecycle event/status/queue mutation is added by the companion feedback path.
8. **Scope/release sequence?** No Functions, Rules, data model, lifecycle, Algolia sequence,
   production setting, or release topology changes; it rides the already reviewed source and
   remains behind the existing owner-gated rollout.

Implementation-review residuals accepted without scope expansion: the existing scheduled
`reconcilePortalCatalogAlgoliaIndex` callable and separately opened Studio instances do not gain a
new distributed lock in this bounded UI correction, so the owner must ensure no scheduled/manual
reconcile overlap during the separately authorized APPLY. A search-only `nbHits` read failure is
intentionally fail-closed for Preview (the otherwise successful dry-run is not presented as an
APPLY-ready preview); no credential or live-settings data is exposed. These are operational and
failure-safety dispositions, not new production actions.

Formal Review disposition remains **`approved_with_changes`**. Focused Portal tests, Portal
typecheck, targeted lint, and the existing Studio/Workflow checks are required before Owner DEV QA.
No production action is authorized by this amendment.

The implementation authorization recorded in the owner checkpoint is now satisfied. After the
bounded implementation and Test gates, stop at the appropriate explicit Owner DEV QA checkpoint;
do not stage, commit, push, deploy, publish, or mutate production.

## Independent Implementation Review — 2026-09-13

An independent adversarial subagent reviewed the complete working-tree implementation and found no
blocking defect. Targeted contracts passed **25/25**; Portal typecheck, Studio TypeScript, targeted
ESLint, and `git diff --check` passed. The review confirmed owner/admin and callable authorization
parity, no secret exposure, exact production-target fail-closed behavior, route-scoped Print
Requests selectors, companion per-design duplicate protection, and server-settlement-gated success
callbacks.

Non-blocking operational residuals are accepted without scope expansion: the existing scheduled or
parallel Algolia callable has no new distributed lock in this UI-only amendment, so a later owner-
gated APPLY must avoid scheduler/manual overlap; Preview intentionally fails closed when the
search-only `nbHits` check fails; and runtime visual/race validation remains an Owner DEV QA duty.
The two adjacent CatalogPreviewLightbox contract failures and Portal production-build `.next/trace`
EPERM are existing baseline/environment limitations, not newly introduced failures.

The exact next checkpoint is **`OWNER DEV QA: PRODUCTION ALGOLIA ACCESS + SMART FILTER + PRINT
REQUEST SCROLL + PORTAL COMPANION CORRECTIVE — PASS`**. No production action is authorized by this
review.

## Owner DEV QA correction review — 2026-09-13

Owner DEV QA returned **`OWNER DEV QA — CORRECTIONS REQUIRED`**. The Algolia Settings DEV guard
passed (owner-visible control, `fresh-prints-dev` target, production-only Preview/Apply disabled,
fail-closed guard), and Smart Filters remained a regression PASS. Two bounded UI corrections were
implemented without reopening the completed Algolia, Smart Filter, or release-sequencing review.

### Print Requests all-status correction

Source tracing proves Customer and Internal Requests share one rail/main renderer; Customer exposes
Working, Editing, Queued, Printing, and Printed, while Internal omits Printing. Working and Editing
are the only editable, unqueued states and therefore render the taller item-card editor controls.
At narrow/stressed widths the existing route-scoped `grid-template-rows: minmax(0, 1fr)` rule had
higher specificity than the responsive stacked-row rule, allowing the implicit second row to grow
and leak scroll to the outer shell. The correction adds explicit route kind/tab attributes for
coverage, bounds the route main pane with `height`/`max-height: 100%`, and applies the responsive
`auto minmax(0, 1fr)` rule at matching specificity. The rail remains the intentional list scroller;
Show Queue retains its generic responsive rule.

### Companion visual/action correction

The established stepper's `minmax(3rem, 1fr)` center track exceeded compact companion-card widths,
distorting minus/value/plus alignment. A companion-scoped override reuses the shared stepper
classes with a zero-minimum center, balanced buttons, centered icons/text, and stretched input.
The suggestion footer now changes **Not now** to **Done** only after a matching companion reaches
confirmed `added` state from the server-settlement path. Pending or failed additions remain **Not
now**; removal/re-add does not oscillate the dismissal label.

Focused correction validation is **61/61 PASS** (including all Customer/Internal status scroll
contracts and companion success/failure/alignment coverage); Portal typecheck, Studio TypeScript,
Functions build, targeted ESLint, Studio renderer/Vite build, and `git diff --check` pass. Portal
production build remains blocked by the existing `.next/trace` EPERM environment issue. Fresh
independent Implementation Review is complete with no blocking defect; only runtime browser smoke
remains for Owner DEV QA. Production remains untouched; no deployment, publication, staging, commit,
or push occurred.

## Post-correction independent Implementation Review — 2026-09-13

The independent reviewer rechecked the post-QA-correction diff. Disposition: **no blocking
findings**. Targeted regression coverage passed **25/25** across companion modal/stepper, companion
hook/wiring, Print Requests counts, and scroll contracts; Portal typecheck, Studio TypeScript,
targeted ESLint, and `git diff --check` also passed. Review confirms the initial-mount `added`
state is honored for **Done**, pending/failure/removal paths remain safe, Customer/Internal status
scroll ownership is bounded, and Show Queue selectors are unchanged. The only residual is that
visual/runtime behavior remains a manual Owner DEV QA responsibility because the contracts are
source-level tests rather than mounted-browser smoke.
