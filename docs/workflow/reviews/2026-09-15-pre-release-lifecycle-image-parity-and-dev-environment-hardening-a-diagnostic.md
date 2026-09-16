# DEV diagnostic: Internal Gang Sheet → Printed (Workstream A)

| Field | Value |
|-------|-------|
| Date | 2026-09-15 |
| Project | `fresh-prints-dev` (read-only Admin ADC) |
| Goal | `pre-release-lifecycle-image-parity-and-dev-environment-hardening` |

## Method

Read-only Firestore inspection of:

- all `upcomingShows` with `source == staff_gang_sheet`
- Internal `printRequests` with `queueTab == queued`
- linked `printRequestItems` + `showAllocations`

No writes.

## Current DEV inventory

| Observation | Value |
|---|---|
| Staff gang sheets (any status) | **1** |
| Completed staff gang sheets | **0** |
| Open staff gang sheets | **1** — `lrqRq2XFJ4LyYYFfEfrH` (“Internal Gang Sheet #2”, cycle 2, `allocatedQuantity` 19, `printFinishedAt` null) |
| Internal `queueTab=printed` | **0** |
| Internal `status=completed` | **0** |

## Sample stuck Queued Internal PR (representative)

`printRequestId`: `8w243Dx4P00jHPjxfXEI`

| Field | Value |
|---|---|
| `status` | `active` |
| `queueTab` | `queued` |
| Item qty sum | 5 |
| Printed qty (`done`/`printed`) | **0** |
| Allocations | 5 × `pending` qty 1, all on show `lrqRq2XFJ4LyYYFfEfrH` |

Same pattern on other queued samples (`Mb1o79z8LQq44cQKbCcY`, `gM1SgVwISsYBXjxcmQjL`, `wgx60AqsvsSoY77lvdyi`): all pending on the single open sheet.

## Classification

**H1-class / pre-finish state on current DEV** — not H2/H3/H4.

| Hypothesis | Match? |
|---|---|
| **H1** finish path did not land (allocations still pending) | **Yes for current data** — sheet still `open`; allocations still `pending`; printed qty 0 |
| **H2** partial multi-sheet | No — single show; full qty still pending |
| **H3** done + still queued (recompute miss) | **No evidence** on current DEV |
| **H4** UI cache only | N/A — Firestore itself shows `queueTab=queued` |

`queueTab=queued` is therefore **correct** for the current persisted state. There is no completed Internal Gang Sheet on DEV whose finish left stale Queued rows.

## Implementation implication

- Do **not** invent a second lifecycle or Move-to-Printed control.
- Do **not** change eligibility semantics (partial multi-sheet guards stay).
- Harden the existing Mark Complete path: behavioral coverage that finish → `done` → eligibility → `queueTab=printed`; Studio cache clear after success; optional reconciled IDs for client verify.
- Owner DEV QA must actually Mark Complete an Internal sheet and confirm Queued→Printed on fresh data.

## Note on cycle #2 without a completed #1

Only cycle #2 exists; zero completed sheets. Cycle #1 may have been deleted or created as #2 initially. That does not change the H1-class classification for current Queued rows.
