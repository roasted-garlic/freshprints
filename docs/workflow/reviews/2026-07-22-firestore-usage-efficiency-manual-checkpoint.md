# Human Checkpoint: Firestore Usage Efficiency — Manual QA

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Workflow | managed-phase / test / `firestore-usage-efficiency` |
| Reason | Manual UI + listener/realtime verification and before/after DEV tracer comparison |
| Status | **resolved** |
| Resolution | PASS (owner 2026-07-22) |

---

## What We Need From You

Run the Studio + Portal manual script below (with DEV tracer enabled), confirm workflows still behave correctly, then reply **PASS**, **FAIL: …**, or **PASS WITH NOTES: …**.

---

## Context

Implemented Wave **A1–A5**, **B1–B3**, and **M1** (DEV tracer). **B4 Discover trim deferred.** Wave C not implemented.

Key behavior changes to verify:
- Sidebar pending badges still update (one shared listener)
- Assisted Messages + Assisted tab share one recent feed
- AI Review tab counts still correct (aggregation + Processing server filter)
- Portal Library pages without always hydrating full catalog; search/multi-tag still works
- Portal shell loads continuable requests only until `/requests` or `/dashboard`
- Account artwork gallery still shows recent confirmed uploads
- Discover home rails unchanged (B4 deferred)

Plan: `docs/workflow/plans/2026-07-22-firestore-usage-efficiency-plan.md`  
Test report: `docs/workflow/reviews/2026-07-22-firestore-usage-efficiency-test-report.md`

---

## Measurement (before/after)

### Enable DEV tracer

In Studio DevTools console and Portal browser console (each app):

```js
localStorage.setItem('FP_FIRESTORE_TRACE', '1')
```

Reload the app. After the script, dump:

```js
window.__fpFirestoreTrace.dump()
```

Record peak concurrent listeners and notable `reads` / `listenerAttaches` keys. Compare a cold run if you still have a pre-change baseline; otherwise treat this as the post-change baseline and note remount behavior when leaving/returning pages.

Tracer is **count + key only** (no document bodies / PII). Leave disabled afterward:

```js
localStorage.removeItem('FP_FIRESTORE_TRACE')
```

---

## Manual Test Required

**Feature / area:** Firestore usage efficiency (Studio + Portal)  
**Environment:** local (`fresh-prints-dev`)  
**Prerequisites:** Staff Studio login; Portal customer login with a working request + catalog access; tracer flag as above

### Steps

1. Cold-open Studio → **Expected:** app loads; sidebar badges appear without errors.
2. Visit Imports → **Expected:** page loads.
3. Visit AI Review (Processing + Needs Review) → **Expected:** queues load; tab counts look sane; Processing updates when status changes.
4. Visit Design Library → leave → return → **Expected:** designs load; no multiply-growing errors; tracer listener keys for Assisted/pending do not double unboundedly on return.
5. Visit Print Requests (list + open a detail) → **Expected:** list and detail work.
6. Visit Show Queue → **Expected:** shows/allocations still update operationally.
7. Visit Customer Uploads → **Expected:** intake list loads; sidebar pending counts match.
8. Open Assisted / Custom Designs (Customer Requests) with Messages panel available → **Expected:** list and messages stay in sync (shared subscription).
9. Cold-open Portal → Discover home → **Expected:** all Discover rails still present (no B4 trim).
10. Visit Library browse (no search) → scroll / Load more → **Expected:** more designs load without waiting on full-catalog hydrate.
11. Enter a search and/or 2+ tags → **Expected:** results filter across the matching set (hydrate may run).
12. Open Current Request drawer + header badge → **Expected:** working items/qty correct.
13. Visit `/requests` tabs → **Expected:** history/queued/printed tabs populate (full scope load).
14. Visit progress tabs → **Expected:** progress still works.
15. Navigate away and return to Discover / Library / Current Request → **Expected:** no obvious duplicate-subscription blow-up in tracer.
16. Add a catalog design to the request → **Expected:** item appears; one-working-request rule intact.
17. Add a customer upload path as usual → **Expected:** attach/processing still works.
18. Edit quantity and print size → **Expected:** saves; unchanged size should not needlessly rewrite if already correct.
19. Attempt save below 200 effective DPI → **Expected:** still blocked.
20. Queue a request to a show (if safe in dev) → **Expected:** queue still works.
21. Account overview artwork gallery → **Expected:** recent confirmed uploads/donations still show (up to recent 150 fetch window).

### Pass criteria
- [x] Studio shell badges and AI Review usable
- [x] Portal Discover rails unchanged
- [x] Library browse pages; search/multi-tag still works
- [x] Current Request + `/requests` tabs correct
- [x] Product rules preserved (one working request, 200 DPI, uploads)
- [x] Tracer dump captured (post-change); remount does not obviously multiply always-on listeners
- [x] No production deploy performed

### Please reply with
- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

**Your result:** **PASS** (owner 2026-07-22)

---

## Impact If Delayed

Signoff for `firestore-usage-efficiency` remains blocked.

---

## Agent Actions While Paused

**Allowed:** Read docs, update checkpoint/test docs, answer clarifying questions  

**Forbidden:** Further implementation, Wave C, B4, production deploy, rules/index deploys, migrations

---

## Resolution Record

| Date | User response | Recorded in state | Follow-up |
|------|---------------|-------------------|-----------|
| 2026-07-22 | PASS | yes | Signoff approved; B4 / Wave C remain deferred |
