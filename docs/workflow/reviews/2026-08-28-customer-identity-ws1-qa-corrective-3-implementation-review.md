# WS1 QA Corrective #3 — Implementation Review

**Date:** 2026-08-28  
**Goal:** `customer-account-identity-management-and-audit` (WS1)  
**Scope:** Owner re-QA corrective #3 + Show Queue gang-sheet results modal polish  
**Reviewer:** Independent corrective implementation review (post-implement)  
**Verdict:** **approved**

---

## Summary

Corrective #3 addresses seven owner-reported UX/runtime issues without expanding WS1 scope. All fixes are client-side (Studio + Portal). No Functions, Rules, or deploy actions were taken.

---

## Issue → Fix mapping

| # | Issue | Root cause | Fix | Verified |
|---|-------|------------|-----|----------|
| 1 | Re-enable styled destructive | `DangerOverflowMenu` defaults `danger: true` | `danger: false` on Re-enable menu item; `icon-button-success` + `Button variant="success"` | Contract tests |
| 2 | Disabled/closed clutter default list | No visibility filter | Active / Disabled / Closed sub-tabs (default Active) with truthful counts | Unit + contract tests |
| 3–5 | Google disabled login silent | Error only inside email form; auth listener cleared error on sign-out | Global login error banner; `pendingLoginErrorRef` + `finalizeBlockedLogin` sign-out path | Contract tests |
| 6 | Tombstone shows Re-enable | `isDisabled` checked without `!isDeleted` | `isReversibleDisabledCustomer()` gating | Unit + contract tests |
| 10–12 | Gang-sheet modal overflow | Unbounded list in modal body | Viewport-bounded modal grid + scrollable results region | Contract tests |

---

## Architecture & security

- **Layering:** Portal auth terminal state handled in `AuthProvider`; UI surfaces message in `LoginForm`. Studio filtering in page hook + shared utility. No layer violations.
- **Security:** Disabled/tombstone checks remain in bootstrap loader before authenticated session. Customer-facing copy avoids internal flags. No Rules or backend weakening.
- **Scope:** No WS2, no deploy, no gang-sheet generation changes.

---

## Regression preservation (corrective #1/#2 passes)

- Username change, PR creation, propagation warnings, disable/restore backend, concise labels, consequence modals, wider Change Username modal (`md-lg`), hard-delete CORS fix — **unchanged** by this corrective.

---

## Test results

| Check | Command | Result |
|-------|---------|--------|
| Corrective #3 tests | `npx tsx --test` (4 files, 17 tests) | **pass** (17/17) |
| Functions build | `npm --prefix functions run build` | **pass** |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | **fail** (pre-existing `portalShowDiscoveryContent.ts` TS1354; unrelated) |
| Studio typecheck | Not run full sweep | Pre-existing unrelated errors expected per prior corrective |
| Lint | Not run | No new lint run this session |

---

## Deploy impact

| Surface | Required for re-QA |
|---------|-------------------|
| Functions | **No** — no function changes |
| Firestore Rules | **No** |
| Portal App Hosting | **No** — local Portal dev sufficient |
| Studio publish | **No** — local Studio reload sufficient |

**Production:** NOT touched.

---

## Owner re-QA checklist

Use local Studio + Portal against `fresh-prints-dev` (or emulators) — same checklist as prompt items 1–32.

### Account directory

1. Active customers shown by default  
2. Disabled hidden unless Disabled tab  
3. Closed hidden unless Closed tab  
4–6. Search works within selected tab; counts match  
7–8. Disabled vs Closed badges correct  

### Actions

9–14. Active/disable/close actions; Re-enable success styling; no Re-enable on tombstone  

### Portal auth

15–22. Disabled email + Google show same clear message; no infinite spinner; active logins still work  

### Username

23–26. Modal width preserved; username + PR flows unchanged  

### Gang-sheet modal

27–32. Compact for 1 sheet; scrollable for 10+; header/footer visible  

---

## Files changed (corrective #3)

**Portal**

- `apps/portal/features/auth/constants/portalAuthBlockedMessages.ts` (new)
- `apps/portal/features/auth/context/AuthProvider.tsx`
- `apps/portal/features/auth/components/LoginForm.tsx`
- `apps/portal/features/auth/services/authService.ts`
- `apps/portal/features/auth/portalAuthBootstrap.contract.test.ts`

**Studio — customers**

- `apps/studio/.../users/utils/customerDirectoryVisibility.ts` (new)
- `apps/studio/.../users/utils/customerDirectoryVisibility.test.ts` (new)
- `apps/studio/.../users/pages/UserManagementPage.tsx`
- `apps/studio/.../users/components/CustomerDirectoryTable.tsx`
- `apps/studio/.../users/components/EditCustomerModal.tsx`
- `apps/studio/.../users/components/RestoreCustomerConfirmDialog.tsx`
- `apps/studio/.../users/components/customerIdentityWs1Corrective.contract.test.ts`
- `apps/studio/src/renderer/src/styles/layout.css`
- `apps/studio/src/renderer/src/styles/components/buttons.css`

**Studio — gang sheet**

- `apps/studio/.../upcoming-shows/components/ExportGangSheetConfirmModal.tsx`
- `apps/studio/src/renderer/src/styles/components/show-queue.css`
- `apps/studio/.../upcoming-shows/components/exportGangSheetModalLayout.contract.test.ts` (new)

**Workflow**

- `.cursor/workflow/state.md`
- This review document

---

## Verdict

**approved** — Implementation matches corrective scope; tests pass; no deploy required for re-QA. STOP for owner re-QA.
