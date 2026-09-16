# Owner DEV QA Checklist: Selected Print Request live sync

| Field | Value |
|---|---|
| Goal | `selected-print-request-live-sync-studio-portal` |
| Status | **PASS — Owner DEV QA complete** |
| Environment | DEV only |
| Production | Not authorized |

| # | Check | Result | Notes |
|---:|---|---|---|
| 1 | Open a request in Portal detail. In Studio, change qty/size or add/remove an item on that request. Confirm Portal updates **without refresh**. | PASS | Owner 2026-09-16 |
| 2 | Select the same request in Studio. In Portal, change an item. Confirm Studio selected detail updates **without refresh**. | PASS | Owner 2026-09-16 |
| 3 | Queue or unqueue from one app while the other has the request open; confirm status/unallocated/show chrome updates without refresh. | PASS | Owner 2026-09-16 |
| 4 | Switch Studio selection to another request; confirm no cross-talk from the previous request’s updates. | PASS | Owner 2026-09-16 |
| 5 | On Portal detail, step item quantities with +/-. Confirm the header **designs / prints** badges update to match the sum of card quantities **without refresh** (not stuck on an old list-cache total). | PASS | Follow-up re-test |
| 6 | Rapid +/- on one design (e.g. 19→14→15) with both Portal and Studio open on that request. Confirm both settle on the **same** final quantity without needing a Portal refresh; no lasting Portal/Studio mismatch. | PASS | Follow-up re-test |
| 7 | No production console/deploy during QA. | PASS | |

## Owner result

* Owner QA outcome: **PASS** (2026-09-16)
* Prior notes: header counts lagged; rapid +/- left Portal 15 vs Studio 14 until Portal refresh — addressed in follow-up and re-verified
* Signoff: `docs/workflow/reviews/2026-09-16-selected-print-request-live-sync-studio-portal-signoff.md`
