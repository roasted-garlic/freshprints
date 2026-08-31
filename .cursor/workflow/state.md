## FreshForge State

| Field | Value |
|-------|-------|
| Status | **ACTIVE** |
| DONE | **no** |
| Active goal | `pre-smart-profiling-print-request-and-gang-sheet-polish` |
| Phase | **Owner DEV QA** |
| Plan Status | **complete** |
| Review Status | **approved_with_changes** (acknowledged) |
| Implementation | **complete** |
| Test Status | **passed_with_notes** |
| Implementation Review | **approved** |
| DEV Deploy | **complete** (`01df254c` → `fresh-prints-dev`) |
| Signoff | **not authorized** |
| Human Checkpoint Required | **yes** — owner WS1 / WS2 / WS3 manual DEV QA |
| Production | **NOT AUTHORIZED** |
| Smart Profiling | **NOT STARTED** (parked) |
| Last updated | 2026-08-31 |
| Last Completed Step | DEV Functions deploy to `fresh-prints-dev` |

## Decision Log (recent)

| Date | Decision |
|------|----------|
| 2026-08-31 | Owner **APPROVED DEV deploy** — hook-order corrective QA PASS |
| 2026-08-31 | Rules preflight: **A. NO RULES CHANGE REQUIRED** — no Rules deployed |
| 2026-08-31 | DEV deploy complete — 3 Functions to `fresh-prints-dev`, exit 0 |
| 2026-08-31 | Owner QA blocker: PrintRequestDetailView hook order — **fixed** (handleUnqueueFromShow moved above early returns) |
| 2026-08-31 | Owner QA: Portal permissions on /requests — fixed client `in` query → per-request equality queries |

---

## Workstreams

| WS | Title | Status |
|----|-------|--------|
| WS1 | Customer remove queued request from show to edit | **deployed — owner QA pending** |
| WS2 | Custom Request Final Image validation + attach hardening | **deployed — owner QA pending** |
| WS3 | Gang-sheet customer price + weight line | **local Studio reload — owner QA pending** |

---

## Deploy Record

| Field | Value |
|-------|-------|
| Implementation SHA | `01df254c2a519669dd202e465efd3f34a09df62e` |
| Firebase project | `fresh-prints-dev` |
| Functions | `unqueuePortalPrintRequestFromShow`, `staffAddAssistedCreationFinalSource`, `customerAddAssistedApprovedProofToPrintRequest` |
| Rules | **none deployed** |
| Record | `docs/workflow/reviews/2026-08-31-pre-smart-profiling-print-request-and-gang-sheet-polish-dev-deploy-record.md` |

---

## Artifacts

| Artifact | Path |
|----------|------|
| Plan | `docs/workflow/plans/2026-08-31-pre-smart-profiling-print-request-and-gang-sheet-polish-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-08-31-pre-smart-profiling-print-request-and-gang-sheet-polish-review.md` |
| Implementation Review | `docs/workflow/reviews/2026-08-31-pre-smart-profiling-print-request-and-gang-sheet-polish-implementation-review.md` |
| Test Report | `docs/workflow/reviews/2026-08-31-pre-smart-profiling-print-request-and-gang-sheet-polish-test-report.md` |
| Hook-order corrective | `docs/workflow/reviews/2026-08-31-pre-smart-profiling-print-request-hook-order-corrective-review.md` |
| DEV deploy record | `docs/workflow/reviews/2026-08-31-pre-smart-profiling-print-request-and-gang-sheet-polish-dev-deploy-record.md` |

---

## Allowed Actions

- Owner DEV QA (manual WS1 / WS2 / WS3)
- Read docs / repo inspection
- Record QA results in workflow state

## Forbidden Actions

- Production deploy
- Signoff (pending owner DEV QA)
- Smart Profiling work
- Firestore/Storage Rules deploy (not required for this goal)
- App Hosting deploy (not authorized)
- Committing unrelated working-tree changes into this goal

---

## Next Required Step

Owner manual DEV QA on WS1, WS2, WS3. Reply `PASS` / `PASS WITH NOTES` / `FAIL` per workstream.

### Portal reload

`npm run dev:portal` (port 3100) — **restart** after pull/checkout of `01df254c`.

### Studio reload

`npm run dev:studio` — **stop and restart** for WS3 gang-sheet export changes.

---

## Unrelated Working Tree (preserved)

Portal show-designs rails/cache; Studio imports + ai-review; `portalShowCatalogDesigns.ts`; `listPortalShowCatalogDesigns.types.ts`; local `firestore.rules` tweak — **not part of this goal**.
