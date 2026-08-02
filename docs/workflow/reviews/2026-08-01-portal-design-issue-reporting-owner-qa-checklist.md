# Owner QA checklist: Portal design issue reporting (development)

Date: 2026-08-01
Environment: `fresh-prints-dev` (Portal + Studio pointed at dev)
Branch under test: `feature/portal-design-issue-reporting`

Record **PASS**, **PASS WITH NOTES**, or **FAIL** for each item. Leave notes on anything not a
clean PASS. Do not promote to production until every item is PASS or PASS WITH NOTES with an
accepted note.

## Portal (customer-facing)

| # | Item | Result |
|---|------|--------|
| 1 | "Report an Issue" appears alone at the left of the design-details toolbar; Background/Share/Favorite are grouped at the right in that order; Add to request is a separate full-width row below | ______ |
| 2 | Report modal buttons: Cancel at the left edge, Submit Report at the right edge (opposite edges via `space-between`) | ______ |
| 3 | Report modal has an accessible top-right close control; Escape closes the modal when not submitting; Tab/Shift+Tab cycles focus within the modal only | ______ |
| 4 | Guest (signed-out) clicking "Report an Issue" is sent through login and returns to the same design | ______ |
| 5 | After returning from guest login, the correct design context (same design ID/modal) reopens | ______ |
| 6 | Design ID field is read-only and matches the currently selected design | ______ |
| 7 | Description validation: rejects under 10 and over 1,000 normalized characters; live counter is accurate; inline error is visible and announced | ______ |
| 8 | Submitting a valid report succeeds; a duplicate/rapid double-click does not create two reports (idempotent submit, button disabled in flight) | ______ |
| 9 | Success state shows the animated check, "Report sent" / "We'll take a look.", and a Done button; closing only happens via Done or a deliberate cancel before submit | ______ |
| 10 | Submitting a second report for a design that already has an open report from the same customer shows the correct one-open-report message instead of creating a duplicate | ______ |
| 11 | No native `alert`/`confirm`/`prompt` appears anywhere in the flow | ______ |
| 12 | Daily rate limit (10/day, America/Chicago) behaves correctly when reasonably testable | ______ |

## Studio (staff-facing, Inbox)

| # | Item | Result |
|---|------|--------|
| 13 | A newly submitted report arrives in the Inbox "Open" list once (not duplicated) and the bell/count updates | ______ |
| 14 | Submitter line shows display name, falling back to username, falling back to "Anonymous" | ______ |
| 15 | The exact customer-submitted report text renders unmodified; design title/thumbnail snapshot renders; no customer email or other private metadata is shown | ______ |
| 16 | "View Design" opens Design Details in place (no navigation away from Inbox) for a current, non-archived design | ______ |
| 17 | "View Design" correctly handles an archived design (opens with archived context) and a missing/purged design (safe unavailable message, report remains usable) | ______ |
| 18 | From the in-place Design Details view, Edit Design and Archive (with confirm dialog) both work correctly and update the underlying design | ______ |
| 19 | "Mark Resolved" removes the item from Open immediately (optimistic) and it appears under Done / Resolved design reports; if the resolve call fails, the item correctly returns to Open with a visible warning | ______ |
| 20 | Resolved-report history (Done tab) loads on demand, is bounded, and shows previously resolved reports correctly merged with just-resolved items | ______ |
| 21 | Owner, admin, and helper roles can all view and resolve reports; a non-staff or inactive-staff account cannot read or resolve reports | ______ |
| 22 | Existing Inbox items (portal queued, show queue full) still behave exactly as before — no regression from this feature | ______ |
| 23 | With `FP_FIRESTORE_TRACE=1`, confirm exactly one bounded `designIssueReports` listener attaches (`status==open`, `createdAt desc`, `limit(100)`), no per-card/per-design listener appears, navigating within Studio does not multiply the listener, and resolved history is a single bounded on-demand read (`limit(50)`), not a listener | ______ |

## General

| # | Item | Result |
|---|------|--------|
| 24 | No unexpected console errors, warnings, or visible error states anywhere in the tested flows | ______ |

## Sign-off

Overall verdict (PASS / PASS WITH NOTES / FAIL): ______

Notes:
