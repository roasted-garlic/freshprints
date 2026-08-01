# Formal Review: Production print-request item resize permission (Studio + Portal)

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Reviewer | Review Agent (independent of Planning Agent) |
| Plan | `docs/workflow/plans/2026-07-31-production-portal-request-item-resize-permission-plan.md` |
| Verdict | **approved** |

---

## Summary

The Plan correctly identifies a shared Firestore Rules whole-document allowlist gap for
server-stamped `requestCountApplied` on catalog `printRequestItems`. That gap denies both Studio
staff and Portal customer size `updateDoc`s after Wave C’s `onPrintRequestItemCreated` marker
lands. The proposed fix (allowlist + optional bool + client immutability + Rules tests + separate
Rules deploy + dual-surface owner QA) is the narrowest safe correction and does not reopen prior
branding/registration PASSes or Stage 2.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Rules-focused; Studio+Portal covered; Stage 2 deferred |
| Architecture alignment | pass | No new layers; Rules keep-up with existing Function |
| Security impact addressed | pass | No privilege expansion; marker immutable; ownership/locks preserved |
| Data model impact addressed | pass | Document existing field; no migration |
| Backend impact addressed | pass | Rules deploy only; Function unchanged |
| Test strategy adequate | pass | Emulator failing-before/passing-after + alignment + dual QA |
| Human checkpoints identified | pass | Implement phrase; separate Rules deploy; QA; Stage 2 later |
| Roadmap alignment | pass | Goal #13 Phase G remediation; Stage 2 paused |
| Documentation plan | pass | DATA_MODEL + workflow artifacts |
| No silent scope expansion | pass | Explicitly parks `showAddCountApplied` / duplicate `updatedBy` |

---

## Architecture Review

**Findings:**

- Size writes are correctly mapped: Studio
  `apps/studio/.../printRequestService.ts` ~1402–1418; Portal
  `apps/portal/.../portalPrintRequestService.ts` ~895–910; collection
  `printRequestItems/{itemId}`.
- Both Rules branches require `printRequestItemRequiredFieldsValid` (`firestore.rules` ~521–578,
  ~1163–1191). Shared validator → shared failure mode is sound.
- Prefer Rules-only fix over client workarounds (e.g. stripping unknown fields is impossible for
  clients; Admin rewrite of all items would be data mutation and out of scope).

**Required changes:** none.

---

## Security Review

**Findings:**

- Adding an optional server marker to `hasOnly` without immutability would let clients forge
  analytics idempotency. Plan correctly requires `optionalFieldUnchanged("requestCountApplied")` on
  **both** staff and customer update paths.
- Customer quantity remains locked (`quantity ==` in `customerCanUpdatePrintRequestItem`); Cap A
  callable path unchanged.
- Parent status gates (`draft`/`editing` for customers; Studio UI locks) preserved — Plan does not
  unlock lifecycle.
- Production Rules deploy remains a separate human checkpoint (correct).

**Required changes:** none.

**Security Agent perspective:** Approve Rules schema keep-up; reject any alternative that removes
`keys().hasOnly` or allows customers to create/delete items.

---

## Data Model Review

**Findings:**

- `requestCountApplied` is already written by `functions/src/onPrintRequestItemCreated.ts` ~46–54
  and documented in Wave C reviews; missing only from `DATA_MODEL.md` / Rules allowlist.
- No backfill needed for the fix to work: marker already present on failing docs; Rules must accept
  it unchanged.

**Required changes:** none beyond Plan’s DATA_MODEL note.

---

## Backend Review

**Findings:**

- Local Rules hash matching 2026-07-30 prod deploy supports “source == production == broken
  allowlist,” not undeployed client-only drift.
- July 17 duplicate-resize client fix is orthogonal (parent touch / `pending_dup_*`); Plan correctly
  does not treat optional undeployed parent harden as this root cause.
- No Functions change required.

**Required changes:** none.

---

## Test Review

**Findings:**

- Emulator matrix mirroring Amendment 16 completion tests is appropriate.
- Failing-before must be recorded honestly (run against current rules or assert current source lacks
  allowlist entry before implement).
- Dual-surface owner QA required because Studio and Portal use different auth branches and qty
  mechanisms.

**Required changes:** none.

---

## Risk Review

**Findings:**

- Adjacent `showAddCountApplied` risk correctly parked.
- Studio duplicate client `updatedBy` noted as possible separate deny — correctly out of scope for
  size autosave.

**Required changes:** none.

---

## Required Changes Before Implementation

None. Plan is approved as written.

---

## Human Checkpoints Required Before / After Implement

1. Owner: `APPROVE PORTAL REQUEST ITEM RESIZE PERMISSION FIX IMPLEMENTATION`
2. After implement + automated tests: separate **production Firestore Rules deploy** approval
3. Owner QA on production Studio **and** Portal catalog item resize
4. Separate authorization to resume Stage 2 (not part of this implement pass)

---

## Verdict

**approved**

Exact next approval phrase:

```text
APPROVE PORTAL REQUEST ITEM RESIZE PERMISSION FIX IMPLEMENTATION
```

Do not implement, deploy Rules, modify production data, resume Stage 2, or begin domain cutover
until that phrase is received.
