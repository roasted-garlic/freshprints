# Next Planned Goal

**Updated:** 2026-09-08

## Current state

- No managed goal is active. `print-request-direct-export-gangsheet-and-copy` is closed with
  approved signoff after Owner DEV QA **PASS** on 2026-09-08.
- The original request Export/Generate/Copy implementation, the owner-authorized global Gang
  Sheet Settings/four-tier amendment, and the requested Settings UX refinement are complete and
  validated. The authorized DEV Rules/Function deployment is preserved as completed evidence.
- Commit/push, Studio publish, and production remain separately gated; no new goal is selected.
- Direct Export/Generate/Copy buttons are hidden on Working and Editing requests; existing Add to
  Show/Internal Gangsheet actions remain available there.
- Studio publish and production remain separately gated.

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
  Owner DEV QA then passed and the goal was signed off. The next required step is commit/push
  authorization for the closed goal; Studio publish and production remain separate checkpoints.

`[NEEDS OWNER AUTHORIZATION: COMMIT/PUSH CLOSED PRINT REQUEST GOAL]`

Parent program:
`smart-catalog-intelligence-completion-and-legacy-tag-retirement`

The parent may still contain parked or deferred work, but it is not itself an
active child goal.

## Parked or deferred work

| Item | Status |
|------|--------|
| WS5 Autonomous DEV canary | **CLOSED** — PASS under Model 2; Autonomous remains OFF |
| WS6 | **NOT STARTED** — candidate only; requires a new Plan/Review and owner authorization |
| Tag / reranker retirement | Parked/deferred under the parent program |
| Autonomous | **OFF** |
| Automatic Pass 2 | **PARKED** |
| Production promotion | **SEPARATELY GATED / NOT AUTHORIZED** |

No later goal is selected while the closed Print Request goal awaits commit/push authorization.
