## FreshForge State

| Field | Value |
|---|---|
| Status | **IDLE** |
| DONE | yes — managed goal closed with approved signoff |
| Signoff Status | **approved** — Owner DEV QA PASS recorded; commit/push completed; Studio publish remains separately gated |
| Current Mode | idle |
| Parent program | Fresh Prints Studio / Print Request workflow |
| Current Goal | none — `print-request-direct-export-gangsheet-and-copy` closed |
| Current Phase | idle — last goal signed off and pushed; awaiting next goal selection |
| Plan Status | amended and approved |
| Review Status | original and amended Formal Review approved; amended implementation complete locally |
| Implementation Status | complete — direct Export/Generate/Copy, global Gang Sheet Settings/four-tier pricing, and requested UI refinements signed off |
| Test Status | Firestore Rules 169/169 across 22 suites; Show Queue, request Export, Copy, focused amended tests, Functions build, Vite build, targeted lint, and diff check passed; Studio typecheck/full build have documented unrelated baseline failures |
| Human Checkpoint Required | yes before Studio publish or production |
| Human Checkpoint Reason | Owner DEV QA PASS and development commit/push are complete; Studio publish and production remain separate owner checkpoints |
| Environment | `fresh-prints-dev` |
| Production | untouched |
| Commit/push | `ab319468` pushed to `origin/development`; no force push |
| Last updated | 2026-09-08 |
| Last Completed Step | Owner DEV QA PASS recorded; goal committed/pushed; post-push state and handoff reconciled |
| Latest closed goal | `print-request-direct-export-gangsheet-and-copy` |

**Decision Log:**
- 2026-09-08 — Owner **authorized implementation** of `print-request-direct-export-gangsheet-and-copy`. Plan + formal review remain **approved**; implementation, test, and Implementation Review may proceed, with DEV deployment, Studio publish, production, commit, and push separately gated.
- 2026-09-08 — Completed the owner-authorized global Gang Sheet Settings amendment: canonical `settings/showQueue` resolver with read-only legacy Internal fallback, six global layout fields, fixed four-tier saved-width pricing/weight policy, Settings UI, local editor retirement, request Standard price/weight rendering, cache fingerprint updates, and narrow `settings/showQueue` Rules allowlist extension. Focused amended validation passed; Rules emulator validation is blocked locally by missing Java. Stop before DEV deploy, Owner QA, publish, commit, or push.
- 2026-09-08 — Completed the owner-requested Settings UX refinement locally: Show Queue settings is now a single-column, no-tab modal with its Save action in the footer; Settings uses a vertical section sidebar and wider content; Gang Sheet Settings uses side-by-side Layout and Pricing & Weight columns with responsive field grids. Automated validation remains local; the DEV deploy / Owner QA checkpoint is unchanged.
- 2026-09-08 — Refined the Show Queue settings modal order per owner follow-up: Whatnot URL is full width first, default allocation and portal cutoff share a row, and the Gang Sheet Settings link is full width with the standard `button-md` height. The deployment / Owner QA checkpoint remains unchanged.
- 2026-09-08 — Owner authorized a test-only Firestore Rules checkpoint. Read-only Java preflight found no JDK (`java -version` unavailable, no `where.exe java`, empty `JAVA_HOME`, and no `bin\\java.exe` under normal Windows locations). Per scope, `npm run test:rules` was not started and Java was not installed; Rules validation remains blocked with `[BLOCKED: COMPATIBLE JDK REQUIRED FOR FIRESTORE RULES TESTS]`.
- 2026-09-08 — Owner-installed Microsoft OpenJDK 25.0.4.1 was verified in a shell-local environment. `npm run test:rules` executed with Firebase CLI 15.26.0 and parsed Java 25, but Firestore emulator startup failed before tests because port 8080 is occupied by unrelated `Remote_Keyboard.exe` (PID 29420). No process was terminated and no Rules/code change was made; rerun after the port is freed.
- 2026-09-08 — Owner freed port 8080. With Microsoft OpenJDK 25.0.4.1 visible, the exact `npm run test:rules` suite started Firestore and Storage emulators and passed 169/169 tests across 22 suites (0 failed, 0 cancelled, 0 skipped). No corrective Rules/code change was needed. The Rules validation gate is clear; stop before DEV deployment / Owner QA.
- 2026-09-08 — Owner authorized the reviewed DEV deployment to `fresh-prints-dev`. `firebase deploy --only firestore:rules --project fresh-prints-dev` passed and released ruleset `0d32ca64-8cfc-4bd8-bd56-b34f426d47bd`; compiler warnings were pre-existing/non-blocking. `firebase deploy --only functions:copyStudioPrintRequest --project fresh-prints-dev` passed with exactly one Function deployed. `copyStudioPrintRequest` is ACTIVE in `us-central1`, Node.js 20, revision `copystudioprintrequest-00001-yec`, 100% traffic on latest revision, source hash `6484fccde1612904191273e4e92138f1c9c780e0`. No Storage Rules, indexes, migrations, Portal, Studio publish, commit, push, or production action occurred. Stop for Owner DEV QA.
- 2026-09-08 — Owner requested a quick pricing/weight follow-up after the DEV Firebase deployment. Local gang-sheet labels now render independent Price and Weight lines; grouped summaries use logical request source items and saved quantities/dimensions rather than physical gang-sheet placements. Focused validation passed 18/18, targeted lint passed, Vite build passed, and `git diff --check` passed. No Rules, Function, Studio publish, commit, push, or production action occurred for this follow-up. Await explicit Studio publish / Owner QA authorization.
- 2026-09-08 — Owner requested the next pricing presentation refinement. Gang-sheet price/weight terms now sort by configured dollar amount ascending, summary text uses a smaller font, and gang-sheet modal lengths display exactly two decimals. Print Request detail now has labeled clickable Total price/Total weight pills with a calculation breakdown modal, and each design card shows a right-aligned per-size cost formula beside quantity. Focused validation passed 46/46, targeted lint passed, Vite build passed, full Studio typecheck still reports only documented unrelated baseline errors, and `git diff --check` passed. No Rules, Function, Studio publish, commit, push, or production action occurred. Await explicit Studio publish / Owner QA authorization.
- 2026-09-08 — Owner requested request-detail and gang-sheet modal polish. The old Pocket/Full Size count pill was replaced by the richer Total price/Total weight controls; read-only cards restore stacked Qty and dimensions with a matching Cost line; warnings can be dismissed; and the bounded gang-sheet modal list now expands to show more sheets before scrolling. Focused contract validation passed 9/9, targeted lint passed, Vite build passed, and `git diff --check` passed. No Rules, Function, Studio publish, commit, push, or production action occurred. Await explicit Studio publish / Owner QA authorization.
- 2026-09-08 — Owner requested the design-card cost alignment refinement. Read-only cards now mirror the metadata into two rows: Qty / Cost on the first row and dimensions / cost calculation on the second, with the calculation right-aligned. Focused contract validation passed 10/10, targeted lint passed, direct Vite build passed, and `git diff --check` passed. The full Studio `npm run build` remains blocked before Vite by documented unrelated baseline TypeScript errors. No Rules, Function, Studio publish, commit, push, or production action occurred. Await explicit Studio publish / Owner QA authorization.
- 2026-09-08 — Owner requested current four-tier size summaries on Print Request list, Show Queue, and Internal Gang Sheet cards. The compact labels now use `Pocket`, `Reg Full`, `Reg Oversize`, and `Ext Oversize`, driven by the canonical 4/11/14-inch width policy with zero-count tiers hidden. Focused validation passed 19/19, targeted lint passed, direct Vite build passed, and `git diff --check` passed. No Rules, Function, Studio publish, commit, push, or production action occurred. Await explicit Studio publish / Owner QA authorization.
- 2026-09-08 — Owner clarified that Print Request list cards should not show the four-tier size pill because the full request detail already exposes complete statistics. Removed that redundant list-card pill while retaining `Pocket`, `Reg Full`, `Reg Oversize`, and `Ext Oversize` summaries on Show Queue and Internal Gang Sheet allocation cards. Focused validation passed 19/19, targeted lint passed, direct Vite build passed, and `git diff --check` passed. No Rules, Function, Studio publish, commit, push, or production action occurred. Await explicit Studio publish / Owner QA authorization.
- 2026-09-08 — Owner requested the request totals modal show each size range inline with its bold tier label. Added `Pocket (4" and under)`, `Standard Full Size (over 4" through 11")`, `Standard Oversized (over 11" through 14")`, and `Extra Oversized (over 14")` presentation while keeping the count on the following line. Focused modal contract validation passed 6/6, targeted lint passed, direct Vite build passed, and `git diff --check` passed. No Rules, Function, Studio publish, commit, push, or production action occurred. Await explicit Studio publish / Owner QA authorization.
- 2026-09-08 — Owner DEV QA **PASS** closed `print-request-direct-export-gangsheet-and-copy`. Final DEV disposition is **approved**. Signoff records Rules validation 169/169 across 22 suites, Show Queue/request Export/Copy regressions, focused amended tests, Functions/Vite builds, targeted lint, and diff check. Authorized DEV Rules release and `copyStudioPrintRequest` revision evidence is preserved; Studio publish, commit/push, and production remain untouched.
- 2026-09-08 — Owner authorized commit/push of the closed goal. The exact 71-file signed-off inventory was committed as `ab319468` (`feat: add print request production actions and global gang sheet settings`) and pushed normally to `origin/development`. No force push, Studio publish, deployment, or production action occurred.
- 2026-09-08 — Completed implementation and automated validation for `print-request-direct-export-gangsheet-and-copy`. Implementation Review approved locally; Functions build, Vite build, focused tests, targeted lint, and diff check passed as recorded, while unrelated Studio/full-lint baseline failures remain documented. Proposed DEV Function inventory is `copyStudioPrintRequest` only. Stop before DEV deployment / Owner QA.
- 2026-09-08 — Owner clarified that direct Export/Generate/Copy buttons must be hidden on Working and Editing requests; only existing Add to Show / Add to Internal Gangsheet actions remain there. Updated the request action gate, focused contract coverage, permanent workflow/architecture docs, and Implementation Review. Validation remains local; deployment and Owner QA stay gated.
- 2026-09-08 — Owner amended the active goal before further implementation: add request gang-sheet pricing, fixed four-tier width pricing, one global Gang Sheet Settings source for pricing/weight/layout, Show Queue/Internal reconciliation, local editor retirement, request price/weight display, and cache/settings Rules review. Repository investigation mechanically confirmed separate persisted `settings/showQueue` and `settings/internalGangSheet` documents, legacy two-tier width-or-height summaries, and missing Standard request pricing propagation. Plan and Formal Review were amended in place; no amended implementation, deployment, publish, commit, push, or production action occurred.
- 2026-09-08 — Amended Formal Review approved the normalized global-settings architecture for planning. Recommended canonical source is the existing `settings/showQueue` Gang Sheet fields with non-destructive legacy Internal fallback, no migration unless mechanically required; new four-tier settings require narrow existing Rules allowlist updates. Legacy large-tier weight 0.75 oz is the resolved equivalent for non-Pocket tiers, including Extra Oversized. Await explicit owner authorization before amended implementation.
- 2026-09-08 — Owner **unparked** `print-request-direct-export-gangsheet-and-copy`. Restored as active managed goal. Plan + formal review remain **approved**; implementation still requires explicit owner authorization (original scope was investigation → plan → review only).
- 2026-09-08 — Closed `hide-add-to-show-for-archived-converted-requests` (owner PASS; pushed `189dd3d6` / `bf2732f6`).
- 2026-09-08 — Original authorization for export/gangsheet/copy goal: investigation → plan → formal review only.

**Allowed Actions:** Remain idle and wait for owner selection of the next managed goal. Any new goal requires a new Plan/Review and owner authorization.
**Forbidden Actions:** Publish Studio; deploy; touch production; run migrations/indexes; mutate Autonomous; start WS6; create a new goal without Plan/Review and owner authorization.

## Next Required Step

The managed goal is closed, committed, and pushed. The required next marker is `[READY FOR OWNER TO SELECT NEXT MANAGED GOAL]`.

## Manual Test Checkpoint

Owner DEV QA **PASS** recorded on 2026-09-08, and the closed goal was committed/pushed as `ab319468`. Studio publish remains a separate checkpoint; no production action is implied by this signoff.

## Artifacts (closed goal)

| Kind | Path |
|---|---|
| Plan | `docs/workflow/plans/2026-09-08-print-request-direct-export-gangsheet-and-copy-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-08-print-request-direct-export-gangsheet-and-copy-review.md` |
| Implementation Review | `docs/workflow/reviews/2026-09-08-print-request-direct-export-gangsheet-and-copy-implementation-review.md` (original evidence plus authoritative amended implementation review) |
| Signoff | `docs/workflow/reviews/2026-09-08-print-request-direct-export-gangsheet-and-copy-signoff.md` |

## Artifacts (last closed)

| Kind | Path |
|---|---|
| Plan | `docs/workflow/plans/2026-09-08-hide-add-to-show-for-archived-converted-requests-plan.md` |
| Signoff | `docs/workflow/reviews/2026-09-08-hide-add-to-show-for-archived-converted-requests-signoff.md` |

## Parked prior goal

| Item | Notes |
|---|---|
| _(none)_ | No active managed goal; print request goal is signed off and closed |
| Production | Untouched |
