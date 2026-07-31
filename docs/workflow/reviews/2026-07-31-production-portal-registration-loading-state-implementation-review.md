# Implementation Review: Portal registration loading-state fix

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Reviewer | Review Agent (independent) |
| Approval | `APPROVE PORTAL REGISTRATION LOADING-STATE FIX IMPLEMENTATION` |
| Plan | `docs/workflow/plans/2026-07-31-production-portal-registration-stuck-plan.md` |
| Verdict | **approved** |

---

## Summary

Independent review of the loading-state / complete-profile client fix confirms scope stayed
inside Portal auth (timeout, staged diagnostics, terminal error, retry/sign-out, duplicate
guard). No Functions, Rules, Auth Console, API-key, domain, branding, or Stage 2 changes.
Automated Portal auth tests, typecheck, lint, and Portal build passed in this session.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Matches approved Phase 1 scope | pass | Client-only resilience + ID-token stage before callable |
| No Auth Console remediation from historical 400 | pass | 400 classified non-reproducible / historical |
| No production data mutation | pass | Read-only Auth inventory only |
| Sanitized instrumentation | pass | `[fp-portal-auth]` stage codes; no tokens/emails in stage logs |
| Timeout + clear busy | pass | 45s `withCompleteProfileTimeout`; `isAuthActionLoading` cleared on catch |
| Terminal error + retry + sign-out | pass | `CompleteProfileForm` |
| Duplicate submission blocked | pass | `registrationInProgressRef` + form `submitLockRef` |
| Email/password path still provisioned | pass | `register()` uses same staged/timeout pipeline |
| Tests run honestly | pass | See test report below |

---

## Diff findings

**Required changes:**

- [ ] None for merge to `development` docs+code.

**Notes:**

- Exact hang stage on production remains to be observed via `[fp-portal-auth]` logs after
  App Hosting rollout (instrumentation is in place; pre-rollout cannot prove live stage).
- Auth-only Google user `L3jjfWJG…` was **absent** at post-implement read-only recheck (only
  owner Auth user listed). Agents did not delete users; document as inventory drift /
  `[NEEDS OWNER CONFIRMATION]`.

---

## Test evidence (this session)

| Check | Result |
|-------|--------|
| `npx tsx --test` Portal auth tests (incl. new provisioning tests) | **pass** (20/20) |
| `npm run typecheck --workspace @fresh-prints/portal` | **pass** |
| `npm run lint` | **pass** |
| `npm run build:portal` | **pass** |
| `git diff --check` (touched auth files) | **pass** |

---

## Verdict

**approved** — proceed to owner `APPROVE PRODUCTION PORTAL APP HOSTING ROLLOUT` only; do not
self-deploy.
