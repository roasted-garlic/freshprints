# Plan: Pre–Smart Profiling Print Request + Production Polish

| Field | Value |
|-------|-------|
| Date | 2026-08-31 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Goal ID | `pre-smart-profiling-print-request-and-gang-sheet-polish` |
| Phase alignment | Phase 6 (Print Requests) · Phase 7 (Show Queue / gang sheets) · Phase 9C (Assisted Creation) |
| Production | **NOT AUTHORIZED** |
| Smart Profiling | **NOT STARTED** (parked) |

---

## Goal

Ship three small, owner-prioritized workflow improvements on `development` **before** resuming Smart Profiling:

1. **WS1** — Portal customers can remove their own **queued** Print Request from a show and return to editing.
2. **WS2** — Custom Request / Assisted Creation **Final Image** is production-ready for reliable Print Request attachment.
3. **WS3** — Grouped gang sheets show a **price + weight** summary line beneath each customer section heading (grouped modes only).

---

## Background

The sizing/upscale managed goal closed 2026-08-31 (Owner DEV QA PASS). Owner wants these polish items completed before Smart Profiling. All three workstreams reuse existing lifecycle, processing, and gang-sheet architecture rather than new product surfaces.

**Related ADRs:** ADR-FP-071, ADR-FP-075, ADR-FP-080, ADR-FP-094, ADR-FP-110, ADR-FP-141, ADR-FP-143, ADR-FP-156.

---

## Scope

### In Scope

- WS1: New Portal callable + UI for customer self-unqueue (pre-production only)
- WS2: Final Image processing/eligibility fixes on existing assisted-creation attach path
- WS3: Shared price/weight calculation + Electron compositor subtitle for two grouped gang-sheet modes
- Unit tests, rules alignment tests (WS1), manual DEV QA matrix
- DEV Firebase deploy for new/changed Functions (owner-approved checkpoint)
- Documentation updates for behavior changes

### Out of Scope

- Smart Profiling, AI pipeline, tag retirement, production deploy, Studio publish, App Hosting production
- Portal customer-facing pricing UI, configurable price/weight settings, payment/shipping/tax
- Standard (`efficiency`) gang-sheet price/weight text
- Staff Did Not Print recovery changes, conversion semantics changes, show cutoff bypass
- Bulk backfill of legacy assisted ingests (optional follow-up only if discovered in QA)

---

# WS1 — Customer Remove Request from Show to Edit

## Repo-verified current flow

| Step | Implementation |
|------|----------------|
| Queue to show | `queuePortalPrintRequestToShow` → creates `showAllocations` with `status: "pending"`; sets `printRequests.status: "active"` |
| Portal caller | `portalShowSelectionService.ts` → `useQueuePrintRequestToShow.ts` |
| Queued UI | `PrintRequestDetailView.tsx` — `isEditable === false` when `status: "active"`; no unqueue action |
| Tab derivation | `derivePrintRequestListTab` — `totalAllocatedQuantity > 0` → **queued** tab |
| Staff removal | `upcomingShowService.removeShowAllocationsForRequest` (hard delete); recovery uses `cancelShowAllocationsInTransaction` (`status: "canceled"`) |
| Conversion cancel pattern | `evaluateCustomerPrintRequestConversionEligibility` — cancelable: `pending`, `queued`; blocking: `in_progress`, `printed`, `done` |
| Show gate | `canRemoveRequestFromShow` — blocks when show `productionStatus` is `printing`, `fully_printed`, `completed`, `archived` |
| ADR-FP-071 guard | `shouldTransitionActiveRequestToEditing` — no `active→editing` if another continuable request exists (Portal customers) |

**Gap:** No customer-facing reverse of queue. Customers cannot write `showAllocations` or `printRequests.status` (Firestore rules).

## Proposed architecture

### New callable: `unqueuePortalPrintRequestFromShow`

**Location:** `functions/src/unqueuePortalPrintRequestFromShow.ts` (+ shared types + validation lib)

**Transaction (single show, owned request):**

1. Authenticate Portal customer; verify active account (existing portal customer guards).
2. Load `printRequest`; verify `customerId === caller`, `requestOrigin === "portal_customer"`, `isInternal !== true`, not `converted_to_internal` closure.
3. Load target `upcomingShow`; verify `canRemoveRequestFromShow(show.productionStatus)`.
4. Load all allocations for `(printRequestId, upcomingShowId)` where `status ∈ {pending, queued}`.
5. **Reject** if zero cancelable allocations (idempotent-friendly message).
6. **Reject** if any allocation on this request for this show is `in_progress | printed | done` (production started).
7. **Reject** if any allocation on this request globally is in blocking state (defense in depth).
8. **ADR-FP-071 pre-check:** if `customerHasOtherContinuableRequest` (portal-editable `draft`/`editing` exists), **fail** with `PORTAL_ONE_WORKING_REQUEST_MESSAGE` — customer must resolve the other working request before editing this one (deterministic; no duplicate continuable requests).
9. Set each cancelable allocation `status: "canceled"` (+ `updatedAt`); preserve documents for lineage.
10. Recompute `upcomingShows.allocatedQuantity` for the show (`computeShowAllocatedQuantityFromAllocations` pattern).
11. If no non-canceled allocations remain globally for request: set `printRequests.status: "editing"` (when `shouldTransitionActiveRequestToEditing` passes).
12. `recomputeAndPersistQueueTab` for the request.
13. Return `{ printRequestId, upcomingShowId, canceledAllocationIds, requestStatus }`.

**Shared extraction:** Add `functions/src/lib/unqueuePortalPrintRequestFromShowCore.ts` (+ tests) mirroring cancel/status helpers from `showProductionRecovery.ts` and `printRequestConversion.ts` so logic is unit-testable without emulator.

### Portal UI

| File | Change |
|------|--------|
| `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx` | Show **Remove from Show & Edit** when derived tab is `queued` and request is portal-editable origin |
| `apps/portal/features/print-requests/components/PortalUnqueueFromShowConfirmModal.tsx` | **New** — confirmation copy per owner spec |
| `apps/portal/features/print-requests/services/portalShowSelectionService.ts` | Callable wrapper |
| `apps/portal/features/print-requests/hooks/useUnqueuePrintRequestFromShow.ts` | **New** — loading/error/success; navigate back to Working experience |

**Confirmation copy (plan default):**

- Request will be removed from the selected show.
- You can edit items, sizes, and quantities again.
- You will need to add the request to a show again before it prints.
- The same show may no longer be available (cutoff/capacity rules still apply).

### Exact removable allocation states

| Allocation status | Customer removable? |
|-------------------|---------------------|
| `pending` | **Yes** |
| `queued` | **Yes** |
| `in_progress` | **No** |
| `printed` | **No** |
| `done` | **No** |
| `canceled` | N/A (already released) |

**Additional gates:** show not in active printing terminal states (`canRemoveRequestFromShow`); request ownership and portal origin; ADR-FP-071 no conflicting continuable request.

### Request state after success

- `printRequests.status`: **`editing`** (when zero active allocations globally and ADR-FP-071 allows)
- Portal tab: **Working** (derived)
- Items: unchanged (sizes, qty, uploads, `artworkEnhanceMode`, etc.)

### Schema / migration

- **No new fields.** Uses existing `canceled` allocation status.
- **No migration.**

### Rules impact

- **No Firestore rule changes** — Admin SDK only.
- Extend `tests/firebase/showQueueAllocation.rules.test.ts` — customers still cannot write allocations directly.

### Deployment

- **Functions:** deploy `unqueuePortalPrintRequestFromShow` to `fresh-prints-dev` (owner checkpoint).
- **Portal:** App Hosting dev rebuild / local `npm run dev:portal`.
- **Studio:** no change required for WS1.

---

# WS2 — Custom Request Final Image Production Ingest

## Repo-verified representation

| Concept | Schema / path |
|---------|----------------|
| Assisted request | `assistedCreationRequests/{id}` |
| Staff proof | `proofs[]` under `assisted-creation/{uid}/{requestId}/proofs/{fileId}` |
| **Final Image** | `finalSource: AssistedCreationFinalSource` under `assisted-creation/{uid}/{requestId}/final/{fileId}` (ADR-FP-110) |
| Staff upload | Studio `assistedCreationRequestsService.uploadAndAttachFinalSource` → `staffAddAssistedCreationFinalSource` |
| Customer attach | `customerAddAssistedApprovedProofToPrintRequest` |
| Ingest output | `customerUploads` + `printRequestItems` with `sourceType: "customer_upload"` |
| Byte resolution | `resolveAssistedCreationApprovedProofDownload` — **prefers `finalSource`**, else approved proof |

## Current processing at attach

`customerAddAssistedApprovedProofToPrintRequest` already:

- Copies source → `customer-uploads/{uid}/{uploadId}/source`
- Runs `processCustomerUploadImageBytes(..., { skipCustomerQualityGates: true })` (trim, normalize, 15″ automated upscale target, derivatives)
- Persists `productionStoragePath`, `widthPx`, `heightPx`, DPI/sizing fields, `technicalStatus: "ready"`
- Creates `printRequestItem` via `resolveInitialPrintRequestItemSize`

## Identified gaps

| Gap | Impact |
|-----|--------|
| `evaluateAssistedApprovedProofAddToRequest` ignores `finalSource` | Portal **hides Add to Request** when proof purged but `finalSource` exists; server would succeed |
| `staffAddAssistedCreationFinalSource` — metadata-only validation | Corrupt/low-res final accepted until attach fails |
| No `assistedFinalSourceId` on `customerUploads` | Weak audit trail when final (not proof) was ingested |
| Idempotent re-attach skips re-processing | Stale upload if pipeline improved (edge case) |

**Not a gap:** attach path already uses the same `processCustomerUploadImageBytes` as customer-upload finalize (with staff quality gates skipped). No new `sourceType` required.

## Proposed architecture

### A. Shared eligibility fix (required)

**File:** `packages/shared/src/utils/assistedCreationApprovedProofAddToRequest.ts`

- Extend input with optional `finalSource` view.
- Eligible when `status === "approved"` AND (`finalSource` present OR proof download available OR already ingested).
- New reason codes: `final_source_available`, adjust `purged_never_ingested` to require absence of both proof download and `finalSource`.

**Portal:** `AssistedCreationDetailPanels.tsx` — pass `finalSource` into evaluator.

### B. Staff final-source validation (required)

**File:** `functions/src/assistedCreationRequests.ts` (`staffAddAssistedCreationFinalSource`)

After upload metadata checks, **probe image** with shared Sharp helper extracted from `customerUploadProcessing.ts`:

- Decode succeeds (reject corrupt files)
- Record `widthPx`, `heightPx` on `finalSource` document (additive optional fields)
- Warn/reject if below minimum decode threshold (plan: reject if cannot decode; warn if effective DPI at 10″ would be &lt; 72 — staff can override via re-upload; hard block only on corrupt/unreadable)

**No processing at upload time** in V1 — processing remains at attach to avoid duplicate Storage and keep Assisted lifecycle separate. (Owner outcome: production-ready **at attach**; staff upload validated early.)

### C. Attach callable hardening (required)

**File:** `functions/src/customerAddAssistedApprovedProofToPrintRequest.ts`

- Align eligibility with updated shared evaluator (import shared function).
- When ingesting from `finalSource`, set `assistedFinalSourceId` on `customerUploads` (additive field).
- Ensure `updatedAt` on new upload doc (parity with finalize).
- On processing failure, return user-safe error; do not partial-write item without ready upload.

### D. sourceType decision

**Keep `customer_upload`** on `printRequestItems` (ADR-FP-094). Traceability via `assistedCreationRequestId` + `assistedFinalSourceId` on upload.

### Lifecycle boundary (preserved)

- No Design Library publication
- No AI Review enqueue from this goal
- No catalog lifecycle mutation
- Final Image stays in assisted Storage until attach copies to private `customer-uploads`

### Schema / migration

| Field | Collection | Required? |
|-------|------------|-----------|
| `assistedFinalSourceId` | `customerUploads` | Optional additive |
| `widthPx`, `heightPx` | `assistedCreationRequests.finalSource` | Optional additive |

**No migration.** Forward-only on new uploads/ingests.

### Rules impact

- **No Storage/Firestore rule changes** expected (existing assisted + customer-upload paths).

### Deployment

- **Functions:** `customerAddAssistedApprovedProofToPrintRequest`, `staffAddAssistedCreationFinalSource` (bundled in `assistedCreationRequests`) → `fresh-prints-dev`.
- **Portal + Studio:** dev reload.

---

# WS3 — Customer Price + Weight on Grouped Gang Sheets

## Repo-verified layout pipeline

| Mode | Planner (shared) | Compositor (Electron) |
|------|------------------|----------------------|
| `grouped_by_customer` | `gangSheetGroupedLayout.ts` | `composeGroupedGangSheetSheets.ts` |
| `customer_grouped_continuous` | `gangSheetContinuousCustomerGroupedLayout.ts` | `composeContinuousCustomerGroupedGangSheetSheets.ts` |
| `efficiency` | `gangSheetEfficiencyLayout.ts` | inline in `exportGangSheetPng.ts` — **unchanged** |

**Headings:** `buildGroupedGangSheetSectionHeading` / `buildGroupedGangSheetSectionContinuedHeading` in `groupPrintRequestsByShow.ts` (ADR-FP-143).

**Quantity authority:** `allocation.allocatedQuantity` → `buildShowExportAllocationAssets.ts` → IPC `image.quantity` → one nest placement per physical unit.

**Dimensions authority:** `resolveQueuedPrintInches({ allocationWidthInches, allocationHeightInches })` in asset builder (already computed; not yet on IPC type).

## Price model (owner-fixed)

Per physical unit in a customer block:

```
unitPriceUsd = (printWidthInches >= 6 || printHeightInches >= 6) ? 2 : 1
```

Use persisted allocation print inches (snapshot at queue time). Exactly 6.00″ → $2 tier.

Mixed tiers in one block:

```
$2 x {qtyAt2} + $1 x {qtyAt1} = ${total}
```

Single tier: `$2 x 20 = $40` or `$1 x 20 = $20`. Omit zero-count terms.

## Weight model (owner-fixed)

```
totalWeightOz = 0.75 * totalQuantity
```

Display fractional ounces (e.g. 21 → 15.75 oz). No rounding down.

## Continuation / spillover behavior

**Product rule (owner preferred):** Each section heading shows totals for **quantity on that section/sheet segment only**.

| Structure | Segment quantity source |
|-----------|-------------------------|
| Sheet per Customer | `sheet.placements.length` per PNG (Continued segments separate) |
| Continuous grouped | `PendingGroupedSection.sheet.placements.length` per stacked section |

Implementation: `calculateCustomerGangSheetSectionSummary({ placements, allocationDimensionMap })` where placements carry `allocationId` and copy index.

## Proposed architecture

### Shared utility (new)

**File:** `packages/shared/src/utils/gangSheetCustomerSectionSummary.ts`

```typescript
export interface GangSheetSectionSummaryAllocationInput {
  allocationId: string;
  quantity: number; // segment-local count for this heading
  printWidthInches: number;
  printHeightInches: number;
}

export interface GangSheetCustomerSectionSummary {
  tier1Quantity: number;
  tier2Quantity: number;
  totalQuantity: number;
  totalPriceUsd: number;
  totalWeightOz: number;
  priceLine: string;   // e.g. "$2 x 10 + $1 x 10 = $30"
  weightLine: string;  // e.g. "Weight: 0.75oz x 20 = 15 oz"
  combinedLine: string; // priceLine + " | " + weightLine
}
```

Pure functions + formatter; full unit tests (`gangSheetCustomerSectionSummary.test.ts`).

### IPC / asset builder changes

| File | Change |
|------|--------|
| `gangSheetExportIpc.types.ts` | Add `printWidthInches`, `printHeightInches` to `GangSheetExportImageRequest` |
| `buildShowExportAllocationAssets.ts` | Pass dimensions onto IPC images |
| `exportGangSheetPng.ts` (Electron) | Preserve `allocationId` + dimensions on expanded copies |

### Compositor / label rendering

| File | Change |
|------|--------|
| `gangSheetLabelRendering.ts` | `buildGroupedSectionHeadingSvg(heading, summaryLine)` — two-line band; increase `computeGangSheetLabelBandHeightPx` for grouped section bands |
| `composeGroupedGangSheetSheets.ts` | Compute segment summary per section; render subtitle |
| `composeContinuousCustomerGroupedGangSheetSheets.ts` | Same per `PendingGroupedSection` |

Subtitle uses smaller font than primary heading (`resolveGroupedSectionLabelFontSizePx` — currently unused; adopt here).

### Cache fingerprint

**File:** `gangSheetCacheFingerprint.ts`

- Add `sectionSummaryVersion: 1` top-level field when `layoutMode` is grouped (invalidates pre-change caches).
- Include `printWidthInches`, `printHeightInches` per image in fingerprint payload (tier changes invalidate cache).

### ADR / docs

- Amend ADR-FP-143 note: grouped section headings may include a second production-metadata line (price/weight); not customer billing.

### Schema / migration

- **None** — display-only calculation from existing allocation dimensions + quantity.

---

## Affected Files Summary

### WS1
- `functions/src/unqueuePortalPrintRequestFromShow.ts` (new)
- `functions/src/lib/unqueuePortalPrintRequestFromShowCore.ts` (new)
- `packages/shared/src/types/portal/unqueuePortalPrintRequestFromShow.types.ts` (new)
- `functions/src/index.ts`
- Portal print-request detail + service + hook + modal (new)
- `tests/firebase/showQueueAllocation.rules.test.ts`

### WS2
- `packages/shared/src/utils/assistedCreationApprovedProofAddToRequest.ts` (+ tests)
- `functions/src/customerAddAssistedApprovedProofToPrintRequest.ts` (+ tests)
- `functions/src/assistedCreationRequests.ts` (staff final validation)
- `functions/src/lib/customerUploadProcessing.ts` (extract decode probe helper)
- `packages/shared/src/types/customerUpload/customerUpload.types.ts` (optional field)
- Portal `AssistedCreationDetailPanels.tsx`

### WS3
- `packages/shared/src/utils/gangSheetCustomerSectionSummary.ts` (new + tests)
- `packages/shared/src/types/export/gangSheetExportIpc.types.ts`
- `packages/shared/src/utils/gangSheetCacheFingerprint.ts` (+ tests)
- `apps/studio/.../buildShowExportAllocationAssets.ts`
- `apps/studio/electron/services/export/exportGangSheetPng.ts`
- `apps/studio/electron/services/export/composeGroupedGangSheetSheets.ts`
- `apps/studio/electron/services/export/composeContinuousCustomerGroupedGangSheetSheets.ts`
- `packages/shared/src/utils/gangSheetLabelRendering.ts`

---

## Test Strategy

### Automated

| WS | Command / suite |
|----|-----------------|
| WS1 | `unqueuePortalPrintRequestFromShowCore.test.ts`; `printRequestConversion.test.ts` regression; rules test |
| WS2 | `assistedCreationApprovedProofAddToRequest.test.ts`; `customerAddAssistedApprovedProofToPrintRequest.test.ts`; processing probe tests |
| WS3 | `gangSheetCustomerSectionSummary.test.ts`; `gangSheetCacheFingerprint.test.ts`; compositor unit tests |
| All | `npm --prefix functions run build`; targeted `npx tsx --test` bundles per WS |

### Manual DEV QA matrix

**WS1**
1. Queued customer request shows action + confirmation
2. Success → Working tab, editable items, allocations canceled
3. Re-add to show respects cutoff/capacity
4. In-progress allocation → blocked
5. Wrong customer / internal request → blocked
6. Second continuable request exists → blocked with clear message
7. Reload preserves state

**WS2**
1. Staff uploads final PNG → attach succeeds
2. Portal Add to Request with finalSource-only (proof purged) → CTA visible + success
3. Item DPI nonzero; gang sheet + ZIP export OK
4. No catalog publication side effects

**WS3**
1. Grouped by Customer + Sheet per Customer show subtitle; Standard does not
2. 6″ tier boundary; mixed tier math; 20×$2=$40; 20×0.75oz=15oz
3. Continued segment shows segment-local totals
4. Regenerate after qty/dimension change updates cache

---

## Human Checkpoints Anticipated

- [x] Formal Review before implement (this goal)
- [ ] DEV Firebase Functions deploy (WS1 + WS2) — owner approval
- [ ] Owner DEV QA PASS before signoff
- [ ] Production deploy — **NOT in this goal**

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| ADR-FP-071 collision on unqueue | medium | Fail closed when other continuable exists; tested |
| Assisted attach still fails on edge images | medium | Staff decode probe + attach tests |
| Gang-sheet layout overlap with two-line heading | low | Increase band height; compositor tests |
| Stale gang-sheet cache | low | `sectionSummaryVersion` + dimension fields in fingerprint |

---

## Rollback Plan

- Revert commits on `development`; redeploy prior Functions on DEV if deployed.
- No data migration to reverse.

---

## Documentation Updates Required

- [ ] `docs/architecture/DATA_MODEL.md` — WS1 cancel semantics; WS2 `assistedFinalSourceId`; WS3 display note
- [ ] `docs/architecture/BACKEND.md` — new callable
- [ ] `docs/project/DECISIONS.md` — optional short ADR amendment for WS3 gang-sheet production line (or note under ADR-FP-143)
- [ ] `docs/standards/TESTING.md` — new test file paths if needed

---

## Open Questions

- [ ] None blocking — ADR-FP-071 collision handled by fail-closed pre-check (documented above).
- [ ] Optional follow-up: legacy assisted fast-ingest uploads backfill (out of scope unless QA finds production blockers).

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-31-pre-smart-profiling-print-request-and-gang-sheet-polish-review.md`
- Verdict: pending
