# Review: Studio Assisted Messages Inbox

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Reviewer | Managing Agent |
| Plan | `docs/workflow/plans/2026-07-17-studio-assisted-messages-inbox-plan.md` |
| Verdict | **approved** |

---

## Summary

Plan correctly reuses `assistedCreationUpdateAcks` and mirrors the alerts bell UI without overloading print-request inbox. Parking the next-queue (message/notes deploy, invite continue URL, Brevo) is required and documented. Dropping stage/list badges in favor of the header inbox matches owner intent.

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Studio header inbox + deep-link; no Portal inbox / Brevo |
| Architecture | pass | UI pattern from StaffInboxBell; ack model unchanged |
| Security | pass | Existing staff ack rules only |
| Data / backend | pass | No new collection; no Functions for inbox |
| Test strategy | pass | Shared tests + Studio build + manual QA |
| No silent expansion | pass | Next-queue parked explicitly |
| Badge decision | pass | Remove scattered; keep thread Read |

## Required Changes

None.

## Approval

`approved` — proceed to implement.
