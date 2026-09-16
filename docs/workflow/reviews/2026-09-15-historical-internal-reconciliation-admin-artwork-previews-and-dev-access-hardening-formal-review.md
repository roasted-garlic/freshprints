# Formal Review: Historical Internal reconciliation, Admin artwork previews, and DEV access hardening

| Field | Value |
|-------|-------|
| Date | 2026-09-15 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-15-historical-internal-reconciliation-admin-artwork-previews-and-dev-access-hardening-plan.md` |
| Prior goal | `pre-release-lifecycle-image-parity-and-dev-environment-hardening` — Signoff **approved_with_notes** |
| Verdict | **approved_with_changes** |

---

## Summary

The Plan correctly closes the prior goal’s deferred notes into one bounded bundle: historical Internal repair (reuse finish/reconcile, Preview→Apply, no second lifecycle), Staff Artwork derivative previews under ADR-FP-187, and DEV-only auth friction + server allowlist without pretending client Auth creation can be blocked. Production boundaries and the compact Promotion Manifest requirement are explicit. Verdict **approved_with_changes** locks a few product/architecture defaults before Implement.

---

## Checklist

| Area | Status | Notes |
|---|---|---|
| Scope clear and bounded | pass | A/B/C; production mutation out |
| Architecture alignment | pass | Reuse helpers; callable boundaries |
| Security impact addressed | pass | Owner-only A; ADR-FP-187; DEV project gate |
| Data model impact addressed | pass | Settings doc for C; no new PR statuses |
| Backend impact documented | pass | Callables + registerCustomer; no Auth blocking required |
| Test strategy adequate | pass | Per-workstream focused tests |
| Human checkpoints identified | pass | See below |
| Roadmap alignment | pass | Follows prior PASS WITH NOTES |
| Documentation plan | pass | Manifest at Signoff |
| No silent scope expansion | pass | No Move-to-Printed; no public Staff Artwork |

---

## Architecture Review

**Findings:**
- A correctly rejects Whatnot recovery and Mark Complete successor-gated retry as insufficient for History repair.
- B correctly signs Staff Artwork preview/thumbnail only.
- C correctly separates UX overlay from server gate; documents Auth orphan limitation.

**Required changes:**
- [x] **A v1 UI:** selected completed History sheet Preview→Apply only (no bulk Settings scan in v1 unless owner opts in at Implement approval).
- [x] **A role:** **owner-only** Preview and Apply (not owner/admin).
- [x] **C enforcement v1:** reject unapproved at `registerCustomer` **and** deny/sign-out unapproved customer bootstrap sessions on DEV (so accidental existing accounts cannot linger on complete-profile / customer routes).

---

## Security Review

**Findings:**
- C must not claim Auth creation is prevented; copy must avoid email enumeration.
- Production short-circuit on `fresh-prints-dev` only is mandatory.
- B must not widen Storage Rules or return originals.

**Required changes:**
- [x] Generic restricted-access copy (no “your email is not on the list”).
- [x] Production IAM / History Apply remain separate checkpoints.

**Human approval needed before production:**
- [x] Prod Gen2 TokenCreator self-binding (if confirmed)
- [x] Prod History reconciliation Preview
- [x] Prod History Apply after Preview
- [x] Prod Functions / Portal / Studio promotion
- [x] Identity Platform Auth blocking (only if pursued later — **not** this goal)

---

## Data Model Review

**Findings:** `settings/portalDevCustomerAccess` (or equivalent) is appropriate; Rules staff-only.

**Required changes:**
- [ ] None beyond Plan (document field shape in Implement)

---

## Backend Review

**Findings:** Reuse `finishShowAllocationsInTransaction` + `reconcilePrintRequestsAfterShowFinish` without forking. Staff Artwork resolve from `staffArtworks` by allocation `staffArtworkId`.

**Required changes:**
- [x] Apply must **not** create Internal Gang Sheet N+1 or mutate `productionStatus` away from completed.

---

## Testing Review

**Findings:** Strategy covers A idempotence, B three sources, C DEV/prod matrices.

**Required changes:**
- [x] Explicit contract: production project id → registerCustomer allowlist assert is a no-op; overlay not mounted.

---

## Documentation Review

**Findings:** Manifest requirement at Signoff is correct and must stay compact.

---

## Required Changes (approved_with_changes)

1. A: **owner-only**; History **selected-sheet** v1; reuse finish/reconcile; no new cycle on Apply.
2. B: Staff Artwork `previewStoragePath` ?? `thumbnailStoragePath` only; retire intentional blank.
3. C: Overlay on every `/login`/`/register` visit (visit-only ack); allowlist owner/admin manage; server gate on DEV project; deny unapproved bootstrap; accept Auth orphan limitation without GCIP in this goal. **DEV Portal = localhost + `myprintrequest.dev` tunnel (not App Hosting).**
4. Production Promotion Manifest appended at Signoff (compact).
5. No production mutation during Implement/Test/Signoff of this goal.

---

## Blockers

None blocking Formal Review. Implementation blocked on **explicit owner Implement→Test authorization**.

---

## Verdict Rationale

Approved with changes because investigation answers 1–31 are sufficient, security boundaries are honest (especially Auth), and prior Owner QA notes are fully addressed without scope creep.

---

## Next Step

Await owner acceptance of required changes + explicit **authorize Implement → Test**. Until then: **STOP**.
