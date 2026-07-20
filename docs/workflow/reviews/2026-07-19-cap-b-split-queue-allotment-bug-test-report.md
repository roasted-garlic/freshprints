# Test Report: Cap B split queue allotment bug

| Field | Value |
|-------|-------|
| Date | 2026-07-19 (second pass) |
| Plan | docs/workflow/plans/2026-07-19-cap-b-split-queue-allotment-bug-plan.md |
| Review | docs/workflow/reviews/2026-07-19-cap-b-split-queue-allotment-bug-review.md |
| Result | **pending_manual** (unit + deploy passed; owner re-test required) |

---

## Root cause (confirmed, with evidence)

| Hypothesis | Result |
|------------|--------|
| Client drops `selections` after bidding ack | **Hardened** — split path now snapshots selections into a ref at “Add to show” (before ack); submit never re-derives / omits on that path |
| Server ignores selections / no Cap B | **Confirmed for git HEAD** — committed callable has no Cap B / `selections`. Working tree + deploy include both. Successful queue of 50 with Cap B=25 implies the live function was still pre-split (Cap B would otherwise reject). |
| Stale / overwritten deploy | **Likely** — Cap B never committed; deploys from wrong tree or timing can leave pre-split callable live |

---

## Automated

| Check | Command | Exit | Notes |
|-------|---------|------|-------|
| Unit | `npx tsx --test` on `buildPortalQueueToShowSelections.test.ts`, split allocation, portalShowQueueFit, queue validation | 0 | 42 tests; includes **25+25 → 25 of A** + new payload helper |
| Functions build | firebase predeploy `tsc` | 0 | Via deploy |
| Deploy | `firebase deploy --only functions:queuePortalPrintRequestToShow,functions:listPortalAllocatableShows --project fresh-prints-dev` | 0 | Revision **queueportalprintrequesttoshow-00021-keh**; marker `cap-b-split-v2` |

---

## Deploy

- Project: **`fresh-prints-dev` only** (no production)
- Functions: `queuePortalPrintRequestToShow`, `listPortalAllocatableShows`
- Owner must run deploy: **No**
- Portal: soft-reload `npm run dev:portal` browser tab

---

## Implementation notes (this pass)

- Client: `splitAllotmentRef` + `buildPortalQueueToShowSelections` — split confirm freezes selections before bidding ack
- Server: Cap B + selections (unchanged logic) + structured logs `marker: "cap-b-split-v2"`
- Unit tests for payload builder (fail if split path omits selections)

---

## Manual QA

See `docs/workflow/reviews/2026-07-19-cap-b-split-queue-allotment-bug-manual-qa.md`
