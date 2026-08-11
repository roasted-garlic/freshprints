# Review: Portal design-modal scroll position preservation (plan)

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-08-10-portal-design-modal-scroll-preservation-plan.md |
| Verdict | **approved** |

---

## Summary

Independent inspection confirms the jump-to-top is caused by `PortalScrollReset` reacting to full `searchParams` string changes when `designId` is added/removed, despite deep-link navigation already using Next.js 15 `{ scroll: false }`. The proposed narrow fingerprint fix is correct, in scope, and preferable to manual scroll restoration.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Portal shell scroll selectivity only; Studio/About/Algolia/Functions out |
| Architecture alignment | pass | No new router framework; reuse existing deep-link + shell patterns |
| Security impact addressed | pass | None |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | None |
| Test strategy adequate | pass | Pure helper unit tests + existing catalog tests + portal build/typecheck/lint |
| Human checkpoints identified | pass | Second App Hosting rollout + owner scroll QA; Studio still paused |
| Roadmap alignment | pass | Amendment to active prelaunch UX goal |
| Documentation plan | pass | Workflow artifacts only |
| No silent scope expansion | pass | Explicit pause of Studio/QA/Signoff/dev-sync |

---

## Independent verification

| Claim | Verdict | Evidence |
|-------|---------|----------|
| Deep link already uses `{ scroll: false }` | Confirmed | `useCatalogDesignDeepLink.ts` open/close/unavailable paths |
| Catalog ignores designId-only for filter/`q` | Confirmed | `CatalogPageContent.tsx` `libraryParamsWithoutDesignId` fingerprint |
| PortalScrollReset resets on any search change | Confirmed | deps `[pathname, search]`; unconditional `resetPortalScroll` |
| Next.js 15 supports scroll:false | Confirmed | `apps/portal/package.json` `next@^15.1.6`; Assisted Creation already uses same API |
| Add-to-request does not need product change | Confirmed | Qty/add stays on catalog; pick path closes modal via `onBeforeNavigate` |

---

## Architecture Review

**Findings:**
- Prefer stopping erroneous reset over capturing/restoring scroll.
- Import or mirror `PORTAL_DESIGN_DEEP_LINK_PARAM` rather than a magic string drift risk.

**Required changes:**
- [ ] None (prefer constant import noted as implement guidance, not a re-review gate)

---

## Security Review

**Findings:** None.

**Required changes:**
- [ ] None

**Human approval needed before production:**
- [ ] App Hosting rollout #2 after merge (owner phrase as before)

---

## Data Model / Backend Review

**Findings:** None.

**Required changes:**
- [ ] None

---

## Testing Review

**Findings:**
- Pure fingerprint helper is the right unit-test seam.
- Must keep existing `CatalogPageContent.searchPersistence` and deep-link containment tests green.

**Required changes:**
- [ ] None

---

## Required Changes (if approved_with_changes)
None.

---

## Blockers
None.

---

## Verdict Rationale

Root cause is verified in source; fix is the narrowest correct change; scopes and pause gates are explicit. Implementation may proceed.

---

## Next Step

Implement on hotfix branch from current `origin/production` tip → Test → Independent Implementation Review → production PR checkpoint.
