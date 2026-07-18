# Review: Portal duplicate + resize — Save failed / permissions

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-17-portal-duplicate-resize-permissions-plan.md |
| Verdict | **approved** |

---

## Summary

Root-cause path is well evidenced: autosave toast maps to `updatePrintRequestItem`, not the duplicate callable. Primary denial is updates against optimistic `pending_dup_*` ids (non-existent docs → permission-denied). Secondary: unnecessary parent `printRequests` touch on item edit. Rules harden via `diff().affectedKeys().hasOnly` is appropriately narrow. Parked notification QA preserved.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Client fix + narrow rules harden only |
| Architecture alignment | pass | Service-layer writes; no UI→Firestore bypass |
| Security impact addressed | pass | No broader create/update identity; hasOnly tightens parent updates |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | Rules deploy gated on human APPROVE DEV DEPLOY |
| Test strategy adequate | pass | tsc + manual Portal retest |
| Human checkpoints identified | pass | Manual QA + optional rules deploy |
| Roadmap alignment | pass | Bug fix; parks prior QA |
| Documentation plan | pass | Workflow artifacts + state |
| No silent scope expansion | pass | Duplicate callable untouched |

---

## Architecture Review

**Findings:**
- Matching Studio item-update write shape is correct.
- Keeping parent bumps on add/remove preserves `itemCount` integrity.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- Prefer client removal of parent touch over relaxing item rules.
- `diff().affectedKeys().hasOnly(["itemCount","notes","updatedBy","updatedAt"])` is stricter than equality-only checks for accidental field mutation.
- Null-tolerant optional helpers must not accept arbitrary types — only null-or-missing alongside existing type checks.

**Required changes:**
- [x] None beyond plan

**Human approval needed before production:**
- [x] Rules: **dev only** after `APPROVE DEV DEPLOY`; no production

---

## Data Model Review

**Findings:**
- Notes clear via `deleteField()` matches “absent optional” model better than `null`.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- No Functions changes required for primary fix.
- Rules deploy command for `fresh-prints-dev` only.

**Required changes:**
- [x] None

---

## Test Review

**Findings:**
- Manual duplicate→resize is the acceptance gate.
- Document that rules emulator suite is absent.

**Required changes:**
- [x] None

---

## Required Changes Before Implement

- [x] None

---

## Verdict Rationale

Approved: narrow, evidence-based, security-conscious, reversible. Implement client fix immediately; rules harden may ship with same phase but deploy waits on owner approval.
