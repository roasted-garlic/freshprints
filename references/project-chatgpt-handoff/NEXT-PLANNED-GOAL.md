# Next Planned Goal

**Updated:** 2026-09-09

## Current state

- No active child goal. `legacy-tag-operational-retirement-and-smart-profile-search-parity` is
  **CLOSED** with approved signoff after Owner DEV QA **PASS** on 2026-09-09.
- Commit/push is complete as `1c43f6e1` on `origin/development`; production and publish remain
  separately gated.
  The owner decisions are resolved: Halftone uses the existing `halftoneStaffDecision.value`,
  legacy Studio tag URLs are ignored without mapping, and incomplete Smart Profiles do not fall
  back to historical tags.
- Prior managed goal `print-request-direct-export-gangsheet-and-copy` is closed with approved
  signoff after Owner DEV QA **PASS** on 2026-09-08.
- The original request Export/Generate/Copy implementation, the owner-authorized global Gang
  Sheet Settings/four-tier amendment, and the requested Settings UX refinement are complete and
  validated. The authorized DEV Rules/Function deployment is preserved as completed evidence.
- The prior Print Request commit `ab319468` and the legacy tag retirement commit `1c43f6e1` are
  pushed to `origin/development`; Studio publish and production remain separately gated; no new
  goal is selected.
- Direct Export/Generate/Copy buttons are hidden on Working and Editing requests; existing Add to
  Show/Internal Gangsheet actions remain available there.
- Studio publish and production remain separately gated.

DEV cutover evidence (2026-09-09): six explicitly allowlisted Functions were deployed to
`fresh-prints-dev`; existing local Portal/Studio Smart Filter flags were already enabled; the
existing owner/admin reconcile dry-run/apply processed 350 ready records in
`portal_catalog_ready_dev`; settings removed `tagIds` and `tagFacetKeys` while preserving all eight
Smart Profile facets and non-tag searchable fields. Live parity checks covered facets/AND,
category, q/text fields, pagination, zero counts, missing profiles, exact ID, former tag-name/
alias zeros, and Halftone via `halftoneStaffDecision.value`. No production, Portal/Studio publish,
Rules/index deploy, migration/backfill, or tag deletion occurred. Commit/push completed as
`1c43f6e1` after the Owner DEV QA signoff.
Owner DEV QA then passed; the deterministic read-only corrective audit re-derived 20 former
tag-name/alias samples, all with no preserved Ready-design baseline and no current Algolia hits,
with zero material regressions.

Artifact: `docs/workflow/reviews/2026-09-09-legacy-tag-retirement-smart-profile-dev-cutover.md`.
Signoff: `docs/workflow/reviews/2026-09-09-legacy-tag-operational-retirement-and-smart-profile-search-parity-signoff.md`.

## Closed goal evidence

Owner scope now includes one global Studio Gang Sheet Settings source for all six current physical
layout settings plus four width-based price/weight tiers; Show Queue/Internal local editors must
be removed or read-only; direct request Standard Gang Sheet output must visibly use the same
price/weight resolver; and all material settings must invalidate cache fingerprints.

The repository investigation and in-place Plan/Formal Review amendments are complete, as is the
owner-authorized local implementation. Focused amended tests, compositor regression, Functions
build, Vite build, targeted lint, and diff check passed. Studio typecheck/full build retain the
documented unrelated baseline failures. Java 25 is available and the owner freed the unrelated
port 8080 conflict. The exact `npm run test:rules` command started the Firestore and Storage
emulators and passed 169/169 tests across 22 suites (exit code 0); no corrective Rules/code
change was needed. The authorized DEV deployment then completed: Firestore Rules released
ruleset `0d32ca64-8cfc-4bd8-bd56-b34f426d47bd`, and `copyStudioPrintRequest` is ACTIVE in
`us-central1` on Node.js 20, revision `copystudioprintrequest-00001-yec`, 100% traffic on the
latest revision, source hash `6484fccde1612904191273e4e92138f1c9c780e0`. No other Function,
Storage Rules, indexes, migration, Portal, Studio, or production deployment occurred. A
  post-deployment local refinement now renders independent Price and Weight lines and calculates
  grouped totals from logical request source items, saved dimensions, and quantities rather than
  physical placements. The latest local presentation follow-up sorts price/weight terms in
  ascending configured price order, uses a smaller gang-sheet summary font, formats modal lengths
  to exactly two decimals, and adds labeled clickable Print Request totals with a calculation
  breakdown plus per-card cost formulas. Focused validation passed 46/46, targeted lint and Vite
  build passed, full Studio typecheck retains unrelated baseline errors, and `git diff --check`
  passed. A later local polish replaced the old request size-count pill with the richer Total price
  and Total weight controls, restored stacked Qty/dimensions/Cost card metadata, made gang-sheet
  warnings dismissible, and expanded the bounded sheet-list scroll region. The latest local card
  alignment refinement mirrors Qty/Cost and dimensions/calculation into two metadata columns. The
  latest size-summary refinement uses compact `Pocket`, `Reg Full`, `Reg Oversize`, and
  `Ext Oversize` labels on Show Queue and Internal Gang Sheet allocation cards only; Print Request
  list cards intentionally retain only design and quantity totals. The focused contract tests
  passed 19/19, targeted lint and direct Vite build passed, and `git diff --check` passed; the full
  Studio build remains blocked by documented unrelated baseline TypeScript errors. The latest
  totals-modal polish renders each bold tier label with its settings range inline in parentheses,
  with the count on the next line; modal contract tests passed 6/6.
  Owner DEV QA then passed, the goal was signed off, and commit/push completed as `ab319468`.
  Studio publish and production remain separate checkpoints.

`[READY FOR OWNER TO SELECT NEXT MANAGED GOAL]`

## Closed goal handoff

- Portal and Studio no longer expose active legacy tag filters, tag management, tag display, tag
  facet reads, or tag search corpus terms. Smart Profile facets/category/search, exact IDs, and
  dedicated Halftone filtering remain.
- Studio AI Review no longer seeds or writes regular tags; existing censored-term editing remains.
- Shared/Functions Algolia records and change classification no longer carry tag-specific fields or
  index work. Historical `design.tags`, Rules/indexes, taxonomy schema-v1 compatibility, and
  deployed tag-trigger/archive exports remain deferred compatibility.
- Focused verification: Portal 82/82, Studio 39/39, Functions/shared 45/45; Portal tsc and Functions
  build pass; Studio tsc has only documented unrelated baseline failures; Portal Next build is
  Windows `.next/trace`/timeout-blocked; `git diff --check` passes.
- Owner DEV QA is **PASS** and signoff is **approved**. Commit/push is complete as `1c43f6e1`.
  Production/backfill, physical tag cleanup, retained compatibility Function deletion, and
  Rules/index cleanup remain separately gated.

Parent program:
`smart-catalog-intelligence-completion-and-legacy-tag-retirement`

The parent may still contain parked or deferred work, but it is not itself an
active child goal.

## Parked or deferred work

| Item | Status |
|------|--------|
| WS5 Autonomous DEV canary | **CLOSED** — PASS under Model 2; Autonomous remains OFF |
| WS6 | **NOT STARTED** — candidate only; requires a new Plan/Review and owner authorization |
| Tag / reranker retirement | Operationally retired in DEV; physical cleanup and compatibility deletion deferred |
| Autonomous | **OFF** |
| Automatic Pass 2 | **PARKED** |
| Production promotion | **SEPARATELY GATED / NOT AUTHORIZED** |

No active child goal is selected. Production promotion, backfill, Maintenance Mode, physical tag
cleanup, retained compatibility deletion, and other Algolia/Firebase external-state changes
remain separately gated.
