# Formal Review: Pre–Smart Profiling Print Request + Production Polish

| Field | Value |
|-------|-------|
| Date | 2026-08-31 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-31-pre-smart-profiling-print-request-and-gang-sheet-polish-plan.md` |
| Goal ID | `pre-smart-profiling-print-request-and-gang-sheet-polish` |
| Verdict | **approved_with_changes** |
| Production | **NOT AUTHORIZED** |
| Smart Profiling | **NOT STARTED** |

---

## Summary

The plan correctly scopes three independent workstreams that reuse established allocation lifecycle (WS1), assisted-creation ingest pipeline (WS2), and grouped gang-sheet compositors (WS3). Repo inspection confirms removable allocation states, Final Image schema, and allocation-quantity authority. **Approved with minor required changes** before implementation — primarily ADR-FP-071 fail-closed UX copy and WS3 fingerprint versioning detail.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Three WS; explicit out-of-scope |
| Architecture alignment | pass | Callable + shared utils; no UI direct Firestore writes |
| Security impact addressed | pass | WS1 server-authoritative; WS2 no new public paths |
| Data model impact addressed | pass | Additive optional fields only; no migration |
| Backend impact addressed | pass | 1 new callable; 2 Function touch points |
| Test strategy adequate | pass | Per-WS unit + manual matrix |
| Human checkpoints identified | pass | DEV deploy + owner QA |
| Roadmap alignment | pass | Pre–Smart Profiling polish |
| Documentation plan | pass | DATA_MODEL, BACKEND, DECISIONS |
| No silent scope expansion | pass | Smart Profiling / production excluded |

---

## Formal Review Questions

### WS1

| # | Question | Answer |
|---|----------|--------|
| 1 | Exact customer-removable allocation states? | **`pending`**, **`queued`** only |
| 2 | Allocation history? | **`status: "canceled"`** — documents retained (parity with ADR-FP-141 / recovery) |
| 3 | Request state after editable? | **`editing`** when zero active allocations globally and ADR-FP-071 allows |
| 4 | ADR-FP-071 preserved? | **Yes** — fail closed if another portal-editable `draft`/`editing` exists; reuse `shouldTransitionActiveRequestToEditing` |
| 5 | New callable required? | **Yes** — `unqueuePortalPrintRequestFromShow` (customers cannot write allocations) |
| 6 | Rules changes required? | **No** — Admin SDK mutations only |

### WS2

| # | Question | Answer |
|---|----------|--------|
| 7 | What is Final Image in repo? | **`assistedCreationRequests.finalSource`** at `assisted-creation/{uid}/{requestId}/final/{fileId}` |
| 8 | Missing production metadata? | Attach path already processes; gaps are **Portal CTA eligibility** (ignores `finalSource`), **staff upload validation**, optional **`assistedFinalSourceId`** audit |
| 9 | Reusable processing utilities? | **`processCustomerUploadImageBytes`**, **`saveCustomerUploadProcessedOutputs`**, extract Sharp decode probe from **`customerUploadProcessing.ts`** |
| 10 | sourceType for attached item? | **`customer_upload`** (keep current ADR-FP-094) |
| 11 | Migration required? | **No** — additive fields forward-only |
| 12 | Catalog lifecycle change? | **No** — assisted lifecycle remains distinct |

### WS3

| # | Question | Answer |
|---|----------|--------|
| 13 | Authoritative quantity? | **`showAllocations.allocatedQuantity`** → IPC `image.quantity` → placement count per segment |
| 14 | Continued/spillover representation? | **`PendingGroupedSection`** / **`PendingGroupedSheet`** with `-Continued` headings; segment qty = placements in that section |
| 15 | Where to calculate? | **`packages/shared/src/utils/gangSheetCustomerSectionSummary.ts`** (new) |
| 16 | Which compositors render second line? | **`composeGroupedGangSheetSheets.ts`**, **`composeContinuousCustomerGroupedGangSheetSheets.ts`** via **`gangSheetLabelRendering.ts`** |
| 17 | Cache/fingerprint changes? | Add **`sectionSummaryVersion`**, per-image **`printWidthInches`/`printHeightInches`** to fingerprint |
| 18 | Shared calculation/render model? | **Yes** — one shared summary util; both compositors call it per section |

---

## Architecture Review

**Findings:**
- WS1 correctly mirrors ADR-FP-141 cancelable vs blocking split and staff recovery patterns without hard-deleting allocations.
- WS2 extends existing attach callable rather than new attachment architecture — appropriate.
- WS3 keeps pricing logic out of Electron compositor except formatting/rendering — appropriate.

**Required changes:**
- [ ] Implement WS1 core in shared-testable lib before callable wrapper (as planned).

---

## Security Review

**Findings:**
- WS1: Callable must verify ownership, portal origin, non-internal, show production gate, and blocking allocation absence — plan covers all.
- WS2: No cross-customer exposure; customer-upload private paths unchanged.
- WS3: Display-only; no new data exposure.

**Required changes:**
- [ ] None

**Human approval needed before production:**
- [ ] All deploys — DEV only in this goal

---

## Data Model Review

**Findings:**
- WS1: No schema change.
- WS2: Optional `assistedFinalSourceId` on `customerUploads`; optional dimensions on `finalSource`.
- WS3: No persistence.

**Required changes:**
- [ ] Document additive fields in DATA_MODEL.md during implement.

---

## Backend Review

**Findings:**
- New export: `unqueuePortalPrintRequestFromShow` in `functions/src/index.ts`.
- Redeploy: assisted creation handlers + attach callable on DEV.

**Required changes:**
- [ ] Use `FUNCTIONS_DISCOVERY_TIMEOUT=120` for DEV deploy (established pattern).

---

## Testing Review

**Findings:**
- Acceptance criteria from owner prompt mapped to per-WS test files.
- Manual matrix adequate for Portal UX and gang-sheet visual verification.

**Required changes:**
- [ ] Add compositor snapshot or band-height assertion tests for WS3 heading overlap.

---

## Documentation Review

**Findings:**
- Plan lists DATA_MODEL, BACKEND, DECISIONS updates.
- Recommend brief ADR-FP-143 amendment note for production price/weight subtitle (informational only).

**Required changes:**
- [ ] Add ADR-FP-143 amendment during implement/signoff.

---

## Required Changes (approved_with_changes)

1. **WS1:** Return explicit error code when ADR-FP-071 blocks (`hasOtherContinuableRequest`) — include actionable Portal copy referencing existing continuable-request picker pattern.
2. **WS3:** Bump cache with explicit `sectionSummaryVersion: 1` on first ship (plan already specifies — mandatory in implement).
3. **WS2:** Do not add staff-upload-time full production pipeline in V1 — validation + attach-path hardening only (plan already constrains — do not expand).

---

## Blockers

None.

---

## Verdict Rationale

**approved_with_changes** — Repo verification resolves all `[NEEDS REPO CHECK]` items without owner escalation. WS1 safety boundary is clear from `printRequestConversion.ts` and `canRemoveRequestFromShow`. WS2 Final Image is `finalSource` with attach-time processing already present. WS3 segment-local totals are feasible from placement counts. Minor implement-time requirements listed above.

---

## Next Step

**STOP** — await owner approval of Plan + Formal Review before implementation.

Owner should reply with approval to proceed to Implement phase (or requested plan revisions).
