# Signoff: Print-request add-to-show stay on detail + Portal polish batch

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Signoff by | Signoff Agent |
| Goal | `print-request-add-to-show-selection-bounce` |
| Plan | `docs/workflow/plans/2026-07-13-print-request-add-to-show-selection-bounce-plan.md` (+ amendment) |
| Review | `docs/workflow/reviews/2026-07-13-print-request-add-to-show-selection-bounce-review.md` (+ amendment review) |
| Test report | `docs/workflow/reviews/2026-07-13-print-request-add-to-show-selection-bounce-test-report.md` |
| Final status | **approved_with_notes** |

---

## Summary

Closed the Add-to-Show / queue-to-show selection bounce: Portal and Studio stay on request detail after queue/add, ShowPicker calendar stays mounted through capacity celebrate, and Queued progress shows wait copy until printing starts. Same owner PASS also covers related Portal polish delivered in-session: optimistic first catalog add, discover home URL remap, sidebar edge-tab chrome, nav Upload placement, and account **Your designs** gallery/overview stats.

---

## Changes Delivered

### Core goal behavior

- Portal: stay on `/requests/[id]` after queue-to-show; silent refresh; no bounce to Queued list
- Studio: follow selection to Queued with `requestId` + tab; no empty-list bounce
- Studio + Portal: Keep ShowPicker mounted during submit/celebrate; close modal before parent refresh
- Portal Queued progress: “Waiting for the printing to start” until show is printing

### Related session polish (same PASS)

- Optimistic first catalog add (coalesced create; stash badge/qty/toast immediate)
- Discover at `/`; Design Library at `/catalog`; Home nav removed; logo → `/`
- Desktop sidebar: outside edge tab open/close (no desktop hamburger); mobile hamburger retained
- Bottom nav: Library · FAB · Upload; Print Requests via account
- Account Overview: uploaded/donated counts + designs gallery (5 preview tiles, View more modal with All/Uploaded/Donated)
- Studio Design Details: Origin (Customer upload / Staff import) + clearer upload doc / customer profile IDs

### Documentation

- Plans/reviews/amendments/manual checkpoint/test report under `docs/workflow/`

---

## Tests

### Automated

- Shared print-request tab selection utils: **pass** (8)

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Add-to-show / queue-to-show + polish checkpoint | **PASS** | owner (2026-07-13) |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Manual UI | obtained | 2026-07-13 | PASS |
| Production deploy | not required | | |
| Database migration | N/A | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Account gallery only lists customer uploads/donations (not catalog picks) | low | Expected; empty copy explains |
| Session polish lacked separate micro-plans | low | Folded into this signoff under owner PASS |

---

## Deferred Items (Roadmap)

- None from this goal; import AI closed in parallel signoff

---

## Open Blockers

- [x] None

---

## Verdict

**approved_with_notes** — Owner PASS on core queue/add behavior plus in-session Portal chrome/account gallery polish.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated
- [x] `ROADMAP.md` updated
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated

**Recommended next action for user:** Pick next goal explicitly (Phase 9 planning, production Portal deploy, or monorepo normalization) — do not auto-start.
