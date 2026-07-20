# Test report: Portal auth busy feedback gaps

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Plan | docs/workflow/plans/2026-07-18-portal-auth-busy-feedback-gap-plan.md |
| Result | **passed_with_notes** (automated); owner manual QA pending |

## Automated

| Check | Command | Result |
|-------|---------|--------|
| Typecheck | `npm run typecheck` in `apps/portal` | pass (exit 0) |
| ESLint (scoped) | auth form / AuthProvider files | pass (exit 0) |

## Soft-reload

- Stopped prior process on port 3100
- `npm run dev:portal` → Ready at http://localhost:3100
- No Functions deploy

## Manual (owner)

1. `/login` → Continue with Google → expect full-screen **Signing you in…** until home or complete-profile; cancel popup → overlay clears.
2. `/login` email sign-in → expect same overlay through Auth + profile load.
3. `/register` email → ack modal → confirm → expect **Creating your account…** immediately (no idle form).
4. `/register` Google → overlay through redirect to complete-profile; finish username + ack → **Setting up your account…**.

Reply: `PASS` / `FAIL: …` / `PASS WITH NOTES: …`
