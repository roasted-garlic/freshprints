# Review: Invite / Password-Reset Continue URL — Stop Localhost Redirects

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-17-invite-password-continue-url-localhost-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

Root cause and fix are clear and narrowly scoped: Portal invite password-reset continue URLs incorrectly use `PORTAL_BASE_URL` (default / deploy env `http://localhost:3000`) instead of the existing fail-closed project map used by proof emails. Approving implementation with the required changes below. Functions deploy is required for live verification; agent must not deploy without owner `APPROVE DEV DEPLOY`.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Invite continue URL only; prior history/auth QA parked |
| Architecture alignment | pass | Reuse `portalUrlResolver` |
| Security impact addressed | pass | Fail closed; emulator-only localhost |
| Data Model impact addressed | pass | None |
| Backend impact addressed | pass | Callable change + deploy callout |
| Test strategy adequate | pass | Unit + Functions build + manual QA |
| Human checkpoints identified | pass | Deploy approval + manual invite QA |
| Roadmap alignment | pass | Owner-reported production-path bug |
| Documentation plan | pass | BACKEND + resend setup |
| No silent scope expansion | pass | |

---

## Architecture Review

**Findings:**
- Aligning invites with `resolvePortalBaseUrl` is correct; do not reintroduce a deploy-time `PORTAL_BASE_URL` for customer-facing continues.

**Required changes:**
- [x] None beyond plan (implement as specified)

---

## Security Review

**Findings:**
- Continue URL must be https Portal host for deployed projects.
- Firebase Auth will reject continue URLs whose host is not in Authorized domains — keep existing fallback without continue URL and document domain checklist.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] Production Functions deploy excluded from this phase

---

## Data Model Review

**Findings:**
- None

**Required changes:**
- [ ] None

---

## Backend Review

**Findings:**
- `createCustomerWithPortalInvite` is the only code path setting Portal continue URL today.
- `createTeamUser` generates reset links without continue URL (Studio) — leave unchanged.
- Removing unused `portalBaseUrl` `defineString` avoids future accidental localhost baking via `.env.fresh-prints-dev`.

**Required changes:**
1. Prefer removing `portalBaseUrl` from `secrets.ts` once unused (do not leave a localhost default that can be deployed).
2. Ensure `.env.example` does not instruct operators to set localhost `PORTAL_BASE_URL` for non-emulator deploys.
3. After code lands, owner deploy (only when approved):

```bash
firebase deploy --only functions:createCustomerWithPortalInvite --project fresh-prints-dev
```

No Firestore/Storage rules change.

---

## Testing Review

**Findings:**
- Extend portal URL unit tests for login continue helper.
- Manual QA must use a **new** invite after deploy (old emails keep old continueUrl).

**Required changes:**
- [x] Include explicit manual step: inspect continue host after password set (not only Portal in-app returnTo).

---

## Documentation Review

**Findings:**
- BACKEND.md already documents project map for proof CTAs; extend to invite continue URLs.
- resend-email-setup should note invite continue URL source.

---

## Required Changes (if approved_with_changes)

1. Remove `portalBaseUrl` defineString after switching invite to resolver (unless another caller still needs it — none found).
2. Document Firebase Authorized domains: `myprintrequest.dev`, `myprintrequest.com` (+ `localhost` for local Portal only).
3. Exact deploy command for owner (above); no agent deploy.

---

## Blockers (if blocked)

None

---

## Verdict Rationale

Clear bug, existing correct pattern to reuse, bounded deploy surface, honest manual QA needed. Approved with the cleanup/docs deploy callouts above.

---

## Next Step

Implement approved scope; then automated tests; then human checkpoint for deploy + invite QA.
