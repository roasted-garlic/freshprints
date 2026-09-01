## FreshForge State

| Field | Value |
|-------|-------|
| Status | **ACTIVE** |
| DONE | **no** |
| Active goal | `pre-smart-profiling-print-request-and-gang-sheet-polish` |
| Phase | **WS2 owner DEV QA re-test** |
| Plan Status | **complete** |
| Review Status | **approved_with_changes** (acknowledged) |
| Implementation | **WS2 corrective deployed to DEV** |
| Test Status | **passed_with_notes** (WS2 corrective pre-deploy) |
| Implementation Review | **approved_with_notes** — WS2 corrective |
| DEV Deploy | **complete** — WS2 corrective `b861a047` |
| Signoff | **not authorized** |
| Human Checkpoint Required | **yes** — owner WS2 re-test |
| Production | **NOT AUTHORIZED** |
| Smart Profiling | **NOT STARTED** (parked) |
| Last updated | 2026-09-01 |
| Last Completed Step | WS2 corrective DEV Function deploy |

## Decision Log (recent)

| Date | Decision |
|------|----------|
| 2026-09-01 | Owner **APPROVED** WS2 corrective DEV deploy |
| 2026-09-01 | WS2 corrective deployed — `customerAddAssistedApprovedProofToPrintRequest` → `fresh-prints-dev` |
| 2026-09-01 | Corrective SHA `b861a047` pushed to `origin/development` |
| 2026-09-01 | WS2 owner QA **FAIL** — attach latency + large download; corrective implemented |
| 2026-08-31 | **WS1 owner DEV QA: PASS** |

---

## Workstreams

| WS | Title | Owner DEV QA |
|----|-------|----------------|
| WS1 | Customer remove queued request from show to edit | **PASS** |
| WS2 | Custom Request Final Image validation + attach hardening | **FAIL → corrective deployed — re-test pending** |
| WS3 | Gang-sheet customer price + weight line | **PENDING** |

---

## Deploy Record

| Field | Value |
|-------|-------|
| Corrective SHA | `b861a047bbc61ab7d9739c3163d72102f945c446` |
| Firebase project | `fresh-prints-dev` |
| Functions deployed | `customerAddAssistedApprovedProofToPrintRequest` (update) |
| Download URL callable | `customerGetAssistedCreationApprovedProofDownloadUrl` — already on DEV |
| Rules / indexes / Hosting | **none deployed** |
| Record | `docs/workflow/reviews/2026-09-01-pre-smart-profiling-ws2-corrective-dev-deploy-record.md` |

---

## Allowed Actions

- Owner WS2 re-test (Tests A–E)
- Read docs / DEV Function logs for attach timings

## Forbidden Actions

- Signoff (WS2 + WS3 pending)
- Production deploy
- Smart Profiling
- Automatic further deploys

---

## Next Required Step

Owner WS2 re-test after **Portal restart** (`npm run dev:portal`). Reply `WS2 PASS`, `WS2 PASS WITH NOTES: …`, or `WS2 FAIL: …`.

---

## Unrelated Working Tree (preserved)

WS1 Portal unqueue fixes, show-designs rails/cache, Studio imports/AI Review, `firestore.rules` tweak — **not in corrective commit `b861a047`**.
