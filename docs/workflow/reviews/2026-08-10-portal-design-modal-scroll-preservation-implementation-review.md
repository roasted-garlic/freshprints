# Implementation Review: Portal design-modal scroll position preservation

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Reviewer | Review Agent (independent, post-implement) |
| Plan | docs/workflow/plans/2026-08-10-portal-design-modal-scroll-preservation-plan.md |
| Diff basis | Working tree on `hotfix/portal-design-modal-scroll-preservation` vs `f5584451…` |
| Verdict | **approved** |

---

## Summary

Final diff matches the approved plan: scroll jump is stopped by ignoring `designId`-only search changes in `PortalScrollReset`, without manual `scrollTo` restoration and without changing Add-to-Request product behavior. Existing `{ scroll: false }` deep-link and `q` persistence paths remain intact.

---

## Diff review checklist

| Concern | Verdict | Notes |
|---------|---------|-------|
| Accidental global scroll behavior | pass | Pathname / non-designId query changes still reset |
| Next.js routing misuse | pass | No new router calls; deep-link still `scroll: false` |
| Scroll restoration races | pass | Skip returns before scheduling rAF/timeouts |
| Interaction with `q` persistence | pass | Fingerprint keeps `q`/filters; only strips `designId` |
| Interaction with filters | pass | Category/tag/`q` changes still differ in fingerprint → reset |
| Add to Request regressions | pass | No flow changes; close-via-`onBeforeNavigate` no longer jumps |
| Unnecessary catalog rehydration | pass | No catalog data hooks touched |
| Mobile / a11y focus | pass | No focus/scroll-lock changes; shell reset selectivity only |
| Constant drift | pass | Uses `PORTAL_DESIGN_DEEP_LINK_PARAM` |

---

## Files reviewed

- `apps/portal/features/navigation/utils/portalScrollResetFingerprint.ts`
- `apps/portal/features/navigation/utils/portalScrollResetFingerprint.test.ts`
- `apps/portal/features/navigation/components/PortalScrollReset.tsx`
- `apps/portal/features/navigation/components/PortalScrollReset.containment.test.ts`

---

## Required corrections

None.

---

## Next step

Prepare production PR → owner merge → **second** Portal App Hosting rollout from new tip → then resume Studio 1.0.3 / owner QA.
