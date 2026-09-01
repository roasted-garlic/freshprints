# DEV Deploy Record — AI Review Approve/Reject Firestore Rules Corrective

**Date:** 2026-09-01  
**Scope:** Standalone corrective — **not** part of `pre-smart-profiling-print-request-and-gang-sheet-polish`  
**Owner authorization:** DEV Rules deploy (implicit via bugfix session); production **NOT AUTHORIZED**

---

## Root cause

Studio AI Review approval draft updates call `designService.updateDesign` with `artworkBackgroundHex`, which automatically sets `artworkBackgroundSource: "staff_manual"`. The Firestore `catalogMetadataOnlyUpdate` fast path allowed `artworkBackgroundHex` but not `artworkBackgroundSource`, causing `permission-denied` on Approve (and stale/missing fast paths could affect Reject).

---

## Git checkpoint

| Field | Value |
|-------|-------|
| Corrective commit | `139aad4e` (`139aad4e`… — `fix: allow AI Review artwork background source updates`) |
| Files | `firestore.rules`, `tests/firebase/designCatalogApprovalExpressionBudget.rules.test.ts` |

---

## Firebase deploy — `fresh-prints-dev` (before owner QA)

| Field | Value |
|-------|-------|
| Project | `fresh-prints-dev` |
| Resource | Firestore Rules only |
| Command | `firebase deploy --only firestore:rules --project fresh-prints-dev` |
| Exit code | **0** |
| Result | **Deploy complete** — rules released to cloud.firestore |
| Deploy timing | **Before** owner Approve/Reject QA PASS |

### Not deployed

- Production (`fresh-prints`)
- Functions, indexes, Storage Rules, Hosting

---

## Owner QA

| Check | Result |
|-------|--------|
| AI Review Approve | **PASS** |
| AI Review Reject | **PASS** |
| Overall | **AI REVIEW APPROVE / REJECT RULES CORRECTIVE: PASS** |

---

## Production promotion

This Rules correction is recorded in `docs/standards/DEPLOYMENT.md` → **DEV-only pending production promotion inventory**. Production has **not** received this change.

---

## Deploy / source alignment note

The pre-commit DEV deploy was executed from the local working tree. If a subsequent scoped git commit contains **only** the AI Review `catalogMetadataOnlyUpdate` delta, verify deployed DEV rules match that commit before the next production promotion. Do not rewrite deploy history silently.
