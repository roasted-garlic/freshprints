# Review: Portal admin sign-out redirect + Show Queue bottom padding

| Field | Value |
|-------|-------|
| Date | 2026-09-21 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-09-21-portal-admin-signout-redirect-and-queue-padding-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

The plan correctly diagnoses a soft-navigation race: after admin sign-out, `PortalAdminAuthGate` can remain painted on “Redirecting to staff sign-in…” while `router.replace` never leaves the `(admin)` layout. Hard navigation on guest redirect and post-logout landing is the right fix. Show Queue bottom padding is a narrow CSS change. Approved with binding implement constraints below.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Auth nav + CSS padding only |
| Architecture alignment | pass | Client UX gate; no layer bypass into services |
| Security impact addressed | pass | Same-origin `/login` via existing returnTo helpers |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | None |
| Test strategy adequate | pass | Contract test + manual sign-out |
| Human checkpoints identified | pass | Manual DEV QA; no prod deploy in phase |
| Roadmap alignment | pass | Bugfix / polish |
| Documentation plan | pass | Workflow artifacts sufficient |
| No silent scope expansion | pass | |

---

## Architecture Review

**Findings:**
- Hard `window.location` navigation is appropriate at auth boundaries when App Router soft nav leaves gate UI stuck.
- Prefer keeping `returnTo` construction on `buildPortalAuthHref` (do not hand-build query strings).

**Required changes:**
- [x] In `PortalAdminAuthGate`, remove unused `useRouter` if hard nav replaces all `router.replace` calls in that effect.
- [x] Do not change customer `(app)` `AuthGate` guest-browse behavior in this phase.

---

## Security Review

**Findings:**
- Redirect targets remain validated same-origin login paths.
- Hard nav does not weaken rules or expose admin data; unauthenticated gate already withholds children.

**Required changes:**
- [x] None beyond using existing `buildPortalAuthHref` / safe returnTo.

**Human approval needed before production:**
- [x] None for implementation; production Portal deploy remains a separate owner gate if requested later.

---

## Data Model Review

**Findings:**
- None.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- None.

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Contract test must assert hard navigation intent (`location.replace` / `assign`), not only soft `router.replace`.
- Manual sign-out on Show Queue (and preferably Staff Artwork) is required before signoff.

**Required changes:**
- [x] Run scoped portal contract/unit tests for touched files; record exact commands.

---

## Documentation Review

**Findings:**
- Workflow plan/review/test/signoff enough; optional ARCHITECTURE one-liner not required.

---

## Required Changes (if approved_with_changes)

1. Admin guest redirect: `window.location.replace(buildPortalAuthHref(...))` with existing pathname → returnTo mapping; drop unused router import if applicable.
2. Logout success path: `window.location.assign('/login')` (or `replace`) after successful Firebase sign-out; keep catch-path state updates.
3. CSS: increase `.portal-admin-queue` bottom padding only (leave upload card padding alone unless shared).
4. Update `adminShowQueue.contract.test.ts` assertions to match hard-nav approach.

---

## Blockers (if blocked)

_(none)_

---

## Verdict Rationale

Narrow, reversible, correctly scoped. Soft-nav race explanation matches observed UI. Binding changes lock implement details without expanding scope.

---

## Next Step

Implement approved scope with the required changes list.
