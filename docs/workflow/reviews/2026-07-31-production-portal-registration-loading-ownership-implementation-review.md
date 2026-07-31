# Implementation Review: Portal registration loading-ownership fix

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Reviewer | Review Agent (independent of Implementation Agent) |
| Plan | `docs/workflow/plans/2026-07-31-production-portal-registration-post-rollout-amendment.md` |
| Formal Review | `docs/workflow/reviews/2026-07-31-production-portal-registration-post-rollout-amendment-review.md` (**approved**) |
| Verdict | **approved** |

---

## Summary

Final runtime diff matches the approved amendment: Google → `missing-profile` /
`missing-customer` no longer keeps `isAuthActionLoading` sticky; complete-profile provision
overlay is gated solely by local `isSubmitting`; timeout/failure restores interactive bootstrap
and clears locks; composed regression tests encode the production FAIL. No Functions, Rules,
Auth Console, branding, or data changes. Stop before production merge / App Hosting rollout.

---

## Diff scope checked

| Path | Assessment |
|------|------------|
| `AuthProvider.tsx` | Sticky keep-busy on missing-* removed; registration listener no longer forces `loading-profile`; provision catch restores bootstrap + clears loading; success clears loading |
| `CompleteProfileForm.tsx` | Uses ownership helpers; overlay only when provisioning; sign-out in overlay footer |
| `AuthBusyOverlay.tsx` | Optional footer for escape actions |
| `globals.css` | Footer layout only |
| `completeProfileLoadingOwnership.ts` (+ test) | Pure ownership + composed FAIL regression |
| Unrelated Firebase / branding / Studio | **Not** in this diff |

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Matches amendment | pass | Loading ownership + overlay + cleanup + tests |
| Timeout coverage unchanged/wrapped | pass | Still full IIFE via `withCompleteProfileTimeout` |
| Terminal error / Retry / sign-out | pass | Form interactive on failure; overlay footer escape |
| Locks/refs | pass | `registrationInProgressRef` + `submitLockRef` in finally |
| Composed regression | pass | 27 auth-focused tests green |
| No Firebase config/data | pass | Docs + Portal client only |
| No Auth user delete | pass | None |
| No deployment | pass | Stop for rollout phrase |

---

## Required changes before rollout

- [ ] None for implementation approval
- [ ] Owner: `APPROVE PRODUCTION PORTAL APP HOSTING ROLLOUT: LOADING-OWNERSHIP FIX`
- [ ] Then PR to `production` + explicit App Hosting rollout (automatic rollouts stay disabled)

---

## Verdict

**approved** — proceed to human App Hosting rollout checkpoint only after owner phrase.
