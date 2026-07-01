# Plan - Bulk Import Modal Scroll To Success

- **Date:** 2026-07-01
- **Mode:** Managed Phase
- **Goal slug:** `bulk-import-modal-scroll-to-success`
- **Roadmap phase:** Phase 4/6 maintenance - Design Library catalog management
- **Gate:** Plan -> Review -> Implement -> Test -> Signoff
- **Human checkpoint:** None expected. This is a renderer-only modal UX follow-up with no deploy or data writes.

---

## 1. Goal

After bulk category or bulk tag import saves successfully, return the user to the top of the list view so the success message is visible immediately.

---

## 2. Scope

| File | Change |
|---|---|
| `src/renderer/src/features/designs/components/CategoryManagementModal.tsx` | Scroll the category list modal body to the top after successful bulk category import returns to the list view. |
| `src/renderer/src/features/designs/components/TagManagementModal.tsx` | Scroll the tag list modal body to the top after successful bulk tag import returns to the list view. |
| `.cursor/workflow/state.md` | Track this managed follow-up through signoff. |
| `docs/workflow/reviews/2026-07-01-bulk-import-modal-scroll-to-success-test-report.md` | Record verification. |
| `docs/workflow/reviews/2026-07-01-bulk-import-modal-scroll-to-success-signoff.md` | Record signoff. |

No Firebase, service, data model, permission, dependency, seed, migration, or deploy changes.

---

## 3. Implementation Notes

- Add a ref to each modal's list `ModalBody`.
- Add a short-lived ref flag set only when a successful bulk import returns to list view.
- After the list view renders, scroll its modal body to `top: 0`.
- Preserve existing behavior for failed-only imports and manual Back actions.

---

## 4. Verification

Run:

1. `npx tsc --noEmit`
2. `npm run lint`
3. `git diff --check`

Inspection checks:

- Successful category bulk import returns to the list view and scrolls to the top where the success alert appears.
- Successful tag bulk import returns to the list view and scrolls to the top where the success alert appears.
- Failed-only imports stay in the bulk import view.
- Manual Back actions do not force-scroll the list view.

---

## 5. Out Of Scope

- Changing import parsing or validation.
- Changing create/update services.
- Changing success message copy beyond existing behavior.
- Changing modal layout or global modal components.
