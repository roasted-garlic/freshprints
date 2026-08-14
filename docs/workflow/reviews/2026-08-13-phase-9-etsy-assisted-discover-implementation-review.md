# Implementation Review: Phase 9 Etsy+Assisted + Discover remediation

| Field | Value |
|-------|-------|
| Date | 2026-08-13 |
| Reviewer | Implementation / Review Agent |
| Goal | `phase-9-custom-request-results-and-routing-remediation` |
| Plan | `docs/workflow/plans/2026-08-13-phase-9-etsy-assisted-discover-remediation-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-08-13-phase-9-etsy-assisted-discover-remediation-review.md` |
| Base SHA | `975f6400262a86600c4662f39480c6f55e20b0c1` |
| Branch | `fix/phase9-results-and-discover-remediation` |
| Verdict | **approved** — local implement + automated tests complete; **STOP before DEV deploy** |

---

## Scope check

| Binding Formal Review item | Status |
|----------------------------|--------|
| Etsy Mark as satisfied → existing complete → `completed` | Done |
| Cancel separate / quieter → `cancelled` | Done |
| No Mark as satisfied on Assisted | Done (untouched) |
| Preserve Assisted drawer / proof / cancel | Done |
| Preserve `/requests/artwork` | Done |
| No legacy monolith recreation | Done |
| Discover pool selection + hydrate | Done |
| Rail limit 25 / max 3 | Done |
| No HOME_DISCOVERY_POOL_PAGE_SIZE-only fix | Done |
| Recent / Most Liked explicit eligibility | Done |
| Popular / NTW preserved | Done |
| hasMore authoritative | Done |
| No Functions change | Done |
| No index/Rules/Algolia change | Done |

---

## Workstream A summary

- Lifecycle notice on Etsy results when a request id is present.
- Primary **Mark as satisfied** → `etsyRecommendationService.completeRequest` → `completeEtsyRecommendationRequest`.
- Quiet footer **Cancel this search** (confirm) → `cancelRequest`.
- After either action → return to choose-path hub (`goToChoose({ clearDraft: true })`).
- Purchase → artwork upload path unchanged.

## Workstream B summary

- `buildServerListQuery` sets `minFavoriteCount: 1` (Most Liked) and `requireLastAddedToShowAt: true` (Recent).
- `buildDesignFilterConstraints` + `countReadyDesigns` apply matching inequalities; count adds matching `orderBy`.
- Membership repair preserves eligibility flags.
- Home: `selectTopPopularCategoryRails` on pool, then ≤3 category hydrates via `listReadyDesignsPageWithSortFallback` (`createdAt`, limit 25).
- Cold add cost: ≤3 queries / ≤78 docs.

---

## Tests / verification (local)

| Check | Result |
|-------|--------|
| Focused `npx tsx --test` (catalog + Etsy + ranking) | **88 pass / 0 fail** |
| Portal `npm run typecheck` | **PASS** (exit 0) |
| Scoped eslint on changed portal files | **PASS** (exit 0) |
| `git diff --check` | **PASS** (exit 0) |
| Functions build | **Skipped** (Functions not modified) |

---

## Deploy impact

| Artifact | Impact |
|----------|--------|
| Portal | Code change — local/DEV validation next |
| Functions | **None** |
| Firestore indexes | **None** (existing composites; no file change) |
| Rules | **None** |
| Algolia | **None** |
| Studio drafts | **None** |

---

## Human checkpoint (next)

1. Owner authorizes **Portal DEV validation / App Hosting DEV deploy** if remote QA needed (optional for local-only smoke).
2. Owner Portal manual QA (Etsy lifecycle + Discover rails/counts).
3. Production promotion later — not authorized now.

**STOP — no DEV/production deploy from this step.**
