# Manual QA: Studio Message history modal

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Workflow | managed-phase / studio-message-history |
| Reason | UI/UX verification — unread Messages dropdown + read/acked history modal |
| Status | **PASS** |
| Resolution | Owner: “I would call this PASS” (2026-07-17) |

---

## What We Need From You

Run the Studio Messages checks below locally and reply **PASS**, **FAIL: …**, or **PASS WITH NOTES: …**.

---

## Context

Studio header **Messages** now mirrors Portal Alerts: live dropdown = **unread only**; **Message history** opens a modal of **cleared / acked** customer updates (capped at 50). Deep-link still opens Assisted request → Messages tab. No Functions/rules deploy. Parked Portal duplicate/resize, notification history, Ctrl+Enter, Studio deep-link residual, and web-push QA remain open separately.

**Plan:** `docs/workflow/plans/2026-07-17-studio-message-history-plan.md`

---

## Manual Test Required

**Feature / area:** Studio header Messages — unread dropdown + Message history  
**Environment:** local Studio (staff user with Assisted Creation view permission)  
**Prerequisites:**
- Studio running against an environment with Assisted requests + `assistedCreationUpdateAcks`
- Ideally 1+ unread customer update and 1+ previously acked update (open a message once to create an ack, then reopen)

### Steps

1. With **unread** customer updates: open header **Messages** → **Expected:** only unread rows; footer shows **Message history** and Assisted link; no already-acked rows in the dropdown.
2. With **no unread** (all caught up): open Messages → **Expected:** “Messages clear” (or equivalent); **no** list of old acked messages; **Message history** still available.
3. Click **Message history** → **Expected:** dropdown closes; modal titled “Message history”; list shows **acked / cleared** updates only (no unread rows); list scrolls if many.
4. Press **Escape** → **Expected:** modal closes. Re-open history; click overlay outside panel → **Expected:** modal closes.
5. Open history; click a row → **Expected:** navigates to that Assisted request Messages tab (deep-link).
6. With an unread row: open Messages, click the unread row → **Expected:** panel closes and route changes; badge unread count updates; **re-open Messages** → that item is **gone** from the dropdown (appears under Message history instead).
7. Optional: from history, confirm thread scroll / messages tab still behaves as before (parked deep-link residual QA can cover scroll polish separately).

### Pass criteria

- [x] Dropdown never lists acked/read customer updates
- [x] Empty unread shows clear empty state with history link still available
- [x] History modal lists acked updates only (cap ~50)
- [x] Click unread → navigate; badge updates; item moves to history on reopen
- [x] Click history row → Assisted Messages deep-link works
- [x] Escape/overlay close work on history modal

### Please reply with

- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

**Your result:** **PASS** — owner reply 2026-07-17: “I would call this PASS” (Studio Message history after residual mirroring Portal).

---

## Files changed (this phase)

- `packages/shared/src/utils/assistedCreationHistory.ts`
- `packages/shared/src/utils/assistedCreationHistory.test.ts`
- `apps/studio/src/renderer/src/features/customer-requests/context/assistedMessagesContext.ts`
- `apps/studio/src/renderer/src/features/customer-requests/components/AssistedMessagesProvider.tsx`
- `apps/studio/src/renderer/src/features/customer-requests/components/AssistedMessagesBell.tsx`
- `apps/studio/src/renderer/src/features/customer-requests/components/AssistedMessagesHistoryModal.tsx` (new)
- `apps/studio/src/renderer/src/styles/components/staff-inbox.css`
- `docs/workflow/plans/2026-07-17-studio-message-history-plan.md`
- `docs/workflow/reviews/2026-07-17-studio-message-history-review.md`
- `docs/workflow/reviews/2026-07-17-studio-message-history-test-report.md`
- `docs/workflow/reviews/2026-07-17-studio-message-history-manual-qa.md`
- `.cursor/workflow/state.md`

---

## Deploy needed?

**No** — Studio renderer + shared util only. No Functions, rules, or env changes.

---

## Agent Actions While Paused

**Allowed:** Read docs, update checkpoint doc, answer clarifying questions, record PASS/FAIL

**Forbidden:** Production deploy; wipe parked QA checkpoints; expand to Brevo/web-push
