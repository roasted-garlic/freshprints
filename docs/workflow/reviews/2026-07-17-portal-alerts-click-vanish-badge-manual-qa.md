# Manual QA: Portal Alerts — click vanish + circular badge

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Feature | Portal header Alerts residual UX |
| Environment | local Portal (`apps/portal`, typically http://localhost:3100) |
| Plan | docs/workflow/plans/2026-07-17-portal-alerts-click-vanish-badge-plan.md |

---

## Prerequisites

- Portal running locally with a customer account that has at least one **unread** alert (or trigger a staff message to create one).
- Hard-refresh Portal after pulling these local changes.

---

## Manual Test Checkpoint

**Feature / area:** Portal header Alerts — list stability on click + badge shape  
**Why automated tests are insufficient:** Visual badge geometry and click→navigate timing need human eyes  
**Environment:** local  
**Prerequisites:** Unread notification present; logged-in customer

### Steps

1. Open Portal header → click **Alerts** so the dropdown shows an unread item.  
   → **Expected:** Item listed; red unread count badge on the Alerts control looks **circular** (or near-circle) for a single digit like `1`, not a wide oval/pill. Badge should look **small** relative to the Alerts pill (height/min-width `0.95rem`, font `0.55rem` — not chunky / letter-height).

2. Click the unread notification row.  
   → **Expected:** The row does **not** flash away / empty the panel awkwardly before navigation. Panel closes cleanly and you land on the linked request/proof page. (Badge may drop to zero after mark-read — that is OK.)

3. If you can create a second unread, open Alerts with **two** unreads and click one.  
   → **Expected:** Clicked row stays visible until the panel closes; no “You're all caught up” empty flash mid-click.

4. (Optional) With `9+` style counts if available, confirm multi-digit / `9+` badge remains readable (short pill OK).

### Pass criteria

- [ ] Single-digit unread badge is circular / near-circular and noticeably smaller than the Alerts label text
- [ ] Clicking a notification navigates without the list item vanishing first in a jarring way
- [ ] No empty-panel flash before redirect when that was the only unread

### Please reply with

- `PASS` — all criteria met  
- `FAIL: [description]` — what failed  
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

---

## Result

| Field | Value |
|-------|-------|
| Result | **PASS** (absorbed) |
| Recorded | 2026-07-17 |
| Notes | Absorbed into `portal-notification-history-modal`; owner PASS on unread Alerts + history modal + deep-links covers click-vanish/badge criteria. |
