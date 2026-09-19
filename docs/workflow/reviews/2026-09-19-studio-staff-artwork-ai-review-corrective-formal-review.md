# Formal Review: Studio Staff Artwork → AI Review corrective

| Field | Value |
|---|---|
| Date | 2026-09-19 |
| Plan | [2026-09-19 corrective plan](../plans/2026-09-19-studio-staff-artwork-ai-review-corrective-plan.md) |
| Review gate | Formal Review |
| Decision | **APPROVED WITH CONDITIONS** |
| Implementation authorization | Approved after the conditions below are preserved |

## Evidence reviewed

- `functions/src/staffArtwork.ts` currently writes every promoted title as
  `catalogTitleSource: "staff"`, even when Studio supplied its generated random default. This
  is the confirmed reason `resolveFinalCatalogCopy` protects the filename/default root title.
- The existing `catalogTitleSource` vocabulary and `resolveFinalCatalogCopy` already distinguish
  trusted root titles from import-derived roots and already persist the AI candidate when the
  final catalog path is eligible. No Studio display override is needed.
- The existing promotion callable already copies Staff Artwork production, preview, and thumbnail
  into canonical `designs/{id}/...` paths before deleting the private Staff Artwork record. AI
  Review reads those canonical Design paths through `designDerivativeUrlService`; no private
  Staff Artwork read or Rules change is required.
- `designService`/`useDesigns` provide the closest deterministic cursor pattern: ordered timestamp
  plus `__name__`, `limit(pageSize + 1)`, cursor state, append loading, reload, and stale-request
  protection. The Staff Artwork service currently uses a single bounded `limit(100)` query.
- The current focused contract suite passes before changes: 22 tests passed. Its Staff Artwork
  assertions intentionally still expect the old action wording and will be updated only with the
  approved implementation.

## Review decision and conditions

1. Additive Staff Artwork title provenance is justified and remains narrowly scoped. The existing
   Staff Artwork document has no field that records whether `title` was omitted or explicitly
   authored; inferring that distinction later from title text is unsafe because an explicit title
   can resemble a generated or filename-like value. Use the existing shared title-source
   vocabulary, add no collection or lifecycle state, and keep the legacy fallback bounded for
   records without the new field.
2. The implementation must preserve the documented normal workflow: AI suggestions are persisted
   for review and human approval persists the approved draft. Do not change global AI prompt,
   provider, queue, or normal Import/Ready Design semantics. Autonomous/final-catalog writes may
   use the existing resolver and provenance rules.
3. Remove Studio-side random default title submission so the backend owns default generation and
   can record the correct provenance. An explicitly supplied or later edited title must remain
   `staff` authority.
4. Pagination must be component → hook → service, keep newest-first order, use a deterministic
   cursor and bounded reads, preserve selection across appended pages, and reset the cursor after
   promotion/deletion. Do not silently fall back to an unbounded read when an index is missing.
5. Keep the existing canonical derivative-copy behavior and test it. Do not add a Staff Artwork
   dependency to AI Review, duplicate binaries into a new namespace, or weaken Rules.
6. Rename only Staff Artwork action copy to `Send to AI`; keep the `AI Review` workspace, route,
   and lifecycle names unchanged.
7. Preserve all unrelated working-tree changes. No production deploy, Studio release, migration,
   backfill, index deployment, or console action is authorized by this review.

## Required verification before Signoff

- Focused title-authority, promotion, pagination/selection, action-copy, and preview-continuity
  tests pass.
- Functions build/tests, Studio typecheck/build, targeted lint, and `git diff --check` pass, with
  failures documented honestly if an environment limitation occurs.
- Owner DEV QA is recorded before Signoff.

The plan is approved for implementation subject to these conditions.
