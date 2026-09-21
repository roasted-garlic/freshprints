# Signoff: Portal admin sign-out redirect + Show Queue bottom padding

| Field | Value |
|-------|-------|
| Date | 2026-09-21 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-09-21-portal-admin-signout-redirect-and-queue-padding-plan.md |
| Review | docs/workflow/reviews/2026-09-21-portal-admin-signout-redirect-and-queue-padding-review.md |
| Test report | docs/workflow/reviews/2026-09-21-portal-admin-signout-redirect-and-queue-padding-test-report.md |
| Final status | **approved_with_notes** |

---

## Summary

Portal admin sign-out no longer sticks on “Redirecting to staff sign-in…” (hard navigation after logout + admin guest redirect). Admin Show Queue gets clear bottom padding via `.portal-admin-body` so the last card is not flush with the viewport.

---

## Changes Delivered

### Behavior

- `AuthProvider.logout` uses `window.location.assign('/login')` after Firebase sign-out.
- `PortalAdminAuthGate` guest redirect uses `window.location.replace(buildPortalAuthHref(...))`.
- Admin Show Queue / shell body bottom padding increased (incl. safe-area).

### Files Created

- `docs/workflow/plans/2026-09-21-portal-admin-signout-redirect-and-queue-padding-plan.md`
- `docs/workflow/reviews/2026-09-21-portal-admin-signout-redirect-and-queue-padding-review.md`
- `docs/workflow/reviews/2026-09-21-portal-admin-signout-redirect-and-queue-padding-test-report.md`
- `docs/workflow/reviews/2026-09-21-portal-admin-signout-redirect-and-queue-padding-signoff.md`

### Files Modified

- `apps/portal/features/admin-show-queue/components/PortalAdminAuthGate.tsx`
- `apps/portal/features/auth/context/AuthProvider.tsx`
- `apps/portal/styles/admin-show-queue.css`
- `apps/portal/features/admin-show-queue/adminShowQueue.contract.test.ts`
- `.cursor/workflow/state.md`

### Documentation Updated

- Workflow artifacts only for this goal.

---

## Tests

### Automated

- Admin Show Queue contract tests: **11/11 pass**
- Portal typecheck: **pass**

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Admin sign-out reaches Login (not stuck redirect) | PASS WITH NOTES (local DEV; prod smoke after rollout) | agent / owner rollout |
| Show Queue bottom spacing | PASS WITH NOTES (local CSS; prod visual confirm) | agent / owner |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | obtained | 2026-09-21 | Owner requested commit, push, merge, and rollout |
| Database migration | N/A | | |
| Design / UX | N/A | | Modest padding only |
| Business / policy | N/A | | |
| Secrets / env | N/A | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Hard nav full reload on logout | Low | Intended; reliable escape from admin layout |
| Prod visual padding preference | Low | Owner can request bump after smoke |

---

## Deferred Items (Roadmap)

- None required.

---

## Open Blockers

- [x] None

---

## Verdict

**approved_with_notes** — implementation complete; automated tests green; owner authorized production promotion and Portal App Hosting rollout. Production smoke of admin sign-out + queue bottom spacing after rollout.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [ ] `ROADMAP.md` updated (no roadmap item required)
- [ ] `RISK_REGISTER.md` updated if needed (N/A)
- [ ] **`references/project-chatgpt-handoff/CURRENT-STATE.md` updated** (handoff package not present)
- [ ] Other handoff files (N/A)

**Recommended next action for user:** After App Hosting traffic is live, smoke admin Show Queue sign-out and bottom spacing on production.
