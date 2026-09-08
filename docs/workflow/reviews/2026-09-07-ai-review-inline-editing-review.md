# Review: AI Review Inline Editing

## Decision

Approved for implementation as a renderer-focused UX change.

## Review notes

- The existing draft form already seeds title, description, category, and tags from AI suggestions and tracks changes against a baseline.
- The duplicate suggestion block should become provenance context rather than a second editing workflow.
- Smart Profile dimensions are Functions-owned persisted data; the UI may compact and expose existing category selection, but arbitrary dimension persistence requires a separate service/data-contract change unless an existing path is found.
- No production, Firebase, security, or deployment changes are authorized in this phase.

## Acceptance criteria

- Staff can edit primary AI-enriched catalog fields immediately in the first form.
- AI-origin and changed-from-AI state remain visible.
- Smart Profile uses a compact responsive grid and does not create a false promise of persistence.
- Existing approve/reject/reprocess behavior remains intact.
