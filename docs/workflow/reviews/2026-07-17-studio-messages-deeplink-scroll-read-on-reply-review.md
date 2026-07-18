# Review: Studio Messages deep-link scroll + mark read on reply

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Reviewer | Managing Agent |
| Plan | `docs/workflow/plans/2026-07-17-studio-messages-deeplink-scroll-read-on-reply-plan.md` |
| Verdict | **approved** |

---

## Summary

Narrow residual UX on the already-shipped Studio Messages inbox. Reuses existing ack service and `latestAssistedCreationCustomerUpdateAtMs`. No backend/Portal push surface. Correctly parks Portal Alerts human checkpoint separately.

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Studio renderer only |
| Architecture | pass | No new layers |
| Security | pass | Existing staff ack path |
| Data / backend | pass | None |
| Test strategy | pass | Shared tests + manual QA |
| No silent expansion | pass | Portal push untouched |

## Required Changes

None.

## Approval

`approved` — proceed to implement.
