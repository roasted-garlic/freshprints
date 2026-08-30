# Signoff: Customer Account Identity Management — WS2 Transfer Username

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Goal | `customer-account-identity-management-ws2-duplicate-resolution` |
| Verdict | **approved** |
| Production | **NOT AUTHORIZED** |

---

## Summary

WS2 delivers an owner-only **Transfer Username** workflow in Studio (internal component `ResolveDuplicateAccountWizard`) backed by Cloud Functions on `fresh-prints-dev`:

- `previewDuplicateAccountResolution`
- `transferCustomerUsername`

Behavior: move desired username from username source to account to keep; release survivor prior username; assign source placeholder; disable source; propagate survivor identity snapshots; **no WS3 history merge**.

Owner-facing product name is **Transfer Username** (UI corrective after functional DEV QA PASS).

---

## Owner decisions honored

- Two-tier duplicate verification + `TRANSFER USERNAME` phrase
- Default disposition: transfer + disable source; explicit partial success if disable fails
- Continuable print request fail-closed rules (ADR-FP-071 alignment)
- Survivor old username released in same transaction
- Audit events: preview, username transferred, reuse `account.disabled`
- Owner-only WS2 preview/apply; admin `updateCustomer` unchanged
- ADR-FP-153 recorded

---

## Tests

See `docs/workflow/reviews/2026-08-29-customer-account-identity-management-ws2-test-report.md`.

Owner DEV QA: **PASS** (after UI naming corrective).

---

## DEV deployment

Functions deployed to `fresh-prints-dev` only. Studio runs locally/dev build.

Coordinated production promotion of customer identity package (WS1+WS2+) deferred per owner direction.

---

## Follow-ups (not WS2 scope)

- WS3 **Merge Accounts** — planning authorized separately
- WS4 customer activity / Print Request grouped history
- Duplicate prevention (Auth/bootstrap) — read-only note in implementation review
- Studio-wide TypeScript debt cleanup

---

## Artifacts

| Artifact | Path |
|----------|------|
| Plan | `docs/workflow/plans/2026-08-29-customer-account-identity-management-ws2-duplicate-resolution-plan.md` |
| Review | `docs/workflow/reviews/2026-08-29-customer-account-identity-management-ws2-duplicate-resolution-review.md` |
| Implementation review | `docs/workflow/reviews/2026-08-29-customer-account-identity-management-ws2-duplicate-resolution-implementation-review.md` |
| DEV QA | `docs/workflow/reviews/2026-08-29-customer-account-identity-management-ws2-duplicate-resolution-dev-qa.md` |
| ADR-FP-153 | `docs/project/DECISIONS.md` |

---

## Final status

**approved** — WS2 closed on DEV. FreshForge returns to **IDLE** then WS3 Plan phase.
