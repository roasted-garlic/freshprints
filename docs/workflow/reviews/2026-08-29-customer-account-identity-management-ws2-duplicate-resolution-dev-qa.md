# Owner DEV QA: Customer Identity WS2 Duplicate Resolution

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Goal | `customer-account-identity-management-ws2-duplicate-resolution` |
| Environment | **DEV only** (`fresh-prints-dev` + local Studio) |
| Production | **NOT AUTHORIZED** |

---

## Prerequisites

- Studio running locally against `fresh-prints-dev` (`npm run dev:studio`)
- Reload Studio after 2026-08-29 Button variant corrective if already open
- WS2 Functions deployed: `previewDuplicateAccountResolution`, `transferCustomerUsername`
- **Use DEV duplicate test accounts only** — not production customer accounts
- Owner login for WS2 wizard; admin/helper logins for permission checks

---

## Fixture setup

### SOURCE (email/password)

- Owns desired username
- Will be disabled after transfer

### SURVIVOR (Google)

- Will remain active
- Different username before transfer

Prepare additional fixtures for blocker tests (continuable print requests).

---

## Checklist

### A. Owner-only UI

| Step | Expected | Pass |
|------|----------|------|
| Owner: Users → Customers sees **Resolve Duplicate Account** | Visible | [ ] |
| Admin: same page | WS2 action **not** available | [ ] |
| Helper: same page | WS2 action **not** available | [ ] |
| Admin: Change Username still works | Unchanged | [ ] |

### B. Select Source and Survivor

| Step | Expected | Pass |
|------|----------|------|
| Open wizard; assign SOURCE = email/password, SURVIVOR = Google | Roles unmistakable | [ ] |
| Preview shows username, email, provider, customerId, Auth UID, state | Present | [ ] |
| Preview shows history counts, continuable PRs, reservation, verification | Present | [ ] |
| Preview shows planned disposition (transfer + disable) | Present | [ ] |

### C. Tier A verification (if DEV fixture supports)

| Step | Expected | Pass |
|------|----------|------|
| Matching verified emails | `verified_email` | [ ] |
| Apply still requires `TRANSFER USERNAME` | Required | [ ] |
| No attestation required | N/A for Tier A | [ ] |

*If no Tier A fixture: note here and rely on automated tests + Tier B.*

### D. Tier B verification

| Step | Expected | Pass |
|------|----------|------|
| Different emails → Preview | Owner confirmation required | [ ] |
| Apply without attestation/reason | **Rejected** | [ ] |
| Apply with attestation + reason ≥8 chars + phrase | Proceeds | [ ] |

### E. Primary transfer test

Record before Apply:

- SOURCE username: __________
- SURVIVOR username: __________
- SOURCE customerId: __________
- SURVIVOR customerId: __________
- SOURCE Auth UID: __________
- SURVIVOR Auth UID: __________

After Apply:

| # | Expected | Pass |
|---|----------|------|
| 1 | Desired username on SURVIVOR | [ ] |
| 2 | SURVIVOR old reservation released | [ ] |
| 3 | SOURCE has `dupe-src-*` placeholder | [ ] |
| 4 | SOURCE customerId unchanged | [ ] |
| 5 | SURVIVOR customerId unchanged | [ ] |
| 6 | SOURCE disabled | [ ] |
| 7 | SURVIVOR active | [ ] |
| 8 | No business-history ownership moved | [ ] |
| 9 | Result = complete success | [ ] |

### F. Authentication behavior

| Account | Expected | Pass |
|---------|----------|------|
| SURVIVOR Google login | Succeeds; desired username shown | [ ] |
| SOURCE email/password login | Blocked (WS1 disabled behavior) | [ ] |

### G. Username reservations (read-only Console)

| Check | Expected | Pass |
|-------|----------|------|
| Desired username → SURVIVOR | Yes | [ ] |
| Placeholder → SOURCE | Yes | [ ] |
| SURVIVOR old username not active | Yes | [ ] |
| No duplicate ownership | Yes | [ ] |

### H. History unmoved

| Check | Expected | Pass |
|-------|----------|------|
| SOURCE print history on SOURCE customerId | Unchanged | [ ] |
| SURVIVOR print history on SURVIVOR customerId | Unchanged | [ ] |
| `printRequests.name` unchanged | Yes | [ ] |

### I. Continuable request blockers

| Case | Expected | Pass |
|------|----------|------|
| Neither continuable | Allowed (if other checks pass) | [ ] |
| Survivor only continuable | Allowed | [ ] |
| Source only continuable | **BLOCKED** | [ ] |
| Both continuable | **BLOCKED** | [ ] |

### J. Stale preview

| Step | Expected | Pass |
|------|----------|------|
| Preview → change reservation/state → Apply old preview | Rejected; new preview required | [ ] |

### K. Same-account protection

| Step | Expected | Pass |
|------|----------|------|
| Same customer as source and survivor | Prevented or rejected | [ ] |

### L. Audit events

| Event | Expected | Pass |
|-------|----------|------|
| `account.duplicate_resolution_previewed` | On preview | [ ] |
| `account.username_transferred` | On transfer | [ ] |
| `account.disabled` | On source disable | [ ] |
| Metadata safe (no secrets) | Yes | [ ] |

### M. Partial success

| Step | Expected | Pass |
|------|----------|------|
| Safe DEV simulation of disable failure | `partial_success` if reproduced | [ ] N/A |

---

## Owner response

**PASS** — Functional WS2 behavior approved. UI corrective (Transfer Username naming) verified 2026-08-29.

Reply template for records:

- `PASS` — recorded 2026-08-29 after UI naming corrective

---

## Post-QA workflow

- **PASS** → Test reconciliation → WS2 signoff → IDLE / next authorized workstream
- **FAIL** → Narrow corrective within same WS2 goal
- **Do not** promote WS2 to production (coordinated identity package promotion later)
