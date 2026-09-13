# Implementation Review (narrow): Customer Quota Override linked UX + Internal Save fix

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Reviewer | Review Agent |
| Goal | `customer-specific-temporary-print-request-and-show-quota-override` |
| Scope | PRE-QA Studio linked-quota UX polish + Internal Save corrective |
| Verdict | **approved_with_notes** |
| Next | **STOP — Owner QA A–Q** |

---

## Summary

Studio Edit Customer → Quota Override now defaults to **linked** temporary quota (both dimensions), with **Set independently** for unequal cases. Independent override contract preserved.

Separately, Owner-reported **Internal** on Save was caused by Functions writing `metadata.expiresAtMs: undefined` into Firestore activity events. Minimal callable fix redeployed to `fresh-prints-dev` only (`updateCustomerPrintRequestQuotaOverride`). Schema/Rules/resolver/consumers unchanged.

---

## Proof checklist

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Studio UI only for linked polish | pass | `CustomerQuotaOverrideSection.tsx`, `customerQuotaOverrideEditMode.ts`, `layout.css` |
| 2 | Backend schema unchanged | pass | No edits to `printRequestQuotaOverride.types` / DATA_MODEL field shape |
| 3 | Callable semantics unchanged | pass | Same request/response; only activity metadata omit-undefined |
| 4 | Rules unchanged | pass | `firestore.rules` not modified this pass |
| 5 | Linked mode writes both dimensions | pass | `buildQuotaOverrideSavePayload` linked → 30/30 |
| 6 | Independent mode supported | pass | Checkbox **Set independently** + per-dimension fields |
| 7 | Unequal overrides open independent | pass | `resolveInitialCustomerQuotaOverrideEditMode` tests |
| 8 | No silent value loss on mode switch | pass | Differing independent → linked clears shared field + note |
| 9 | Optional expiration unchanged (shared) | pass | Single Expires field; both-global save clears (no expiration-only override) |
| 10 | Effective-limit / server consumers unchanged | pass | No Portal consumer / resolver edits |
| 11 | Firebase redeploy | **note** | UX polish needed **no** Rules/6-consumer redeploy. **YES** for Internal fix: `updateCustomerPrintRequestQuotaOverride` only |

---

## Internal error root cause

DEV logs (`updateCustomerPrintRequestQuotaOverride`):

`Cannot use "undefined" as a Firestore value (found in field "metadata.expiresAtMs")`

Fix: omit `expiresAtMs` from activity metadata when unset (no expiration).

Deploy:

```bash
firebase deploy --only functions:updateCustomerPrintRequestQuotaOverride --project fresh-prints-dev
```

Exit **0** — Successful update.

---

## Verification

| Check | Result |
|-------|--------|
| Focused Studio mode + contract + callable contract | **17/17 PASS** |
| Functions build | **exit 0** |
| ESLint touched files | **exit 0** |
| Studio `tsc --noEmit` | exit 2 — **pre-existing unrelated**; **zero** hits on quota override paths |

---

## Owner QA updates

- **B:** Linked by default when no/equal override
- **D:** Linked 30 → effective **30 / 30**
- **E:** Set independently → PR global / Show 35 → **20 / 35** (or current globals)
- **F:** Independent 30 / 40
- **H:** Independent clear PR only → PR global, Show stays
- Also: equal reopen Linked; unequal reopen Independent; mode switch does not silently pick a winner
- **Save:** Internal error should be gone after callable redeploy

---

## Explicitly NOT done

- Production
- Rules redeploy
- Six Portal consumer redeploy
- Storage / indexes / migration
- Commit / push
- Signoff
