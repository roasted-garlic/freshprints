# Plan: Uploaded intake pill + Add to Request progress modal

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-18-uploaded-pill-add-progress-review.md |

---

## Goal

1. Studio Customer Upload Intake shows a gold/amber **Uploaded** meta pill on normal (non-assisted) uploads, matching the existing purple **Custom** pill placement and Portal source-pill colors.
2. Portal Assisted Add to Request shows a progress/status modal with honest staged client messages while the callable runs, instead of only button text "Adding…".

## Background

Owner follow-up after Custom meta pill work. Portal Current Request already uses gold **Uploaded** / purple **Custom** source pills. Assisted add closes the consent modal immediately and leaves only a button busy label, which feels incomplete during processing/trim/upscale/attach.

## Scope

### In Scope

- Studio: list + detail meta line pills (`Custom` XOR `Uploaded`)
- Studio CSS for gold/amber Uploaded badge (warning tokens / Portal upload pill parity)
- Portal: progress modal after Allow / Don’t allow on assisted Add to Request
- Soft-reload Studio + Portal; no Functions unless required (prefer none)
- Manual re-test checklist

### Out of Scope

- Functions / server progress events
- Production deploy
- Changing consent Allow / Don’t allow / Cancel semantics
- Renaming button to "Your Stash"
- Donation-specific alternate pill labels (non-assisted donations still get Uploaded as source type)

---

## Affected Areas

### Files / Modules (expected)

- `apps/studio/.../CustomerUploadIntakeSection.tsx`
- `apps/studio/.../layout.css` (Uploaded badge styles)
- `apps/portal/.../AssistedCreationDetailPanels.tsx`
- `apps/portal/.../AssistedLibraryListingConsentModal.tsx` (busy wiring only if needed)
- New or extended Portal modal component for add progress
- `apps/portal/styles/assisted-creation.css` (progress modal styles if needed)

### Architecture Impact

- [x] None (UI presentation only; client-staged status)

### Security Impact

- [x] None

### Data Model Impact

- [x] None

### Backend Impact

- [x] None preferred (client-side staged messages timed to existing callable await)

### UI / UX Impact

- [x] Details: Studio intake meta pills; Portal assisted add progress modal; no em dashes in new/changed copy

### Migration Impact

- [x] None

---

## Approach

1. **Uploaded pill:** Where Custom is rendered for `assistedCreationRequestId`, else render Uploaded. Never both. Same meta line spots (list sub + detail meta).
2. **Uploaded styles:** Mirror Custom badge sizing; colors from Studio `--color-warning` / `--color-warning-text` (Portal upload pill uses warning tokens).
3. **Progress modal:** On Allow/Don’t allow, close consent modal, open non-dismissible progress dialog. Stages while awaiting callable:
   - Immediate: "Preparing and resizing artwork…"
   - After short delay if still pending: "Adding to your request…"
   - Success: brief "Done" / success line, then close and keep existing drawer refresh behavior
   - Error: show message + dismiss
4. Keep button label **Add to Request** when idle; consent Cancel / Escape unchanged.
5. Soft-reload only; no Functions deploy.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck / lint if quick | existing portal/studio scripts if already used | optional |
| Unit tests | n/a for pure UI | no |

### Manual

| Step | Expected |
|------|----------|
| Studio soft-reload → intake list/detail normal upload | Gold **Uploaded** pill on meta line; no Custom |
| Assisted intake row | Purple **Custom** only; no Uploaded |
| Portal soft-reload → Add to Request → Allow | Consent closes; progress modal with staged messages; success/close; item in Current Request |
| Don’t allow | Same progress path; still adds |
| Cancel on consent | No add; no progress modal |

---

## Human Checkpoints

- [ ] Manual UI re-test (Studio + Portal soft-reload)
- [ ] No production

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Staged messages feel "fake" | Copy is honest about preparing/resizing then adding; no fake per-server-step events |
| Progress modal traps user on hang | Keep error path + finally clear busy; Escape only when not busy / on error |

Rollback: revert the touched UI files; soft-reload.

---

## Open Questions

None blocking.
