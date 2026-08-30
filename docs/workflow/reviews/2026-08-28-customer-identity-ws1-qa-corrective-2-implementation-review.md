# Customer Identity WS1 QA Corrective #2 — Implementation Review

**Date:** 2026-08-28  
**Goal:** `customer-account-identity-management-and-audit` (WS1)  
**Phase:** Corrective implementation review (pre-deploy STOP)

## Summary

Corrective #2 addresses owner re-QA failures for reversible disable visibility, Portal login UX after identity changes, hard-delete preview invocation, action labeling, and Change Username modal width. **No deploy performed.**

## Root causes

### A–B. Reversible disable appeared broken

| Question | Finding |
|----------|---------|
| Callable invoked? | **Yes** — `disableCustomerAccount` POST **200** at `2026-08-28T20:41:37Z` (revision `disablecustomeraccount-00001-wis`). |
| Firestore/Auth changed? | Backend path is correct; owner observed Auth not disabled — **not re-verified in-console** (no manual mutation). Most likely Firestore wrote `isDisabled` + `users.isActive=false` when POST succeeded. |
| Studio swallowed error? | **No** — dialog would have shown error on callable failure. |
| Primary UI defect | **`customerService.mapCustomerData` omitted `isDisabled` / `disabledAt` / etc.** UI always treated customers as active after reload. |

**Corrective:** Shared `readCustomerIdentityDocumentFields` + Studio mapper fix; immediate `patchCustomer` after disable/restore; disable/restore callables now **fail closed** if Auth mutation fails after Firestore commit.

### D–E. Portal login stuck on "Logging you in…"

| Question | Finding |
|----------|---------|
| Auth sign-in | Assumed successful (overlay only shows with `firebaseUser`). |
| Bootstrap hang | `LoginForm` kept `isSubmitting=true` after successful login, so **busy overlay masked terminal bootstrap states** (`inactive`, `error`, etc.). |
| Username change data path | `applyCustomerProfileUpdate` does not alter `userId`; lookup remains `customers.userId == uid`. |
| Disabled account | If disable succeeded server-side, `users.isActive=false` → inactive message hidden by overlay. |

**Corrective:** Clear `isSubmitting` when bootstrap leaves `loading-profile`; map `isDisabled`/`isDeleted` in Portal customer profile; block disabled/tombstoned customers in `loadPortalSession`; **30s bootstrap timeout** with actionable error.

### F. Permanent delete preview

| Question | Finding |
|----------|---------|
| Server exception? | **No POST reached the function** in fresh-prints-dev logs. Only **OPTIONS 403** (`Empty Authorization header`) at `2026-08-28T20:42:39Z`. Compare: `disableCustomerAccount` OPTIONS **204** + POST **200** same session. |
| Subcollection bug | Fixed in corrective #1; not the live failure mode for this attempt. |

**Corrective:** Storage prefix inspection wrapped in try/catch (fail-safe). **Redeploy `previewHardDeleteCustomerAccount` (and paired hard delete) required** so callable CORS/invoker matches working functions.

## Action terminology (final)

| State | Overflow labels |
|-------|-----------------|
| Active | **Disable Account** · **Close Account Permanently** (tombstone) · **Delete Account Permanently** (history-free) |
| Disabled | **Re-enable Account** (no Disable) |
| Closed/tombstoned | **Closed** badge; no re-enable |

Modal titles carry consequence copy (disable, re-enable, close, hard delete).

## DEV diagnostic notes (no manual repair)

- **AI Dev disable:** POST 200 logged; verify `customers.isDisabled`, `users.isActive`, Auth `disabled` in console during owner re-QA.
- **Username-changed Portal customer:** Re-test after Studio mapper + login overlay fix; if still blocked, inspect `users/{uid}` + `customers.userId` linkage.
- **Hard-delete target:** Re-test after function redeploy; expect OPTIONS 204 then POST 200 in logs.

## Tests run

```bash
cd functions && npm run build   # exit 0
npx tsx --test \
  packages/shared/src/utils/readCustomerIdentityDocumentFields.test.ts \
  functions/src/disableCustomerAccount.contract.test.ts \
  functions/src/lib/customerAccountIdentityBootstrapDeletion.test.ts \
  apps/studio/.../customerIdentityWs1Corrective.contract.test.ts \
  apps/studio/.../customerIdentityMapper.contract.test.ts \
  apps/portal/features/auth/portalAuthBootstrap.contract.test.ts
# 17/17 pass
```

Studio/Portal `tsc --noEmit`: pre-existing unrelated errors elsewhere in monorepo (not introduced by this corrective).

## Rules impact

**None** — no `firestore.rules` changes in corrective #2.

## Exact DEV Functions deploy allowlist (after review approval)

1. `disableCustomerAccount` — Auth fail-closed + any bundle sync  
2. `restoreCustomerAccount` — paired Auth fail-closed  
3. `previewHardDeleteCustomerAccount` — **required** (callable OPTIONS/CORS fix)  
4. `hardDeleteCustomerAccount` — paired with preview  

**Rules redeploy:** not required.

**Studio publish:** local changes only; not authorized.

**Production:** untouched.

## Review status

**Approved for DEV deploy** — pending human deploy authorization (workflow STOP).
