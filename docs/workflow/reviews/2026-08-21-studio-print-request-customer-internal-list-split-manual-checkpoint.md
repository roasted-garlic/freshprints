# Human Checkpoint

| Field | Value |
|-------|-------|
| Date | 2026-08-21 |
| Workflow | managed-phase / test / `studio-print-request-customer-internal-list-split` |
| Reason | Owner Studio QA for Customer vs Internal Print Request lists |
| Status | **resolved** — owner `PASS` 2026-08-21 |
| Resolution | PASS |

---

## What We Need From You

Run the Studio Print Requests QA below against **local Studio → `fresh-prints-dev`** and reply `PASS`, `FAIL: …`, or `PASS WITH NOTES: …`.

---

## Context

Implement and automated Test are complete. Discriminator is persisted `isInternal`. Default view is **Customer Requests**. Composite index is on **`fresh-prints-dev` only**. No production index, PR, Studio release, Portal, Functions, Rules, schema, or data repair.

---

## Manual Test Required

**Feature / area:** Studio `/print-requests` Customer vs Internal lists

**Environment:** local Studio against `fresh-prints-dev`

**Prerequisites:**
- Staff login
- At least one customer request and one internal request
- DEV index deployed (done this session)

### Steps

1. Open Studio → Print Requests. → **Expected:** **Customer Requests** selected; no internal `IR###` rows.
2. Switch to Internal Requests. → **Expected:** only internal rows; no customer `CR###` rows.
3. Cycle Customer → Internal → Customer several times. → **Expected:** no extras, missing rows, or data changes.
4. Use Working / Queued / Printing / Printed and Working triage on each kind. → **Expected:** filters still work; counts match the selected kind.
5. Search on Customer, then switch to Internal (and reverse). → **Expected:** results are kind-scoped; search text stays unless it hides the selected row.
6. Create one customer request. → **Expected:** lands in Customer Requests, Working/Empty, selected; not in Internal.
7. Create one internal request. → **Expected:** lands in Internal Requests, Working/Empty, selected; not in Customer.
8. Open and edit one request from each list (quantity, valid print size, Add Designs, Duplicate, remove item). → **Expected:** unchanged vs current behavior.
9. Attach each type to Show Queue per existing rules. → **Expected:** both still attachable.
10. From Show Queue (or a `?requestId=` link), open a request of the other kind. → **Expected:** kind heading matches the request; no duplicate detail page.

Do not use name suffixes as the implementation discriminator. They are visual QA only.

### Pass criteria

- [ ] Customer and Internal are not mixed
- [ ] Default is Customer Requests
- [ ] Counts/search/filters scoped to kind
- [ ] Create lands in the matching list
- [ ] Deep link reconciles kind
- [ ] Switching lists does not write request data
- [ ] Sizing / Duplicate / Add Designs / Show Queue unchanged

### Please reply with

- `PASS` — all criteria met
- `FAIL: [description]`
- `PASS WITH NOTES: [notes]`

**Your result:** _pending_

If the list fails with a Firestore index error, or a request is missing from both lists, reply with that detail and **do not** ask for a second index or a data repair in this goal until reported.

---

## Impact If Delayed

Signoff stays blocked. Studio list split is not closed.

---

## Agent Actions While Paused

**Allowed:** Read docs, update checkpoint doc, answer clarifying questions

**Forbidden:** Production index/PR/deploy; extra indexes; data scan/backfill; Portal/Functions/Rules; expand scope

---

## Resolution Record

| Date | User response | Recorded in state | Follow-up |
|------|---------------|-------------------|-----------|
| 2026-08-21 | Kind tabs should match Users page Staff/Customers segmented control | yes | Applied `print-requests-kind-tab-bar`; remaining QA still pending |
| 2026-08-21 | `PASS` | yes | Signoff approved |

---

## Resume Checklist

- [x] User feedback recorded in `.cursor/workflow/state.md` Decision Log
- [x] `Human Checkpoint Required` set to `no` after PASS
- [x] Plan/review updated if scope changed
- [x] `Next Required Step` set for signoff after PASS
