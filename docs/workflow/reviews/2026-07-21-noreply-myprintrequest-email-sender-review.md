# Review: Transactional email from noreply@myprintrequest.com

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-21-noreply-myprintrequest-email-sender-plan.md |
| Verdict | approved_with_changes |

---

## Summary

Plan correctly scopes a sender-domain alignment (`team@funkyfreshprints.com` → `noreply@myprintrequest.com`), shared unmonitored disclaimer on all four transactional templates, docs/param updates, and human gates for provider verification + soft-deploy. Architecture stays within existing email template + `defineString` params. Production remains separately gated.

## Checklist

- [x] Scope clear and bounded
- [x] Architecture alignment
- [x] Security impact addressed (provider verification; no new secrets; param update called out)
- [x] Data model impact and migrations noted (none)
- [x] Backend impact documented
- [x] Test strategy adequate (unit + manual inbox smoke)
- [x] Human checkpoints identified
- [x] Roadmap / prior email work alignment
- [x] No silent scope expansion (funkyfreshprints marketing links explicitly out of scope)

## Required changes (implement must follow)

1. **Shared footer helper** — implement a single `appendUnmonitoredEmailFooter` (or equivalent) used by all four builders; do not duplicate disclaimer HTML four times.
2. **Param deploy checklist in docs** — setup/DEPLOYMENT notes must state that changing code defaults alone is insufficient when Firebase params were previously set; list the commands or console path to set both `INVITATION_FROM_EMAIL` and `PROOF_NOTICE_FROM_EMAIL`.
3. **Soft-deploy Function list** — use the established email Function set (at minimum: `createTeamUser`, `createCustomerWithPortalInvite`, `staffAddAssistedCreationProof`, `onEmailDeliveryJobCreated`, and any other callables that send via the shared templates in this slice). Do not bare `--only functions`.
4. **Do not change** bidding-acknowledgment / marketing links to `funkyfreshprints.com`.

## Optional (owner preference; non-blocking)

- From display name: default **Fresh Prints**; switch to **My Print Request** only if owner says so before implement.
- Disclaimer wording: use plan default unless owner supplies alternate.

## Security notes

- Live send before Brevo/Resend verification of `myprintrequest.com` / `noreply@` is **forbidden**.
- Production param/domain changes require a separate human approval after soft-deploy PASS.

## Verdict rationale

`approved_with_changes` — safe to implement code/docs per required changes; soft-deploy and production remain human-gated after provider verification.

## Approval

- Review doc: `docs/workflow/reviews/2026-07-21-noreply-myprintrequest-email-sender-review.md`
- Verdict: **approved_with_changes**
