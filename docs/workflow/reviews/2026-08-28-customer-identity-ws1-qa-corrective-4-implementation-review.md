# WS1 QA Corrective #4 — Implementation Review

**Date:** 2026-08-28  
**Goal:** `customer-account-identity-management-and-audit` (WS1)  
**Scope:** Portal disabled-session logout + Print Request integrity + Studio duplicate-CR prevention  
**Verdict:** **approved**

---

## Summary

Corrective #4 addresses owner FAIL on Portal Print Request integrity and mid-session disable behavior. Root cause for the callable rejection is **`requestOrigin !== portal_customer`**, not username propagation. Implementation unifies Portal editability predicates, fixes working-request selection, signs out disabled sessions before Firestore permission errors surface, and adds Studio + Functions guards against new duplicate continuable customer requests.

---

## Dev data inventory (read-only, `fresh-prints-dev`)

**Customer:** `NGr4D72KZWqVnzZxUjFj` (Ion Supply / `ionsuppdizzle`) — username changed from `ionsupplyllc` (evident in at-creation snapshot on CR002).

| Request ID | Name | Status | requestOrigin | isInternal | Username snapshot | At-creation username | Portal-editable? | Why |
|------------|------|--------|---------------|------------|-------------------|----------------------|------------------|-----|
| `T0ovRXzRoymruI3TZPIy` | ionsupplyllc-CR002 | draft | **portal_customer** | false | ionsuppdizzle | ionsupplyllc | **Yes** | Matches callable contract |
| `x5ezhslvPqIbpWN68JV6` | ionsuppdizzle-CR003 | draft | **studio_customer** | false | ionsuppdizzle | (unset) | **No** | Callable rejects non-portal origin |

**Username change is NOT causal** — propagation updated snapshots only; `requestOrigin` and `isInternal` unchanged.

---

## Issue mapping

| Issue | Root cause | Fix |
|-------|------------|-----|
| Disabled session permission overlay | `users.isActive=false` while Firebase session + Portal shell remain mounted; Firestore rules deny via `callerIsActive()` | Real-time `users` + `customers` listeners → `finalizeBlockedLogin` before private reads fail |
| Multiple drafts / wrong request | UI used status-only `continuableRequests[0]`; picker offered non-portal-editable Studio drafts | Shared `isPortalEditablePrintRequest`; portal-editable working request + explicit selection |
| Quantity decrement/remove | Optimistic UI targeted working request A while mutations hit request B (origin mismatch) | Same selection resolver for all add/qty/remove paths |
| Studio duplicate CRs | No create-time guard; picker listed all customers | Transaction guard + exclude customers with continuable CRs from picker |
| Disabled row highlight | Corrective #3 styling | Removed row background; badges/tabs retained |

---

## Tests

| Suite | Result |
|-------|--------|
| `portalPrintRequestEditability.test.ts` | 6/6 pass |
| `resolvePortalWorkingRequestBranch.test.ts` | 3/3 pass |
| `portalPrintRequestWs1Corrective4.contract.test.ts` | 4/4 pass |
| `portalAuthBootstrap.contract.test.ts` | 5/5 pass |
| `customerIdentityWs1Corrective.contract.test.ts` | 6/6 pass |
| Functions `npm run build` | pass |

---

## Deploy impact (NOT performed)

| Surface | Required for re-QA |
|---------|-------------------|
| Portal client | Local reload |
| Studio client | Local reload |
| Functions | **Yes** — `portalWorkingPrintRequest` guard narrowing (create/attach) |
| Firestore indexes | **Yes** — new `status + isInternal` composite for Studio picker query |
| Firestore Rules | **No** |

**Suggested Functions deploy allowlist:** any callable importing `functions/src/lib/portalWorkingPrintRequest.ts` (at minimum `createPortalPrintRequest`, `addPortalCatalogDesignToPrintRequest`).

**Production:** NOT touched.

---

## Owner re-QA checklist

See corrective #4 prompt items 1–43. Prioritize:

1. Disable logged-in Portal customer → signed out with message, no permission overlay  
2. Customer with portal + studio drafts → only portal draft is editable; picker excludes studio draft  
3. Explicit request selection → add/inc/dec/remove all target same request  
4. Studio Create Customer Request → customers with open draft/editing CR hidden; race blocked server-side  
5. Disabled/Closed tabs — normal row background, badges remain  

---

## Verdict

**approved** — STOP for owner re-QA. Deploy Functions + indexes when separately authorized.
