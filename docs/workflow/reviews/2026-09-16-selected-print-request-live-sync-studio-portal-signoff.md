# Signoff: Selected Print Request live sync (Studio ↔ Portal)

| Field | Value |
|-------|-------|
| Date | 2026-09-16 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-09-16-selected-print-request-live-sync-studio-portal-plan.md` |
| Review | `docs/workflow/reviews/2026-09-16-selected-print-request-live-sync-studio-portal-formal-review.md` |
| Test report | `docs/workflow/reviews/2026-09-16-selected-print-request-live-sync-studio-portal-test-report.md` |
| Owner DEV QA | `docs/workflow/reviews/2026-09-16-selected-print-request-live-sync-studio-portal-owner-dev-qa-checklist.md` |
| Final status | **approved** |

---

## Summary

Closed managed goal `selected-print-request-live-sync-studio-portal`. Request-scoped Firestore listeners keep the selected Studio Print Request and open Portal detail fresh across apps without full page refresh. Owner DEV QA follow-ups fixed Portal header counts preferring live items and rapid +/- qty races via shared prop-sync guards. Owner recorded **PASS**. No production deploy.

---

## Changes Delivered

### Behavior
- Studio selected Print Request: live subscribe request document + items; tear down on selection change/unmount.
- Portal open detail: live subscribe request, items (when not Working-cart-driven), and allocations for show chrome.
- Portal detail header design/print badges prefer live open-page `items` summary over list-cache `summariesByRequestId`.
- Item cards (Portal + Studio): remote snapshots apply only when local draft is clean; pending debounce/in-flight/queued/dirty edits hold remote apply (`printRequestItemPropSyncGuard`).
- Studio save returns updated item so prop-sync can advance `lastAccepted` from server `updatedAt`.

### Files Created
- `packages/shared/src/utils/printRequestItemPropSyncGuard.ts` (+ test)
- Studio/Portal liveSync contract tests
- Plan, formal review, test report, Owner DEV QA checklist, this signoff

### Files Modified (selected)
- `apps/studio/.../usePrintRequestDetails.ts`, `printRequestService.ts`, `PrintRequestItemCard.tsx`, `PrintRequestsPage.tsx`
- `apps/portal/.../usePrintRequestDetail.ts`, `portalPrintRequestService.ts`, `PrintRequestDetailView.tsx`, `PortalPrintRequestItemCard.tsx`
- `docs/WORKFLOWS.md`, `docs/standards/TESTING.md`, `docs/project/ROADMAP.md`

### Documentation Updated
- WORKFLOWS live-sync section; TESTING commands; ROADMAP closed entry

---

## Tests

### Automated
- liveSync + prop-sync + count parity contracts: **17/17 PASS** (follow-up suite)
- Portal + Studio typecheck: **PASS**
- Initial goal lint on changed files: **PASS**

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Owner DEV QA checklist (incl. header live counts + rapid +/- parity) | **PASS** | Owner 2026-09-16 |

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | 2026-09-16 | Out of scope; not authorized |
| Database migration | N/A | | |
| Design / UX | obtained via Owner DEV QA PASS | 2026-09-16 | Live feel verified on DEV |
| Business / policy | N/A | | |
| Secrets / env | N/A | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Unselected Studio Print Requests list rail not live | Low | Deferred; selected/open only by design |
| Simultaneous multi-editor OT/CRDT not supported | Low | Dirty-local holds remote; last write wins at Firestore |
| Full-site realtime for all requests/shows | N/A | Explicitly out of scope |

---

## Deferred Items (Roadmap)
- Live-updating entire Studio Print Requests list without selection
- Presence/cursors or collaborative locks

---

## Open Blockers
- [x] None

---

## Verdict

**approved** — Plan reviewed, implementation in scope, automated tests passed, Owner DEV QA **PASS** after follow-up fixes. No outstanding human checkpoints. Production remains separately gated.

---

## Workflow Complete
- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] `RISK_REGISTER.md` updated if needed — no new production risk
- [x] **`references/project-chatgpt-handoff/CURRENT-STATE.md`** — handoff package not present in repo; skipped
- [x] Handoff `13-recent-completed-work.md` — N/A (package absent)

**Recommended next action for user:** Say next managed-phase goal, or `commit` / `push` if you want these changes on `development`. No production deploy authorized.
