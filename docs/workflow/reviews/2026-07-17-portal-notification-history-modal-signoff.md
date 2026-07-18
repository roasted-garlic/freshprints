# Signoff: Portal customer notification history modal

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-07-17-portal-notification-history-modal-plan.md |
| Review | docs/workflow/reviews/2026-07-17-portal-notification-history-modal-review.md |
| Test report | docs/workflow/reviews/2026-07-17-portal-notification-history-modal-test-report.md |
| Manual QA | docs/workflow/reviews/2026-07-17-portal-notification-history-modal-manual-qa.md |
| Final status | **approved_with_notes** |

---

## Summary

Portal header Alerts: live dropdown is **unread only**; **Notification history** opens a modal of **read / cleared** alerts with deep-links. Absorbed residual click-vanish (pin-on-open) + circular badge. Owner manual QA **PASS**. Residual alert copy (“New message” / “New proof”) still needs Functions redeploy — deferred, not part of this PASS. Web-push / VAPID **not** marked PASS.

---

## Changes Delivered

### Behavior

- Alerts dropdown lists unread only; empty → caught-up with history link.
- History modal lists read notifications only; Escape/overlay close; row deep-links.
- Click unread navigates without vanish flash; item moves to history; badge updates.
- Single-digit unread badge near-circular.

### Documentation Updated

- Manual QA, test report, signoff for this phase
- Absorbed click-vanish badge manual QA marked PASS
- Roadmap / workflow state / handoff

---

## Tests

### Automated

- Portal typecheck: pass
- Unit: `customerNotifications.test.ts` pass
- Lint / full build: skipped (narrow UI; documented)

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Unread Alerts + history modal + deep-links (+ absorbed click-vanish/badge) | **PASS** | Owner (2026-07-17) |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | 2026-07-17 | Client UI; Functions copy redeploy optional |
| Database migration | not required | | |
| Design / UX | obtained | 2026-07-17 | Manual QA PASS |
| Business / policy | not required | | |
| Secrets / env | not required | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Residual “New message” / “New proof” copy not live until Functions redeploy | low | Owner `APPROVE DEV DEPLOY` for selective Functions |
| Web push / VAPID still unset | medium | Separate parked phase |

---

## Deferred Items (Roadmap)

- Functions redeploy for alert title/body copy
- `portal-notifications-web-push` VAPID setup + push QA
- Optional `firestore.rules` harden from duplicate/resize (`APPROVE DEV DEPLOY`)
- Brevo (later)

---

## Open Blockers

- [x] None for this goal (UI PASS complete)

---

## Verdict

**approved_with_notes** — owner PASS on history modal UX; Functions copy redeploy and web-push remain separate follow-ups.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated
- [x] `ROADMAP.md` updated
- [ ] `RISK_REGISTER.md` — N/A
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated

**Recommended next action for user:** Finish parked **portal-notifications-web-push** — set `NEXT_PUBLIC_FIREBASE_VAPID_KEY` + push QA; optionally `APPROVE DEV DEPLOY` for residual alert-copy Functions (and/or duplicate/resize rules harden).
