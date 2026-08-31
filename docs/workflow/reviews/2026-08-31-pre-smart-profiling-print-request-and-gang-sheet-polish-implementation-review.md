# Implementation Review: Pre-Smart-Profiling Print Request & Gang-Sheet Polish

| Field | Value |
|-------|-------|
| Date | 2026-08-31 |
| Goal | `pre-smart-profiling-print-request-and-gang-sheet-polish` |
| Verdict | **approved** |
| Production | **NOT AUTHORIZED** |
| DEV deploy | **NOT PERFORMED** (STOP before deploy per owner) |
| Smart Profiling | **NOT STARTED** (parked) |

---

## Formal Review mandatory changes

| # | Requirement | Result |
|---|-------------|--------|
| 1 | WS1 ADR-FP-071 stable `continuable-request-conflict` + actionable Portal copy | **pass** |
| 2 | WS2 V1 validation + attach hardening only (no staff-upload production ingest pipeline) | **pass** |
| 3 | WS3 `sectionSummaryVersion: 1` in grouped gang-sheet cache fingerprint | **pass** |

---

## WS1 — Customer remove from show & edit

| Criterion | Result |
|-----------|--------|
| Callable `unqueuePortalPrintRequestFromShow` exported | **pass** |
| Server auth + ownership + origin checks | **pass** |
| Removable allocation states `pending` / `queued` | **pass** |
| Blocked allocation states `in_progress` / `printed` / `done` | **pass** |
| Blocked show production states `printing` / `fully_printed` / `completed` / `archived` | **pass** |
| ADR-FP-071 conflict fail-closed before unqueue | **pass** |
| Allocations canceled (not deleted); history preserved | **pass** |
| Show `allocatedQuantity` recomputed | **pass** |
| Request returns to `editing` when no active allocations remain | **pass** |
| Portal action + confirmation modal | **pass** |
| Portal maps collision to owner-approved copy | **pass** |

---

## WS2 — Custom Request Final Image

| Criterion | Result |
|-----------|--------|
| Staff Final Image byte probe at upload (`probeAssistedFinalSourceImageBytes`) | **pass** |
| Invalid/non-image rejected at upload | **pass** |
| `finalSource` authoritative when proof purged (shared + Portal evaluator) | **pass** |
| Attach uses existing `processCustomerUploadImageBytes` path | **pass** |
| `sourceType` remains `customer_upload` | **pass** |
| `assistedFinalSourceId` audit linkage on upload record | **pass** |
| No catalog / AI Review / Design Library side effects | **pass** |
| No migration | **pass** |

---

## WS3 — Gang-sheet price + weight summary

| Criterion | Result |
|-----------|--------|
| Shared utility `gangSheetCustomerSectionSummary.ts` | **pass** |
| $1 tier when both dimensions `< 6"`; $2 when either `>= 6"` | **pass** |
| Weight `0.75 oz × quantity` with fractional totals | **pass** |
| Rendered on Grouped by Customer + Sheet per Customer only | **pass** |
| Standard / efficiency unchanged | **pass** |
| Segment-local summaries on continuation sheets | **pass** |
| Fingerprint includes `sectionSummaryVersion: 1` for grouped modes | **pass** |
| Quantity + print-inch tier changes invalidate grouped cache | **pass** |
| Efficiency fingerprint ignores print-inch summary inputs | **pass** |

---

## Security review

| Area | Result |
|------|--------|
| WS1 customer cannot unqueue arbitrary allocations | **pass** — server authoritative |
| WS1 production-started work cannot be pulled back | **pass** |
| WS2 Final Image remains customer-private | **pass** |
| WS2 no client-supplied arbitrary Storage attach | **pass** |
| WS3 display-only; no billing/payment mutation | **pass** |

---

## Migration

**None required.**

---

## Unrelated working tree

Preserved and **not** bundled into this goal: Portal show-designs rails/cache, Studio imports/AI review, `portalShowCatalogDesigns.ts`, `listPortalShowCatalogDesigns.types.ts`.

---

## Verdict

**approved** — all three workstreams implemented within approved scope; mandatory Formal Review changes verified; ready for owner DEV QA after DEV deploy (not performed in this session).
