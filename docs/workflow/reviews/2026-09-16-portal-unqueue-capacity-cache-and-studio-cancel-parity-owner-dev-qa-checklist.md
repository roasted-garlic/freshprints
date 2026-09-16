# Owner DEV QA Checklist: Portal unqueue cache + Studio cancel parity

| Field | Value |
|---|---|
| Goal | `portal-unqueue-capacity-cache-and-studio-cancel-parity` |
| Status | **Owner DEV QA PASS** |
| Environment | DEV only |
| Production | No production action authorized |
| Automated report | `2026-09-16-portal-unqueue-capacity-cache-and-studio-cancel-parity-test-report.md` |

## Preflight

- Portal: local/tunnel against DEV Firebase.
- Studio: DEV checkout; **staff remove requires Functions serving the updated** `unqueueStudioCustomerPrintRequestFromShow` (soft-cancel). If Studio still hits an old deployed Functions build, cancel-parity will not appear until that environment is updated (deploy remains separately unauthorized — use local functions/emulator if that is your DEV path).
- Portal cache fix is client-side and does not need a Functions deploy.

| # | Check | Result | Notes |
|---:|---|---|---|
| 1 | Queue a request to a show (or use one already queued). Note show capacity and personal spots. Remove it from the show in Portal. **Without refreshing the page**, open Add to Show for that request on the same show. Confirm show capacity and “Your print spots” **exclude** the just-removed quantity (no “29 of 25” / exhausted false positive). | **PASS** | Owner 2026-09-16 |
| 2 | With another request still using some spots on the show (e.g. 4), open Add to Show for a request whose true print qty is larger than remaining personal room (e.g. CR022 = 25). Confirm the block message uses the **true request qty** and remaining room (e.g. room for 21 of 25) — this is correct cap math, not a cache bug. | **PASS** | Owner clarified 2 designs / 25 prints expectation |
| 3 | In Studio Show Queue, staff-remove a customer Print Request from an open show. Confirm the row remains as **canceled / History only** (not gone), with zero current Designs/Items for that group. Confirm button shows **Removing…** and is disabled while the remove runs. | **PASS** | Owner 2026-09-16 |
| 4 | Re-add that request (or another) and confirm canceled history does not inflate personal cap or show capacity. | **PASS** | |
| 5 | No production console/deploy/write during QA. | **PASS** | |

## Owner result

* Owner QA outcome: `PASS`
* Owner notes: Confirmed designs vs prints distinction; remove Confirm busy feedback verified via follow-up fix during QA.
* Follow-up fixes required: none outstanding for this goal
* Promotion authorization: `NOT REQUESTED / NOT GRANTED`

Follow-up Signoff is recorded at
`docs/workflow/reviews/2026-09-16-portal-unqueue-capacity-cache-and-studio-cancel-parity-signoff.md`.
