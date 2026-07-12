# Plan: Request detail empty-header actions + contextual Back (remediation r5)

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Status | ready_for_review |
| Related | portal-customer-artwork-upload UX follow-up |

## Goal
1. Hide top Upload/Add (and Add to show is already gated) until the request has at least one attached item; empty state keeps the CTAs.
2. Back link/label reflects navigation origin via `from` query param, not only derived list tab.

## Scope
- PrintRequestDetailView header gating
- `from` param helper + wire from cards, start flow, catalog exit, upload deep-link
- Preserve `from` when clearing `upload=1`

## Out of scope
- Backend; production deploy; Studio

## Approach
Shared parse/build/resolve helpers; callers pass `from=discover|library|working|queued|printing|printed`.

## Test
Portal typecheck + manual: empty request no header buttons; Back from Discover says Discover; Back from Working tab says Working.
