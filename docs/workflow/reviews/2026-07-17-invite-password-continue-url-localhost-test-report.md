# Test Report: Invite / Password-Reset Continue URL — Stop Localhost Redirects

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-07-17-invite-password-continue-url-localhost-plan.md |
| Implementation | session — Functions invite continue URL fix |
| Overall | **pending_manual** |

---

## Summary

Automated checks for the invite continue-URL fix passed (9/9 email unit tests including new login-continue coverage; Functions `tsc` build). Live verification requires owner deploy of `createCustomerWithPortalInvite` to fresh-prints-dev, then a **new** Portal invite password create/reset flow. Manual QA checkpoint is open.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Unit tests | `npx tsx --test functions/src/lib/email/email.test.ts` | 0 | pass | 9/9 including portal login continue URL |
| Functions build | `npm --prefix functions run build` | 0 | pass | |
| Lint | — | — | skip | No Portal/Studio UI changes; Functions-only |
| Portal typecheck | — | — | skip | No Portal code changes |
| Integration / E2E | — | — | skip | Covered by manual invite QA |
| Backend/rules | — | — | skip | No rules changes |

---

## Failures (if any)

None

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Lint / Portal typecheck | Out of change surface for this phase |
| Live Firebase Auth continue URL | Requires Functions deploy + human |

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Invite → password set → continue host | pending | See manual QA doc; after `APPROVE DEV DEPLOY` |
| Firebase authorized domains | pending | Confirm `myprintrequest.dev` listed |

Manual test instructions: `docs/workflow/reviews/2026-07-17-invite-password-continue-url-localhost-manual-qa.md`

---

## Recommendations

- After deploy, always re-send a **new** invite; old emails retain old `continueUrl`.
- Optionally purge leftover `PORTAL_BASE_URL` Cloud Functions params in Firebase console if still present from prior deploys (harmless once unused by code).

---

## Signoff Readiness

- [x] All required automated checks pass OR failures documented
- [ ] Manual tests complete OR checkpoint pending
- [ ] Ready for signoff phase

**Next step:** manual-test-checkpoint (after owner deploy approval)
