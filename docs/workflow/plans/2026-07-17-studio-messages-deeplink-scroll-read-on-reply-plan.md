# Plan: Studio Messages deep-link scroll + mark read on reply

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase (residual UX follow-up) |
| Related | docs/workflow/plans/2026-07-17-studio-assisted-messages-inbox-plan.md |

---

## Goal

When staff open an Assisted Creation message deep-link in Studio, land with the Messages thread scrolled so the latest/relevant messages are visible without manual page scroll. When staff send a reply, mark the related unread customer update(s) as read (same monotonic `markReadThrough` effect as the red **Read** control), even if they never clicked **Read**.

## Background

Studio Messages inbox (header bell + deep-link) already PASSed owner QA. Residual UX: deep-link still requires scrolling to see the thread/composer, and reply does not clear unread unless Open/Read was used. Active parent workflow `portal-notifications-web-push` stays parked at human deploy/QA — this change is Studio renderer-only and must not touch Portal push work.

## Scope

### In Scope

- On Messages tab open (including deep-link `detailTab=messages`): scroll the messages panel into view in the page content area and scroll the thread container to the bottom (latest messages).
- After a successful staff `sendMessage`, call existing `markReadThrough` through the latest customer-update timestamp (`latestAssistedCreationCustomerUpdateAtMs`).
- Manual QA steps for the owner.
- Narrow workflow state update that preserves Portal Alerts checkpoint.

### Out of Scope

- Portal customer inbox / Portal Alerts / Web Push
- New Firestore collections or Functions
- Changing inbox Open → mark-read behavior (keep it)
- Commits, deploys, production

---

## Affected Areas

### Files / Modules (expected)

- `apps/studio/.../AssistedCreationRequestsSection.tsx` (scroll + send handler)
- Optional: no shared util change if `latestAssistedCreationCustomerUpdateAtMs` is sufficient
- Docs: this plan, review, manual QA; workflow state

### Architecture Impact

- [x] None — UI/service call reuse only

### Security Impact

- [x] None new — same staff-only `assistedCreationUpdateAcks` write path

### Data Model Impact

- [x] None

### Backend Impact

- [x] None

### UI / UX Impact

- [x] Messages deep-link focus/scroll; unread clears on staff reply

### Migration Impact

- [x] None

---

## Approach

1. Improve Messages-tab scroll effect: after paint (`requestAnimationFrame`), `scrollIntoView` the messages panel/thread into the nearest scroll ancestor, then set `thread.scrollTop = thread.scrollHeight`. Retry once if layout not ready.
2. In `handleSendMessage` success path: compute `latestAssistedCreationCustomerUpdateAtMs(item.revisionHistory)`; if present, invoke `onMarkHistoryEntryRead(atMs)` (existing monotonic ack helper).
3. Document manual QA; leave Portal Alerts human checkpoint intact in state.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Shared unit (existing helpers) | `npx tsx --test packages/shared/src/utils/assistedCreationHistory.test.ts` | yes |
| Studio typecheck/build if cheap | `npx tsc --noEmit` or vite build in `apps/studio` | preferred |

### Manual

- Deep-link from Messages inbox → Messages tab visible with thread at bottom / composer reachable without hunting
- With unread customer message, send staff reply without clicking **Read** → badge/unread clears
- **Read** control still works when used alone

---

## Human Checkpoints Anticipated

- Manual UI QA for scroll + read-on-reply (local Studio)
- Portal Alerts deploy/QA remains a separate open checkpoint (do not conflate)

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| scrollIntoView fights other layout | Use `block: "nearest"` / focus thread; double rAF |
| Mark-on-reply races with inbox Open ack | Monotonic `markReadThrough` — later/same cursor is no-op |

Rollback: revert the two behavior hooks in `AssistedCreationRequestsSection.tsx`.

---

## Open Questions

None.
