# Signoff: Portal copy/UX polish batch (callout, bidding ack v3, qty select, past-show chips)

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Signoff by | Signoff Agent |
| Plan | Side polish during Cap B allotment bug phase (no separate polish plan) |
| Review | — |
| Test report | — (manual QA only) |
| Manual QA | Cap B callout soft-reload; bidding ack v3; split qty auto-select; yellowish past-show chips |
| Final status | **approved** |

---

## Summary

Owner soft-reload / manual QA: **PASS on everything** for this Portal polish batch (2026-07-19). Copy/UX items below are closed. The Cap B split allotment bug managed phase remains **active** (implement/test) and is **not** closed by this signoff.

---

## Changes Delivered (closed as PASS)

| # | Item | Result |
|---|------|--------|
| 1 | Cap B calendar/split callout title + body (`Each Customer Is Limited to…` / Cap A + fitting qty placeholders) | **PASS** |
| 2 | Bidding acknowledgments **v3** (Request Portal Acknowledgment + Add to Show Print Run): exclusive gang-sheet paragraph, funkyfreshprints.com link; Functions redeployed | **PASS** |
| 3 | Auto-select on “Add to this show” qty inputs in `PortalQueueSplitSelectionModal` | **PASS** |
| 4 | Yellowish passed-show calendar day chips (`is-past-only` / warning token mixes) | **PASS** (confirmed; Decision Log already had PASS) |

---

## Manual tests

| Test | Result | Approved by |
|------|--------|-------------|
| Cap B split callout title + body after soft-reload | PASS | owner |
| Bidding ack modals v3 (copy + link; version stored) | PASS | owner |
| Split selection qty inputs select-on-focus | PASS | owner |
| Passed-show yellowish day chips | PASS | owner |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Design / UX | obtained | 2026-07-19 | Owner PASS on polish batch |
| Production deploy | not required | | Dev Functions redeploy for bidding ack v3 only |

---

## Deferred / still active

- **Cap B split UI allotment bug** — active managed phase; 25+25 queue-only-selected re-test may still be needed (see `2026-07-19-cap-b-split-queue-allotment-bug-manual-qa.md`)
- Other parked owner-QA items (unchanged)

---

## Verdict

**approved** — Polish batch closed with owner PASS. Do **not** set overall workflow `DONE: yes`; Cap B allotment bug continues.

---

## Workflow Complete

- [x] Decision Log + polish human checkpoints cleared for these items only
- [ ] Overall managed phase `DONE: yes` — **no** (Cap B still active)
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated

**Recommended next action:** Continue Cap B allotment bug test/signoff (manual 25+25 queue re-test as needed).
