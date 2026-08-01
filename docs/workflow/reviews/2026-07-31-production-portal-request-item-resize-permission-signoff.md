# Signoff: Production print-request item resize permission (Studio + Portal)

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-07-31-production-portal-request-item-resize-permission-plan.md` |
| Review | `docs/workflow/reviews/2026-07-31-production-portal-request-item-resize-permission-review.md` (**approved**) |
| Test report | `docs/workflow/reviews/2026-07-31-production-portal-request-item-resize-permission-test-report.md` |
| Rules deploy | `docs/workflow/reviews/2026-07-31-production-portal-request-item-resize-permission-rules-deploy-checkpoint.md` |
| Final status | **approved** |

---

## Summary

Catalog print-request item width/height autosave no longer fails with `permission-denied` /
“Missing or insufficient permissions” on production Studio or Portal. Root cause was Wave C’s
Admin-stamped `requestCountApplied` missing from `printRequestItemRequiredFieldsValid`’s
`keys().hasOnly` allowlist. Rules now recognize the optional marker and keep it client-immutable.
Owner QA: **PASS**.

This closes the `production-portal-request-item-resize-permission` slice under Goal #13.
`production-release` continues (Stage 2 hosted.app smoke and custom-domain cutover remain deferred
until separately authorized). Prior branding and registration PASSes are unchanged.

---

## Changes Delivered

### Behavior

- Staff (Studio) and customer (Portal) size updates succeed when `requestCountApplied: true` is present
- Clients cannot set or clear the marker
- Ownership, lifecycle locks, Cap A quantity path, DPI/AR/22″ client policy unchanged

### Production

- Firestore Rules deployed to `fresh-prints-prod` (Rules-only)

### Files

- `firestore.rules`
- `tests/firebase/printRequestItemResize.rules.test.ts`
- `package.json` (`test:rules`)
- `packages/shared/.../printRequestLimitSettingsRulesAlignment.test.ts`
- `packages/shared/.../printRequest.types.ts`
- `docs/architecture/DATA_MODEL.md`
- Workflow plan / review / test / deploy / this signoff

---

## Tests

### Automated

| Check | Result |
|-------|--------|
| Rules alignment | 4/4 |
| `npm run test:rules` | 56/56 |

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Studio + Portal catalog item resize after Rules deploy | **PASS** | owner |

---

## Human Approvals Obtained

| Approval | Status | Date |
|----------|--------|------|
| `APPROVE PORTAL REQUEST ITEM RESIZE PERMISSION FIX IMPLEMENTATION` | obtained | 2026-07-31 |
| `APPROVE PRODUCTION FIRESTORE RULES DEPLOY: REQUEST ITEM RESIZE PERMISSION` | obtained | 2026-07-31 |
| Owner QA Studio + Portal | **PASS** | 2026-07-31 |

---

## Risks / follow-ups

| Item | Notes |
|------|-------|
| `showAddCountApplied` on `showAllocations` | Adjacent Wave C marker; parked unless same toast appears on allocation edits |
| Studio duplicate client `updatedBy` | Possible separate Rules mismatch; out of scope for size autosave |
| Stage 2 | Still paused — resume only with separate owner authorization |
| Domain cutover | Deferred |

---

## Final Status

**approved** — resize-permission slice closed. Goal #13 continues; next gated step is Stage 2 when
the owner authorizes it.
