# Signoff: One working print request per portal customer

| Field | Value |
|-------|-------|
| Date | 2026-07-11 |
| Verdict | **pending_human** — code complete; await deploy + manual QA |

## Delivered

- `createPortalPrintRequest` blocks second `draft`/`editing` (transactional)
- Firestore index `printRequests`: `customerId` + `status`
- Portal Start/FAB continues existing working request; no “Start new” beside open draft
- Pick modal: pick only (no start new)
- ADR-FP-071 + DATA_MODEL + ADR-FP-067 update
- Unit tests PASS

## Manual tests requested

### Manual Test Checkpoint

**Feature / area:** One working print request  
**Why automated tests are insufficient:** Callable + UI entry points need live Firebase  
**Environment:** local Portal + deployed `createPortalPrintRequest` on fresh-prints-dev  
**Prerequisites:** Deploy function + indexes

### Steps
1. With no draft → Start request → creates and opens selection → **Expected:** new draft created  
2. With that draft open → FAB / Start / Continue → **Expected:** opens existing request, no second create  
3. Call create again (or double-submit) → **Expected:** friendly failed-precondition message  
4. Queue request to a show → Start request again → **Expected:** can create a new draft  

### Pass criteria
- [ ] Cannot create a second working request while one `draft`/`editing` exists
- [ ] UI never offers “Start new” when a continuable request exists
- [ ] After queue, a new request can be started

### Please reply with
- `PASS` / `FAIL: …` / `PASS WITH NOTES: …`

## Human approvals

- Deploy `createPortalPrintRequest` + Firestore indexes required before production use of the lock
