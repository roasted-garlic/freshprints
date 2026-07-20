# Plan: Duplicate card — preparing feedback + editable while pending

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | Optimistic duplicate lock in PortalPrintRequestItemCard |

---

## Goal

After Duplicate, the new card must not feel silently broken. Show a clear **Preparing duplicate…** state, and let the customer edit size/qty immediately; persist those edits as soon as the real item id arrives.

## Background

Optimistic rows use `pending_dup_*` ids and disable all controls until the callable returns. Cards are keyed by `item.id`, so the component remounts on resolve and any mid-flight edits would be lost. Owner reports a few-second lock with no indicator.

## Scope

### In Scope
- Visible preparing status on optimistic duplicate cards (`aria-busy`, status copy, light visual treatment)
- Stable React `key` across pending→real id so the card does not remount
- Enable size/qty editing while preparing; flush autosave when id becomes real
- Keep Duplicate / Remove disabled until the real id exists

### Out of Scope
- Speeding the Cloud Function itself
- Cart drawer changes
- Studio duplicate UX

---

## Approach

1. `usePrintRequestDetail`: track `itemClientKeyById` (pending id stays as key when swapped to real id); expose `getItemClientKey`.
2. `PrintRequestDetailView`: `key={getItemClientKey(item.id)}`.
3. `PortalPrintRequestItemCard`: preparing banner; size/qty enabled; actions locked; on optimistic→real, `saveDraft()`.
4. CSS: `.portal-request-item-editor-card.is-preparing` + `.portal-request-item-preparing`.

---

## Test Strategy

- Portal typecheck
- Manual: duplicate → see Preparing; edit size while preparing → after ready, value persists / saves

---

## Approval
- Review doc: docs/workflow/reviews/2026-07-19-duplicate-preparing-feedback-review.md
- Verdict: approved
