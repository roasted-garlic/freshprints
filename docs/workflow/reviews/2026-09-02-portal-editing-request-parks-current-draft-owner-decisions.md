# Owner decisions: portal-editing-request-parks-current-draft

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Goal | `portal-editing-request-parks-current-draft` |
| Plan | `docs/workflow/plans/2026-09-02-portal-editing-request-parks-current-draft-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-02-portal-editing-request-parks-current-draft-review.md` |

---

## OD-1 — Parked draft visibility

**APPROVED:** Keep parked draft visible on Portal Working.

- `status` remains `draft`
- Visibly inactive (“Temporarily inactive” / locked)
- CTA to active Editing PR
- No mutations, queue, Add, or upload targeting
- Current Request resolves to Editing PR, not parked draft
- Editing PR stays on Editing tab (ADR-FP-158)

## OD-2 — Empty draft

**APPROVED:** Do not park empty drafts.

- Use authoritative empty predicate (`itemCount === 0` / merge convention)
- Archive/clean empty draft in the **same** TX that activates Editing
- No parking relationship for empty drafts

## OD-3 — Clear Editing

**APPROVED:** Clearing items alone does **not** restore.

- Clear items while `status === "editing"` → Editing remains active; parked draft stays parked
- Restore only when Editing **ownership ends** (queue → active, archive, delete, convert, etc.)

---

## Parking fields (final)

| Field | Document | Authorship |
|-------|----------|------------|
| `parkedByEditingRequestId` | parked draft | server-only |
| `parkedAt` | parked draft | server-only |
| `parksDraftPrintRequestId` | editing PR | server-only |

## Implementation authorization

Owner authorized Implement after recording these decisions (2026-09-02).
