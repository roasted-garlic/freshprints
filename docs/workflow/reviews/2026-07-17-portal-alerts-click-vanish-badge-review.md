# Review: Portal Alerts — click vanish + circular badge

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-17-portal-alerts-click-vanish-badge-plan.md |
| Verdict | **approved** |

---

## Summary

Narrow residual UX fix on Portal Alerts only. Root cause (unread-filtered live list + immediate mark-read) and badge CSS approach are sound. No security, data, or backend impact. Manual QA required for visual/click feel.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Portal header Alerts only |
| Architecture alignment | pass | Provider/bell/CSS within notifications feature |
| Security impact addressed | pass | Existing markRead; no rule changes |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | None |
| Test strategy adequate | pass | Portal typecheck + manual QA |
| Human checkpoints identified | pass | Manual UI retest |
| Roadmap alignment | pass | Residual of parked portal notifications |
| Documentation plan | pass | Workflow artifacts only |
| No silent scope expansion | pass | Push/VAPID/Studio/Brevo out of scope |

---

## Architecture Review

**Findings:**
- Pinning preview at panel open keeps mark-read in the service layer and avoids optimistic local list mutation hacks.
- Badge change is CSS-only; align with Studio `staff-inbox-bell-bubble` sizing pattern.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- No change to who can read/mark notifications.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] None for this residual (deploy of broader Alerts phase still separately gated)

---

## Data Model Review

**Findings:**
- None.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- None.

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Typecheck + manual click/badge steps sufficient for this UI residual.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- Manual QA doc required at test phase; do not wipe parked Ctrl+Enter or Studio deep-link checkpoints in state.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Scope is minimal, root cause is correct, preferred UX (keep row until panel close / navigate) is explicit, and risks are low. Approved to implement.

---

## Next Step

Implement approved scope.
