# Human Checkpoint: Provider-Agnostic Proof-Ready Email

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Workflow | managed-phase / test / provider-agnostic-proof-ready-email |
| Reason | Dev Firebase deploy approval and live email/UI manual QA are required |
| Status | **pending** |
| Resolution | pending |

---

## What We Need From You

Approve or decline the selective `fresh-prints-dev` Functions/rules deployment. If approved, the
agent can deploy the reviewed slice, then you can complete live invitation/proof email QA.

---

## Context

Repository implementation and local automated tests are complete. No Function, rule, secret, or
parameter has been deployed or changed. Production is excluded.

---

## Decision Required

**Question:** May the agent selectively deploy the email slice to `fresh-prints-dev`?

**Options:**
1. `APPROVE DEV DEPLOY` — deploy the listed Functions and Firestore rules to `fresh-prints-dev`.
2. `NO DEPLOY` — leave repository implementation complete but stop before live QA/signoff.
3. `I WILL DEPLOY` — you run the command and tell the agent when deployment is complete.

**Selective command:**

```bash
firebase deploy --only functions:createTeamUser,functions:createCustomerWithPortalInvite,functions:staffAddAssistedCreationProof,functions:updateEmailProviderSettings,functions:onEmailDeliveryJobCreated,firestore:rules --project fresh-prints-dev
```

This does not set or rotate secrets/parameters. If deployment reports a missing
`RESEND_API_KEY`, sender parameter, or other shared configuration, stop and request separate
approval rather than changing it.

**Recommendation:** `APPROVE DEV DEPLOY` so the required live delivery checks can run.

**Your decision:** _pending_

---

## Manual Test Required

**Feature / area:** Studio Email Providers, invitation regression, and Assisted proof-ready delivery  
**Environment:** local development apps against `fresh-prints-dev`  
**Prerequisites:**
- Selective deploy completed successfully
- Existing `RESEND_API_KEY` and verified `funkyfreshprints.com` sender are available
- Owner, admin/helper, and Portal customer test accounts
- Real inbox controlled by the tester

### Steps
1. Sign in to Studio as owner and open Settings → **Expected:** Email Providers appears; both fields show Resend; Brevo appears disabled with “coming later.”
2. Save the settings → **Expected:** Success state appears and values remain Resend after reload.
3. Sign in as admin/helper → **Expected:** Email Providers section is absent; direct callable use is permission denied.
4. Create a team invite and a Portal customer invite using controlled inboxes → **Expected:** Existing success/failure UX remains; both invitation emails arrive from `Fresh Prints <team@funkyfreshprints.com>`.
5. For an Assisted request in progress, attach the first proof → **Expected:** Proof submission succeeds and exactly one proof-ready email arrives.
6. Open the email CTA → **Expected:** It uses `https://myprintrequest.dev/custom-designs?flow=assisted&step=status` and opens the authenticated Assisted status flow.
7. Request a revision as the customer, then attach a new revised proof → **Expected:** Exactly one additional proof-ready email arrives for the new proof.
8. Reload/revisit the request without attaching another proof → **Expected:** No additional logical notice is created.
9. Inspect sanitized Function logs/job state if available → **Expected:** Status reaches `sent`; logs show IDs/safe codes only, with no recipient address, body, link, secret, or raw provider response.

### Pass criteria
- [ ] Owner-only provider settings and disabled Brevo behavior are correct
- [ ] Team and customer invitations still work
- [ ] First proof sends exactly one notice
- [ ] Revised proof sends exactly one additional notice
- [ ] Sender and dev CTA are correct
- [ ] No duplicate logical notice appears
- [ ] No PII/secrets appear in Function logs

### Please reply with
- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

**Your result:** _pending_

---

## Impact If Delayed

Repository implementation remains complete, but live delivery cannot be verified and workflow
signoff cannot be approved.

---

## Agent Actions While Paused

**Allowed:** Read docs, update checkpoint/test records, answer clarifying questions  
**Forbidden:** Implement, deploy, migrate, change secrets/config, sign off, expand scope

---

## Resolution Record

| Date | User response | Recorded in state | Follow-up |
|------|---------------|-------------------|-----------|
| pending | pending | no | Await decision |

---

## Resume Checklist
- [ ] User feedback recorded in `.cursor/workflow/state.md` Decision Log
- [ ] `Human Checkpoint Required` set to `no`
- [ ] Dev deploy approval/result recorded
- [ ] Manual QA result recorded in test report
- [ ] Next Required Step set for test completion or signoff
