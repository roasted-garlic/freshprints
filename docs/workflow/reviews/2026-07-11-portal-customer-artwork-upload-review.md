# Review: Portal Customer Artwork Uploads and Studio Catalog Intake

| Field | Value |
|-------|-------|
| Date | 2026-07-11 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-07-11-portal-customer-artwork-upload-plan.md` |
| Verdict | **approved_with_changes** |
| Active workflow | **Unchanged** — `admin-operational-test-data-wipe` remains the managed goal; this review does **not** authorize implementation under that goal |

---

## Summary

The plan is architecturally sound: customer uploads stay separate from catalog `designs`, trusted processing is server-side, SVG is correctly deferred, Studio staff promotion is gated, and the open wipe track is explicitly sequenced out of dual implementation. It is **approved with changes** — several decisions must be locked (or treated as binding implement constraints) before coding, and implementation remains blocked until wipe is signed off or formally parked.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Strong in/out lists; Phase 9 Q&A and auto-catalog correctly excluded |
| Architecture alignment | pass | Portal/Studio layers, shared types, Functions boundary, no Electron in Portal, no monorepo restructure |
| Security impact addressed | pass with changes | Good threat model; ZIP/SVG/limits strong; rate-limit mechanism and Storage-rule limits need locking (see Security) |
| Data model impact addressed | pass with changes | Separate entities + dual statuses good; enum and print-size ambiguities; gang sheet source gap |
| Backend impact addressed | pass | Finalize-after-Storage preferred; callables listed; wipe extension in G |
| Test strategy adequate | pass | Commands match `TESTING.md`; coverage list matches acceptance risks |
| Human checkpoints identified | pass | Wipe gate, wording, rules/functions deploys, production Portal |
| Roadmap alignment | pass | Phase 8 fast-follow before Phase 9; does not collide with `customRequests` naming |
| Documentation plan | pass | ADR-FP-073 + DATA_MODEL/ARCHITECTURE/SECURITY/wipe docs |
| No silent scope expansion | pass | Explicitly preserves wipe; no AI prompt changes; no second working request |
| One-working-request (ADR-FP-071) | pass with changes | Intent correct; attach callable must hard-require same transactional create gate |

---

## Architecture Review

**Findings:**

- **Correct separation of lifecycles.** Request-use vs catalog promotion matches product rules and avoids writing request/production statuses onto `designs.status`.
- **Trusted boundary is right.** Client preflight + Storage source upload + finalize callable avoids callable payload limits and keeps sharp off the Portal bundle. Aligns with “no custom REST API without ADR.”
- **Layering.** New `apps/portal/features/customer-uploads/` + Studio intake under `/imports` (not a fourth workspace) matches architecture rules. Shared pure math in `packages/shared`; decode/process in Functions.
- **Studio import vs customer upload.** Correctly does **not** reuse Electron ZIP/PNG import or staff 2 GB limits. Separate source + production paths for customers are an intentional improvement over catalog’s single `originals/` blob.
- **Sub-phase order risk.** Sub-phase **G** (rules/indexes) after **C** (Portal UI) is unsafe if taken literally as deploy order. Rules and indexes must ship with or before any customer-writable Storage/Firestore path and before Portal upload CTAs go live.
- **ZIP pipeline under-specified.** Plan allows ZIP but does not lock whether (a) client uploads a ZIP object and the server expands into per-file `customerUploads`, or (b) the browser expands and uploads files individually. Trusted bomb protection requires locking **(a)** for ZIP (folder/multi remain individual files).
- **Gang sheet gap.** Decision 17 covers `ShowAllocation` and export hooks but not `GangSheetItem.designId: string` + `originalPathSnapshot` (`packages/shared/src/types/gangSheet/gangSheet.types.ts`). Sub-phase D must include gang-sheet types and writers.

**Required changes:**

- [ ] Reorder deploy guidance: Firestore/Storage rules + indexes land with sub-phase **B** (or before **C** goes live), not only in G. G remains wipe/cleanup/hardening.
- [ ] Lock ZIP flow: server-side trusted extraction of an uploaded ZIP into per-file upload records; reject nested ZIPs; folder selection stays client multi-file.
- [ ] Add `GangSheetItem` (and gang-sheet service/export paths) to the source-resolution checklist alongside allocations.

---

## Security Review

**Findings:**

- **Untrusted public input posture is correct:** auth required, canonical paths, server validation authoritative, SVG deferred, animated formats rejected, nested ZIP rejected, customer limits ≪ staff limits.
- **Callable-only attach** for request items is the right default — current `printRequestItems` rules require `isReadyDesign(designId)`, which would block upload-backed items and tempt unsafe rule relaxation.
- **Storage rules caveat:** “only while Firestore doc status allows upload” is hard to enforce richly in Storage rules. v1 should rely on: path ownership + size/type allowlist on `source`; **finalize** enforces doc ownership/status/path match; derivatives Admin-only. Do not assume complex Storage↔Firestore coupling without a proven rules pattern.
- **Rate limiting** is named but not designed. Repo has **no** App Check or HTTP rate limits on callables today. v1 needs a concrete abuse control (e.g. per-UID daily create/finalize caps enforced in callables + the stated concurrency of 3).
- **Private artwork isolation** correctly warns against applying ready-design public derivative read patterns to unapproved uploads.
- **Staff permissions** align with catalog approve (owner/admin for Send to AI Review). Good.
- **PII:** Studio intake showing customer email is staff-only and acceptable; avoid logging emails/filenames with full paths in Functions logs.

**Required changes:**

- [ ] Document concrete v1 abuse controls (per-UID daily caps on batch create + finalize; retain concurrency 3). App Check may remain a follow-up but must not be implied as already present.
- [ ] Clarify Storage rules: path + size/type + owner; status/lifecycle enforcement in finalize callable (and attach/promote).

**Human approval needed before production:**

- [x] Firestore rules deploy
- [x] Storage rules deploy
- [x] Functions deploy (new public upload surface)
- [x] Confirmation wording (legal/product)
- [x] Production Portal App Hosting (separate, still undeployed)
- [x] Wipe park or signoff before **any** implementation of this feature
- [x] Any weakening of customer isolation — stop

---

## Data Model Review

**Findings:**

- **`customerUploads` / `customerUploadBatches`** match camelCase plural conventions and correctly stay off `designs` until staff promotion.
- **Dual status fields** (`technicalStatus` vs `catalogReviewStatus`) are mandatory and well motivated.
- **Enum ambiguity (decision 2):** text both includes `promoted_to_design` and prefers collapsing to `sent_to_ai_review` + `promotedDesignId`. Implementers will diverge without a lock.
- **Request-item source union** is the right additive model; missing `sourceType` ⇒ `catalog_design` is a sound compatibility strategy. Making `designId` optional is a breaking TypeScript change for many call sites — plan correctly scopes that to sub-phase D; expect a wide but mechanical compile pass.
- **Decision 15 ambiguity:** “`printWidthInches = widthPx/300` **or** lock preferred 10″” — must pick one. Studio import uses `buildImportPrintSizeCreateFields` → `calculatePrintSizeAtTargetDpi` (inches = pixels / target DPI). **Lock that.** Request UI can still default customer-facing size toward 10″ via existing `resolveInitialPrintRequestItemSize`.
- **`onPrintRequestItemCreated`:** already no-ops when `designId` is empty. Still require an explicit `sourceType !== "catalog_design"` (or equivalent) guard so a mistaken dual-populated item cannot inflate `requestCount`.
- **Promotion link fields:** `promotedDesignId` on upload + `sourceCustomerUploadId` on design — good for idempotency and wipe ordering.
- **Phase 9 naming:** `/customer-uploads/` was documented for “Phase 9 request assets”; this plan reuses the prefix for Phase 8 fast-follow artwork. ADR-FP-073 must state that this is **not** `customRequests` / Phase 9 Q&A.

**Required changes:**

- [ ] Lock `catalogReviewStatus` to: `not_eligible` \| `pending_staff_review` \| `sent_to_ai_review` \| `excluded_from_catalog` (drop `promoted_to_design`; use `promotedDesignId` as the promotion link).
- [ ] Lock print-size metadata for processed uploads to `buildImportPrintSizeCreateFields` / shared target-DPI inches (no alternate “force 10″ on the upload record” path).
- [ ] ADR-FP-073 must distinguish customer request artwork uploads from Phase 9 `customRequests`.

---

## Backend Review

**Findings:**

- Callable set is appropriate; memory/timeout guidance (≥512MiB / ~180s) matches existing AI enqueue patterns.
- Attach callable must:
  1. `requirePortalCustomer`
  2. Verify ownership of batch/uploads
  3. Require both confirmations + `termsVersion` + `technicalStatus === ready`
  4. Resolve working request: if none, create via same transactional one-working gate as `createPortalPrintRequest`; if one exists (`draft`/`editing`), attach; if create would violate ADR-FP-071, fail closed
  5. Idempotent: uploads already linked to a `printRequestId` return success without duplicating items
- Promote callable transaction + post-commit enqueue is correct; default click must not re-enqueue.
- Wipe integration in G is correctly preferred over an unbounded follow-up; still must not start while wipe is the active buggy track without owner park/signoff.

**Required changes:**

- [ ] Spell the five attach-callable invariants above into the plan Approach (or treat this review list as binding).
- [ ] Specify attach idempotency: skip item create if `customerUploadId` already present on the target request (same size merge policy optional; default = no duplicate rows for same upload id).

---

## One-working-request compliance (ADR-FP-071)

**Findings:**

- Plan explicitly forbids a second working request and reuses create-when-none / attach-when-one.
- Catalog add-to-request already has create/single/pick branches; with ADR-FP-071, pick is vestigial. Upload attach should **not** reintroduce multi-working pick UX.
- Authoritative enforcement must remain on the **server** (create path inside attach callable), not UI alone — matches the one-working-request review precedent.

**Required changes:**

- [ ] Attach flow: no “pick among multiple working requests” UI; server fails closed if unexpectedly >1 continuable (should not occur post-ADR-FP-071).

---

## Testing Review

**Findings:**

- Commands align with `docs/standards/TESTING.md` (no root `npm test`).
- Coverage list matches the highest-risk areas (transparency, ZIP, source union, promotion idempotency, export resolution, wipe expansion).
- Manual E2E Portal → request → show → Studio intake → AI → catalog approve/reject is correctly required.
- Rules: “emulator if present else document gap” is honest; for a public upload surface, **prefer** adding at least focused rules unit/emulator checks in G, or document residual risk in `RISK_REGISTER.md`.

**Required changes:**

- [ ] None blocking. Recommendation: add rules tests or an explicit residual-risk entry if emulators are not used.

---

## Documentation Review

**Findings:**

- Doc update list is complete for a feature of this size.
- ADR-FP-073 is the right home for entity separation, item source union, staff promotion, and processing boundary.
- Parallel-plan handling of `.cursor/workflow/state.md` is correct (do not steal the wipe goal).

---

## Implementation sequencing

| Gate | Review assessment |
|------|-------------------|
| Plan + Review now while wipe open | **Allowed** (this document) |
| Start implementation under wipe goal | **Forbidden** |
| Implement after wipe signoff | **Preferred** |
| Implement after owner parks wipe + switches managed goal | **Allowed** with Decision Log entry |

**Verdict on sequencing:** Plan’s decision 26 is correct and is a **hard gate**, not a suggestion.

---

## Required Changes (approved_with_changes)

Binding before implementation (plan revision preferred; else implement agent must obey this list without reinterpretation):

1. **Deploy order:** Rules + indexes with/before trusted upload backend goes live; before Portal upload UI is enabled.
2. **ZIP:** Server-side trusted extract of uploaded ZIP → per-file records; nested ZIP reject; folder = client multi-file.
3. **Gang sheets:** Include `GangSheetItem` + writers/resolvers in sub-phase D.
4. **`catalogReviewStatus`:** Drop `promoted_to_design`; use `sent_to_ai_review` + `promotedDesignId`.
5. **Print-size metadata:** Lock to `buildImportPrintSizeCreateFields` / shared target-DPI math.
6. **Abuse controls:** Concrete per-UID daily caps on create/finalize in callables.
7. **Storage rules:** Path/owner/size/type in rules; lifecycle in finalize.
8. **Attach callable:** Five ADR-FP-071 / confirmation / idempotency invariants; no multi-working picker.
9. **ADR-FP-073:** Clarify vs Phase 9 `customRequests`.

---

## Blockers

1. None for **plan approval**.
2. **Implementation blocker (workflow):** active `admin-operational-test-data-wipe` must be signed off or formally parked before this feature becomes the managed implementation goal.

---

## Verdict Rationale

**approved_with_changes** — The plan meets FreshForge bar for a high-risk public upload feature: correct entity split, trusted processing, one-working-request intent, SVG deferral, staff-gated AI, wipe coexistence rules, and an adequate test matrix. Remaining items are lock-downs and sequencing clarifications, not fundamental redesign. It is **not** a blank check to implement while wipe remains the active goal.

---

## Next Step

1. Optionally revise the plan to incorporate the nine required changes (recommended).
2. Owner: approve confirmation wording when ready (can wait until implement start).
3. Owner: **sign off or park** `admin-operational-test-data-wipe`.
4. Only then: switch managed goal to `portal-customer-artwork-upload` and begin sub-phase A under a new implement scope (or split A–G as separate approved scopes).

**Do not begin implementation from this review alone.**
