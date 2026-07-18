# Signoff: Portal notifications — batch mark-read (+ residual Alerts chrome / message bubbles)

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-07-17-portal-notifications-batch-mark-read-plan.md |
| Review | docs/workflow/reviews/2026-07-17-portal-notifications-batch-mark-read-review.md |
| Test report | docs/workflow/reviews/2026-07-17-portal-notifications-batch-mark-read-test-report.md |
| Manual QA | docs/workflow/reviews/2026-07-17-portal-notifications-batch-mark-read-manual-qa.md |
| Final status | **approved_with_notes** |

---

## Summary

Portal Alerts batch mark-read (same `requestId` + `kind` on deep-link; **Mark all read**), residual Alerts chrome (header **X**, short footer labels), and same-session residual Messages bubble UX (Studio side flip; moderate bubble width `min(85%, 28rem)` on Portal + Studio) are owner-accepted. Owner reply: **PASS**. Web-push OS toast QA (A5/B3) is **not** included in this PASS.

---

## Changes Delivered

### Behavior

- Opening one assisted Portal alert marks all unread peers with the same `requestId` + `kind` once the destination loads.
- Alerts footer **Mark all read** clears all loaded unread.
- No Portal per-item Read link (Studio Messages Read remains staff-only).
- Alerts close via header **X**; footer labels **Mark all read** | **History** (| **Enable alerts** when push not enabled).
- Messages bubbles: staggered left/right restored after full-bleed experiment; max-width `min(85%, 28rem)`; Studio staff = right / customer = left.

### Files Modified

- `apps/portal/features/notifications/context/PortalNotificationsProvider.tsx`
- `apps/portal/features/notifications/services/customerNotificationsService.ts`
- `apps/portal/features/notifications/components/PortalNotificationsBell.tsx`
- `apps/portal/features/notifications/utils/selectUnreadPeerNotificationIds.ts`
- `apps/portal/features/notifications/utils/selectUnreadPeerNotificationIds.test.ts`
- `apps/portal/styles/shell.css`
- `apps/portal/styles/assisted-creation.css`
- `apps/studio/src/renderer/src/styles/components/staff-inbox.css`
- Workflow plan / review / test / manual QA docs

### Documentation Updated

- Manual QA, test report, this signoff
- `docs/project/ROADMAP.md`
- `.cursor/workflow/state.md`

---

## Tests

### Automated

- Portal typecheck: pass (`npm run typecheck` in `apps/portal`, exit 0)
- Unit: `selectUnreadPeerNotificationIds` + `locationMatchesNotificationHref` — 5 tests, exit 0
- Lint / full build: skipped (documented in test report)

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Batch mark-read A–D (peer clear, kind isolation, Mark all read, history regression) | **PASS** | Owner (2026-07-17) |
| Alerts chrome E (header X, short footer labels) | **PASS** | Owner (2026-07-17) |
| Residual Studio bubble flip + moderate width (same residual UX session) | **PASS** | Owner (2026-07-17) — “PASS this” after message width/UI iteration |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | 2026-07-17 | Local / client UX; no production |
| Database migration | not required | | |
| Design / UX | obtained | 2026-07-17 | Owner PASS |
| Business / policy | not required | | |
| Secrets / env | not required | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Web-push A5/B3 OS toast still open | medium | Parked `portal-notifications-web-push`; do not mark PASS without owner |
| Optional `firestore.rules` harden (duplicate/resize) may still need explicit `APPROVE DEV DEPLOY` if not already on dev | low | Optional; client fix already PASS |
| Uncommitted local tree for this phase | low | Commit when owner asks |

---

## Deferred Items (Roadmap)

- Finish **portal-notifications-web-push** — owner A5 local smoke + B3 background OS toast
- **Brevo** (after push, or if owner explicitly defers push)
- Optional leftover `APPROVE DEV DEPLOY` items (rules harden / any undeployed copy) if owner wants them shipped

---

## Open Blockers

- [x] None for this goal

---

## Verdict

**approved_with_notes** — owner PASS on batch mark-read + Alerts chrome + same-session message bubble residuals; web-push remains a separate open checkpoint.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes` for this goal
- [x] `ROADMAP.md` updated
- [ ] `RISK_REGISTER.md` — N/A
- [ ] `references/project-chatgpt-handoff/CURRENT-STATE.md` — handoff package not present in repo
- [ ] `references/project-chatgpt-handoff/13-recent-completed-work.md` — N/A

**Recommended next action for user:** Finish parked **portal-notifications-web-push** A5 + B3 OS toast QA (`docs/workflow/reviews/2026-07-17-portal-notifications-web-push-manual-qa.md`), or explicitly defer push and start Brevo.
