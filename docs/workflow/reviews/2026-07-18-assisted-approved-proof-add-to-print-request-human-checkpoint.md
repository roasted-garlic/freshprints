# Human Checkpoint: Assisted proof → print request defaults

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Feature | Small Managed Items #1 — Add approved Assisted proof to Current Request / Stash |
| Plan | docs/workflow/plans/2026-07-18-assisted-approved-proof-add-to-print-request-plan.md |
| Review | docs/workflow/reviews/2026-07-18-assisted-approved-proof-add-to-print-request-review.md |
| Status | **approved** |

---

## Why we stopped

Approved assisted art is download-only today. Adding it to a print request needs a few product choices before code.

## Recommended defaults (confirmed)

| # | Decision | Recommendation | Owner |
|---|----------|----------------|-------|
| A | Where does it go? | Always **Current Request / Your Stash** (create working request if empty) | Approved |
| B | What kind of line item? | Private **customer upload** (not catalog / not AI Review) | Approved |
| C | Quantity & size | Qty **1**; print size from image pixels (same as customer artwork uploads) | Approved |
| D | Storage | **Server copies** the PNG into upload storage so it survives the 14-day assisted purge | Approved |
| E | When is the button shown? | While the full-res still exists, or if already added; hide if purged and never added | Approved |
| F | Catalog listing? | **No** — private print-only | Approved |
| G | Duplicate clicks? | Idempotent — one line on the working request per assisted request | Approved |
| H | Button label | **Add to Request** (beside Download PNG; matches other add-to-request CTAs) | Approved (clarified 2026-07-18) |
| I | Past requests? | **No** — working request only | Approved |
| J | Validation | Same Stash attach path as customer upload, **except** skip PNG / transparency / “is this a good image” gates (staff-provided art) | Approved |
| K | Chrome pill | **Current Request** (header pill + FAB/drawer aria/title; not “Your Stash”) | Approved (clarified 2026-07-18) |

## Owner confirmation

- **2026-07-18** — Owner replied `APPROVE DEFAULTS` + notes (Overview single Approved Design card; Download PNG \| Add to Request; skip customer upload quality gates; server copy; idempotent; no production).
- **2026-07-18 (copy clarify)** — Button label exactly **Add to Request**; header/cart chrome pill **Current Request** (not Your Stash).

## Please reply with

- ~~`APPROVE DEFAULTS`~~ — recorded
- `APPROVE WITH NOTES: …` — list any changes (e.g. label “Add to Your Stash”, allow catalog promote, etc.)
- `FAIL / CHANGE: …` — different product path

After confirmation, implementation proceeds for **#1 only** (no production; commit only if you ask).
