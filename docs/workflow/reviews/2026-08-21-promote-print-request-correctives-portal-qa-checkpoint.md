# Human Checkpoint — Portal production smoke (PR #84)

| Field | Value |
|-------|-------|
| Date | 2026-08-21 |
| Workflow | managed-phase / implement / `promote-print-request-correctives-to-production` |
| Reason | Gate D App Hosting is LIVE. Owner must smoke Portal sizing on production. Studio list-split waits for a new version. |
| Status | **pending** |
| Resolution | pending |

---

## What We Need From You

Smoke Portal print-request sizing on **production** `https://myprintrequest.com`, and name the next Studio version if you want Gate E.

---

## Context

PR **#84** is merged at `7716d4a`. Indexes READY. Function `queuePortalPrintRequestToShow` `00005-lek` ACTIVE. Portal build **`fresh-prints-portal-build-2026-08-21-001`** is **100%** on that SHA.

Published Studio remains **1.0.7**. Do not QA Customer/Internal list split on 1.0.7.

Rollback Portal: `fresh-prints-portal-build-2026-08-19-001` @ `99b2303`.

---

## Manual Test Required

**Feature / area:** Production Portal print-request sizing + queue inches  
**Environment:** production (`https://myprintrequest.com`)  
**Why automated tests are insufficient:** UI persistence, DPI warnings, and queue inches need a real request.

**Prerequisites:**
- Logged-in production customer (or staff using Portal as a customer)
- A production-safe test show if you queue (do not create destructive fixtures)

### Steps (Portal — do now)

1. Add a high-resolution catalog design sized about `14 × 21.1` → **Expected:** adequate DPI accepted.
2. Refresh the request → **Expected:** size persists.
3. A size in the 200–299 DPI band → **Expected:** warns but allows.
4. Below 200 effective DPI → **Expected:** blocks save.
5. Greater than 22″ → **Expected:** blocks save.
6. Queue that sized request to a production-safe test show → **Expected:** Studio Show Queue (current 1.0.7) shows exactly those inches (queue integrity is Function + shared data; Show Queue already reads requested inches).

### Steps (Studio lists — wait for Gate E)

Do **not** mark these on 1.0.7:

- Customer vs Internal kind switcher
- Kind-scoped Working/Queued/Printing/Printed counts
- Add Designs keep-existing-item / Duplicate second-size (needs the new Studio build)

### Pass criteria (Portal now)

- [ ] High-res ~14×21.1 accepted and persists after refresh
- [ ] 200–299 DPI warns but allows
- [ ] Below 200 DPI blocks
- [ ] Over 22″ blocks
- [ ] Queued inches match (if a safe show was used)

### Please reply with

- `PROD PRINT REQUEST CORRECTIVES QA: PASS` — if Portal criteria met **and** you are deferring Studio list QA until after publish
- `FAIL: [description]`
- `PASS WITH NOTES: [notes]`

And separately, when ready for Studio:

```text
APPROVE STUDIO VERSION: <x.y.z>
```

Do not reuse **1.0.7**.

**Your result:** _pending_

---

## Agent Actions While Paused

**Allowed:** Read docs, update checkpoint, answer questions  
**Forbidden:** Invent Studio version; publish Studio; extra Functions; Rules; App Hosting re-rollout; schema/backfill
