# Plan: Ctrl+Enter to send assisted messages (Portal + Studio)

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase (residual UX follow-up) |
| Related | Studio Messages inbox / assisted message composers |

---

## Goal

On Portal and Studio assisted-creation message composers, **Ctrl+Enter** (and **Cmd+Enter** via `metaKey`) sends the message when send is enabled, and a small tip label under the Send button documents the shortcut. Plain **Enter** continues to insert a newline.

## Background

Owner requested residual composer UX after Studio Messages work. Narrow UI-only change on existing composers. Portal Alerts deploy/QA and Studio deep-link scroll manual QA remain parked/open separately — this does not expand into Brevo, notifications, or Firestore.

## Scope

### In Scope

- Portal `AssistedCreationMessagesPanel` textarea: Ctrl/Cmd+Enter → same submit path as Send button
- Studio assisted Messages composer textarea: same behavior when `canMutate` / send enabled
- Small secondary tip label below Send on both surfaces (copy: `Ctrl + Enter to send`)
- Light CSS for tip alignment under the button (existing muted/hint tokens)
- Manual QA steps; cheap typecheck/unit if available

### Out of Scope

- Portal Alerts / Web Push / Brevo
- Changing plain-Enter behavior (must remain newline)
- New shared design-system primitives
- Commits, deploys, production
- Platform-aware ⌘ copy (optional nicety; prefer simple Windows-leaning tip)

---

## Affected Areas

### Files / Modules (expected)

- `apps/portal/features/assisted-creation/components/AssistedCreationDetailPanels.tsx`
- `apps/portal/styles/assisted-creation.css`
- `apps/studio/.../AssistedCreationRequestsSection.tsx`
- `apps/studio/.../styles/components/staff-inbox.css`
- Docs: this plan, review, test/manual QA; workflow state

### Architecture Impact

- [x] None — UI event wiring only

### Security Impact

- [x] None — same auth-gated send handlers; no new endpoints

### Data Model Impact

- [x] None

### Backend Impact

- [x] None

### UI / UX Impact

- [x] Composer keyboard shortcut + tip label on Portal + Studio Messages

### Migration Impact

- [x] None

---

## Approach

1. On each composer textarea `onKeyDown`: if `(ctrlKey || metaKey) && key === 'Enter'`, `preventDefault`, and if send would be enabled (trimmed non-empty, not sending, Studio `canMutate`), call `form.requestSubmit()` (or equivalent) so the existing submit handler runs.
2. Wrap Send button + tip in a small flex column aligned to the end; tip uses existing muted/hint classes and `font-size-xs`.
3. Tip copy: **`Ctrl + Enter to send`** (same on both apps; metaKey still works on Mac).
4. Preserve parked Portal Alerts notes and open Studio deep-link manual QA in workflow state.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck / unit (if cheap) | portal/studio scoped if available | preferred |
| Lint | project default if cheap | no |
| Build | only if needed for confidence | no |
| E2E | — | no |

### Manual

- [ ] Portal: focus composer, Ctrl+Enter with empty draft → no send; with text → sends; plain Enter → newline; tip visible under Send
- [ ] Studio: same when staff can mutate; helper/read-only composer unchanged

---

## Human Checkpoints Anticipated

- [x] Manual UI smoke (local Portal + Studio)
- [ ] Design approval — not required (matches existing muted hint)
- [ ] Business logic — none
- [ ] Production / deploy — none for this residual

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Accidental send on Enter | Only Ctrl/Cmd+Enter; plain Enter unchanged |
| Double-submit | Reuse existing `sending` / disabled guards |

Rollback: revert composer TSX + CSS tip rules.

---

## Open Questions

None blocking.
