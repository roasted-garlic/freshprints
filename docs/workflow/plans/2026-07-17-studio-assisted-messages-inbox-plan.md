# Plan: Studio Assisted Messages Inbox

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-17-studio-assisted-messages-inbox-review.md |

---

## Goal

Add a Studio header **Messages** inbox (alerts-style dropdown) for unread Assisted Creation customer messages, with truncated previews that deep-link to the request Messages tab. Reduce scattered unread badges so staff keep up via the inbox instead of red chips everywhere.

## Background

Owner approved building a messages inbox mirroring the alerts bell, while keeping the post-QA queue (pending Functions deploys, invite continue URL, Brevo) parked and not forgotten.

## Scope

### In Scope

- Header Messages icon + badge count + dropdown (patterned on `StaffInboxBell`)
- Unread rows from existing `assistedCreationUpdateAcks` + `revisionHistory` customer updates
- Truncated preview → navigate to Custom Designs → Assisted → request → Messages
- Mark read-through for the opened message’s timestamp on Open (monotonic ack)
- Remove stage-tab and list-card unread badges (inbox is primary)
- Keep Messages-tab header count + per-row **Read** for in-thread clarity
- Deep-link query params on `/customer-requests`
- Park next-queue in workflow state (messages deploy QA, invite deploy, Brevo)

### Out of Scope

- Portal customer inbox
- Extending `staffInboxAcks` / print-request Inbox kinds
- Push notifications / sound for messages
- Brevo / email deploy
- Full-page Messages inbox (dropdown + deep-link is enough; optional “View all” can link to Custom Designs Assisted)

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/utils/assistedCreationHistory.ts` (+ tests)
- `apps/studio/.../customer-requests/constants/customerRequestRoutes.ts` (new)
- `apps/studio/.../customer-requests/components/AssistedMessagesBell.tsx` (new)
- `apps/studio/.../customer-requests/components/AssistedMessagesProvider.tsx` (new)
- `apps/studio/.../customer-requests/context/assistedMessagesContext.ts` (new)
- `apps/studio/.../shared/components/AppHeader.tsx`, `AppShell.tsx`
- `AssistedCreationRequestsSection.tsx`, `CustomerRequestsPage.tsx`
- `staff-inbox.css` (reuse/extend panel styles)
- Docs: DATA_MODEL, plan/review/manual QA, workflow state

### Architecture Impact

- [x] Details: New Studio feature module mirroring staff-inbox UI pattern; reuses Assisted ack collection; no new backend collection.

### Security Impact

- [x] Details: Same staff-only ack rules; no new client write paths beyond existing `markReadThrough`.

### Data Model Impact

- [x] Details: None new — reuse `assistedCreationUpdateAcks`.

### Backend Impact

- [x] None (no Functions/rules changes for inbox itself). Pending prior message/notes deploy remains separate.

### UI / UX Impact

- [x] Details: Header Messages bell; badge removal on stage/list; deep-link selection.

### Migration Impact

- [x] None

---

## Approach

1. Shared helpers to list unread customer-update entries for inbox derivation + truncate preview.
2. Route helpers: `tab`, `requestId`, `detailTab=messages`.
3. Provider: subscribe recent Assisted requests + acks; derive unread inbox items newest-first; open → navigate + markReadThrough.
4. Bell UI next to alerts bell.
5. Honor URL params on Customer Requests / Assisted section; open Messages tab.
6. Remove stage + card unread badges; keep Messages tab + row Read.

**Badge decision:** Drop scattered stage/list badges; keep in-thread affordances.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Shared unit | `npx tsx --test packages/shared/src/utils/assistedCreationHistory.test.ts` | yes |
| Studio build | `npx vite build` in `apps/studio` | yes |

### Manual

- Unread customer message → header badge + truncated row
- Open → lands on Messages; ack advances; badge drops
- Stage/list no longer show unread chips

---

## Human Checkpoints Anticipated

- Visual QA of Messages bell vs Alerts bell
- No Functions deploy required for this inbox phase (prior message callables still need separate approval)

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Extra Firestore listeners in shell | Reuse same `subscribeRecent` limit (100); staff-only |
| Missing customer display names | Fall back to customerId / description preview |

Rollback: remove bell + restore badges via revert.

---

## Open Questions

None — owner chose inbox; agent chose to drop scattered badges.

---

## Next Queue (do not lose)

After current Assisted Messages work passes / deploys:

1. Finish `assisted-creation-messages` Functions deploy + manual QA (`customerSend…`, `staffSend…`, `staffUpdate…` for Save notes)
2. Invite password continue URL: deploy `createCustomerWithPortalInvite` + QA
3. **Brevo** as email provider (API key; was next after phases pass)
4. Deferred Resend/email wave deploy items still parked under provider-agnostic email
