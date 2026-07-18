# Plan: Portal Alerts — click vanish + circular badge

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | parked `portal-notifications-web-push`; residual UX after alert-missing investigation |

---

## Goal

Fix two Portal header Alerts UX issues: (1) notification list item vanishes / empties awkwardly on click before navigation completes; (2) unread count badge is oblong — make it near-circular for single digits (match Studio Alerts bubble approach).

## Background

Owner residual on Portal Alerts (parked deploy/QA for web push remains separate). Screenshot shows a wide stadium-shaped red “1” badge. Clicking a notification marks it read via Firestore; the open panel currently prefers live `unreadItems`, so the row disappears (or the panel flashes empty) before redirect finishes.

## Scope

### In Scope
- Stabilize open notification panel list so mark-read does not remove the clicked row while the panel is open / before navigate
- Keep mark-read behavior (still mark read on open); badge unread count may update immediately
- CSS: circular / near-circular unread badge for single digits; readable for `9+`
- Manual QA steps for owner
- Workflow state + parked Ctrl+Enter / Studio deep-link checkpoints preserved (not wiped)

### Out of Scope
- Web push / VAPID / Functions deploy
- Studio Messages bell changes
- Brevo
- Commits / production deploy
- Ctrl+Enter composer work (parked with open manual QA)

---

## Affected Areas

### Files / Modules (expected)
- `apps/portal/features/notifications/components/PortalNotificationsBell.tsx`
- `apps/portal/features/notifications/context/PortalNotificationsProvider.tsx` (openItem / panel list source if needed)
- `apps/portal/styles/shell.css` (`.portal-notifications-bell-badge`)
- Workflow plan/review/manual QA docs

### Architecture Impact
- [x] None — presentation / client coordination only within existing notifications feature

### Security Impact
- [x] None — still uses existing `markRead` + rules; no new access paths

### Data Model Impact
- [x] None

### Backend Impact
- [x] None

### UI / UX Impact
- [x] Details: Portal header Alerts panel click behavior; unread badge shape

### Migration Impact
- [x] None

---

## Approach

### Root cause (vanish)

1. Panel preview is `(unreadItems.length > 0 ? unreadItems : items)`.
2. `openItem` calls `markRead`, which writes `readAt`; Firestore local/listener updates `items` immediately.
3. Clicked row leaves `unreadItems` → list re-renders without it (sole unread can flash empty / “all caught up” before navigate or panel close feels settled).

### Fix (vanish)

Preferred: **pin the panel preview list when the panel opens** (unread-first snapshot at open time). Live `items` / mark-read may still update badge `unreadCount`, but the open list does not remove rows until the panel closes. `openItem` continues: close panel → `router.push` → `markRead` (fire-and-forget).

Fallback if pin is awkward: always show recent `items` (unread styling via `is-unread`) so mark-read only drops highlight, not the row.

### Fix (badge)

Match Studio `.staff-inbox-bell-bubble` pattern: fixed `height` + equal `min-width`, tight horizontal padding, `box-sizing: border-box`, `line-height: 1`, `font-variant-numeric: tabular-nums`. Remove asymmetric padding that stretches single-digit badges into ovals.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npx tsc --noEmit` in `apps/portal` (or project script) | yes |
| Lint | if touched files lint-clean | no (not blocking) |
| Unit tests | none for this UI | no |
| Build | no | no |
| Integration | no | no |
| E2E | no | no |
| Backend/rules | no | no |

### Manual
- [x] Details: click unread alert → item stays until panel closes / navigate; no empty flash; badge looks circular for `1`; `9+` still readable

---

## Human Checkpoints Anticipated
- [x] Manual UI/UX review (local Portal header)
- [ ] Design approval
- [ ] Business logic decision
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars
- [ ] Other:

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Pinned list hides a notification that arrives while panel is open | Low | Acceptable for short-lived dropdown; refresh on next open |
| Badge too tight for `9+` | Low | Keep `min-width` + horizontal padding for multi-char |
| Ctrl+Enter / Studio QA state wiped | Medium | Explicitly park those checkpoints in workflow state |

---

## Rollback Plan

Revert the three Portal files (bell, provider if changed, shell.css). No data migration.

---

## Documentation Updates Required
- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [ ] DATA_MODEL.md
- [ ] BACKEND.md
- [ ] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [ ] DECISIONS.md
- [x] Other: workflow plan/review/manual QA under `docs/workflow/`

---

## Open Questions
- [x] None

---

## Approval
- Review doc: docs/workflow/reviews/2026-07-17-portal-alerts-click-vanish-badge-review.md
- Verdict: pending
