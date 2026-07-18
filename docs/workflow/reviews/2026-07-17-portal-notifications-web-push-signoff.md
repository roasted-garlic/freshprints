# Signoff: Portal Notification Center + Web Push

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-07-17-portal-notifications-web-push-plan.md |
| Review | docs/workflow/reviews/2026-07-17-portal-notifications-web-push-review.md |
| Test report | docs/workflow/reviews/2026-07-17-portal-notifications-web-push-test-report.md |
| Manual QA | docs/workflow/reviews/2026-07-17-portal-notifications-web-push-manual-qa.md |
| Final status | **approved_with_notes** |

---

## Summary

Portal in-app Alerts + FCM Web Push for assisted proofs/messages is owner-accepted. Owner confirmed **PASS** for manual QA A5 (local smoke OS toast) and B3 (background “New message” OS toast), with related UX residuals from the push closeout arc absorbed into this phase as appropriate. Batch mark-read and other parked Alerts UX phases were signed off separately earlier the same day.

---

## Changes Delivered

### Behavior

- In-app `customerNotifications` + Portal Alerts bell (unread, history, mark-read).
- Optional browser Web Push via FCM (`webPushSubscriptions`, Account enable/refresh, SW + foreground display).
- Functions emit notifications + FCM send on staff message / proof; display-path and token-refresh fixes deployed to `fresh-prints-dev`.

### Files Modified (phase arc — representative)

- `functions/src/` customer notification + push helpers; staff message/proof emitters
- `apps/portal/features/notifications/`
- `apps/portal` SW route / messaging SW handling
- `firestore.rules` (notifications + subscriptions)
- Docs: plan, review, test report, manual QA

### Documentation Updated

- This signoff
- `docs/project/ROADMAP.md`
- `.cursor/workflow/state.md`

---

## Tests

### Automated

- Shared customerNotifications unit tests: pass (recorded in test report)
- `npm --prefix functions run build`: pass
- `npm --prefix apps/portal run typecheck`: pass (multiple follow-ups)

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| A5 — Enable/Refresh → local “Browser alerts are working” OS toast | **PASS** | Owner (2026-07-17) |
| B3 — Background Portal → staff message → OS “New message” toast | **PASS** | Owner (2026-07-17) |
| Related push/Alerts UX residuals in same closeout arc | **PASS** (absorbed) | Owner (2026-07-17) |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | 2026-07-17 | Dev-only Functions / rules; no production |
| Database migration | not required | | Additive collections/fields |
| Design / UX | obtained | 2026-07-17 | Owner PASS A5/B3 |
| Business / policy | not required | | |
| Secrets / env | obtained (dev) | 2026-07-17 | VAPID / FCM web push cert for `fresh-prints-dev` (local Portal) |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Production Web Push not deployed | medium | Separate `APPROVE` + VAPID/prod config when releasing |
| Uncommitted local tree for push/Alerts work | low | Commit when owner asks |
| Optional leftover `firestore.rules` harden (duplicate/resize) | low | Explicit `APPROVE DEV DEPLOY` if still needed |

---

## Deferred Items (Roadmap)

- **Brevo** email provider (HTTP API + `BREVO_API_KEY`) — next queue after this signoff
- Production deploy of notifications / push when authorized
- Optional rules harden deploy if not already on `fresh-prints-dev`

---

## Open Blockers

- [x] None (A5/B3 owner PASS recorded)

---

## Verdict

**approved_with_notes** — Owner PASS for A5/B3 closes the parked web-push human checkpoint. Notes: production/push release and Brevo remain deferred; no production deploy in this phase.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes` for this goal
- [x] `ROADMAP.md` updated
- [ ] `RISK_REGISTER.md` updated if needed — not required (no new open risk beyond known deferred Brevo/prod)
- [ ] **`references/project-chatgpt-handoff/CURRENT-STATE.md` updated** — N/A (handoff package not present in repo)
- [ ] `references/project-chatgpt-handoff/13-recent-completed-work.md` — N/A

**Recommended next action for user:** Narrow residual — customer cancel reason on assisted requests — then Brevo plan.
