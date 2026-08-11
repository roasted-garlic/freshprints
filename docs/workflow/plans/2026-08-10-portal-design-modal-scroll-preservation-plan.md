# Plan: Portal design-modal scroll position preservation (amendment)

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase / hotfix amendment |
| Parent goal | `prelaunch-catalog-search-count-and-first-visit-ux` |
| Related | docs/workflow/reviews/2026-08-10-portal-design-modal-scroll-preservation-plan-review.md |

---

## Goal

Preserve the user’s exact Portal catalog scroll position when a design-details modal is opened, interacted with (including Add to Current Request / quantity controls), or closed. Modal open/close must not jump the underlying page to the top.

---

## Background

Parent hotfix (PR #55 / `f558445…`) already syncs `designId` with `router.replace(..., { scroll: false })` and ignores `designId`-only churn for catalog filter/`q` state. Owner observed jump-to-top before final QA. Original App Hosting rollout for `f558445…` was **successfully created** and must not be cancelled; this amendment requires a **second** Portal rollout after merge. Studio 1.0.3 / final QA / Signoff / development sync remain paused.

---

## Root cause (verified, not guessed)

| Candidate | Verdict |
|-----------|---------|
| Missing `{ scroll: false }` on deep-link open/close | **Not the cause** — `useCatalogDesignDeepLink` already passes `{ scroll: false }` on open, close, and unavailable-id cleanup (Next.js 15 App Router) |
| `q` persistence wipe | **Not the cause of scroll jump** — CatalogPageContent already fingerprints params without `designId` before re-applying filters/`q` |
| Modal unmount remounting catalog | **Not primary** — selected design is local state; catalog list remains mounted |
| Add to Request product navigation | **Partial path** — default add/qty stays on catalog; `pick` branch calls `onBeforeNavigate` → `closeDesignDetails` (URL `designId` clear) before picker; no intentional scroll |
| `window.scrollTo(0, 0)` / body lock | **Primary cause** — `PortalScrollReset` in `PortalAppShell` runs `resetPortalScroll()` on **every** `pathname` **or** full `searchParams.toString()` change, including `designId` add/remove |

Evidence: `apps/portal/features/navigation/components/PortalScrollReset.tsx` deps `[pathname, search]` with unconditional `window.scrollTo(0, 0)` (+ main/content scrollports) on a rAF/timeout cascade.

Router API (repo check): Portal uses `next@^15.1.6`; App Router `router.replace(href, { scroll: false })` is already the correct no-scroll option. Native no-scroll is insufficient alone because `PortalScrollReset` forcibly resets after the search-string change.

---

## Scope

### In Scope
- Narrow fix so `designId`-only query changes do **not** trigger portal scroll reset
- Focused unit tests for the fingerprint / skip logic
- Regression: existing deep-link + `q` persistence tests still pass
- Plan/review/test/implementation-review docs; production amendment PR checkpoint
- Second Portal App Hosting rollout **after** merge (not this implement pass)

### Out of Scope
- Catalog search semantics, Studio search/counts, About modal
- Functions / Rules / indexes / Algolia mutate / DNS / cutover
- Current Request business rules / Print Request lifecycle
- Broad site-wide scroll restoration framework
- Cancelling or modifying the in-flight `f558445…` rollout
- Studio publish, final owner QA, Signoff, development sync (paused until amendment lands)

---

## Affected Areas

### Files / Modules (expected)
- `apps/portal/features/navigation/components/PortalScrollReset.tsx` (+ extracted pure helper / tests)
- Possibly tiny shared helper colocated under `features/navigation/` or reuse `PORTAL_DESIGN_DEEP_LINK_PARAM` from catalog utils
- Docs under `docs/workflow/plans|reviews/`

### Architecture Impact
- [x] None (behavior-only; shell scroll reset selectivity)
- [ ] Details:

### Security Impact
- [x] None

### Data Model Impact
- [x] None

### Backend Impact
- [x] None

### UI / UX Impact
- [x] Details: Catalog/discovery listings keep scroll across design modal cycles; intentional pathname / non-`designId` query navigations still reset to top (existing product behavior for filter/library URL changes)

### Migration Impact
- [x] None

---

## Approach

1. Extract a pure helper, e.g. `portalSearchFingerprintIgnoringDesignId(search: string): string`, deleting `PORTAL_DESIGN_DEEP_LINK_PARAM` (`designId`) before stringifying.
2. In `PortalScrollReset`, keep resetting when `pathname` changes **or** when the fingerprint (search without `designId`) changes. Skip reset when only `designId` appears/disappears/changes.
3. Do **not** add manual `window.scrollTo` restoration for modal cycles — stop the erroneous reset instead.
4. Do **not** change Add to Request product behavior; closing via `onBeforeNavigate` will stop jumping once scroll reset ignores `designId`-only churn.
5. Leave `useCatalogDesignDeepLink` `{ scroll: false }` in place (defense in depth).
6. Branch from **current** `origin/production` tip (today `f558445…` unless advanced); PR → `production`; second App Hosting rollout after merge.

### FreshForge impact classification
- Starter Surface: no
- Development Tooling: no
- Distribution/Installer: no
- Documentation: workflow artifacts only
- Development History: n/a (product app)

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Unit (new + existing deep-link / q persistence) | `npx tsx --test` focused Portal files | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Portal build | `npm run build:portal` | yes |
| Lint | `npm run lint` | yes |
| `git diff --check` | `git diff --check` | yes |

### Manual
- [x] Owner production QA scenarios A–F + scroll checklist (after second rollout + Studio publish resume)

---

## Human Checkpoints Anticipated
- [x] Production Portal App Hosting rollout #2 after amendment merge
- [x] Manual UI QA (scroll preservation) as part of parent goal QA
- [ ] Design approval
- [ ] Database migration
- [ ] Secrets / env vars

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Skipping reset for other query keys accidentally | Med | Fingerprint only strips `designId`; other catalog query changes still reset |
| Race with existing rAF/timeouts | Low | Skip entire effect body (no timers) when only designId changed |
| Interaction with `q` sync | Low | `q` changes still change fingerprint → reset remains (unchanged intentional filter/search URL behavior) |

---

## Rollback Plan

Revert the amendment commit/PR on `production` and redeploy App Hosting from prior tip. Does not affect Functions/Rules/indexes.

---

## Documentation Updates Required
- [ ] PROJECT_BRIEF / ARCHITECTURE / etc. — none for product docs
- [x] Workflow plan/review/test/implementation-review + prod PR checkpoint
- [x] Update `.cursor/workflow/state.md` + handoff CURRENT-STATE

---

## Open Questions
- [x] None (root cause verified)

---

## Approval
- Review doc: docs/workflow/reviews/2026-08-10-portal-design-modal-scroll-preservation-plan-review.md
- Verdict: pending
