# Studio Halftone Background Toggle Hotfix Plan

## Status

Implementation authorized for the current Studio hotfix request. Production merge and deployment are out of scope.

## Goal

When staff turns Halftone on in a Studio human-review surface, seed the artwork background to the light-black preset. When staff turns Halftone off, restore the background control to its default state. After either automatic change, Artwork Background remains an independent control: selecting another background must not change the Halftone decision.

## In scope

- Import session settings and per-item import preview controls, including single and batch import state.
- Customer Upload Intake preview controls, including persistence and retry handling.
- AI Processing / AI Review preview and form Halftone controls, including immediate persistence.
- Design Edit Modal form state and save payload.
- Focused contract/unit tests and the required Studio typecheck/build-preflight checks.
- This plan and its review record.

## Implementation boundaries

- Reuse the existing artwork-background fields and existing save/callable paths.
- Keep the existing resolver precedence so a later explicit background choice wins while Halftone remains on.
- For import state, Halftone on maps the paired background override to `dark`; Halftone off maps it to `auto`.
- For persisted intake and AI review state, Halftone on writes light black; Halftone off clears the staff background override to the default path.
- For the edit modal, Halftone on/off updates only the in-form background preset; the existing Save action persists both fields together.
- No Functions, Rules, indexes, Portal, schema, migration, IAM, secrets, or production data changes.
- Do not merge to production, publish a Studio release, or deploy.

## Acceptance criteria

1. Each listed Studio surface visibly switches to light black when Halftone is enabled.
2. Disabling Halftone restores the default background state for that surface.
3. While Halftone is enabled, changing Artwork Background remains possible and does not change Halftone.
4. Persisted surfaces retain the synchronized toggle/background result across refresh or remap, with retry behavior covering both fields.
5. Existing explicit background precedence and independent background tests remain valid.
6. Focused tests, Studio typecheck, build/package preflight as applicable, and `git diff --check` pass; failures are recorded honestly.

## Risks and checks

- Intake metadata uses sequential existing writes; optimistic state, pending state, failure latches, and retry behavior must cover both the Halftone decision and its paired background update.
- AI review must avoid racing separate background and Halftone writes; the existing Halftone save path should persist the paired background in the same design update while the workspace updates preview state immediately.
- Existing manual background selections must not be cleared except by the explicit Halftone-off transition.

## Stop conditions

Stop before broadening scope if the fix requires a new backend callable/permission boundary, a schema/data migration, changes to non-Studio runtime surfaces, or an unresolved product choice about background persistence semantics.

## Hotfix addition — stable Print Request rail selection

The same Studio hotfix also includes a client-only navigation defect on the Print
Requests page. Selecting a second or later request can race detail hydration: the
detail hook exposes the newly selected ID while still retaining the prior request
object, allowing route canonicalization to treat the new selection as stale and
rewrite the URL back to another row. The fix will make a selected request eligible
for route repair only when the retained detail object belongs to that exact ID, and
will clear retained request/item detail state when a new ID begins loading.

### Addition scope

- `PrintRequestsPage` selection/readiness and `usePrintRequestDetails` transition state only.
- Preserve the existing URL as the source of selection, list-tab filtering, triage behavior,
  direct-ID hydration, and rail scroll preservation.
- Cover Working, Editing, Queued, Printing, and Printed navigation through focused route/page
  contracts.
- No Functions, Rules, indexes, Portal, schema, migration, IAM, secrets, or production data changes.
- Do not merge to production, publish a Studio release, or deploy.

### Addition acceptance criteria

1. Clicking a second or subsequent visible request changes `requestId` to that request and does not
   redirect back to the prior selection or flicker the route.
2. The selected detail pane cannot render or canonicalize from a prior request while the new request
   is hydrating.
3. The rail remains mounted and interactive while the selected request changes across every listed
   Print Requests tab.
4. Direct-ID/deep-link hydration and existing queue/tab canonicalization behavior remain intact.
5. Focused navigation contracts, Studio typecheck/build checks, and `git diff --check` pass; any
   unrelated pre-existing suite failures remain documented honestly.
