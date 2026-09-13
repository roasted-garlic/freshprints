# AI Review Inline Editing Plan

## Goal

Make AI Review fast to edit by presenting one editable catalog form at the top, while preserving a compact, visible record of AI-origin values and changes. Make Smart Profile dimensions compact and editable in the same review surface.

## Scope

- Move the editable catalog fields ahead of the read-only suggestion presentation.
- Add per-field AI-origin context and original-value traceability without duplicate editable controls.
- Replace the expanded Smart Profile list presentation with a responsive multi-column editor using the existing draft/save flow where available.
- Keep processing metadata, rerun controls, permissions, and approval behavior unchanged.

## Architecture / data / Firebase

Renderer-only presentation and form-state changes. No new Firebase collections, rules, callable functions, or direct component data access. Existing service-layer approval persistence remains authoritative.

## UI considerations

Use the existing design tokens and controls. Inputs remain directly focusable; no edit-mode toggle. AI provenance is shown as a small badge/helper row, with the prior AI value available inline when the current value differs.

## Risks

Smart Profile persistence is Functions-owned today, so this phase must not imply that locally edited profile values are persisted unless an existing save path supports it. If no path exists, the editor should be introduced behind the current approval draft boundary or the missing persistence should be split into a follow-up phase.

## Verification

Run focused AI Review tests, TypeScript checks for the touched surface, and `git diff --check`.
