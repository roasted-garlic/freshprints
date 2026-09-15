# Smart Catalog Autonomous canonical-copy fail-closed corrective — plan

Date: 2026-09-14
Phase: `smart-catalog-autonomous-canonical-copy-fail-closed-corrective`
Environment: `fresh-prints-dev` only

## Goal

Make Autonomous approval depend on the catalog values that will actually be persisted and
published, not only on the transient AI candidate. A design with a valid AI result and Smart
Profile must receive those exact effective values in the root catalog fields before it can become
Ready. Preserve a complete, non-placeholder staff-authored root field; replace only an import
filename/default or missing/invalid root field with the corresponding valid AI value. If the
resulting final record is still incomplete or invalid, route to Needs Review.

Production is outside this phase. No production settings, Functions, designs, Algolia, backfills,
or repair/reprocessing are authorized.

## DEV containment and evidence

Read-only DEV readback is contained: `settings/aiEnrichment` reports
`catalogWorkflowMode=shadow`, `catalogAutonomousLiveEnabled=false`, and Pass 2 is OFF.
The DEV evidence set contains 24 system-reviewed rows; three current v39/v7 Ready rows are
malformed at the root while their AI suggestions and Smart Profiles are valid:

- `coiXzQDhJBKBVB1dFVZT` — root title `b41e81c7d8`, no description/category; AI title
  `Wildflowers Don't Care Where They Grow Floral`, category `Floral & Nature`.
- `nff6PpkZF9TNitnpX2Mm` — root title `343 Boston Terrier`, no description/category; AI title
  `Boston Terrier Floral Bow Tie Portrait`, category `Animals`.
- `1Ws0T9fivryest6IUSbt` — root title `just_hit_it` (source filename), no description/category;
  AI title `Just Hit It Weed Logo`, category `Cannabis & 420`.

Algolia records for those IDs contain the malformed root values. Reprocessing preserves the root
fields and invokes the same queue pipeline, reproducing the mismatch. Existing Shadow artifacts
and source inspection show the provider/parser/candidate path is valid; the loss occurs after
candidate evaluation.

## Proven root cause

`aiEnrichmentCandidateCore` resolves the provider result, validates the candidate title and
description, resolves the category against active categories, builds the Smart Profile, and
computes `shouldPublishReady` from those candidate fields. `aiEnrichmentPipeline.markAiSuccess`
re-evaluates the decision from the candidate and then writes lifecycle fields plus
`aiSuggestions`, `aiAnalysis`, and `smartProfile`, but does not write root `design.title`,
`design.description`, or `design.categoryId`. Imports intentionally seed the root title from the
filename and leave description/category empty. Autonomous therefore writes Ready/system approval
and the Algolia trigger indexes those stale root values. The existing health counters are also
incremented before persistence, so they can report an auto-approval that was never safe at the
canonical record boundary.

This is a downstream persistence-contract mismatch, not a provider, parser, race, or production
incident finding.

## Bounded implementation

1. Add a pure final-catalog resolver/validator that receives candidate copy, current root copy,
   import filename metadata, and the active category set. It preserves a non-placeholder root
   title/description/category; otherwise it selects the candidate field. It must reject exact
   filename-stem/default title fallbacks (`Imported design`, `Customer upload`), missing/blank
   description, and missing/unknown/inactive/Uncategorized category IDs. Return deterministic
   reason codes such as `catalog_copy_title_placeholder`,
   `catalog_copy_description_missing`, and `catalog_copy_category_unresolved`.
2. In `markAiSuccess`, after Smart Profile authority/preset merge and immediately before the
   guarded transaction update, resolve the final catalog fields and recompute the automation
   decision using those exact values. When the final decision is publishable, write the resolved
   title/description/categoryId in the same transaction as Ready/approval; when blocked, write
   no Ready/system approval and retain any existing root values for staff review. Persisted
   `aiSuggestions` remains the provider candidate for audit; root fields are the effective catalog
   authority selected by the resolver.
   Candidate hard blockers remain authoritative even when a trusted root field can fill a missing
   candidate slot; this keeps malformed provider output fail-closed.
3. Return the reconciled final decision/outcome from `markAiSuccess` so Automation Health counters
   are incremented after persistence using the actual result. Count final blockers as routed
   Needs Review/hard-blocker outcomes and never as `actuallyAutoApproved`.
4. Add bounded diagnostic logging containing design ID, attempt ID, final reason codes, and the
   root/candidate parity outcome. Extend the existing Automation Health counters (and its existing
   Studio readout) for canonical-copy hard blockers, title fallbacks, missing descriptions, and
   unresolved categories. Do not persist provider payloads, image bytes, secrets, or unbounded
   trace data.

No provider/model/prompt change, schema migration, Rules/index change, Algolia rebuild, or
production action is in scope. The only UI touch is the existing Studio Automation Health readout,
which exposes the new bounded canonical-copy counters.

## Tests and DEV verification

- Pure validator tests for complete trusted root copy, missing/blank description, missing/invalid/
  sentinel category, filename-stem/fallback title, and a genuine human title that differs from
  the filename.
- `markAiSuccess` contract tests proving root-invalid + candidate-incomplete remains Needs Review
  and never writes Ready/system approval; root-invalid + candidate-valid writes the exact effective
  AI fields atomically; complete trusted roots remain intact; stale attempts remain guarded.
- Reprocess regression proving preserved malformed roots fail closed.
- Automation Health test proving counters reflect the final persisted decision.
- Existing AI decision, Smart Profile, publication, and Algolia tests remain green.
- Run targeted Functions/shared tests, typecheck/lint/build as available, and `git diff --check`.
- Promote the reviewed Functions change only to DEV, then run a deterministic same-design
  Shadow-vs-Autonomous comparison, a bounded unattended DEV soak, adversarial review, and OWNER
  QA. Capture evidence and stop before any production promotion/re-enable checkpoint.

The existing `ready_backfill` catalog-reprocess mode is a separate non-approval backfill path that
intentionally preserves Ready lifecycle/root authority; this corrective gates the live queue path
used by normal processing and owner Ready reprocess, and does not perform a historical backfill.

## Review and owner boundary

Formal Review must approve this bounded scope before implementation. After DEV tests/soak and
OWNER QA pass, return the exact production promotion plan for a separate owner authorization;
production Autonomous must remain Shadow/live false until that checkpoint.
