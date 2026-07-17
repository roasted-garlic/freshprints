# Fresh Prints — Current State Snapshot

> **Refresh before every external AI session.**
> Source: `.cursor/workflow/state.md` (authoritative)
> Last updated: **2026-07-16**

---

## At a Glance

| Field | Value |
|-------|-------|
| **Last completed goal** | `phase-9c-assisted-creation` — **approved_with_notes**, owner manual QA `PASS` |
| **Active managed goal** | `provider-agnostic-proof-ready-email` |
| **Phase** | **Plan complete; human checkpoint before review** |
| **Email direction** | Resend now behind provider-neutral interface; Brevo later |
| **Runtime settings** | Owner-only separate provider choices for invitation and proof-ready notices |
| **Deployment** | None authorized for the email phase |

---

## Artifacts

| Type | Path |
|------|------|
| Phase 9C signoff | `docs/workflow/reviews/2026-07-16-phase-9c-assisted-creation-signoff.md` |
| Phase 9C test report | `docs/workflow/reviews/2026-07-16-phase-9c-assisted-creation-test-report.md` |
| Phase 9C manual QA | `docs/workflow/reviews/2026-07-16-phase-9c-assisted-creation-manual-qa.md` |
| Active plan | `docs/workflow/plans/2026-07-16-provider-agnostic-proof-ready-email-plan.md` |
| Active review | pending |

---

## Owner decisions needed before review / implementation

1. Confirm the target `INVITATION_FROM_EMAIL`.
2. Confirm `PROOF_NOTICE_FROM_EMAIL` (same verified sender or a different verified sender).
3. Confirm the deployed `PORTAL_BASE_URL` for the Assisted proof review CTA.

After these are recorded, run review phase. Do not implement before review approval.

---

## Locked email behavior

- Send a notice for the first proof and each new proof after revisions.
- Enqueue one deterministic delivery job per request/proof.
- Resolve recipient server-side from `customers`, then linked `users` fallback.
- Keep Resend for invitations now.
- Show Brevo disabled in Studio until a later reviewed implementation.
- Never store provider secrets in Firestore or expose them to Studio/Portal.

---

## Do not

- Implement or deploy before the human checkpoint is cleared and review approves the plan.
- Add or configure Brevo in this phase.
- Production deploy without explicit approval.
- Paste API keys or customer email addresses into chat/logs.
