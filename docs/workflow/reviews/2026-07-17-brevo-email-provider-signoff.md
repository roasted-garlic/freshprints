# Signoff: Brevo transactional email provider (+ parallel UX A/B)

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-07-17-brevo-email-provider-plan.md |
| Review | docs/workflow/reviews/2026-07-17-brevo-email-provider-review.md |
| Test report | docs/workflow/reviews/2026-07-17-brevo-email-provider-test-report.md |
| Manual QA | docs/workflow/reviews/2026-07-17-brevo-email-provider-manual-qa.md |
| Diagnosis | docs/workflow/reviews/2026-07-17-brevo-proof-resend-diagnosis.md |
| Final status | **approved_with_notes** |

---

## Summary

Brevo is live on `fresh-prints-dev` for proof-ready transactional email. Owner confirmed **BREVO PASS** with Brevo Transactional Logs showing **Sent / Delivered / First opening** for subject “Your Fresh Prints proof is ready” from `team@funkyfreshprints.com`. Stale enqueue coerce (`brevo`→`resend`) was diagnosed and fixed earlier the same day; owner smoke after redeploy succeeded.

Parallel Portal/Studio UX A/B and the residual Sending… labels were implemented in this phase but **not separately owner-confirmed** in the PASS reply — treated as **absorbed / optional** (no FAIL invented). Resend regression switch was optional and not required for this signoff.

---

## Changes Delivered

### Behavior

- Brevo HTTP Transactional Email adapter (`createBrevoEmailProvider`) behind existing `EmailProvider` contract.
- Studio Settings: selectable `inviteProvider` / `proofNoticeProvider` including `brevo` (ADR-FP-090).
- Fail-closed provider resolution (no silent unknown→Resend); enqueue snapshots provider onto jobs.
- Parallel UX: Portal Request revisions above Approve; Studio taller proof note; residual Sending… / Approving… while proof response in flight.

### Files Modified (phase arc — representative)

- `functions/src/lib/email/` (Brevo adapter, settings, router)
- `functions/src/assistedCreationRequests.ts`, `updateEmailProviderSettings.ts`
- `apps/studio/.../EmailProviderSettingsSection.tsx`
- `apps/portal/.../AssistedCreationStatusPanel.tsx` (order + Sending… residual)
- Docs: plan, review, test report, manual QA, setup `docs/workflow/setup/brevo-email-setup.md`, diagnosis

### Documentation Updated

- This signoff
- Manual QA + test report (owner BREVO PASS)
- `docs/project/ROADMAP.md`
- `.cursor/workflow/state.md`

---

## Tests

### Automated

- Email + provider unit tests: **pass** (15/15) — see test report
- `npm --prefix functions run build`: **pass**

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Part 0 — `BREVO_API_KEY` + sender verify | **PASS** (implied by live delivery) | Owner (2026-07-17) |
| Part C — Proof-ready via Brevo (Sent / Delivered / First opening) | **BREVO PASS** | Owner (2026-07-17) |
| Part A — Portal revisions above Approve + Sending… residual | **Absorbed / optional** — not separately confirmed | — |
| Part B — Studio taller proof note | **Absorbed / optional** — not separately confirmed | — |
| Optional Resend regression switch | **Not required** for this signoff | — |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | 2026-07-17 | Dev-only Functions / secrets; no production |
| Database migration | not required | | Settings fields additive |
| Design / UX | partial | 2026-07-17 | Brevo live path PASS; UX A/B optional residual |
| Business / policy | not required | | |
| Secrets / env | obtained (dev) | 2026-07-17 | Product `BREVO_API_KEY` in Secret Manager for `fresh-prints-dev` (not pasted in chat) |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Production Brevo not configured/deployed | medium | Separate owner approve + secret/sender on production when releasing |
| UX A/B not separately owner-confirmed | low | Code shipped; optional re-glance if polish needed |
| Uncommitted local tree for Brevo/email work | low | Commit when owner asks |
| Defaults remain Resend until Settings switch | info | Expected; owner may leave proof on Brevo in Settings |

---

## Deferred Items (Roadmap)

- **assisted-customer-cancel-reason** — owner manual QA still open
- Production email / Functions release when authorized
- Optional leftovers: production push release; `APPROVE DEV DEPLOY` for duplicate/resize rules harden if needed

---

## Open Blockers

- [x] None for Brevo live path (owner BREVO PASS recorded)

---

## Verdict

**approved_with_notes** — Owner BREVO PASS with Brevo Transactional Logs evidence (Sent / Delivered / First opening). Automated tests previously passed. UX A/B / Sending… residual noted as absorbed/optional without separate confirmation. No production deploy. No commits in this signoff pass.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] `RISK_REGISTER.md` updated if needed — N/A (no new risks beyond deferred production config)
- [x] **`references/project-chatgpt-handoff/CURRENT-STATE.md`** — package not present in repo; skipped
- [x] Handoff `13-recent-completed-work.md` — N/A (package absent)

**Recommended next action for user:** Owner manual QA for **assisted-customer-cancel-reason** (`docs/workflow/reviews/2026-07-17-assisted-customer-cancel-reason-manual-qa.md`), or say `Continue Workflow` / pick the next roadmap item.
