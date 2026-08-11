# Plan: Discover complete-library search placeholder count (amendment)

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase / hotfix amendment (same branch) |
| Parent goal | `prelaunch-catalog-search-count-and-first-visit-ux` |
| Sibling amendment | Portal design-modal scroll preservation (already on branch) |
| Branch | `hotfix/portal-design-modal-scroll-preservation` @ `fbc3733…` |
| Related | docs/workflow/reviews/2026-08-10-discover-complete-library-search-placeholder-count-plan-review.md |

---

## Goal

Discover’s search placeholder must show the **complete eligible ready Design Library count**, not the size of the bounded Discover home rail pool (~85).

---

## Root cause (verified)

| Step | Finding |
|------|---------|
| `CatalogHomePageContent` | `readyDesignCount = designs.length \|\| null` feeds the placeholder |
| `useCatalogHomeDesigns` | Loads only `catalogService.listHomeDiscoveryPool()` |
| `listHomeDiscoveryPool` | Intentionally **bounded** — merges preferred sort pages of size `HOME_DISCOVERY_POOL_PAGE_SIZE` (80) for rail ranking/fill; not full membership |
| Why ~85 | Unique merge of bounded preferred pools (plus optional base-ready fill capped for rails) ≈ hydrated home set; **not** library census |
| Authoritative count | `catalogService.countReadyDesigns({})` via Firestore `getCountFromServer` — already used by `useCatalogDesigns` ordinary path (`fetchReadyDesignCountWithRetry` + count authority). Home pool **already calls** `countReadyDesigns({})` internally for fill decisions but **does not return** it to the UI |

Discover home pool (A) and complete ready membership (B) are separate. Defect = displaying A as B.

---

## Scope

### In Scope
- Discover placeholder count authority on same hotfix branch
- Reuse `countReadyDesigns` / `fetchReadyDesignCountWithRetry` (no new backend)
- Focused tests; update combined prod PR checkpoint
- Preserve scroll-preservation changes untouched unless integration requires

### Out of Scope
- Expanding Discover hydration / rails / ranking
- Browse All / library badge logic changes (already aggregate-backed)
- Algolia as membership source; Functions/Rules/indexes; Studio; merge/deploy

---

## Affected Areas

### Files / Modules (expected)
- `CatalogHomePageContent.tsx` — stop using `designs.length` for placeholder
- `useCatalogDesigns.ts` (`useCatalogHomeDesigns` and/or small colocated helper) — expose independent ready-library count
- Pure placeholder helper + tests (prefer next to existing catalog tests)
- Update containment test J if home hook gains aggregate count for placeholder only
- Workflow plan/review/test/impl-review/checkpoint updates

### Architecture / Security / Data / Backend
- [x] None beyond Portal client aggregate count read (existing pattern)
- UI: Discover placeholder only

---

## Approach

1. Keep `listHomeDiscoveryPool` / rail memos unchanged.
2. Load complete ready count independently with `fetchReadyDesignCountWithRetry(() => catalogService.countReadyDesigns({}))` (parallel to home pool load inside `useCatalogHomeDesigns` **or** a tiny dedicated hook — prefer extending `useCatalogHomeDesigns` return shape so Discover has one catalog home data entry).
3. Placeholder uses resolved aggregate only; pending/failed → existing neutral `'title, tag or description'` (never `designs.length`).
4. Extract `buildDiscoverSearchPlaceholder(count: number | null): string` for singular/`toLocaleString` coverage.
5. Do not return pool length as total; do not hydrate all designs to count.

---

## Test Strategy

| Check | Required |
|-------|----------|
| Focused Discover placeholder + home count tests | yes |
| Scroll-preservation focused tests (rerun) | yes |
| Portal typecheck, lint, `build:portal`, `git diff --check` | yes |

Manual owner QA after later combined rollout (not this pass).

---

## Human Checkpoints Anticipated
- [x] Production merge + second App Hosting rollout (after combined hotfix ready — not this pass)
- [ ] Studio / Signoff / development sync — still paused

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Extra aggregate read on Discover | One `getCountFromServer` (same as library); pool already does one internally — acceptable; avoid coupling UI to pool cache return type this pass unless trivial |
| Misleading fallback | Explicit null on pending/fail; never designs.length |
| Containment test J breakage | Update test to allow placeholder count while asserting rails still use `listHomeDiscoveryPool` |

---

## Rollback Plan

Revert the Discover-count commit(s) on the hotfix branch / PR.

---

## Open Questions
- [x] None — owner requirement is explicit

---

## Approval
- Verdict: pending
