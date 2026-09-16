# Owner DEV QA Checklist: Print Request count parity

| Field | Value |
|---|---|
| Goal | `print-request-count-parity-across-show-queue-and-summary-surfaces` |
| Status | **Owner DEV QA PASS WITH NOTES — follow-ups closed** |
| Environment | DEV only; localhost/tunnel workflow |
| Production | No production action authorized or performed |
| Automated report | `2026-09-16-print-request-count-parity-across-show-queue-and-summary-surfaces-test-report.md` |

Record Pass/Fail and a short note for each item. This checklist is intentionally not a signoff.

## DEV QA preflight

- Portal entry point: `http://localhost:3100/requests` or the configured DEV tunnel URL.
- Studio entry point: launch the existing DEV checkout with `npm run dev:studio`, then open Show Queue.
- Use DEV-authenticated data or an equivalent DEV fixture only. Do not open production Firebase,
  production callable URLs, production console tools, or production data during this checklist.
- At handoff, the local Portal endpoint and Studio Vite endpoint both responded with HTTP 200; this
  proves local reachability only and is not a substitute for visual or data QA.

| # | DEV QA check | Result | Notes / evidence |
|---:|---|---|---|
| 1 | Open the production-shaped or equivalent DEV Print Request and confirm full-request surfaces show **19 Designs / 25 Items (prints)**, even if the persisted row mirror is 20. Check Studio request rail/detail, Portal list/detail, Add-to-Show summary, queue-to-show remaining summary, and customer history card. | ☐ | Not fully exercised in this report; related DEV fixture `roasted_garlic-CR022` correctly shows **2 designs / 25 prints** (items qty 19 + 6). |
| 2 | Open the selected DEV Show Queue row and confirm it shows **19 Designs \| 25 Items \| Reg Full 19 · Reg Oversize 6 \| $56**. Confirm tiers, price, capacity, status, and top counters describe the same selected show's non-canceled allocation set. | ☐ | Deferred pending follow-up fixes. |
| 3 | Confirm canceled allocation history remains available for history/requeue/move context but does not inflate current counters. A canceled-only request/show group must show zero current counters and an explicit **History only** treatment. | **FAIL (partial)** | Portal customer remove keeps canceled rows (desired). Studio staff remove **deletes** allocation rows, so Show Queue no longer shows a canceled / History only row. Behavior must match regardless of actor. |
| 4 | Exercise or inspect remove/re-add, move-to-show, and Did Not Print requeue history. Confirm canceled source rows plus active destination rows do not double-count current Designs, Items, tiers, or price. | **FAIL** | Portal remove → immediate re-open Add to Show (no page refresh): show capacity and personal spots still include the just-canceled qty (`29 of 201` / `29 of 25 used` / exhausted copy). After refresh: show/personal usage heal to `4` (correct for remaining active PR), but request still correctly requests **25** prints (see Owner notes). Root cause for pre-refresh: `listPortalAllocatableShows` client read cache is not cleared on unqueue. |
| 5 | Check mixed catalog, customer-upload, and Staff Artwork items. Confirm duplicate rows for one artwork count once, equal raw IDs across source namespaces remain distinct, and malformed legacy rows do not merge. | ☐ | Deferred. |
| 6 | Check Staff Inbox queued glance and Portal Admin Show Queue metrics against the selected-show row. Confirm their Designs/Items values use active allocations and preserve existing permission/privacy boundaries. | ☐ | Deferred. |
| 7 | Confirm no production console, production callable, production Firestore/Storage write, deploy, or release action is performed during QA. | **PASS** | Investigation used read-only DEV Admin/ADC reads only. |

## Owner result

* Owner QA outcome: `PASS WITH NOTES` — blocking follow-ups closed under `portal-unqueue-capacity-cache-and-studio-cancel-parity` (Owner PASS 2026-09-16)
* Owner notes: CR022 is 2 designs / 25 prints; personal-cap overflow after refresh was correct. Pre-refresh cache and Studio delete-vs-cancel fixed in follow-up.
* Follow-up fixes required: completed (see follow-up signoff)
* Promotion authorization: `NOT REQUESTED / NOT GRANTED`

Owner DEV QA is complete. The separate Signoff is recorded at
`docs/workflow/reviews/2026-09-16-print-request-count-parity-across-show-queue-and-summary-surfaces-signoff.md`.
