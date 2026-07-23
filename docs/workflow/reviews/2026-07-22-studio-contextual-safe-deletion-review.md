# Review: Studio Contextual Safe Deletion and Historical Tombstones

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-22-studio-contextual-safe-deletion-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

Pass 0 inventory is thorough and correctly identifies that Test Data `ownerDeleteUser` and the orphan client `deletePrintRequest` / `deleteUpcomingShow` APIs are unsafe to relocate as-is. The proposed policy matrix, layered architecture, pass order, and tombstone/username direction align with ADR-FP-084, SECURITY default-deny, and the product principle of no silent cascades. Implementation must not start until the listed owner decisions are recorded and the required plan changes below are applied.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Passes 0–7; wipe stays dev-only; Portal new UI out of scope |
| Architecture alignment | pass | Components → hooks → services → callables; no generic delete endpoint |
| Security impact addressed | pass | Server recheck; Auth disable preferred; permissionService; no rules relaxation proposed |
| Data model impact addressed | pass | Tombstone sketch; username reservation retained; field names need owner pick |
| Backend Impact addressed | pass | Domain callables listed; staged Auth/Storage non-atomicity documented |
| Test strategy adequate | pass | Unit + Functions + typecheck + lint + 20-scenario manual QA |
| Human checkpoints identified | pass | Auth, username, tombstone fields, no prod deploy |
| Roadmap alignment | pass | Data-integrity hardening across Studio entities |
| Documentation plan | pass | DATA_MODEL, BACKEND, DECISIONS ADR, SECURITY, TESTING, handoff |
| No silent scope expansion | pass | Design hard-delete deferred unless owner expands |

---

## Architecture Review

**Findings:**
- Correct rejection of a universal delete endpoint.
- Correct classification: soft-archive paths (designs/categories/tags) stay; hard-delete product paths must be new callables.
- Electron correctly out of scope for Firebase entity deletion.
- Shared types in `packages/shared` for outcomes and display helper is the right place.

**Required changes:**
- [ ] In Pass 1, name preflight vs execute callables consistently and document which UI flows require typed confirmation phrases (mirror `DELETE USER` / `WIPE TEST DATA` only for irreversible hard deletes).

---

## Security Review

**Findings:**
- Critical: current `ownerDeleteUser` deletes Auth users, frees `customerUsernames`, and cascade-deletes the print graph — incompatible with historical retention. Plan correctly marks it Replace/Quarantine.
- Prefer Auth **disable** over **delete** for product customer tombstones; preserves UID as historical reference.
- Keep destructive writes on Admin SDK callables; do not open client `delete` on `customers` / `users` / `designs`.
- Product tombstone callables should not inherit the “dev project only” gate if Studio must fulfill Portal deletion requests on non-dev later — but **this phase targets `fresh-prints-dev` only**. Document that production enablement is a separate human-gated phase.

**Required changes:**
- [ ] Plan Pass 2 must explicitly: (a) relabel or isolate Test Data scratch hard-delete, and (b) ensure the new Users-page action never calls the cascade `ownerDeleteUser` customer path.
- [ ] Server must reject tombstone of the signed-in caller and last active owner (staff) even if UI hides the action.

**Human approval needed before production:**
- [x] Auth disable/delete behavior
- [x] Username reservation semantics change vs ADR-FP-104 cascade
- [x] Any future production deploy of these callables
- [ ] None for this phase’s code work on `fresh-prints-dev` after owner decisions

---

## Data Model Review

**Findings:**
- Reusing `PrintRequestStatus` `archived` and show `isArchived` / production statuses avoids inventing parallel lifecycles — good.
- Tombstone fields are net-new; no `Tombstone` types exist today — ADR required.
- Username uniqueness correctly identified as reservation-doc-based; product delete must **retain** `customerUsernames/{username}`.

**Required changes:**
- [ ] Owner must choose field shape (`isDeleted` + timestamps vs `accountStatus`) before Implement Pass 2.
- [ ] Confirm categories/tags remain soft-archive forever when unused (recommended) — do not implement hard delete of taxonomy docs in this phase unless owner insists.

---

## Backend Review

**Findings:**
- Callable naming matches repo convention.
- Staged execution and idempotent retry guidance is adequate.
- Portal request fulfillment should set `accountDeletionRequests` → `fulfilled` under the new policy when Studio tombs an account with a pending request.

**Required changes:**
- [ ] Add explicit failure recovery matrix to the plan (or ADR draft): Firestore written / Auth disable failed; Auth disabled / Storage pending; retry behavior.
- [ ] `deleteEligiblePrintRequest` must delete child `printRequestItems` in the same trusted operation (batched), never parent-only.

---

## Testing Review

**Findings:**
- Required automated checks match `TESTING.md`.
- Manual 20-scenario list from the goal is complete enough for the checkpoint doc.

**Required changes:**
- [ ] None beyond executing those tests in Test phase and recording exit codes honestly.

---

## Documentation Review

**Findings:**
- Plan correctly lists DATA_MODEL, BACKEND, DECISIONS (supersede conflicting ADR-FP-104 product cascade), SECURITY, TESTING, STYLE_GUIDE display, handoff update at signoff.

---

## Required Changes (approved_with_changes)

1. **Record owner answers** to plan decisions 1–7 in workflow state Decision Log before any application code.
2. **Pass 2 quarantine:** Users-page customer delete must use tombstone + Auth disable + username retain; must not invoke cascade `ownerDeleteUser` as implemented today.
3. **Add Auth/Storage/Firestore failure recovery matrix** to plan Approach or as ADR draft section before Implement Pass 1 completes.
4. **Child cleanup:** eligible print-request delete is request + items only; document no allocation may remain (precondition).
5. **Taxonomy:** default to soft-archive-only for categories/tags this phase (block when referenced); no hard delete of category/tag documents unless owner expands scope.
6. **Design hard delete:** remain out of scope (archive + existing purge only) unless owner explicitly expands and re-reviews.

---

## Blockers (if blocked)

None for plan quality. **Implement is gated** on owner decisions 1–7.

---

## Verdict Rationale

**approved_with_changes** — Inventory and policy direction are sound and actionable; unsafe legacy paths are correctly flagged; architecture and security gates are respected. Conditional approval requires owner product decisions and the quarantine/recovery clarifications above before Implementation Agent may proceed.

---

## Next Step

1. Human checkpoint: answer owner decisions 1–7.
2. Planning Agent: fold answers + required changes into the plan (Status → approved).
3. Only then: Implement Pass 1+.
4. Do not deploy to production.
