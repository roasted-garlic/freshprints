# Signoff: Cap A exhausted card/modal copy (status only)

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-07-19-cap-a-exhausted-card-modal-copy-plan.md |
| Review | docs/workflow/reviews/2026-07-19-cap-a-exhausted-card-modal-copy-review.md |
| Test report | — (manual QA only; no separate test report) |
| Final status | **approved** |

---

## Summary

Portal Cap A exhaustion on design cards and add-to-request modals now shows only **“Daily print limit reached”**. Page banner and Current Request drawer keep the situational helper (e.g. “Add your Current Request to a show.”). Owner soft-reload QA: **PASS**.

This polish was completed while Cap B allotment bug remained the active managed phase; Cap B is unchanged and still in progress.

---

## Changes Delivered

### Behavior
- Cards/modals: status line only via `formatCapAExhaustedStatusLine()`
- Banner + Current Request drawer: still show `exhaustedHelperText` under status / meta
- Doc comment on helper clarifying cards/modals must not append it

### Files Modified (representative)
- `packages/shared/src/utils/printRequestQuotaUserCopy.ts` (+ tests)
- Catalog card / selection card / details modal
- `PortalPrintRequestItemCard`, assisted creation / customer upload Cap A hints
- Banner and drawer left with full helper (intentional)

### Documentation Updated
- Plan + review for this polish; this signoff

---

## Tests

### Automated
- Existing shared unit coverage for `formatCapAExhaustedStatusLine()` (prior / in-scope suite); no Cap A backend changes

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Soft-reload Portal: cards/modals status-only; banner/drawer keep helper | PASS | owner |

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | | |
| Database migration | not required | | |
| Design / UX | obtained | 2026-07-19 | Owner PASS on Cap A card/modal copy polish |
| Business / policy | not required | | |
| Secrets / env | not required | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| None for this polish | — | — |

---

## Deferred Items (Roadmap)
- Cap B split UI allotment bug (active managed phase)
- Other parked owner-QA items (unchanged)

---

## Open Blockers
- [x] None (for this polish)

---

## Verdict

**approved** — Owner PASS; copy split matches plan. Cap B remains active; do not set overall workflow `DONE: yes` for this polish alone.

---

## Workflow Complete
- [x] Cap A polish closed in Decision Log + Parked Also cleared for this item
- [ ] Overall managed phase `DONE: yes` — **no** (Cap B still active)
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated
- [ ] ROADMAP — N/A (polish; no roadmap entry)

**Recommended next action for user:** Continue Cap B: harden client + unit tests; deploy queuePortalPrintRequestToShow + listPortalAllocatableShows to fresh-prints-dev; then test phase.
