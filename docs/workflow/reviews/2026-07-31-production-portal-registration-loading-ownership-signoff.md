# Signoff: Portal registration loading-ownership fix (production)

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-07-31-production-portal-registration-post-rollout-amendment.md` |
| Review | Implementation Review approved |
| Test report | `docs/workflow/reviews/2026-07-31-production-portal-registration-loading-ownership-test-report.md` |
| Rollout checkpoint | `docs/workflow/reviews/2026-07-31-production-portal-registration-loading-ownership-app-hosting-rollout-checkpoint.md` |
| Final status | **approved_with_notes** |

---

## Summary

Production Portal Google registration blocker is cleared. Loading-ownership fix (`7a88e6b` /
PR #13 / App Hosting `58aa0da`) restores an interactive complete-profile form, successful
`registerCustomer` provisioning, and normal Portal load. Owner QA: **PASS WITH NOTES**.

This closes the registration-incident remediation slice under Goal #13. Goal #13
`production-release` continues (branding / Stage 2 / domain cutover still sequenced separately).

---

## Changes Delivered

### Behavior

- Google → `missing-profile` / `missing-customer` no longer traps behind sticky
  `isAuthActionLoading` provision overlay
- Provision overlay + 45s timeout only after Continue
- Terminal error / Retry / sign-out recovery paths usable

### Production

- PR #13 → `58aa0da`
- App Hosting rollout pinned to `58aa0da` (automatic rollouts remain disabled)

---

## Tests

### Automated

- Portal auth-focused: 27/27; typecheck / lint / build:portal passed pre-implement and pre-rollout

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Hosted.app Google complete-profile registration | **PASS WITH NOTES** | owner |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| `APPROVE PORTAL REGISTRATION LOADING-OWNERSHIP FIX IMPLEMENTATION` | obtained | 2026-07-31 | |
| `APPROVE PRODUCTION PORTAL APP HOSTING ROLLOUT: LOADING-OWNERSHIP FIX` | obtained | 2026-07-31 | |
| Owner hosted.app QA | PASS WITH NOTES | 2026-07-31 | See notes below |

---

## Owner QA notes (non-blocking)

1. **Username HTML `pattern` invalid regex** —
   `[a-z0-9][a-z0-9_-]{1,30}[a-z0-9]` reported by browser as invalid character class.
   Registration still succeeded; native pattern validation may be disabled. Narrow follow-up
   (also on `RegisterForm`). Tracked as tech debt.
2. **Asynchronous-listener console message** — consistent with browser-extension noise; no
   Portal failure.
3. **COOP `window.closed`** — still present during Google popup; Auth + provisioning succeeded;
   not root cause / not blocking.

---

## Risks / follow-ups

| Item | Priority | Notes |
|------|----------|-------|
| Fix HTML username `pattern` attribute | low | `CompleteProfileForm` + `RegisterForm` |
| COOP / popup Auth polish | deferred | Non-blocking; optional redirect path later |
| Branding / Stage 2 / domain cutover | next Goal #13 slices | Unblocked by this PASS WITH NOTES |

---

## Final status

**approved_with_notes** — registration remediation closed; Goal #13 continues.
