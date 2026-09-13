# Test Report: Show Queue Move / Combine Requests (Final Regression)

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Goal | `show-queue-move-and-combine-requests` |
| Phase | Final regression after Owner QA **PASS** |
| Environment | local working tree + `fresh-prints-dev` already deployed |
| Production | **NOT AUTHORIZED** |
| Result | **passed_with_notes** |

---

## Commands run

```text
npx tsx --test ^
  packages/shared/src/utils/showQueueMove.test.ts ^
  packages/shared/src/utils/printRequestShowTransfer.test.ts ^
  packages/shared/src/utils/showProductionRecoveryRequeue.test.ts ^
  packages/shared/src/utils/printRequestQueueTabRecompute.test.ts ^
  apps/studio/src/renderer/src/features/upcoming-shows/services/showQueueMove.contract.test.ts ^
  apps/studio/src/renderer/src/features/upcoming-shows/utils/buildMovedDestinationByPrintRequestId.test.ts ^
  apps/studio/src/renderer/src/features/print-requests/components/AddToShowModal.staffGangSheet.contract.test.ts ^
  functions/src/showQueueMove.contract.test.ts ^
  functions/src/showProductionRecovery.contract.test.ts
```

Exit code: **0** — **77/77 pass**

Focused suite recounts:

| Suite | Result |
|-------|--------|
| `packages/shared/src/utils/showQueueMove.test.ts` | **11/11 pass** |
| `packages/shared/src/utils/printRequestShowTransfer.test.ts` | **4/4 pass** |
| Functions + Studio `showQueueMove.contract.test.ts` (combined) | **6/6 pass** |
| `showProductionRecoveryRequeue.test.ts` (DNP) | **32/32 pass** |
| `printRequestQueueTabRecompute.test.ts` | **10/10 pass** (in combined run) |
| `buildMovedDestinationByPrintRequestId.test.ts` | **2/2 pass** (in combined) |
| AddToShowModal staff gang sheet contract | **4/4 pass** (in combined) |
| Functions showProductionRecovery.contract | included in combined; DNP separation intact |
| `buildPrintRequestHistoryCard.test.ts` (extra) | **13/13 pass** |

```text
npm run build --prefix functions
```

Exit code: **0** — **PASS**

```text
npx tsc --noEmit -p apps/studio/tsconfig.json
```

Exit code: **2** — **25 pre-existing unrelated `error TS`** (export/AI review/customer-upload/staff-inbox/shared test fixtures, etc.). **Zero** errors matching move-scoped paths (`showQueueMove*`, `MoveShowQueue*`, `TransferPrintRequest*`, `buildMovedDestination*`, `UpcomingShowsPage`, `show-queue.css`).

---

## Coverage mapped to contract

| Concern | Covered by |
|---------|------------|
| Same-PR combine arithmetic (5+3→8) | `showQueueMove.test.ts` |
| Split / source-only collection | `showQueueMove.test.ts` |
| Source cancel + `movedFromAllocationId` (not DNP lineage) | Functions contract |
| Movable status gates (`pending`/`queued`) | shared + Functions contract |
| Printing destination rejection | shared eligibility + Functions contract |
| Capacity exact-fill / over-cap | shared |
| Checksum / preview assemble / TOCTOU helpers | shared |
| Whole-show all-or-nothing | shared preview assemble |
| Transaction allocation cap (150) | shared |
| Idempotency collection wiring | Functions lib/contract |
| Transfer move vs copy mode | `printRequestShowTransfer.test.ts` |
| Add-to-Show regression | AddToShowModal contract |
| DNP recovery regression | `showProductionRecoveryRequeue` 32 + Functions recovery contract |
| queueTab / ADR-FP-071 | `printRequestQueueTabRecompute` + recovery lib contract |
| Studio wiring (Move All + callables) | Studio contract |
| Moved destination display helper | `buildMovedDestinationByPrintRequestId` |

---

## Manual / Owner QA

| Item | Result |
|------|--------|
| Owner QA checklist A–L on DEV | **PASS** — see owner-qa doc |

---

## Notes

- Portal typecheck/build: **not run** (Portal source unchanged).
- Studio Vite/installer build: **not required** for this Functions+Studio source goal; Owner QA used `npm run dev:studio`.
- Pre-existing Studio `tsc` failures remain documented; no goal-scoped regression introduced.

---

## Verdict

**passed_with_notes** — all focused automated suites green; Functions build green; Owner QA PASS; Studio project-wide tsc remains pre-existing-only.
