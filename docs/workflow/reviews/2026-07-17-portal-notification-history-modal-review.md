# Review: Portal customer notification history modal

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-17-portal-notification-history-modal-plan.md |
| Verdict | **approved** |

---

## Summary

Narrow, coherent Portal Alerts UX addition: history modal from the dropdown, reusing existing `customerNotifications` query (read+unread) and modal Escape/overlay patterns. Absorbs already-landed click-vanish + badge residual without expanding into web-push deploy or Brevo.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | History modal + query cap; residual verify-only |
| Architecture alignment | pass | Service + provider + components; no UI Firestore bypass |
| Security impact addressed | pass | Existing owner-read rules; markRead keys unchanged |
| Data model impact addressed | pass | No schema change |
| Backend impact addressed | pass | Index exists; rules verify-only |
| Test strategy adequate | pass | Portal tsc + manual QA |
| Human checkpoints identified | pass | Manual UI; parked QA preserved |
| Roadmap alignment | pass | Complements parked web-push |
| Documentation plan | pass | Workflow artifacts |
| No silent scope expansion | pass | Explicit out-of-scope list |

---

## Architecture Review

**Findings:**
- Reusing provider `items` avoids dual listeners; raising limit to 50 is fine.
- Dedicated history modal component keeps bell panel focused.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- `firestore.rules` already allows customer read when `customerUid == auth.uid` with no `readAt` filter — history works without rules deploy unless a gap is discovered during implement.
- Update rule still restricts to `readAt`/`updatedAt` only.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] None (no rules/deploy expected)

---

## Data Model Review

**Findings:**
- Docs already exist; markRead does not delete — history-safe.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- Composite index `customerUid` + `createdAt` desc already in `firestore.indexes.json`.

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Typecheck + manual history/navigation/a11y + residual smoke-check is adequate.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- Workflow plan/review/manual QA sufficient; permanent DATA_MODEL update optional/skipped.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Scope matches owner UX, security already supports history reads, residual absorption is documented without wiping parked checkpoints.

---

## Next Step

Implement approved scope.
