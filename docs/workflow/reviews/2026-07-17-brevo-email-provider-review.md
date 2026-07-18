# Review: Brevo transactional email provider

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-17-brevo-email-provider-plan.md |
| Verdict | **approved** |

---

## Summary

Plan correctly extends ADR-FP-089 with a Brevo HTTP adapter, shared provider id enablement, Secret Manager `BREVO_API_KEY`, and Studio settings unlock—without SMTP, MCP token reuse, or production. Scope is bounded and security-aware. **Do not implement until owner sets up the product API key / sender verification checkpoint** (or explicitly asks to implement code-first with secrets later).

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | HTTP API + settings; no marketing/SMTP |
| Architecture alignment | pass | Adapter behind existing router |
| Security impact addressed | pass | Secret Manager; separate from MCP token |
| Data model impact addressed | pass | Enum widen only |
| Backend impact addressed | pass | Secret + Functions wiring documented |
| Test strategy adequate | pass | Unit + manual send QA |
| Human checkpoints identified | pass | Secrets, domain, dev deploy, live QA |
| Roadmap alignment | pass | Next after web-push / cancel residual |
| Documentation plan | pass | |
| No silent scope expansion | pass | |

---

## Architecture Review

**Findings:**
- Reuses provider-neutral contract; Resend remains default.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- Explicit separation of `BREVO_API_KEY` (product) vs `BREVO_MCP_TOKEN` (Cursor) is required in setup docs during implement.
- No secrets in chat/repo.

**Required changes:**
- [x] None for plan approval

**Human approval needed before production:**
- [x] Yes — production secrets/deploy excluded; separate later approval

---

## Data Model Review

**Findings:**
- `settings/emailProviders` and job `provider` accept `brevo` after implement.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- Functions that send mail must have access to Brevo secret when selected; declare both secrets on those functions.
- Open question on from-address/domain verification is OK for plan; blocks live QA only.

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Adapter unit tests + owner live send QA after secret + deploy.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- Amend ADR-FP-089 or add follow-up ADR when implementing.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None for plan approval. **Implement gate:** human product Brevo API key + Secret Manager + sender verification (or owner says implement code-first).

---

## Verdict Rationale

Approved. Ready for implement after human secrets/setup checkpoint (or explicit go-ahead to land code with secret wiring pending).

---

## Next Step

Owner authorized code-first implement (2026-07-17 autonomous push). Implementation lands adapter + wiring without the key in chat. Remaining human checkpoint: create Brevo **product** API key (not MCP), verify sender/domain, set `BREVO_API_KEY` on `fresh-prints-dev`, then live send QA per `docs/workflow/setup/brevo-email-setup.md` and `docs/workflow/reviews/2026-07-17-brevo-email-provider-manual-qa.md`.
