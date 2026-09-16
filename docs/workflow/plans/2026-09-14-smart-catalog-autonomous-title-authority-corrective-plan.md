# Smart Catalog Autonomous title-authority corrective — plan

> **Superseded by the second-soak over-preservation corrective.** The follow-up plan in
> `2026-09-14-smart-catalog-autonomous-title-authority-overpreservation-corrective-plan.md`
> tightens legacy semantics: `legacy_unknown` and `import_filename` are untrusted even when the
> text looks human, and `createdBy != updatedBy` never establishes title authority.

Date: 2026-09-14
Phase: `smart-catalog-autonomous-title-authority-corrective`
Environment: `fresh-prints-dev` only

## Gate status

The first live DEV Processing-queue soak is **FAIL / INCOMPLETE**. Four Ready records retained
filename-like root titles (`PNG 4`, `PNG 6`, `ProjectWhite`, `M4170303i1mimi`) even though their
description, category, Smart Profile, publication, and Algolia records were healthy. No Owner QA
is authorized. DEV must be restored through the owner-gated Studio control to `shadow`, live
`false`, Pass 2 OFF before deployment or a second soak.

## Goal

Make final title selection depend on durable title authority rather than non-empty root text.
Raw import filenames, basename fallbacks, and temporary/default import titles must yield to the
valid AI candidate when no trusted human/import authority exists. Explicit staff-authored and
trusted-import titles must remain protected. Description/category behavior and the existing
fail-closed Smart Profile/Autonomous gate must remain unchanged.

## Proven failure boundary

The provider result and normalized candidate contain valid titles. `markAiSuccess` passes the
candidate through the existing final resolver, which treats a non-empty source-less root title as
usable unless a narrow shape heuristic matches. `PNG 4`, `PNG 6`, `ProjectWhite`, and
`M4170303i1mimi` miss that heuristic; the resolver therefore selects root title while selecting
candidate description/category. The same selected title is used for the final decision and the
atomic Ready write, so there is no later persistence race or authority merge. Publication and
Algolia mirror that root value. This proves a title-authority/placeholder gap (hypotheses A/B),
not a provider, description/category, Smart Profile, or elapsed-runtime defect.

## Bounded implementation

1. Add optional `catalogTitleSource` provenance with the allowlisted values `staff`,
   `trusted_import`, `import_filename`, `ai_generated`, and `legacy_unknown`.
   - Studio-created non-import designs default to `staff`.
   - File/customer imports and customer-upload promotion stamp `import_filename`.
   - Staff Artwork promotion stamps `staff`.
   - A Studio title edit/AI Review approval stamps `staff`.
   - A queue/reprocess write that selects the AI title stamps `ai_generated`; a preserved staff or
     trusted-import title keeps its source.
   - Firestore rules permit this optional field only on the existing staff metadata path.
2. Extend `resolveFinalCatalogCopy` with the source and existing source metadata. Trust explicit
   `staff` and `trusted_import`; reject raw `import_filename`/basename/default roots in favor of a
   valid candidate. For `legacy_unknown`, retain complete non-placeholder copy but treat an
   incomplete root title as untrusted and select the candidate. Keep the existing exact
   source-stem/default and tightly bounded legacy-shape checks; do not replace them with a broad
   regex.
3. In `markAiSuccess`, derive legacy authority deterministically from existing fields when the
   provenance field is absent (`sourceStaffArtworkId`, import/customer source metadata, or a
   differing `updatedBy` staff editor). Resolve and decide on the same final title, then atomically
   persist the selected title and its `catalogTitleSource` with Ready approval. Needs Review writes
   no new root title/source.
4. Preserve the existing description/category final gate, candidate hard blockers, Smart Profile
   merge, publication behavior, and bounded Automation Health counters.

## Regression and verification gates

- Pure resolver cases: `PNG 4`, `PNG 6`, `ProjectWhite`, arbitrary alphanumeric and numeric
  basenames, extension-stripped filename, staff title, trusted-import title, AI title, conflict,
  title-only fallback with valid description/category, and legacy source inference.
- Contract cases: queue and reprocess paths persist the exact selected title/source atomically;
  Shadow never writes root fields; malformed candidate remains Needs Review; staff title edits are
  protected.
- Run full Functions AI, targeted persistence/decision/reprocess/Algolia/shared suites, Functions
  build, Studio typecheck/lint, and `git diff --check`.
- After owner readback confirms DEV `shadow`/live `false`/Pass2 OFF, promote only the reviewed DEV
  Functions (and required DEV rules/client artifacts), verify source parity, then run the real
  sequential AI Review → Processing queue. Capture a new baseline, compare at least four affected
  and four good designs through Firestore/publication/Algolia, run fail-closed/parity checks,
  adversarial review, and a bounded unattended DEV soak.
- Restore DEV to `shadow`/live `false`/Pass2 OFF after the second soak. Only a passing second soak
  may stop at `OWNER QA REQUIRED — AUTONOMOUS CATALOG-COPY FAIL-CLOSED CORRECTIVE`.

## Production boundary

Production settings, Functions, rules, designs, Algolia, repair/reprocessing, and backfills remain
out of scope. If DEV and Owner QA pass, return the exact production promotion/validation plan and
stop for a separate owner authorization.
