# Review: Portal Persistent Current Request (Cart-Style Flow)

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-07-12-portal-persistent-current-request-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

Plan is well-grounded in a verified repo audit: lazy one-working-request creation, selection-mode URL contract, upload modal via `?upload=1`, and absence of basket chrome. Product boundaries (no payment, no donations, Studio selection unchanged, `fresh-prints-dev` only) are explicit. Scope is large but sequenced (Parts B→G) with an optional split. Implementation may proceed after applying the required changes below — they refine the plan; they do not reopen product intent.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Cart-style request UX; donations/payment/Studio out |
| Architecture alignment | pass | Hook/service layers; extend existing provider |
| Security impact addressed | pass | Keeps server gates for create/upload/queue |
| Data Model impact addressed | pass | Prefer no schema change; derived primary variant |
| Backend impact addressed | pass | Prefer reuse callables; deploy only if needed |
| Test strategy adequate | pass | Unit + full manual 24-step checkpoint |
| Human checkpoints identified | pass | Manual UI before signoff; no prod |
| Roadmap alignment | pass | Phase 8 fast-follow after upload parent close |
| Documentation plan | pass | ADR + ARCHITECTURE + handoff |
| No silent scope expansion | pass | Explicit out-of-scope list |

---

## Architecture Review

**Findings:**
- Extending `PortalPrintRequestContext` / a dedicated `useCurrentRequest` is the right foundation; avoid per-page Firestore listeners with divergent state.
- Direct-add must not navigate away — matches existing service write paths in `portalPrintRequestService.ts`.
- Dedicated `/requests/artwork` correctly avoids a generic `/uploads` collision with future donations.
- Selection-mode retention until Part G is the correct migration posture.

**Required changes:**
- [ ] **B1:** Document and implement a single item-subscription owner (provider or one hook used by drawer + catalog + detail). Do not subscribe independently in drawer and catalog cards.
- [ ] **B2:** Attention derivation must live in a pure util (+ tests) covering at least: DPI &lt; 200, DPI 200–299 warning, upload processing/failed, missing/invalid size. Ownership-incomplete only if still representable on attached items; do not invent donation states.

---

## Security Review

**Findings:**
- Client aggregates and basket UI are non-authoritative — acceptable.
- Plan correctly forbids trusting client-only one-working / upload / queue enforcement.
- No production rule or secret changes proposed.

**Required changes:**
- [ ] None beyond keeping existing callable auth paths when wiring artwork page attach.

**Human approval needed before production:**
- [x] Production deploy remains out of scope (separate checkpoint later)

---

## Data Model Review

**Findings:**
- Derived primary variant (earliest catalog `createdAt`) avoids schema churn — good for v1.
- Mixing catalog + upload items already supported — preserve.

**Required changes:**
- [ ] **D1:** If implement discovers duplicate items cannot be ordered reliably without a new field, **stop and revise plan** before adding persisted fields (do not silently add `duplicatedFromItemId`).

---

## Backend Review

**Findings:**
- Reuse of `createPortalPrintRequest`, `resolveOrCreateWorkingPrintRequestInTransaction` (attach), `queuePortalPrintRequestToShow`, `duplicatePortalPrintRequestItem` is correct.
- Artwork page with virtual empty Current Request must rely on attach’s resolve-or-create (already exists) or explicit create-then-attach — do not invent a second create gate.

**Required changes:**
- [ ] **E1:** In Part E approach notes: when no working request exists, artwork confirm uses existing attach resolve-or-create path (or create-then-confirm using existing callables) — document the chosen path in implement notes; no new callable unless a concurrency bug is proven.

---

## Testing Review

**Findings:**
- Automated matrix matches TESTING expectations; manual 24-step list is appropriate.
- Primary-variant and aggregate tests are mandatory for catalog correctness.

**Required changes:**
- [ ] **T1:** Add an explicit unit test that “add again increments primary only when a second size variant exists.”
- [ ] **T2:** Manual checkpoint must include Studio request-selection smoke (unchanged) and assert no donation copy anywhere in new UI.

---

## Documentation Review

**Findings:**
- New ADR (FP-076 proposed) is warranted for UX contract + donation separation.
- ROADMAP / handoff updates already started at goal open — complete at signoff.

---

## Required Changes (approved_with_changes)

1. **Single subscription owner** for working-request items (Architecture B1).
2. **Pure attention util + tests** with enumerated states (Architecture B2).
3. **No silent schema fields** — revise plan if primary-variant ordering needs persistence (Data D1).
4. **Artwork attach path** documented against existing resolve-or-create (Backend E1).
5. **Primary-increment unit test** + manual Studio/donation checks (Testing T1–T2).
6. **Part G gate:** Do not remove selection-mode code until direct-add manual criteria pass (or PASS WITH NOTES accepting temporary dual paths).

Implementer must treat these as binding. No product-scope expansion.

---

## Blockers

None.

---

## Verdict Rationale

**approved_with_changes** — product intent, audit paths, boundaries, and sequencing are sound. Required changes tighten state ownership, attention derivation, attach path documentation, and cleanup gating without blocking the start of Part B after this review.

Optional split into two subphases remains available if implement complexity spikes; default remains one managed pass B→G.

---

## Next Step

Implement approved scope (Parts B→G) on `fresh-prints-dev` only, following required changes. Do not deploy production. Stop for manual UI checkpoint before signoff.
