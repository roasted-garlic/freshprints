# Review: Amendment 9 P1 — Import / approval one-shot design-document read containment

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Reviewer | Independent Formal Review (adversarial, evidence-based) |
| Plan | `docs/workflow/plans/2026-08-07-amendment-9-p1-import-approval-read-containment-plan.md` |
| Plan status at review | `ready_for_review` |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| Verdict | **approved_with_changes** |

---

## Summary

Plan diagnosis of the import (5) and approve (3) oneshot stacks matches current Studio source, including `approveFromInbox` discarding the draft `updateDesign` return. Several proposed skips are proven same-stack redundancies; **I4** and **A3** (as planned) are **not**. I4’s `getDesignById` is the sole client eligibility gate for derivatives-complete after Storage I/O, and A3’s pre-write `getDoc` is the sole remaining archive authority before `readyAt` when A2 also skips a Firestore get. Rules do not block archived→ready. Implement may proceed only with the required retain/reclassify changes below.

---

## Verdict

**approved_with_changes**

Implement may proceed **only if** all Required Changes are applied in the same Implement pass (or the plan is patched to encode them before code lands). Not **approved** as written: I4 and A3 removals are unproven under the hard rule (authority purpose not proven redundant → keep). Not **blocked**: scope, hard constraints, and budgets remain achievable with the retained reads (import ≤2 via I1+I4; approve ≤2 via A1+A3).

---

## Source verification (claims vs HEAD)

Verified against:

- `apps/studio/.../designs/services/designReadyService.ts`
- `apps/studio/.../designs/services/designService.ts` (`createDesign`, `updateDesign`, `applyCatalogApprovalUpdate`, `getDesignById`)
- `apps/studio/.../designs/services/catalogApprovalService.ts`
- `apps/studio/.../ai-review/services/aiReviewInboxService.ts`
- `apps/studio/.../imports/services/importDerivativeService.ts`
- `apps/studio/.../imports/services/importOrchestrationService.ts`
- `firestore.rules` (`match /designs/{designId}` update)
- `apps/studio/.../designs/utils/designReadyPathValidation.ts`
- `apps/studio/.../designs/utils/designDocumentAfterWrite.ts`

| Claim | Verdict | Evidence |
|-------|---------|----------|
| Import success: 2× `getDesignById` + 3× write-path `getDoc` = **5** | **Confirmed** | Create post-`setDoc` `getDoc` (I1); `markDesignProcessing` get (I2) + `updateDesign` get (I3); `markDesignDerivativesComplete` get (I4) + `updateDesign` get (I5). Call sites pass `designId` only today. |
| Approve success: 1× `getDesignById` + 2× write-path `getDoc` = **3** | **Confirmed** | Draft `updateDesign` get (A1); `approveDesignForCatalog` get (A2); `applyCatalogApprovalUpdate` get (A3). |
| Write-path `getDoc` untraced (create/update/apply) | **Confirmed** | `getDesignById` traces; `createDesign` L848, `updateDesign` L961, `applyCatalogApprovalUpdate` L1155 do not. |
| `updateDesign` / `applyCatalogApprovalUpdate` merge-return (no post-write get) | **Confirmed** | `mergeDesignDocumentDataAfterWrite` → `mapDesignDocument`. |
| `approveFromInbox` discards `updateDesign` return | **Confirmed** | `await designService.updateDesign(...); return catalogApprovalService.approveDesignForCatalog(...)` — return unused. |
| Mark helpers always `getDesignById` then `updateDesign` | **Confirmed** | `designReadyService` L50–56, L70–91. |
| `approveDesignForCatalog` always `getDesignById` then apply | **Confirmed** | L34–56; guards archived / rejected / already ready. |
| Import orchestration has `Design` after create but does not thread it | **Confirmed** | `design = await createDesign(...)` then `runImportDerivativePipeline({ designId: design.id, ... })` only. |
| AI enqueue client path adds design-doc oneshots in this slice | **Accepted / out of P1** | Plan budget 0; enqueue is callable-side (out of scope). |
| Firestore Rules block archived→ready | **False — client guards matter** | Staff `designs` update allows status changes without archived→ready deny. Skipping client archive reads weakens real protection. |

---

## Explicit removal decisions

Hard rule applied: if a read’s authority purpose cannot be proven redundant → **keep** / reject that removal.

| ID | Plan action | Formal Review | Rationale |
|----|-------------|---------------|-----------|
| **I2** | Skip `markDesignProcessing` `getDesignById` when `knownDesign` passed | **APPROVE** | Same-stack: create return (status `imported`, `originalPath` set) immediately before mark; eligibility check can run on that snapshot. No intervening Storage I/O. |
| **I3** | Skip `updateDesign` pre-`getDoc` when `knownExisting` from I2/create | **APPROVE** | Double-read of same authority snapshot; archive/`createdBy`/exists purposes covered by create+I2 snapshot in this stack. Still must run existing guards on provided data; still merge-return + cache invalidate. |
| **I4** | Skip `markDesignDerivativesComplete` `getDesignById` when `knownDesign` = processing return | **REJECT — RETAIN read** | **Not redundant.** Between `markDesignProcessing` return and derivatives-complete there are Storage uploads (async gap). I4 is the **only** client check that `status ∈ {imported, processing}` before writing paths + `status: "imported"`. `updateDesign` does **not** re-validate that transition (only blocks archive↔status misuse). Plan’s own mitigation (“only pass snapshots … immediately before use”) fails across Storage. Reclassify I4: **REQUIRED** (or UNKNOWN→REQUIRED). |
| **I5** | Skip `updateDesign` pre-`getDoc` when `knownExisting` from I4 | **APPROVE conditional** | **Approve only** when `knownExisting` is the Design/doc snapshot from the **retained I4** authority get (or equivalent fresh read at derivatives-complete). **Reject** chaining `knownExisting` from the processing-return across the Storage gap. |
| **A2** | Skip `approveDesignForCatalog` `getDesignById` when draft-updated Design passed | **APPROVE** | Capture draft `updateDesign` merge return; run archived/rejected/ready guards on that snapshot in the same sequential stack (no Storage gap). Metadata draft write does not change `status`, so A1 merge status is valid for those guards at A1 time. |
| **A3** | Skip `applyCatalogApprovalUpdate` pre-`getDoc` via `knownExisting` from A1/A2 Design | **REJECT — RETAIN read** | With A2 also skipping Firestore get, A3 is the **only** write-boundary archive/exists authority before `readyAt` stamp. Rules do not prevent archived→ready. Purpose not proven redundant under hard rule. Plan already allows “optional retain A3 if review insists” — this review **insists**. |

### Resulting happy-path budgets (still meet plan targets)

| Path | After required retains | vs plan target |
|------|------------------------:|----------------|
| Import oneshots | **I1 + I4 = 2** (I2/I3/I5 skipped per above) | ≤2 **met** (stretch 1 only if create-merge lands) |
| Import traced `getDesignById` | **1** (I4 retained) | Plan’s “0 when Design threaded” **not** met; amend target to **≤1** with I4 retained |
| Approve oneshots | **A1 + A3 = 2** (A2 skipped) | ≤2 **met** (stretch 1 = A1-only **rejected** here) |
| Approve traced `getDesignById` | **0** | met |

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Studio import/approval only; P3/P4/Portal/server enqueue out |
| Architecture alignment | pass | Pass-through snapshots; Firestore remains authority |
| Security impact addressed | pass with changes | Must retain I4 eligibility + A3 archive-at-ready write boundary; tracing sanitized |
| Data model impact addressed | pass | None; `readyAt` write must remain |
| Backend impact addressed | pass | No new API/schema/dep/Rules |
| Test strategy adequate | pass with changes | Must assert retained I4/A3 reads; approval guards; enqueue once; P0; readyAt |
| Human checkpoints identified | pass | Morning combined QA; no Firebase deploy for P1 |
| Roadmap alignment | pass | Amendment 9 P1 after P3; separate commit |
| Documentation plan | pass | Plan/review/test/impl artifacts |
| No silent scope expansion | pass | Explicit forbids |

---

## Architecture Review

**Findings:**
- Optional `knownDesign` / `knownExisting` on mark/update/apply helpers is an acceptable same-stack optimization; no new layer.
- `importDerivativeService` must thread create (and mark return) Designs; today it cannot skip I2 without API changes — in scope.
- **Hazard:** passing mapped `Design` into `updateDesign`/`applyCatalogApprovalUpdate` as `knownExisting` for `mergeDesignDocumentDataAfterWrite` → `mapDesignDocument` may not round-trip (mapped Timestamps / omitted raw fields). Implement must define a safe shape (document-data / pre-map record), not casually reuse `Design` as Firestore `existingData`.

**Required changes:**
- [x] See Required Changes §3 (knownExisting shape)

---

## Security Review

**Findings:**
- Permission asserts on mark/approve paths stay; skipping `getDesignById` skips `canViewDesigns` only — mark/approve already require edit/approve permissions. Acceptable.
- Client archived / rejected / ready guards must not be weakened. Retaining A3 preserves write-boundary archive check when A2 uses in-memory draft snapshot.
- Retaining I4 preserves derivatives-complete eligibility after Storage (prevents clobbering non-imported/processing statuses with `status: "imported"` + paths).
- DEV tracing must stay metadata-only (collection/source/path pattern; no document contents / PII).

**Required changes:**
- [x] Retain I4 and A3 as above
- [x] Sanitized tracing only

**Human approval needed before production:**
- [ ] None for this Studio-only P1 (no Rules/deploy)

---

## Data Model Review

**Findings:**
- No schema change. `applyCatalogApprovalUpdate` must still set `readyAt` only when `input.status === "ready"` (existing behavior) — do not alter.

**Required changes:**
- [ ] None beyond preserving readyAt behavior in tests

---

## Backend Review

**Findings:**
- No Functions/Rules/API changes. Server enqueue Admin reads correctly out of scope.

**Required changes:**
- [ ] None

---

## Testing Review

**Findings:**
- Discriminating cases 1–15 are directionally right; must be tightened for retained reads.

**Required changes:**
- [x] Happy-path import: assert **I4** `getDesignById` (or equivalent oneshot) still occurs after Storage; I2/I3/I5 absent when threading enabled
- [x] Happy-path approve: assert **A3** `getDoc` (or traced write-path oneshot) still occurs; A2 `getDesignById` absent when draft Design passed; A1 retained
- [x] Approval guards (archived / rejected / already ready) still throw
- [x] Exactly one AI enqueue; P0 local reconcile; Processing 3→2→1→0; readyAt unchanged

---

## Documentation Review

**Findings:**
- Plan should be treated as amended by this review’s removal table (I4/A3 retain; traced import getDesignById target ≤1). Patch optional if Implement encodes Required Changes verbatim.

---

## Required Changes (approved_with_changes)

1. **Retain I4** — Do **not** skip `markDesignDerivativesComplete`’s authority read when the only available snapshot is the pre-Storage `markDesignProcessing` return. Reclassify I4 as **REQUIRED**. Status/`originalPath` validation still runs on the freshly loaded design.

2. **I5 only from I4 snapshot** — `knownExisting` for the derivatives-complete `updateDesign` may skip I5 **only** when sourced from the retained I4 read (same stack). Forbidden: processing-return → I5 across Storage uploads.

3. **Safe `knownExisting` / merge shape** — Define and use a document-data (or otherwise merge-safe) snapshot for skipped pre-write gets. Do not break `mergeDesignDocumentDataAfterWrite` → `mapDesignDocument` by feeding a loosely mapped `Design` as raw `existingData` without a proven round-trip.

4. **Retain A3** — Do **not** skip `applyCatalogApprovalUpdate`’s pre-write `getDoc` on the approve-from-inbox happy path when A2 also skips Firestore get. Keep archive/exists/`createdBy` authority at the `readyAt` write boundary.

5. **Approve A2 wiring** — `approveFromInbox` must `const draftUpdated = await updateDesign(...); return approveDesignForCatalog(..., draftUpdated)` (or equivalent); `approveDesignForCatalog` optional known Design skips **only** its get, **not** guards or the apply write.

6. **Do not weaken** validation, security, `readyAt`, enqueue-once, P0 local reconcile, Processing 3→2→1→0, or import path validation. No new API/schema/dependency. No P3/P4/Portal edits. Separate commit from P3.

7. **Amend targets in impl/test docs** — Import traced `getDesignById` happy path **≤1** (I4), not 0. Approve stretch “A1 only” is **out** for this slice.

8. **Tracing** — Sanitized write-path oneshot tracing on remaining create/update/apply `getDoc` sites (metadata only).

---

## Blockers

None that stop the phase. Removals I4 and A3-as-planned are rejected; work continues under Required Changes.

---

## Verdict Rationale

Evidence confirms the redundant double-read pattern and the discarded draft return. Same-stack skips **I2, I3, A2** and conditional **I5** are sound. **I4** and **A3** fail the redundancy proof: I4 guards eligibility across a Storage boundary that `updateDesign` does not re-check; A3 is the last archive authority before `readyAt` when A2 uses in-memory state, and Rules will not save a mistaken ready transition. Plan text explicitly invites Formal Review to force retains — those retains are mandatory here. Budgets remain ≤2/≤2.

---

## Next Step

**Implement** approved scope **with Required Changes 1–8 applied**. Do not implement I4 skip or A3 skip as originally classified. Re-review only if Implement expands beyond this amended scope.
