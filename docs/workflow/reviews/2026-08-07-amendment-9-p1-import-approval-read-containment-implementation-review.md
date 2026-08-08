# Implementation Review: Amendment 9 P1 — Import / approval read containment

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Reviewer | Independent Implementation Review (adversarial, evidence-based) |
| Plan | `docs/workflow/plans/2026-08-07-amendment-9-p1-import-approval-read-containment-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-08-07-amendment-9-p1-import-approval-read-containment-review.md` (`approved_with_changes`) |
| Test report | `docs/workflow/reviews/2026-08-07-amendment-9-p1-import-approval-read-containment-test-report.md` (`passed`) |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| Inspected | Working-tree diff + source for scoped P1 Studio files (changes uncommitted at review) |
| Verdict | **APPROVED** |

---

## Diff inspected

```
git diff -- apps/studio/src/renderer/src/features/designs \
  apps/studio/src/renderer/src/features/imports \
  apps/studio/src/renderer/src/features/ai-review/services/aiReviewInboxService.ts
```

| Path | Status in working tree |
|------|------------------------|
| `…/ai-review/services/aiReviewInboxService.ts` | modified |
| `…/designs/services/catalogApprovalService.ts` | modified |
| `…/designs/services/designReadyService.ts` | modified |
| `…/designs/services/designService.ts` | modified |
| `…/designs/types/design.types.ts` | modified |
| `…/imports/services/importDerivativeService.ts` | modified |
| `…/imports/services/importOrchestrationService.ts` | modified |
| `…/designs/services/amendment9P1ReadContainment.wiring.test.ts` | new (untracked) |

No Portal app, Functions, P3 taxonomy, or P4 publication modules appear in this P1 source diff.

---

## Call-graph reconstruction (actual source)

### Import happy path — design-document oneshots **5 → 2**

```
importValidatedPngFile
  └─ createDesign → post-setDoc getDoc                          [I1 KEEP]
       returns DesignAuthoritySnapshot { design, documentData }
  └─ runImportDerivativePipeline({ knownAuthority })
       └─ markDesignProcessing(knownAuthority)
            ├─ uses knownAuthority.design (no getDesignById)     [I2 SKIP]
            └─ updateDesign(..., { knownExistingData: documentData })
                 (no pre-write getDoc)                           [I3 SKIP]
       └─ Storage: uploadThumbnailWebp / uploadPreviewWebp       ← async gap
       └─ markDesignDerivativesComplete
            ├─ getDesignAuthoritySnapshot → getDoc               [I4 KEEP]
            │    status ∈ {imported, processing} + path validate
            └─ updateDesign(..., { knownExistingData: authority.documentData })
                 (no pre-write getDoc; NOT processing return)    [I5 SKIP]
```

| ID | Pre | Post | Evidence |
|----|-----|------|----------|
| I1 | getDoc | getDoc (+ trace) | `createDesign` still materializes after `setDoc`; returns `{ design, documentData }` |
| I2 | getDesignById | **skipped** when `knownAuthority.design.id === designId` | `designReadyService.markDesignProcessing` |
| I3 | updateDesign getDoc | **skipped** via `knownExistingData: knownAuthority.documentData` | same; raw doc fields, not mapped `Design` |
| I4 | getDesignById | **retained** as `getDesignAuthoritySnapshot` (fresh getDoc, bypasses Design document cache) | always runs; no `knownDesign` skip param; after Storage only |
| I5 | updateDesign getDoc | **skipped** via `knownExistingData: authority.documentData` from **I4 only** | processing return is never threaded across Storage |

**Oneshoot count:** I1 + I4 = **2**. Meets Formal Review budget (≤2).  
**Traced `getDesignById` on happy path:** **0** (I4 moved to `getDesignAuthoritySnapshot`). Still one post-Storage authority oneshot — satisfies Formal Review intent (“getDesignById or equivalent”); improving on cache bypass is correct.

### Approve-from-inbox happy path — oneshots **3 → 2**

```
approveFromInbox
  └─ draftUpdated = updateDesign(...)                            [A1 KEEP — getDoc]
  └─ approveDesignForCatalog(caller, designId, draftUpdated)
       ├─ uses knownDesign (no getDesignById)                    [A2 SKIP]
       ├─ archived / rejected / already-ready guards on snapshot
       └─ applyCatalogApprovalUpdate(...)
            └─ always getDoc + archived guard + readyAt write    [A3 KEEP]
```

| ID | Pre | Post | Evidence |
|----|-----|------|----------|
| A1 | updateDesign getDoc | retained | inbox still calls `updateDesign` without `knownExistingData` |
| A2 | getDesignById | **skipped** when `knownDesign.id === designId` | `catalogApprovalService.approveDesignForCatalog` |
| A3 | apply getDoc | **retained** — no `knownExistingData` on apply | `applyCatalogApprovalUpdate` always `getDoc`; wiring test forbids skip option in apply section |

**Oneshoot count:** A1 + A3 = **2**. Meets Formal Review budget. Stretch “A1 only” correctly **not** implemented.

---

## Must-verify checklist

| # | Requirement | Verdict | Evidence |
|---|-------------|---------|----------|
| 1 | Import oneshots 5→2 | **Pass** | Call graph above; I1+I4 only |
| 2 | Approve oneshots 3→2 | **Pass** | A1+A3 only; A2 skipped via draft Design |
| 3 | I4 retained (fresh get after Storage) | **Pass** | `markDesignDerivativesComplete` always `getDesignAuthoritySnapshot`; pipeline does not pass processing return; Storage uploads sit between markProcessing and derivativesComplete |
| 4 | A3 retained (apply still getDoc) | **Pass** | No skip API on apply; archive check + `readyAt` when `status === "ready"` unchanged |
| 5 | I2, I3, A2 skipped correctly | **Pass** | create authority → markProcessing; draftUpdated → approveDesignForCatalog |
| 6 | I5 only from I4 documentData | **Pass** | `knownExistingData: authority.documentData` immediately after I4; import path never supplies processing-return as I5 base |
| 7 | knownExisting uses documentData not mapped Design | **Pass** | `DesignAuthoritySnapshot.documentData: Record<string, unknown>`; `knownExistingData?: Record<string, unknown>` documented “Must not be a mapped Design”; mark helpers pass `.documentData` only |
| 8 | Guards intact | **Pass** | Processing: status `imported` before write; derivatives: status ∈ {imported, processing} + path validation; approve: archived/rejected/ready before apply; apply: archived again at write boundary; `readyAt` only on ready |
| 9 | No P3/P4/Portal unrelated changes | **Pass** | Diff limited to 7 Studio modules + P1 wiring test; `git diff --name-only` for portal/functions/packages empty for this slice |
| 10 | Formal Review required changes 1–8 applied | **Pass** | See section below |

---

## Formal Review required changes (1–8)

| # | Required change | Applied? | Evidence |
|---|-----------------|----------|----------|
| 1 | Retain I4 — do not skip authority read across Storage | **Yes** | Always `getDesignAuthoritySnapshot` in `markDesignDerivativesComplete`; no skip parameter |
| 2 | I5 only from I4 snapshot | **Yes** | `knownExistingData: authority.documentData` from that read only |
| 3 | Safe knownExisting / merge shape | **Yes** | `DesignAuthoritySnapshot` + raw `documentData`; create/I4 shallow-copy snapshot fields for merge |
| 4 | Retain A3 | **Yes** | apply always getDoc; comment + wiring test lock it |
| 5 | Approve A2 wiring | **Yes** | `const draftUpdated = await updateDesign(...); return approveDesignForCatalog(..., draftUpdated)` |
| 6 | Do not weaken validation / readyAt / enqueue / P0 / Processing / paths; no new API/schema/dep; no P3/P4/Portal | **Yes** | Guards and readyAt preserved; client-only; scoped files only. Enqueue/P0 not altered in this diff (covered by existing suites per test report) |
| 7 | Amend targets — import traced get ≤1 (I4); A1-only stretch out | **Yes** | Implementation keeps post-Storage oneshot; does not skip A3 |
| 8 | Sanitized write-path tracing | **Yes** | create/update/apply/getDesignAuthoritySnapshot: metadata only (`app`, `collection`, `documentPathPattern`, `source`, `triggerReason`) — no document contents |

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Studio import/approval read containment only |
| Architecture alignment | pass | Same-stack snapshot pass-through; Firestore remains authority; no new layers |
| Security impact addressed | pass | I4 eligibility + A3 archive-at-ready retained; permission asserts unchanged |
| Data model impact addressed | pass | No schema change; `readyAt` write path intact |
| Backend impact addressed | pass | No Functions/Rules/API |
| Test strategy adequate | pass | Wiring test locks I4/A3/threading/tracing; test report: focused suites + tsc + vite build + lint + diff --check exit 0 |
| Human checkpoints identified | pass | Morning combined QA; no Firebase deploy for P1 |
| Roadmap alignment | pass | Amendment 9 P1 after Formal Review retains |
| Documentation plan | pass | Plan/formal review/test/impl-review artifacts |
| No silent scope expansion | pass | No Portal/P3/P4 product code in diff |

---

## Architecture Review

**Findings:**
- `DesignAuthoritySnapshot` correctly separates mapped `Design` (eligibility/guards) from raw `documentData` (merge base). Addresses Formal Review hazard about feeding mapped `Design` into `mergeDesignDocumentDataAfterWrite`.
- I4 via `getDesignAuthoritySnapshot` is preferable to `getDesignById`: always hits Firestore (no `designDocumentCache`), and yields documentData for I5 in one oneshot.
- `createDesign` return type change to `DesignAuthoritySnapshot` has a single production caller (`importOrchestrationService`), updated correctly.

**Required changes:**
- [ ] None

---

## Security Review

**Findings:**
- Post-Storage eligibility still enforced before writing `status: "imported"` + paths.
- With A2 skipped, A3 remains the write-boundary archive/exists authority before `readyAt`.
- Tracing is metadata-only.

**Required changes:**
- [ ] None

**Human approval needed before production:**
- [ ] None for this Studio-only P1 (no Rules/deploy)

---

## Data Model Review

**Findings:**
- `applyCatalogApprovalUpdate` still stamps `readyAt` only when `input.status === "ready"`.

**Required changes:**
- [ ] None

---

## Backend Review

**Findings:**
- No backend surface change.

**Required changes:**
- [ ] None

---

## Testing Review

**Findings:**
- `amendment9P1ReadContainment.wiring.test.ts` is static source-string verification (appropriate lock for I4/A3/no-apply-skip/tracing).
- Test report records combined wiring + localReconciliation + catalogApproval (14 pass), Studio tsc, Vite build, lint, `git diff --check` — all exit 0.
- Runtime instrumented oneshot counters are not in this slice; call-graph reconstruction from source is sufficient for this review.

**Required changes:**
- [ ] None

---

## Documentation Review

**Findings:**
- Formal Review amendments (I4/A3 retain) are encoded in code comments and wiring tests. Test report budgets match amended targets.

---

## Adversarial notes (non-blocking)

1. **`updateDesign` does not assert `knownExistingData` corresponds to `designId`** (unlike `knownDesign.id === designId`). Misuse by a future caller could skip get with a wrong merge base. Current call sites are same-stack and correct; hardening optional later.
2. **I4 is no longer named `getDesignById`** — traced getDesignById count is 0, but the required post-Storage oneshot remains. Prefer counting design-doc oneshots (budget 2), not the method name.
3. **Wiring tests are structural**, not live Firestore counters. Acceptable given Formal Review + existing approval/P0 suites in the test report.
4. **Cosmetic:** extra blank line before `return mapDesignDocument` in `applyCatalogApprovalUpdate` — ignore.

---

## Required Changes

None.

---

## Blockers

None.

---

## Verdict Rationale

Source implements the Formal Review–amended P1: import collapses to I1+I4; approve collapses to A1+A3; I2/I3/A2 skipped on same-stack trustworthy snapshots; I5 keyed only from fresh I4 `documentData`; A3 write-boundary getDoc and archive/`readyAt` behavior preserved; merge-safe `DesignAuthoritySnapshot` avoids mapped-`Design`-as-existingData; tracing sanitized; scope clean of P3/P4/Portal. No critical defect that would force `APPROVED_WITH_CHANGES` or `BLOCKED`.

---

## Next Step

**Signoff** (or commit + Signoff) per Managing Agent. Manual morning 45-design QA remains the human checkpoint outside this review.
