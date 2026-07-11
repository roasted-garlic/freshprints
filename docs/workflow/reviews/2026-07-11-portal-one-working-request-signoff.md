# Signoff: One working print request per portal customer

| Field | Value |
|-------|-------|
| Date | 2026-07-11 |
| Verdict | **approved_with_notes** — owner accepted done in parked-follow-ups batch closeout |

## Delivered

- `createPortalPrintRequest` blocks second `draft`/`editing` (transactional)
- Firestore index `printRequests`: `customerId` + `status`
- Portal Start/FAB continues existing working request; no “Start new” beside open draft
- Pick modal: pick only (no start new)
- ADR-FP-071 + DATA_MODEL + ADR-FP-067 update
- Unit tests PASS

## Manual / human

| Item | Result |
|------|--------|
| Owner acceptance | **PASS WITH NOTES** (2026-07-11) — closed with parked batch; see `2026-07-11-parked-followups-batch-closeout-signoff.md` |

## Notes

If a second working request can still be created in a given environment, redeploy `createPortalPrintRequest` and ensure the `customerId` + `status` index is built.
