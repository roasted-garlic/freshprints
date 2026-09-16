# Plan: Selected Print Request live sync (Studio ↔ Portal)

| Field | Value |
|---|---|
| Date | 2026-09-16 |
| Author | Planning Agent |
| Status | accepted_with_changes — Formal Review approved; Signoff **approved** (CLOSED) |
| Workflow | managed-phase |
| Goal | `selected-print-request-live-sync-studio-portal` |
| Related | Prior count-parity + unqueue-cache goals; Portal `subscribePrintRequestItems` / `subscribeMyContinuablePrintRequests`; Studio Show Queue selected-show subscriptions |

---

## Goal

When a staff member or customer has a **specific Print Request open** (or selected), changes from the other app—add/remove design, quantity, dimensions, queue/unqueue to show—appear in that open view **without a full page refresh**, using narrow Firestore listeners so cost stays proportional to open screens, not total concurrent site users.

---

## Background

Owner asked whether Studio PR edits can update Portal live (and vice versa) without refresh, and whether site-wide realtime would bog down under load.

Current posture (investigation):

- **Studio Show Queue (selected show):** already live (`subscribeToShowAllocations` / `subscribeToUpcomingShow`).
- **Portal:** already live for continuable request list (`subscribeMyContinuablePrintRequests`) and working-items paths (`subscribePrintRequestItems`).
- **Studio Print Requests selected detail:** largely **reload/patch after local mutation** via `usePrintRequestDetails` — another client (Portal customer or second Studio window) can stay stale until refresh.
- **Cross-app gaps:** Studio→Portal detail for queued/`active` views and Studio selected-request hydration when Portal mutates are the main product gaps.

Product constraint from owner discussion: prefer **selected/open document listeners**, not global “everything always live.”

---

## Scope

### In Scope

1. **Studio selected Print Request live sync**
   - While a request is selected on Print Requests (detail/items), subscribe to that request document and its `printRequestItems` (and selected-request allocations if required for queueTab/show chrome already shown on that page).
   - Merge listener emissions into existing detail state without wiping in-progress local edits unsafely (define conflict rule: remote wins on fields not dirty locally, or soft refresh with toast—pick one in implement and document).
   - Tear down listeners when selection changes or page unmounts.

2. **Portal open Print Request detail live sync gaps**
   - Ensure request detail (not only Working drawer items) stays live for the open `printRequestId` across relevant statuses (editing/active/queued chrome), reusing existing item subscription patterns where present.
   - Invalidate or refresh show-schedule / unallocated qty when allocations for that request change while the detail is open (bounded query on `printRequestId`, not all shows).

3. **Cost / safety rails**
   - One request-scoped listener set per open detail; no collection-wide listeners for all customers’ requests in Studio.
   - Trace metadata / existing listener-attach patterns retained.
   - Document read-cost expectations in TESTING or WORKFLOWS briefly.

4. **Tests + Owner DEV QA**
   - Contract tests that Studio selected detail and Portal detail attach/unsubscribe on selection change.
   - Manual: Studio edit qty → Portal open detail updates; Portal edit → Studio selected detail updates; many-user cost narrative validated by scope (no load test required).

### Out of Scope

- Live-updating **entire** Studio Print Requests list for all tabs without selection (optional later).
- Live-updating every Show Queue show in the rail simultaneously beyond current selected-show pattern.
- Presence/cursors, collaborative simultaneous editing locks, or OT/CRDT.
- Changing allocation/cap business rules.
- Production deploy.

---

## Affected Areas

### Files / Modules (expected)
- `apps/studio/.../print-requests/hooks/usePrintRequestDetails.ts` (+ service subscribe helpers if missing)
- `apps/studio/.../print-requests/services/*` (Firestore subscribe for one request + items)
- `apps/portal/.../PrintRequestDetailView.tsx` / detail hooks / `portalPrintRequestService` (extend existing subscribe)
- Shared docs: WORKFLOWS or ARCHITECTURE note on selected-document live sync
- Tests: contract/unit around subscribe lifecycle

### Architecture Impact
- [x] Details: Extend existing Firestore `onSnapshot` patterns; keep UI → hooks → services. Prefer shared ref-counted subscribe helpers if Studio already has that pattern for shows.

### Security Impact
- [x] Details: Listeners must remain under existing Rules (customer own requests; staff via Studio rules). No new public endpoints. Do not broaden query scopes.

### Data Model Impact
- [x] None (read-path only)

### Backend Impact
- [x] None required for listeners (client SDK). No new Functions unless a gap forces it (prefer none).

### UI / UX Impact
- [x] Details: Open detail updates in place; avoid jarring full remounts; preserve scroll/focus where practical. Owner DEV QA for Studio↔Portal.

### Migration Impact
- [x] None

---

## Approach

1. Inventory exact Studio detail load path vs Portal detail subscriptions; list missing listeners.
2. Add Studio `subscribePrintRequest` + `subscribePrintRequestItems` (or reuse shared mapper) wired into `usePrintRequestDetails` for `printRequestId != null`.
3. Close Portal detail gaps (request doc + allocations affecting unallocated/show labels) with request-scoped listeners only.
4. Define local-edit vs remote-update merge rule; implement and test.
5. Contract tests for attach/detach; Owner DEV QA checklist.

---

## Test Strategy

### Automated
| Check | Required |
|---|---|
| Subscribe lifecycle contract tests (Studio + Portal) | Yes |
| Existing print-request item/summary tests still pass | Yes |
| Typecheck Studio + Portal | Yes |
| Lint changed files | Yes |

### Manual
| Check | Who |
|---|---|
| Studio change qty/size/add item → Portal open detail updates without refresh | Owner |
| Portal change → Studio selected request updates without refresh | Owner |
| Queue/unqueue from one app reflected in the other’s open detail chrome | Owner |
| Switching selected request tears down prior listeners (no cross-talk) | Owner / agent contract |

---

## Risks and Rollback

| Risk | Mitigation |
|---|---|
| Listener storms / double subscribe | Ref-count or single hook ownership; tests for detach |
| Overwriting local unsaved edits | Explicit merge rule; disable remote apply while dirty if needed |
| Extra Firestore reads | Selected-only scope; document; no global lists |
| Optimistic UI races | Reuse Portal generation/merge patterns where they exist |

Rollback: revert subscribe wiring; pages fall back to reload-on-focus/mutation.

---

## Human Checkpoints

- Owner DEV QA for cross-app live update feel
- No production deploy in this goal

---

## Open Questions

1. **Dirty-field policy:** When Studio staff is mid-edit on a quantity field and Portal also changes that item, should remote win immediately, or defer until blur/save? **Default proposal:** remote updates apply to non-focused fields; focused input keeps local value until blur/save, then refresh from server if still mismatched.
2. Confirm whether Studio list rail badges (Working/Queued) must live-update for **unselected** rows in v1. **Default proposal:** out of scope for v1; selected detail + Portal open detail only. List can refresh on next navigation or existing post-mutation reload.

---

## FreshForge Impact Classification

| Area | Impact |
|---|---|
| Starter Surface | No |
| Documentation | Yes |
| Development Tooling | No |
| Distribution | No |

---

## Acceptance Criteria

- [ ] Selected Studio Print Request detail reflects remote item/request changes without full page refresh.
- [ ] Open Portal Print Request detail reflects Studio (and other-client) changes without full page refresh for in-scope fields.
- [ ] Listeners are request-scoped and detach on selection change/unmount.
- [ ] No new global all-requests / all-shows live queries.
- [ ] Automated contracts + Owner DEV QA pass; no production deploy.
