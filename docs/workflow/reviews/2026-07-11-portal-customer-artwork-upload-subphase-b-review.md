# Review: Portal Customer Artwork Upload — Sub-phase B

| Field | Value |
|-------|-------|
| Date | 2026-07-11 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-07-11-portal-customer-artwork-upload-subphase-b-plan.md` |
| Parent | `docs/workflow/plans/2026-07-11-portal-customer-artwork-upload-plan.md` |
| Verdict | **approved** |

---

## Summary

Sub-phase B plan correctly scopes the trusted backend and security boundary before any Portal upload UI. It reuses Sub-phase A contracts, locks catalog status at `not_eligible`, specifies callable/rate-limit/lease/ZIP designs, and keeps wipe parked and Portal UI out of scope. Approved to implement after owner acknowledges the new ZIP dependency and subsequent deploys.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Explicit out-of-scope list matches parent; no attach/UI/wipe |
| Architecture alignment | pass | Callable + Storage upload; Admin SDK; no Electron; no Storage-trigger required |
| Security impact addressed | pass | Rules deny client processing writes; Storage path/owner/size; lifecycle in finalize |
| Data model impact addressed | pass | Operational rate-limit/lease/idempotency collections documented |
| Backend impact addressed | pass | Three callables; sharp reuse; ZIP lib human checkpoint |
| Test strategy adequate | pass | Validation/processing/ZIP/rate-limit unit tests; rules gap honest |
| Human checkpoints identified | pass | Dependency + rules/Functions/indexes deploy; no Portal UI enable |
| No silent scope expansion | pass | Studio tsc debt excluded; wipe untouched |
| Parent lock-downs honored | pass | Limits, transparency, ZIP server extract, rules-before-UI, catalog `not_eligible` |

---

## Architecture Review

**Findings:**

- Finalize-after-Storage matches parent architecture and avoids callable payload limits.
- Shared path helpers and `buildImportPrintSizeCreateFields` correctly mandated.
- Streaming ZIP (`yauzl`) is the right default vs in-memory unzip for bomb resistance.
- Concurrency leases with expiry correctly handle Function crashes.

**Required changes:**

- [x] None

---

## Security Review

**Findings:**

- Customer read-only Firestore for uploads; Admin writes — correct.
- Storage write limited to `source` + `archive.zip`; derivatives Admin-only — correct.
- Ready-design public-read pattern explicitly excluded — correct.
- App Check deferred honestly; daily caps + leases provide practical abuse controls.
- Firestore rules tests absent in repo — plan documents manual/emulator checklist; acceptable for B if smoke tests cover cross-customer deny.

**Required changes:**

- [x] None

**Human approval needed before production / shared deploy:**

- [x] ZIP dependency add
- [x] Functions deploy
- [x] Firestore rules / Storage rules / indexes deploy
- [x] Any production project use
- [x] Enabling Portal upload UI (after B verification — Sub-phase C)

---

## Data Model Review

**Findings:**

- Keeps `catalogReviewStatus: not_eligible` in B — prevents premature Studio intake.
- Idempotency + rate-limit + lease collections are necessary and Admin-only.
- Does not prematurely relax `printRequestItems` rules — correct for C.

**Required changes:**

- [x] None

---

## Backend Review

**Findings:**

- Auth via `requirePortalCustomer` aligns with newer Portal callables.
- Memory/timeout guidance adequate; 1GiB for ZIP left as deploy-time owner choice — fine.
- Quota charge flag avoids unfair double-billing on retry — good.
- Deterministic ZIP manifest / upload IDs required for idempotency — specified.

**Required changes:**

- [x] None

---

## Testing Review

**Findings:**

- Commands match project conventions.
- Sharp/ZIP fixture tests in Functions are appropriately scoped.
- Studio unrelated tsc failures correctly excluded.

**Required changes:**

- [x] None

---

## Required Changes

- [x] None

---

## Blockers

1. None for **implementation start** of code/tests in-repo.
2. **Deploy** and **ZIP dependency** remain human checkpoints (do not block writing code against a chosen lib once owner ACKs, or pin lib in implement after ACK).

---

## Verdict Rationale

Plan is implementation-ready, aligned with ADR-FP-073 and the nine parent lock-downs, and correctly forbids Portal UI until backend+rules+indexes are live. **Approved.**

---

## Next Step

1. Owner ACK for ZIP library (`yauzl` recommended) if not already granted.  
2. **Implement** Sub-phase B per this plan (no Portal UI).  
3. Run B test commands; then owner-approved deploy to `fresh-prints-dev` + smoke checklist.  
4. Only after verification: plan Sub-phase C.
