# Review: Library design sharing on custom design requests (#12)

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Reviewer | Review Agent (Architecture + Security perspectives) |
| Plan | docs/workflow/plans/2026-07-20-library-design-sharing-custom-requests-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

Plan correctly targets live **Assisted Creation** (not deferred `customRequests`), reuses `/share/design/{id}`, and keeps customer approve / change-request as the review loop. Scope is bounded and security defaults (ready-only designs, callables-only, no staff force-approve) are sound. Conditional approval requires implement to follow the binding changes below so proof purge/download and Add to Request do not leak across fulfillment modes.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Assisted only; #13 donate explicitly out |
| Architecture alignment | pass | Shared transitions + Admin callables + thin UI; share URL reuse |
| Security impact addressed | pass | Ready-design server check; owner/admin mutate; no new public ACL |
| Data model impact addressed | pass | Additive fields + `fulfillmentMode`; migration notes OK |
| Backend impact addressed | pass | New suggest callable + respond branch; email optional stretch clarified below |
| Test strategy adequate | pass | Transition unit tests + manual Studio/Portal; typecheck |
| Human checkpoints identified | pass | Manual UI; Functions deploy to fresh-prints-dev |
| Roadmap alignment | pass | #12 |
| Documentation plan | pass | DATA_MODEL, BACKEND, DECISIONS ADR, ROADMAP |
| No silent scope expansion | pass | No Messages rich cards / AI match / force-approve |

---

## Architecture Review

**Findings:**
- Reusing status `proof_ready` with `fulfillmentMode` is the right narrow choice — avoids a parallel customer-review state machine.
- Highest structural risk is **cross-mode coupling**: download, sibling proof purge, Add to Request, and email kinds must branch on `fulfillmentMode` / `approvedCatalogDesignId` vs `approvedProofId` everywhere those paths exist (Functions + Portal + any scheduled purge).
- Prefer extending `customerRespondToAssistedCreationProof` with an internal branch (or shared helper) rather than a second poorly named parallel callable — keep one customer “respond to review” entry point.
- Studio catalog picker: reuse an existing Studio design-browser pattern if available; do not build a second catalog subsystem.
- Share URLs: consume `buildPortalDesignShareUrl` / deep-link helpers; do not duplicate OG fetch in Assisted UI beyond what catalog cards already use for ready designs.

**Required changes:**
- [x] Implement must inventory and gate: proof download callable, approve-time sibling purge, terminal purge, Portal Download CTA, Add to Request CTA — all no-ops or alternate paths when `fulfillmentMode === "catalog_share"`.
- [x] On staff proof upload after a prior catalog suggestion (or vice versa), **clear the opposite fulfillment fields** in the same write (fail closed if both would remain set).

---

## Security Review

**Findings:**
- Server-side `status === "ready"` check on suggest is mandatory; client-picked title/image must not be authoritative (plan’s Admin snapshot is correct).
- Catalog share links are already public for ready designs (#13); attaching them to a private Assisted request does not widen design read ACL. Still ensure customer respond cannot approve an arbitrary `designId` that differs from the server-stored `suggestedCatalogDesign.designId`.
- Owner/admin-only suggest matches existing proof attach; helpers remain read-only.
- No new secrets or public mutation endpoints.
- Notification deep links should land on Assisted status (and Overview/proofs-equivalent), not only Messages.

**Required changes:**
- [x] Customer approve for catalog mode must use **server-stored** `suggestedCatalogDesign.designId` only (ignore any client designId on respond).
- [x] If design was archived/rejected between suggest and approve, fail closed with a clear error (or re-validate `ready` on approve) — document chosen behavior in implement notes / ADR.

**Human approval needed before production:**
- [x] Functions (+ any rules if touched) deploy to production later — not this session; fresh-prints-dev deploy is a later human step after implement/test.

---

## Data Model Review

**Findings:**
- Additive `fulfillmentMode`, `suggestedCatalogDesign`, `approvedCatalogDesignId` are appropriate; schemaVersion 1 + optional fields is consistent with prior Assisted additive evolution.
- Snapshot fields (title, preview) are fine for history; live UI may refresh from ready design when available.
- Document that legacy docs without `fulfillmentMode` ≡ `proof_image`.

**Required changes:**
- [x] When clearing a suggestion on revision resume / new proof, set `suggestedCatalogDesign` to `null` (or delete field) and reset `fulfillmentMode` appropriately — avoid stale suggestion cards on `in_progress`.

---

## Backend Review

**Findings:**
- New `staffSuggestAssistedCreationCatalogDesign` callable is the right shape.
- Email kind `assisted_catalog_share_ready` is desirable for parity with proof-ready; plan’s stretch is acceptable **only if** in-app `customerNotifications` ships in the same implement pass.
- Proof-ready email CTA resolver should get a sibling or parameterized URL for catalog review (same Assisted status step is fine).

**Required changes:**
- [x] **In-app notification is required for v1**; email outbox is same-phase preferred but may land as immediate follow-up commit if blocked — do not ship Studio suggest without customer-visible alert.
- [x] Transition util: extend `hasSuggestedCatalogDesign` (or equivalent) and update `assistedCreationTransitions.test.ts` for both proof and catalog paths.

---

## Testing Review

**Findings:**
- Transition unit tests are the critical automated gate.
- Manual Studio + Portal matrix in the plan is adequate; include regression on classic proof path.
- No Firestore client-write rule change expected — confirm during implement; if rules untouched, document skip.

**Required changes:**
- [x] Add at least one unit/integration-style assertion that catalog approve does **not** require `hasProofAsset` / does not set `approvedProofId`.

---

## Documentation Review

**Findings:**
- DATA_MODEL Assisted section, BACKEND callables table, DECISIONS ADR, ROADMAP #12 — sufficient.
- SECURITY.md only if notification or ACL wording would otherwise stay stale.

---

## Required Changes (if approved_with_changes)

1. Gate all proof download / purge / Download CTA / proof-copy Add to Request on fulfillment mode; catalog approve uses catalog Add to Request only.
2. Clear opposite fulfillment fields when switching proof ↔ catalog suggest; clear suggestion when returning to `in_progress` after revision.
3. Customer approve uses server-stored suggested design id only; re-validate design still `ready` (or documented fail-closed).
4. In-app customer notification required in implement v1; email preferred same phase.
5. Extend shared transition tests for catalog `proof_ready` and catalog approve path.

---

## Blockers (if blocked)

(none)

---

## Verdict Rationale

Scope, security, and architecture fit the product ask without reopening #13 or deferred fee queues. Conditional changes prevent the main failure mode: treating a library suggestion like a Storage proof (or the reverse). Binding product default **no staff force-approve** is accepted; cancel remains the close-without-customer-review path.

---

## Next Step

Implement approved scope **following Required Changes**. No production deploy. Stop for manual UI checkpoint after implement + automated tests. Optional non-blocking owner note: confirm email-in-v1 vs notification-first if schedule is tight.
