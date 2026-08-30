# DEV Deploy Record: Portal Customer Username Cooldown Corrective

| Field | Value |
|-------|-------|
| Date | 2026-08-27 |
| Project | `fresh-prints-dev` |
| Branch | `development` (local uncommitted) |
| Allowlist | `updatePortalCustomerProfile`, `registerCustomer`, `createCustomerWithPortalInvite`, `updateCustomer` |

## Pre-deploy verification

| Check | Result |
|-------|--------|
| Branch `development` | PASS |
| Target `fresh-prints-dev` | PASS |
| Functions build (`npm run build`) | PASS |
| All four exports in `functions/src/index.ts` | PASS |
| `customerProfileUpdate.test.ts` (6/6) | PASS |
| Rules/index deploy | Not required |
| Production targeted | No |

## Command

```bash
firebase deploy --project fresh-prints-dev --only functions:updatePortalCustomerProfile,functions:registerCustomer,functions:createCustomerWithPortalInvite,functions:updateCustomer
```

## Deploy result

- Exit code: **0**
- All four functions: **Successful update operation**

## Function revisions (ACTIVE)

| Function | State | Region | Revision | updateTime (UTC) |
|----------|-------|--------|----------|------------------|
| `updatePortalCustomerProfile` | ACTIVE | `us-central1` | `updateportalcustomerprofile-00002-quv` | 2026-08-27T19:33:07.705439394Z |
| `registerCustomer` | ACTIVE | `us-central1` | `registercustomer-00017-kul` | 2026-08-27T19:33:07.024596061Z |
| `createCustomerWithPortalInvite` | ACTIVE | `us-central1` | `createcustomerwithportalinvite-00022-qis` | 2026-08-27T19:33:07.977653354Z |
| `updateCustomer` | ACTIVE | `us-central1` | `updatecustomer-00013-dut` | 2026-08-27T19:33:06.942431060Z |

## Source-behavior verification (deployed bundle)

| Function | Expected behavior | Verified in source |
|----------|-------------------|-------------------|
| `registerCustomer` | Initial username reservation + username stored; **no** `usernameUpdatedAt` at signup | PASS — field removed from customer create payload |
| `createCustomerWithPortalInvite` | Same initial-username behavior; **no** `usernameUpdatedAt` at creation | PASS |
| `updatePortalCustomerProfile` | First change allowed when `usernameHistory` empty; 30-day cooldown after prior change; display-name-only unchanged; propagation unchanged | PASS — `assertPortalUsernameChangeAllowed` gates on `usernameHistory?.length` |
| `updateCustomer` | Staff cooldown bypass; `usernameUpdatedAt` only on actual username change; propagation unchanged | PASS — shared `applyCustomerProfileUpdate` with `mode: "staff"` |

## Not deployed

- Firestore rules
- Firestore indexes
- Storage rules
- App Hosting
- Other Functions
- Production (`fresh-prints-prod`)

## Owner re-QA checklist

**A.** Existing DEV customer (pre-corrective signup `usernameUpdatedAt`, empty `usernameHistory`) → first Portal username change **must succeed**

**B.** Immediate second Portal username change → **must be blocked** (30-day cooldown)

**C.** After first change confirm:
- `usernameHistory` contains prior username
- `usernameUpdatedAt` reflects first change time
- `customerUsernames` reservation moved
- Print Request snapshots propagated
- Immutable request name unchanged

**D.** New customer → `usernameUpdatedAt` absent after creation → first change succeeds

**E.** Studio staff `updateCustomer` → still bypasses cooldown

## Recommendation

**READY FOR OWNER RE-QA**
