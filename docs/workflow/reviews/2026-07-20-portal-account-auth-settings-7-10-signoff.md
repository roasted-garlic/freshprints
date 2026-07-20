# Signoff: Portal account auth settings (#7–#9) + Owner delete user (#10)

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-07-20-portal-account-auth-settings-7-9-plan.md |
| Review | docs/workflow/reviews/2026-07-20-portal-account-auth-settings-7-9-review.md |
| Test report | docs/workflow/reviews/2026-07-20-portal-account-auth-settings-7-10-test-report.md |
| Manual QA | docs/workflow/reviews/2026-07-20-portal-account-auth-settings-7-10-manual-qa.md |
| Final status | **approved** |

---

## Summary

Owner **PASS** (2026-07-20) closed Small Managed Items **#7–#10**: Portal password reset, change email, account deletion request, and Studio owner single-user hard delete on Test Data (`fresh-prints-dev` only). Related polish also PASSed: Notifications **Back to settings**; Google Change email copy without Sync (least-resistance path = sign out → register a new account). Final Studio polish: Delete individual user modal **wider** (≈52rem), theme-matched confirm typography, **copy** control for `DELETE USER` (mirrors wipe confirm), **list-only scroll**, and visible list height capped to **5 user cards** (owner final **PASS** 2026-07-20).

---

## Changes Delivered

### Behavior
- **#7** Forgot-password + signed-in password reset/change for password users; Google-only recovery messaging
- **#8** Password accounts: `verifyBeforeUpdateEmail` + `syncPortalAccountEmail`. Google-only: no in-app change / no Sync; copy points to new account (optional deletion request on old account). Google unlink/relink deferred (ADR-FP-104)
- **#9** Customer `requestPortalAccountDeletion` / cancel — request-only, not Auth wipe
- **#10** Studio Test Data **Delete individual user** modal (Staff/Customers + search); `ownerDeleteUser` with `DELETE USER`; owner + `fresh-prints-dev` gates; self / last-owner blocked
- **Polish:** Notifications Back to settings; Google Change email honest copy (no Sync); Delete user modal width/theme + confirm-phrase copy button + list-only scroll + **5-card** visible height

### Documentation Updated
- ADR-FP-104 in `docs/project/DECISIONS.md`
- Manual QA + test report marked **PASS** 2026-07-20
- ROADMAP Small Managed Items #7–#10 → **Done**

---

## Tests

### Automated
- Functions build, portal account settings unit tests (3), Portal typecheck — passed
- Studio typecheck: pre-existing `ignoreDeprecations` TS5103 only
- Scoped Functions + Firestore rules deploy to `fresh-prints-dev` — passed

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| #7 password reset | PASS | owner 2026-07-20 |
| #8 change email (password Sync + Google new-account copy) | PASS | owner 2026-07-20 |
| #9 deletion request + cancel | PASS | owner 2026-07-20 |
| #10 owner delete user | PASS | owner 2026-07-20 |
| Notifications Back to settings | PASS | owner 2026-07-20 |
| Delete user modal width / theme / copy / list-only scroll | PASS (final polish) | owner 2026-07-20 |

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | | fresh-prints-dev only |
| Database migration | N/A | | |
| Design / UX | obtained | 2026-07-20 | Owner PASS including Google copy, Notifications Back, Delete user modal polish |
| Business / policy | obtained | 2026-07-20 | Google email: least resistance = new account (ADR-FP-104) |
| Secrets / env | N/A | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Google unlink/relink not built | low | Deferred; product chose new-account path |
| Studio tsconfig `ignoreDeprecations` TS5103 | low | Pre-existing; not introduced by this batch |
| Production Portal / Google / email still not released | — | Separate human approval |

---

## Signoff notes (product)

- **Google change-email:** Path of least resistance is **new account** (sign out → register), not Sync and not change-in-Google UX. Sync remains for password users only after verify-before-update.
- **Notifications:** Back control returns to Account settings (confirmed PASS).
- **#10 Delete user modal (final polish):** Wider modal (~52rem), Studio theme fonts/inputs/tabs/rows; confirm phrase uses UI font; copy button next to `DELETE USER` mirrors wipe; **only the user list scrolls** (modal shell / header / confirm / footer fixed); list `max-height` fits **5 cards** (anything over 5 scrolls inside the list). Owner **PASS** 2026-07-20 on this polish set. Soft-reload Studio to pick up styles.

---

## Deferred Items (Roadmap)
- Small Managed Items **#11** — OG / social sharing meta (next queued)
- **#12** — Library design sharing on custom design requests
- Google unlink/relink (if ever needed)
- Phase 9 deferred: Create My Design with AI; design fee / Stripe; assisted questionnaire branching
- Production App Hosting / production Google enablement

---

## Open Blockers
- [x] None for this phase (manual QA human checkpoint cleared)

---

## Verdict

**approved** — Owner PASS closes #7–#10 and related Notifications / Google Change email polish on `fresh-prints-dev`.

---

## Workflow Complete
- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated (#7–#10 Done)
- [ ] `RISK_REGISTER.md` updated if needed — N/A
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated
- [x] `references/project-chatgpt-handoff/03-roadmap-and-phases.md` updated

**Recommended next action for user:** Start managed phase for **#11 OG / social sharing meta** (then #12), or pick another explicit goal.
