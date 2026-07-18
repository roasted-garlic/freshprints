# Plan: Studio Messages history modal (mirror Portal Alerts)

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-17-studio-message-history-review.md |

---

## Goal

Give Studio staff a **Message history** surface that mirrors Portal Alerts: the live Messages dropdown shows **unread only**, and a link opens a modal of **older / already-acked** customer updates so staff can recall the last message without cluttering the live inbox.

## Background

Portal shipped unread dropdown + **Notification history** modal (`PortalNotificationHistoryModal`, `readItems` / `unreadItems`). Studio Messages (`AssistedMessagesBell` + `AssistedMessagesProvider`) already lists unread via `listUnreadAssistedCreationCustomerUpdates` + `assistedCreationUpdateAcks`, but has no scroll-back for read/acked updates. Owner asked to duplicate the Portal pattern for Studio.

Parked workflows (do not wipe): portal-duplicate-resize-permissions manual QA, portal-notification-history-modal QA, Ctrl+Enter QA, Studio deep-link QA, web-push deploy.

## Scope

### In Scope

- Split Studio Messages into **unread (live panel)** vs **read/acked (history modal)**
- Add **Message history** link in Messages dropdown footer
- History modal: scrollable list (cap ~50), Escape/overlay close, reuse Studio modal primitives + `staff-inbox.css` dark theme
- Deep-link from history rows via existing `openItem` navigation (`tab=assisted`, `detailTab=messages`)
- Shared helper to list **read** customer updates (inverse of unread), plus unit test
- Pin unread preview at panel open (Portal residual: avoid yank-before-navigate)
- Manual QA doc for owner

### Out of Scope

- Brevo / web-push / Portal Alerts changes
- Functions or Firestore rules changes (acks already persist)
- New collections or ack schema changes
- Full Assisted inbox page redesign
- Commits / production deploy

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/utils/assistedCreationHistory.ts` — add `listReadAssistedCreationCustomerUpdates` (+ optional `HISTORY_LIMIT` constant)
- `packages/shared/src/utils/assistedCreationHistory.test.ts`
- `apps/studio/.../assistedMessagesContext.ts` — history open/close, `readItems` / `historyItems`
- `apps/studio/.../AssistedMessagesProvider.tsx` — derive read items; history state; close history on openItem
- `apps/studio/.../AssistedMessagesBell.tsx` — history link; pin unread preview
- `apps/studio/.../AssistedMessagesHistoryModal.tsx` (new)
- `apps/studio/.../styles/components/staff-inbox.css` — history modal layout
- Workflow docs under `docs/workflow/plans/` and `docs/workflow/reviews/`

### Architecture Impact

- [x] Details: UI + context only in Studio renderer; shared util for read-list helper. No new backend service. Components stay thin; provider owns list derivation and navigation (existing pattern).

### Security Impact

- [x] Details: None new. History uses same request list + staff acks already authorized for viewers. No client-side permission bypass; deep-link still goes through existing Studio routes/permissions.

### Data Model Impact

- [x] None — read = customer-update entries at/before `readThroughAtMillis`; no schema change.

### Backend Impact

- [x] None — no Functions deploy, no rules deploy.

### UI / UX Impact

- [x] Details: Messages dropdown footer gains **Message history**; modal for cleared updates; empty unread stays “Messages clear” with history still reachable. Manual UI checkpoint required.

### Migration Impact

- [x] None

---

## Approach

1. **Shared helper** — `listReadAssistedCreationCustomerUpdates(history, readThroughAtMs)`: customer-update entries that are *not* unread (requires a non-null threshold). Newest-first. Export a `ASSISTED_MESSAGES_HISTORY_LIMIT = 50` (or local Studio constant) for the aggregated list.
2. **Provider** — Compute `unreadItems` (rename or keep `openItems` as unread-only alias) and `readItems` across loaded Assisted requests; sort + slice to 50. Add `isHistoryOpen`, `openHistory` (close panel → open modal), `closeHistory`. `openItem` closes panel **and** history, then navigate + markReadThrough (monotonic; history clicks are no-ops when already acked).
3. **Bell / panel** — Live list = unread only; pin preview with `useState(() => …)` like Portal; footer: **Message history** button + existing Assisted link; mount history modal beside panel.
4. **Modal** — Studio `Modal` / overlay pattern; caption about last N cleared updates; empty + error states; row click → `openItem`.
5. **CSS** — Compact history modal under staff-inbox (max-height, scroll list) matching Portal taste in Studio dark theme.
6. **Manual QA** — Steps for unread-only dropdown, history-only modal, deep-link, Escape/overlay.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Shared unit tests | `npm test` / package script for `assistedCreationHistory.test.ts` | yes |
| Studio typecheck | Studio `tsc` / package script if present | yes |
| Lint | if quick/local configured | no |
| Build | no (renderer-only UX) | no |
| Integration / E2E | no | no |
| Backend/rules | no | no |

### Manual

- [x] Owner manual QA: unread vs history split, deep-link from history, Escape/overlay close (see manual QA doc)

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review
- [ ] Design approval
- [ ] Business logic decision
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars
- [ ] Other: preserve parked Portal duplicate/resize + notification history + Ctrl+Enter + Studio deep-link + web-push notes

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| History empty if staff never acked | Low | Empty copy; live unread still works |
| Large revision histories slow UI | Low | Cap aggregated read list at 50 |
| openItem from history re-marks | Low | Existing monotonic markReadThrough |
| Confuse with Portal parked QA | Low | Separate workflow goal; park notes preserved |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert Studio Messages components/context/CSS and shared helper/test; no data migration.

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
- [x] Other: plan / review / test report / manual QA / workflow state only

---

## Open Questions

- [x] None — label **Message history**; live = unread; history = read/acked; cap 50; no deploy.

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-17-studio-message-history-review.md
- Verdict: approved
