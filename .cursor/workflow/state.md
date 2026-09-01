## FreshForge State

| Field | Value |
|-------|-------|
| Status | **ACTIVE** |
| DONE | **no** |
| Active goal | `pre-smart-profiling-print-request-and-gang-sheet-polish` |
| Phase | **WS2 corrective complete — await DEV deploy approval + owner re-test** |
| Plan Status | **complete** |
| Review Status | **approved_with_changes** (acknowledged) |
| Implementation | **WS2 corrective implemented locally** |
| Test Status | **passed_with_notes** (WS2 corrective focused suites) |
| Implementation Review | **approved_with_notes** — WS2 corrective |
| DEV Deploy | **pending owner approval** (attach Function) |
| Signoff | **not authorized** |
| Human Checkpoint Required | **yes** — WS2 DEV deploy approval; WS2/WS3 owner re-test |
| Production | **NOT AUTHORIZED** |
| Smart Profiling | **NOT STARTED** (parked) |
| Last updated | 2026-09-01 |
| Last Completed Step | WS2 corrective implementation + focused tests |

## Decision Log (recent)

| Date | Decision |
|------|----------|
| 2026-09-01 | **WS2 owner DEV QA: FAIL** — attach latency + large Final Image download blocked at 8MB callable |
| 2026-09-01 | WS2 corrective: idempotent `assistedFinalSourceId` reuse, single Storage read ingest, signed-URL download, honest progress stages |
| 2026-08-31 | **WS1 owner DEV QA: PASS** |
| 2026-08-31 | DEV deploy complete — baseline WS1–WS3 Functions |

---

## Workstreams

| WS | Title | Owner DEV QA |
|----|-------|----------------|
| WS1 | Customer remove queued request from show to edit | **PASS** |
| WS2 | Custom Request Final Image validation + attach hardening | **FAIL — corrective pending deploy + re-test** |
| WS3 | Gang-sheet customer price + weight line | **PENDING** |

---

## WS2 Corrective Deploy Scope (pending approval)

| Surface | Action |
|---------|--------|
| Functions | `customerAddAssistedApprovedProofToPrintRequest` → `fresh-prints-dev` |
| Portal | **restart** `npm run dev:portal` (download + progress UX) |
| Rules / indexes | **none** |

Download fix uses existing `customerGetAssistedCreationApprovedProofDownloadUrl` (no new Function deploy if already on DEV).

---

## Allowed Actions

- Owner approval for WS2 corrective DEV Function deploy
- Owner WS2 re-test after deploy
- Read docs / repo inspection

## Forbidden Actions

- Automatic deploy
- Production deploy
- Signoff
- Smart Profiling
- Moving production pipeline to staff Final Image upload without owner decision

---

## Next Required Step

Owner approves WS2 corrective DEV deploy, then reruns WS2 checklist. Reply `WS2 PASS`, `WS2 PASS WITH NOTES: …`, or `WS2 FAIL: …`.

### Portal reload

`npm run dev:portal` — **restart** after pulling corrective changes.

---

## Unrelated Working Tree (preserved)

Portal show-designs rails/cache; Studio imports + ai-review; local `firestore.rules` tweak — **not part of this goal**.
