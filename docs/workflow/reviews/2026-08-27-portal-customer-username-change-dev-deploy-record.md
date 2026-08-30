# DEV Deploy Record: Portal Customer Username Change

| Field | Value |
|-------|-------|
| Date | 2026-08-27 |
| Project | `fresh-prints-dev` |
| Branch | `development` (local uncommitted) |
| Allowlist | `updatePortalCustomerProfile`, `updateCustomer` only |

## Command

```bash
firebase deploy --project fresh-prints-dev --only functions:updatePortalCustomerProfile,functions:updateCustomer
```

## Result

- Exit code: **0**
- `updatePortalCustomerProfile`: **create** (new function)
- `updateCustomer`: **update**

## Function revisions (ACTIVE)

| Function | State | Region | Revision | updateTime (UTC) |
|----------|-------|--------|----------|----------------|
| `updatePortalCustomerProfile` | ACTIVE | `us-central1` | `updateportalcustomerprofile-00001-ruh` | 2026-08-27T18:13:54.402430471Z |
| `updateCustomer` | ACTIVE | `us-central1` | `updatecustomer-00012-tas` | 2026-08-27T18:13:58.531708896Z |

## Not deployed

- Firestore rules
- Firestore indexes
- Storage rules
- App Hosting
- Other Functions
- Production (`fresh-prints-prod`)

## Owner QA note

Backend callables are live on DEV. Portal Profile UI (`AccountSettingsModal`) and Studio formatter/copy changes are **local** until App Hosting / Studio publish — run Portal + Studio locally against `fresh-prints-dev` for end-to-end QA.
