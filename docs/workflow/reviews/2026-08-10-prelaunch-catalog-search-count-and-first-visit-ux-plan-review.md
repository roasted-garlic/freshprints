# Review: Prelaunch catalog search, counts, and first-visit UX (plan)

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Reviewer | Review Agent (independent Formal Review) |
| Plan | docs/workflow/plans/2026-08-10-prelaunch-catalog-search-count-and-first-visit-ux-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

Independent repo verification confirms the plan’s root causes, file paths, git ancestry, Hotfix branch strategy, and preferred no-Functions / no-Rules / no-index-mutation approach. Query-time Algolia `typoTolerance: false` + `queryType: 'prefixNone'` are sufficient for the Kill vs Will/Willie defect without production index settings changes. Implementation may proceed only if the required changes below are followed — notably Studio hydrate/count labeling precision and containment against `loadAll` / snapshot regression.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Domain cutover, reconcile, Functions/Rules/indexes, snapshot publishers explicitly out of scope |
| Architecture alignment | pass | Component → Hook → Service preserved; Algolia disposable; Firestore SoT; hydrate-by-id |
| Security impact addressed | pass | Search-only keys only; fail-open localStorage; no Rules relaxation; admin key never client |
| Data model impact addressed | pass | No Firestore preference schema; browser-local dismiss only |
| Backend impact addressed | pass | Preferred solution needs no Functions/Rules/index mutation; Studio search-only env only |
| Test strategy adequate | pass | Focused unit + typecheck + lint + builds; production QA checklist prepared |
| Human checkpoints identified | pass | Prod Portal/Studio rollout + owner QA; index mutation only if QA fails |
| Roadmap alignment | pass | Prelaunch hardening / hotfix-style; no silent scope expansion into cutover |
| Documentation plan | pass | BACKEND/env notes; optional ADR; TESTING only if commands change |
| No silent scope expansion | pass | Chris Corner parked; cutover forbidden |

---

## Independent verification (plan claims vs repo)

| # | Claim | Verdict | Evidence |
|---|-------|---------|----------|
| 1 | No eager full-catalog hydration | **Confirmed (approach)** | Studio Design Library uses `useDesigns` without `loadAll`; containment test forbids `loadAll: true`. Plan B fails closed (no silent `loadAll`) when Algolia env missing. |
| 2 | No Algolia admin key / client security issue | **Confirmed (plan)** | Portal uses `NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY` only (`portalAlgoliaCatalogFlags.ts`). Admin key is Functions/Secret Manager. Plan requires Studio search-only env only. |
| 3 | No generated snapshot architecture reintroduced | **Confirmed** | Plan out-of-scope; Design Library comments/tests already reject generated catalog path. Approach is Algolia IDs → Firestore hydrate. |
| 4 | Exact search via query-time params | **Confirmed sufficient for preferred fix** | Current `listMatchingDesigns` sends no typo/prefix overrides. Algolia docs: `typoTolerance: false` and `queryType: 'prefixNone'` are valid search params (override index defaults). Index mutation not required unless owner QA fails. |
| 5 | Count sources complete (not page length) | **Confirmed sources exist; Portal likely already correct** | Studio: `countDesigns` + 15s cache exists, Design Library uses `filteredDesigns.length`. Portal: `resolveOrdinaryMatchingCount` / `countReadyDesigns`; managed path uses `nbHits`. Page size 40 (not 85). Plan D correctly requires verify-before-fake-fix. |
| 6 | First-visit storage fail-open | **Confirmed pattern** | `artworkQualityModalSnooze.ts` try/catch fail-open; plan mirrors it. |
| 7 | Branch/release = DEPLOYMENT.md Hotfix | **Confirmed** | DEPLOYMENT.md § Hotfix: branch from production → merge production → deploy → merge development → delete branch. Plan correctly uses **`origin/production` tip** (local `production` is behind). |
| 8 | No domain cutover bundled | **Confirmed** | Explicit out-of-scope + human checkpoint unchecked. |
| 9 | Exact file paths exist | **Pass with note** | All cited Portal/Studio paths exist. **`getDesignsByIds` does not exist today** — only `getDesignById`; Portal has `getReadyDesignsByIds`. Plan’s “hydrate helper” must be **added**, not wired as existing. |
| 10 | Studio Algolia approach + dependency ack | **Sound** | Same disposable index + search-only key; page of objectIDs → hydrate; `algoliasearch` `^5.x` acknowledged (Portal `^5.56.0`; Studio has no package yet). |
| 11 | Backend/Rules/index mutation necessary? | **No for preferred solution** | Query-time params + client/env wiring only. Index settings / Functions / Rules only if QA proves params insufficient → stop + amend + human checkpoint. |

### Git ancestry (read-only, verified 2026-08-10)

| Ref | Plan SHA | Verified |
|-----|----------|----------|
| `HEAD` / `origin/development` | `cd331085…` | Match |
| `origin/production` | `b6e67be1…` | Match |
| Local `production` | `8cc014fb…` (behind origin by 5) | Match (`0 5` left-right) |
| Merge-base(`origin/production`, `origin/development`) | `3fabbf67…` | Match |
| Neither tip ancestor of the other | claimed | Confirmed (`merge-base --is-ancestor` fails both ways) |
| `origin/development` 1 commit ahead of merge-base | claimed | Confirmed (`cd33108` workflow signoff only) |

---

## Architecture Review

**Findings:**
- Studio ready-catalog text search via Algolia + ordered Firestore hydrate is the right layering and avoids full-collection scan / generated snapshot revival.
- Ordinary browse remaining Firestore cursor pagination (`DEFAULT_LIST_LIMIT = 100`) is correct.
- `needsCompanion` post-hydrate filter limitation is honestly documented; do not expand into full Firestore scan to “fill” the grid.
- Optional shared exact-match params helper under `packages/shared/src/catalog-search/` is justified (Portal record helpers already live there).
- Gap: Approach A’s count chip can mislabel **client-only** category/tag/needsCompanion filters (still page-local) if implementers always show unfiltered `libraryTotal` as the chip total.

**Required changes:**
- [x] See Required Changes §1–2 below (hydrate helper + count label semantics).

---

## Security Review

**Findings:**
- Preferred path introduces no new public sensitive endpoints and no Rules changes.
- Studio must bake **search-only** Algolia credentials into renderer/`VITE_*` env (same public-key threat model as Portal `NEXT_PUBLIC_*`). Never ship or import admin key / Secret Manager material into Studio.
- About modal localStorage fail-open is acceptable (preference best-effort).
- Managed search fail-closed when Algolia env missing (no silent `loadAll`) is required for security/cost containment.

**Required changes:**
- [x] Document and implement Studio env as search-only only; fail closed for managed search without env (Required Change §3).

**Human approval needed before production:**
- [x] Production Portal App Hosting + Studio packaged release (already in plan)
- [ ] Algolia **index settings** mutation — only if query-time QA fails (stop; not in preferred path)
- [ ] Domain cutover — not this phase

---

## Data Model Review

**Findings:**
- No Firestore schema / preference docs — correct for dismiss/snooze.
- No status/index/migration impact for preferred path.

**Required changes:**
- [ ] None

---

## Backend Review

**Findings:**
- `functions/src/algolia/algoliaAdminClient.ts` sets searchable attrs + customRanking only — no typo/prefix overrides today; client query params override defaults without `setSettings`.
- Prefer **no** Functions, Rules, indexes, or Algolia reconcile in this phase.
- Studio `.env.example` currently has Firebase Vite vars only — Algolia search-only vars must be added and documented in BACKEND/DEPLOYMENT notes.

**Required changes:**
- [x] No backend mutation in preferred implementation; if QA fails exactness, amend plan before index settings (Required Change §4).

---

## Testing Review

**Findings:**
- Focused unit tests for Algolia params (`Kill`/`Will`/`Willie`), URL `q` persistence, About snooze, Studio count/search containment are adequate.
- Existing `designLibraryAuthoritativeSource.test.ts` must remain green (no `loadAll`, no generated catalog).
- Production QA checklist is appropriate; Plan/Review must not run prod mutations.

**Required changes:**
- [x] Keep/extend Design Library containment tests as a hard gate (Required Change §5).

---

## Documentation Review

**Findings:**
- BACKEND/env notes for Studio `VITE_ALGOLIA_*` (search-only) are required.
- Optional ADR for exact-token semantics + Studio Algolia reuse is useful but not blocking if plan comments + BACKEND notes capture behavior.
- Help CMS/copy unchanged except reuse of existing `PORTAL_HELP_ABOUT_*` constants — correct.

---

## Required Changes (if approved_with_changes)

Implementers **MUST** follow these; no plan rewrite required if they are treated as binding amendments:

1. **Studio hydrate helper is new** — `designService.getDesignsByIds` does **not** exist. Add an ordered batch hydrate (getDocs/`getDesignById` batch equivalent) that preserves Algolia hit order and omits unauthorized/missing docs. Do **not** implement via `loadAll: true` or full-collection scan.

2. **Count chip labeling with client-only filters** — Unfiltered ready/archived browse: show `countDesigns` aggregate. Active Algolia text search: show `nbHits` as results. When category/tags/needsCompanion filter the **loaded page client-side** without a managed Algolia query, do **not** present unfiltered `libraryTotal` as if it were the filtered result count — use distinct wording (or suppress “complete filtered total”) so the chip cannot lie.

3. **Studio Algolia credentials** — Use search-only keys only (`VITE_ALGOLIA_*` mirroring Portal search-only trio + optional kill-switch). Same env index as Portal for that Firebase project. Fail closed with clear UI if missing. Never admin key.

4. **Portal exactness params on all text-query Algolia calls** — Apply `typoTolerance: false` and `queryType: 'prefixNone'` to both `listMatchingDesigns` and `buildPortalAlgoliaFacetSearchParams` whenever a non-empty query is sent, so facet distributions cannot diverge from result exactness. Do **not** mutate production index settings unless owner QA fails these params — then stop for human checkpoint + plan amendment.

5. **Containment gates** — Preserve Design Library “no `loadAll` / no generated snapshot / no new unbounded listener” tests; add assertions that managed search fails closed without Algolia config.

6. **Hotfix branch base** — Cut hotfix from **`origin/production` tip** (`b6e67be…`), not stale local `production` (`8cc014f…`). Sync into `development` after production merge; no force-push.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

**approved_with_changes** — Core approach is independently verified sound: no eager hydrate regression, no admin-key exposure in the preferred design, no snapshot revival, query-time Algolia params adequate for Kill/Will/Willie, aggregate/`nbHits` count sources real, fail-open modal storage safe, Hotfix flow matches DEPLOYMENT.md, domain cutover not bundled, and **no backend/Rules/Algolia index mutation is necessary** for the preferred solution. Binding implementer clarifications are required around the missing Studio batch hydrate API, count-label honesty under client-only filters, search-only env discipline, facet+list param parity, and containment tests.

---

## Unresolved owner decisions (non-blocking)

- Portal production ready membership truly ≈85 vs inventory mismatch (verify in Plan D; do not invent a new count backend).
- Archived Design Library search remaining page-local — acceptable for this phase per plan default.
- Multi-word = Algolia AND of exact tokens — acceptable per plan default unless owner objects in QA.

---

## Next Step

Implementation Agent may start **after** workflow state records this verdict — implement approved scope **plus** Required Changes §1–6 only. No Functions/Rules/indexes/Algolia setSettings/reconcile/domain cutover.
