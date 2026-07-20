# Small Managed Items #2 & #3 — Settings requirement note (2026-07-18)

**Status:** #2 Done (PASS). #3 expanded plan: `2026-07-18-print-request-show-caps-plan.md`.

| # | Cap | Settings expectation |
|---|-----|----------------------|
| 2 | Upload caps — requests **down**, donations **up** | **Done** (PASS 2026-07-18) — Studio Settings + `settings/customerUploadQuotas` (ADR-FP-095) + Portal polish |
| 3 | **(A)** Daily designs added to print requests (Chicago) + **(B)** max quantity per show per customer | **In progress** — Studio Settings “Print request limits”; `settings/printRequestLimits`; defaults A=20, B=20 |

## #3 decisions (locked)

- Ship **both** caps; one alone is weaker against flood → queue → repeat.
- Cap A charges **+1 per new `printRequestItems` line** only; resets midnight America/Chicago.
- Cap B on queue: existing customer qty on show + new request qty ≤ setting.
- Reuse Studio Settings + Firestore `settings` patterns (`customerUploadQuotas`).
- Owner-editable; Functions enforce with code defaults.
