# Plan: Studio Staff Operations Inbox

| Field | Value |
|-------|-------|
| Date | 2026-07-08 |
| Author | Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-08-studio-staff-operations-inbox-review.md |

---

## Goal

Give Studio staff realtime visual signals and a check-off inbox when portal customers submit print requests, with deep links to **Print Requests** (Working / Queued tabs) and **Show Queue**.

## Background

First real portal print request exposed a discoverability gap: staff did not know that a fully submitted customer request appears under **Print Requests → Queued** and on **Show Queue**. User approved MVP scope: realtime listener, sidebar badges + toast, header inbox with check-off (local ack), tab helper copy.

## Scope

### In Scope
- Firestore realtime listeners for portal-origin print requests and show allocations
- Header **Inbox** panel with checklist items and per-user localStorage acknowledgments
- Toast on new portal queue-to-show events with deep link
- Sidebar badge counts on **Print Requests** and **Show Queue**
- Print Requests tab helper text (Working vs Queued)
- `tab` query param deep links on `/print-requests`
- Composite Firestore indexes for new queries
- Unit tests for shared inbox derivation logic

### Out of Scope
- Firestore-persisted acks / multi-staff sync
- Electron desktop notifications
- Email / Slack
- Customer Requests / image approval (future inbox kinds)
- Portal confirmation copy (deferred)

---

## Affected Areas

### Files / Modules (expected)
- `packages/shared/src/staffInbox/*`
- `apps/studio/src/renderer/src/features/staff-inbox/*`
- `apps/studio/src/renderer/src/shared/components/AppHeader.tsx`
- `apps/studio/src/renderer/src/shared/components/AppShell.tsx`
- `apps/studio/src/renderer/src/shared/components/Sidebar.tsx`
- `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx`
- `apps/studio/src/renderer/src/features/print-requests/constants/printRequestRoutes.ts`
- `apps/studio/src/renderer/src/styles/components/navigation.css`
- `apps/studio/src/renderer/src/styles/components/staff-inbox.css`
- `apps/studio/src/renderer/src/styles/globals.css`
- `firestore.indexes.json`

### Architecture Impact
- New Studio feature module `staff-inbox` (service → hook → context → UI)
- Shared pure utilities in `@fresh-prints/shared` for inbox item derivation
- App-shell-level provider (same layer as upload activity)

### Security Impact
- [x] None beyond existing staff read access to `printRequests` and `showAllocations`
- Client-only localStorage acks; no new rules or callables

### Data Model Impact
- [x] None

### Backend Impact
- [x] None (index deploy when convenient; queries work after index build)

### UI / UX Impact
- Inbox bell in app header; sidebar numeric badges; toast stack; tab helper on Print Requests

### Migration Impact
- [x] None

---

## Approach

1. **Shared derivation** — Build stable inbox item IDs and derive `portal_working` / `portal_queued` items from portal requests + allocations + ack set.
2. **Subscription service** — `onSnapshot` on `printRequests` (`requestOrigin == portal_customer`) and `showAllocations` (`requestOriginSnapshot == portal_customer`).
3. **Ack store** — `localStorage` keyed by staff user id; acknowledge removes item from open list.
4. **UI** — `StaffInboxProvider` + bell/panel in header; toast on new queued groups after initial snapshot; sidebar badges from unacked counts.
5. **Print Requests** — Tab helper copy; read `tab` query param for deep links from inbox.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Unit tests | `node --import tsx --test packages/shared/src/staffInbox/*.test.ts` | yes |
| Typecheck Studio | `npm run typecheck -w @fresh-prints/studio` | yes |
| Lint | `npm run lint` | yes |

### Manual
- [ ] Portal queue-to-show triggers toast + inbox item + sidebar badges
- [ ] Check-off removes item; persists across reload
- [ ] Inbox "Open" navigates to correct tab and request
- [ ] Tab helper visible on Print Requests

---

## Human Checkpoints Anticipated
- [ ] Firestore index deploy to dev (if query fails before index builds)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Missing Firestore index | medium | Add indexes; document deploy in test report |
| Toast noise on reconnect | low | Skip toasts until after initial snapshot |
| Legacy portal requests without origin field | low | Filter strictly on `portal_customer` |

---

## Rollback Plan

Remove `staff-inbox` feature module and provider wiring; revert indexes if needed.

---

## Documentation Updates Required
- [ ] STYLE_GUIDE.md (brief inbox note) — optional, skip unless needed

---

## Open Questions
- [x] None — user approved MVP scope 2026-07-08

---

## Approval
- Review doc: `docs/workflow/reviews/2026-07-08-studio-staff-operations-inbox-review.md`
- Verdict: approved (user-confirmed scope)
