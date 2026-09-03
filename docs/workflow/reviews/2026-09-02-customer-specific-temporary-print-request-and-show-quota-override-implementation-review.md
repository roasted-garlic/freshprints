# Implementation Review: Customer-specific temporary Print Request + Show quota override

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-02-customer-specific-temporary-print-request-and-show-quota-override-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-02-customer-specific-temporary-print-request-and-show-quota-override-review.md` |
| Test report | `docs/workflow/reviews/2026-09-02-customer-specific-temporary-print-request-and-show-quota-override-test-report.md` |
| Verdict | **approved_with_notes** |
| Next | **STOP — DEV deploy checkpoint (human)** |

---

## Summary

Implementation matches the approved plan and Owner decisions (OD-1 OPTION C, OD-2 owner-only, OD-3 badge). Shared effective-limit resolver + owner callable + Rules immutability + Portal/Studio surfaces are in place. Staff/Show Move/DNP bypass preserved. Cap A not revived. Ready for human DEV deploy of Functions + Rules; no auto-deploy.

---

## Proof checklist (required)

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Global settings unchanged | pass | No edits to Settings defaults UI logic beyond consumer reads |
| 2 | Default 20/20 unchanged | pass | `printRequestLimitDefaults.constants.ts` untouched |
| 3 | Independent overrides | pass | Resolver + Save UI Use-global per dimension |
| 4 | Optional expiration by clock | pass | `expiresAt` + `nowMs >= expiresAt` inactive |
| 5 | No scheduler required | pass | No scheduled Function added |
| 6 | Manual Clear works | pass | `clearAll` / both-null → FieldValue.delete |
| 7 | Expired uses CURRENT global | pass | Resolver tests 10–11 |
| 8 | Over-limit work preserved | pass | Override write does not touch requests/items/allocs |
| 9 | Future mutations blocked | pass | Callables use effective max with existing assert/clamp |
| 10 | Portal + server same effective | pass | Shared resolver; Portal hook + Functions loader |
| 11 | PR counting unchanged | pass | Still `sumPrintRequestItemQuantities` / working items |
| 12 | Show counting unchanged | pass | Still non-canceled `allocatedQuantity` sum |
| 13 | Canceled excluded | pass | Untouched `countsTowardPerShowCustomerCap` |
| 14 | Studio staff bypass | pass | No Studio item/allocate wiring to Portal quotas |
| 15 | Show Move bypass | pass | Contract test |
| 16 | DNP recovery bypass | pass | Contract test |
| 17 | Physical show capacity unchanged | pass | Queue still checks `maxTotalQuantity` separately |
| 18 | Cap A retired | pass | No Cap A reads/writes added |
| 19 | ADR-FP-071 / parking unchanged | pass | No parking module edits; assert active editable remains |
| 20 | Owner-only mutation server-side | pass | Callable `role !== "owner"` deny |
| 21 | Direct customer writes denied | pass | Self-write allowlist excludes override; staff immutable |
| 22 | Audit events written | pass | `account.quota_override_set` / `_cleared` |
| 23 | Users badge clock-aware | pass | `hasActivePrintRequestQuotaOverride` |
| 24 | No index | pass | Direct customer doc get |
| 25 | No migration | pass | Additive optional field |
| 26 | No Storage change | pass | — |

---

## Notes

- Portal/Studio full `tsc` still fails on **pre-existing** unrelated errors; touched quota paths clean when filtered.
- Emulator Rules suite not re-run; static Rules alignment tests pass.
- Owner QA A–Q after DEV deploy.

---

## Exact DEV deploy / restart scope (allowlist)

### Functions (deploy these only)

1. **NEW** `updateCustomerPrintRequestQuotaOverride`
2. `addPortalCatalogDesignToPrintRequest`
3. `confirmCustomerUploadsAndAttachToRequest`
4. `duplicatePortalPrintRequestItem`
5. `updatePortalPrintRequestItemQuantity`
6. `customerAddAssistedApprovedProofToPrintRequest`
7. `queuePortalPrintRequestToShow`

### Firestore Rules

- Deploy updated `firestore.rules` (customer `printRequestQuotaOverride` allowlist + create deny + staff `optionalFieldUnchanged`)

### Clients

- Studio: local restart / HMR
- Portal: local restart / HMR

### Explicitly NOT in this deploy

- Storage Rules: **NO**
- Indexes: **NO**
- Migration: **NO**
- Production: **NO**
- Blind full Functions deploy: **avoid** — use allowlist above

---

## Verdict Rationale

Scope-faithful implementation with automated evidence for resolver, Rules alignment, owner-only callable wiring, Portal hydration, and staff bypass. Deploy remains a human checkpoint.

## Next Step

Owner authorizes DEV Functions + Rules deploy, then Owner QA checklist A–Q.
