# Review: Customer Account Identity Management — WS2 Duplicate Resolution

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-29-customer-account-identity-management-ws2-duplicate-resolution-plan.md` |
| Verdict | **approved_with_changes** → **owner approved 2026-08-29** |

---

## Summary

The WS2 plan correctly scopes **owner-only duplicate preview + atomic username transfer** without WS3 merge or WS4 UI. It grounds proposals in existing username reservation mechanics (`customerUsernames`, `applyCustomerProfileUpdate` txn pattern), WS1 preview/checksum infrastructure, and master plan §9–§10. Verification policy, source disposition, and activity event shapes remain appropriately flagged for owner decisions before implementation. **Do not implement until owner approves this plan and resolves open decisions.**

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | WS3/WS4 explicitly out; no bulk detection |
| Architecture alignment | pass | Functions-owned mutations; Studio wizard thin client |
| Security impact addressed | pass | Owner apply; fail-closed preview; no client reservation writes |
| Data model impact addressed | pass | Preview op extension; placeholder username on source; ADR-FP-153 |
| Backend impact addressed | pass | Two new callables + lib helpers documented |
| Test strategy adequate | pass | Unit + DEV manual matrix incl. primary use case |
| Human checkpoints identified | pass | Verification matrix, disposition, DEV deploy, prod gate |
| Roadmap alignment | pass | WS2 after WS1; WS3/WS4 deferred |
| Documentation plan | pass | DATA_MODEL, BACKEND, SECURITY, DECISIONS |
| No silent scope expansion | pass | No merge, no Auth config changes in implement |

---

## Architecture Review

**Findings:**

- Reuses WS1 patterns: eligibility snapshot, preview TTL, dev project gate, propagation after identity change.
- Proposed `customerUsernameTransfer.ts` correctly avoids duplicating long-term username logic scattered in `customerProfileUpdate.ts` — implement should share `appendUsernameHistory`, `validateCustomerUsername`, and reservation doc shape.
- Post-transfer disable as separate step avoids nested callables inside Firestore txn — acceptable with documented partial-failure UX.

**Required changes:**

- [ ] Before implement: extract shared reservation swap helper or document why transfer txn must diverge from `applyCustomerProfileUpdate` (survivor relinquish + source placeholder in one txn).

---

## Security Review

**Findings:**

- Owner-only apply aligns with hard delete and tombstone sensitivity.
- Admin preview-only access matches WS1 precedent — confirm in permission matrix during implement.
- Auth provider listing via Admin SDK must redact tokens; plan states no secrets — enforce in code review.
- Verification fail-closed prevents blind transfer on display-name similarity alone.

**Required changes:**

- [ ] Implement confirmation phrase when `needs_owner_confirmation` (mirror hard-delete phrase pattern).

**Human approval needed before production:**

- [ ] All WS2 Functions deploy to production (separate from DEV)
- [ ] Any change to Firebase Auth linking policy (research-only in this plan)

---

## Data Model Review

**Findings:**

- Extending `customerIdentityOperationPreviews.operation` beyond `hard_delete` is required — plan documents this.
- Source placeholder username preserves one-reservation-per-customer invariant — critical.
- ADR-FP-153 entry must be added at implement (referenced but not yet in DECISIONS.md).

**Required changes:**

- [ ] Add ADR-FP-153 to `DECISIONS.md` during implement (owner-authorized duplicate username transfer exception).

---

## Backend Review

**Findings:**

- Transaction ordering section adequately addresses race/steal window.
- `consumeCustomerIdentityPreview` must be extended atomically with apply to prevent double-apply — plan implies this; implement must use txn or post-txn idempotent mark.
- Chained hard delete after transfer must reuse WS1 preview — do not bypass eligibility.

**Required changes:**

- [ ] Specify event types in shared types before Functions emit (add to plan appendix during implement if needed).

---

## Testing Review

**Findings:**

- Primary email/password + Google scenario covered in manual checklist.
- Concurrent reservation tests required — plan lists them.
- No E2E automation required for WS2 given owner-only low-frequency flow — acceptable with manual DEV QA gate.

**Required changes:**

- [ ] Add emulator or rules test if preview collection rules change.

---

## Documentation Review

**Findings:**

- Plan lists BACKEND, DATA_MODEL, SECURITY, DECISIONS updates — sufficient for WS2.

---

## Required Changes (approved_with_changes)

1. **Owner must resolve verification matrix and default source disposition** before Implementation Agent starts (see plan Open Questions §1–2).
2. **Add ADR-FP-153** during implement; do not transfer usernames without documented exception to ADR-FP-115 tombstone reuse ban.
3. **Share or justify reservation mutation code** with `customerProfileUpdate.ts` to prevent drift.
4. **Define activity event type strings** in shared types before emit (preview + transfer).

---

## Blockers (if blocked)

None for **plan approval**. Implementation remains blocked until:

- Owner approves plan with resolved `[NEEDS OWNER DECISION]` items (or accepts recommended defaults documented in signoff amendment)
- FreshForge phase transitions to Implement after explicit owner authorization

---

## Verdict Rationale

Plan is **architecturally sound**, **properly bounded**, and **grounded in repo inspection**. Open product/policy choices are correctly flagged rather than silently decided. **approved_with_changes** — proceed to owner plan review; **do not implement** until owner confirms decisions and authorizes Implement phase.

---

## Next Step

1. ~~Owner reviews plan + this review.~~ **Done 2026-08-29**
2. ~~Owner binding decisions recorded in plan.~~ **Done**
3. Implementation + tests + implementation review → **DEV deploy authorization checkpoint**

---

## Owner binding decisions (2026-08-29)

| # | Decision |
|---|----------|
| 1 | Tier A verified email match; Tier B attestation + reason; `TRANSFER USERNAME` phrase |
| 2 | Default: transfer + disable source; explicit partial-success on disable failure |
| 3 | Continuable PR blocks fail-closed (source or both) |
| 4 | Survivor old username released in same txn |
| 5 | Events: preview + username_transferred + reuse account.disabled |
| 6 | WS2 preview/apply owner-only |
| 7 | WS4 deep-link intent documented only |
