# Fresh Prints - Current State Snapshot

> **Refresh before every external AI session.**
> Source: `.cursor/workflow/state.md` (authoritative)
> Last updated: **2026-07-18**

---

## At a Glance

| Field | Value |
|-------|-------|
| **Active managed goal** | Brevo proof-ready email: owner IP/blocklist deliverability |
| **Phase** | **test** (Brevo); wipe presets closed |
| **Just closed** | Studio Test Data Reset presets + wipe expansion — **approved_with_notes** (owner **PASS**) |
| **Tests** | Wipe: owner PASS 2026-07-18. Brevo: partial (`provider_rejected` on some first proofs) |
| **Next** | Owner Brevo IP/blocklist fix + first-proof email retest (PASS/FAIL) |
| **Deployment** | `wipeOperationalTestData` on `fresh-prints-dev`. No production. |

---

## Just closed (2026-07-18)

1. **studio-test-data-reset-presets** — short labels, presets (incl. **All (-) Designs**), expanded Etsy/Custom wipe leftovers; Functions wipe callable already on fresh-prints-dev. Signoff: `docs/workflow/reviews/2026-07-18-studio-test-data-reset-presets-signoff.md`

---

## Still open

1. **Brevo first-proof IP/blocklist** — checkpoint `docs/workflow/reviews/2026-07-18-brevo-proof-email-ip-block-checkpoint.md` (not an app skip fix)
2. Production push / production email release — deferred
3. **portal-notifications-web-push** — VAPID + OS toast (separate)
4. Optional `APPROVE DEV DEPLOY` items (invite continue URL, firestore.rules harden, AI Function redeploy ops)

---

## Do not

- Production deploy without explicit approval.
- Paste API keys into chat/logs.
- Speculative first-proof app code deploys for Brevo IP blocking.
