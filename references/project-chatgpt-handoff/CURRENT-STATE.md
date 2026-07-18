# Fresh Prints - Current State Snapshot

> **Refresh before every external AI session.**
> Source: `.cursor/workflow/state.md` (authoritative)
> Last updated: **2026-07-18**

---

## At a Glance

| Field | Value |
|-------|-------|
| **Active managed goal** | (none - idle) |
| **Phase** | **done** / idle |
| **Just closed** | Brevo IP/blocklist deliverability - **approved_with_notes** (owner **PASS**); Studio wipe presets already closed |
| **Tests** | Owner PASS: Brevo IP 2026-07-18; wipe presets PASS 2026-07-18 |
| **Next** | Pick next managed goal explicitly |
| **Deployment** | `wipeOperationalTestData` on `fresh-prints-dev`. No production. |

---

## Just closed (2026-07-18)

1. **brevo-proof-email-ip-block** - owner **PASS** on Brevo IP/blocklist; no app code. Signoff: `docs/workflow/reviews/2026-07-18-brevo-proof-email-ip-block-signoff.md`
2. **studio-test-data-reset-presets** - confirmed closed **approved_with_notes**. Signoff: `docs/workflow/reviews/2026-07-18-studio-test-data-reset-presets-signoff.md`

---

## Clarifications recorded (2026-07-18 owner)

- **Phase 9:** Not untouched future work - 9A Etsy + 9C Assisted/Custom Requests complete in `fresh-prints-dev`; AI Create My Design + design fee still deferred.
- **Image caching:** Already complete (2026-07-14 Portal catalog image load caching).
- **Account linking:** Firebase/Google console "Link accounts that use the same email" - not a custom app build.
- **Whatnot:** Staff-assisted Import Shows is built (day-to-day sync). Automated live/hourly scheduled sync is **not built and not planned**.

---

## Still open / deferred (pick explicitly)

1. Production Portal App Hosting / production Google enablement / production email release
2. Remaining Phase 9: Create My Design with AI; staff design-fee / Stripe; assisted questionnaire branching
3. Optional `APPROVE DEV DEPLOY` items (invite continue URL, firestore.rules harden, AI Function redeploy ops)
4. Gang Sheet Builder manual canvas (post-MVP backlog)

---

## Do not

- Production deploy without explicit approval.
- Paste API keys into chat/logs.
- Treat live Whatnot scheduled sync or image caching as open MVP app work.
