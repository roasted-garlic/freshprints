# Fresh Prints — Current State Snapshot

## CURRENT AUTHORITATIVE PHASE — SHARED PRICING + CROSS-ORIGIN CUSTOMER REQUEST CORRECTIVE — PRODUCTION INFRASTRUCTURE DEPLOYED; STUDIO RELEASE BLOCKED

**Last updated:** 2026-09-17

The managed goal `print-request-length-surcharge-and-customer-navigation` is implemented locally
under the amended Plan and approved Formal Review. Shared pricing now combines the existing four
width base tiers with four fixed height bands and configurable surcharges; new Show Allocations
capture immutable pricing snapshots, Portal reads a normalized customer-safe pricing projection,
and legacy rows use an explicit no-backfill fallback. The urgent corrective makes active ordinary
Customer Print Requests origin-neutral: Portal reuses unparked `studio_customer` Working/draft
requests, parking is origin-neutral, and Studio creation is guarded by a transactional callable.
Studio customer Print Request detail links to `/users?customerId=...`.

Focused application checks are green: 145/145 affected contracts, 40/40 pricing/compositor/export
tests, 8/8 snapshot-first total tests, Functions build, Studio/Portal typechecks, packaged Studio
1.0.15 build, Portal production build (22/22 static pages), release lint, and diff check. The
focused Rules matrix remains 22/23 because of the reproducible existing 1,000-expression-limit
failure; repository-wide lint has unrelated baseline diagnostics. See:

- `docs/workflow/reviews/2026-09-17-print-request-length-surcharge-and-customer-navigation-test-report.md`
- `docs/workflow/reviews/2026-09-17-print-request-length-surcharge-and-customer-navigation-implementation-review.md`

Owner-authorized DEV deployment is complete for exactly 25 Functions at source hash
`9eff4e7503246487859ad354ce53d2f78360b9b5`; all are ACTIVE in `fresh-prints-dev`. The reviewed
Firestore Rules were released successfully. The owner closed DEV QA as `approved_with_notes` and
authorized the protected production rollout. Storage Rules, indexes, migration, backfill, merge,
cleanup, and customer/request fixture mutation remain out of scope.

The live `getPortalShowPricing` callable returned only the pricing DTO, verified all eight DEV
tiers, and confirmed `5 × 21 = $4` per unit. The protected Studio creation, Studio allocation,
and Portal queue callables rejected unauthenticated requests with HTTP 401 without mutation.
Protected PR #101 merged as production `e6e7eaf7b47e714414572a986611afa124bb8a8b`. Production
Firestore Rules, the exact 25 reviewed Functions, and Portal App Hosting build
`build-2026-09-17-002` are deployed and smoke-checked; hosted `/` and `/requests` are HTTP 200
without DEV markers. Studio stable `v1.0.15` is not published: macOS packaging stalled on
multiple fresh GitHub runners and Release asset uploads returned HTTP 500/502. Existing stable
`v1.0.14` remains current. Interactive Settings/Portal/Studio/customer-flow QA was not executed
because this session had no connected browser and the Windows app-control bridge was unavailable;
the owner accepted this limitation for closeout. **Next gate: retry the exact Studio release after
the external GitHub blocker clears, then publish/verify `v1.0.15` and close the goal.**

**Historical prior snapshot:** 2026-09-16

## CURRENT AUTHORITATIVE PHASE — PORTAL SHOW-RAIL HOTFIX — PUBLISHED AND MACHINE-VERIFIED

Owner DEV QA passed the Portal show-rail description parity hotfix. The homepage `Next Show` and
`Added to Shows This Week` rails hydrate compact selected cards through the existing ready-design-
by-ID catalog path before opening the shared Design Details modal. Persisted descriptions are
restored; public show-card DTO, ordering/membership, modal actions, explicit-content handling, and
ordinary catalog behavior remain unchanged. Stale A→B responses are ignored and unavailable
designs fail closed.

Focused hydration/show-rail contracts are **17/17 PASS**; adjacent Portal contracts **24/24 PASS**;
Portal typecheck, changed-source lint, production build (22/22 static pages), and diff check pass.
The only intended runtime delta is Portal App Hosting. Functions, Rules, indexes, Storage Rules,
IAM, Firebase configuration, migrations, backfills, data, and Studio are unchanged and must not be
deployed for this hotfix.

Signoff: `docs/workflow/reviews/2026-09-16-portal-show-rails-design-description-parity-signoff.md`.
Owner DEV QA: **PASS**. Candidate `7be6fd49b8ce2ebaa068963b492db8e51b16c7c6` was promoted through
protected PR #100 as production merge `15676fcd010f572af0d4a2bc969b108d2777be0a`. App Hosting
rollout `build-2026-09-17-001` succeeded; revision `fresh-prints-portal-build-2026-09-17-001`
serves 100% traffic. Hosted smoke is HTTP 200 without DEV markers; 179 Functions are ACTIVE, 94
indexes are READY, maintenance is OFF, and no backend/data/IAM/Studio deployment occurred.
FreshForge is **IDLE**.

## PRIOR AUTHORITATIVE PHASE — STUDIO HOTFIX — PUBLISHED AND MACHINE-VERIFIED

The owner-authorized Studio-only hotfix `studio-halftone-background-toggle-hotfix-2026-09-16`
has been promoted through the protected development → production path and released
as stable Studio `v1.0.14`.

The hotfix plan and bounded review are recorded at:

- `docs/workflow/plans/2026-09-16-studio-halftone-background-toggle-hotfix-plan.md`
- `docs/workflow/reviews/2026-09-16-studio-halftone-background-toggle-hotfix-review.md`

The Studio client controls and save paths now synchronize the toggle:
Halftone ON seeds light black; Halftone OFF restores the default; subsequent
Artwork Background changes remain independent. Focused hotfix/shared contracts
pass 50/50; canonical release lint is `current=15`, `baseline=25`, `new=0`;
Studio typecheck and package build pass. Broader unrelated contract drift is
documented in the test report.

The owner added and approved a bounded Print Request rail-selection addition.
Clicking a second or later request could expose the new ID while retaining the
previous detail object, allowing route canonicalization to bounce the URL and
flicker. The fix enforces exact-ID detail readiness and clears stale detail state
at the start of a new selection load, with focused regression coverage. The
Print Requests rail remains mounted across the lifecycle tabs while the new detail
hydrates.

The combined hotfix was signed off with notes. Navigation
contracts pass 19/19; canonical release lint remains `current=15`, `baseline=25`,
`new=0`; Studio typecheck and package build pass. The broader Print Requests
directory sweep is 194/198: **PASS WITH 4 ACCEPTED PRE-EXISTING FAILURES**.

Release commit: `fd396ffed415d4cab680a743015008836a51f730`.
Production merge SHA: `f20d5d65aa6e2e9b30032da61846355271904650` (PR #99).
Studio workflow run: `35161665784`; stable release `v1.0.14` is published/latest
with the eight canonical Windows/macOS installer and updater assets. The prior
stable `v1.0.13` remains available for rollback.

Machine verification passed: production Portal returned HTTP 200; App Hosting
revision `fresh-prints-portal-build-2026-09-16-001` has 100% traffic; all 179
production Functions are ACTIVE; and `settings/portalMaintenance.enabled` is
`false`. No Functions, Rules, indexes, Storage Rules, Portal App Hosting, IAM,
Firebase configuration, or data migration was redeployed for this Studio-only
hotfix. No further release action is pending.

## PRIOR AUTHORITATIVE PHASE — PRODUCTION ROLLOUT COMPLETE — OWNER PRODUCTION SMOKE PENDING

Owner release instruction lifted the previous production hold for managed goal
`coordinated-production-promotion-2026-09-16` and authorized the reviewed
rollout. The Studio release lint blocker was resolved under the bounded
corrective authorization and the coordinated production rollout completed. The
remaining gate is Owner Production Smoke.

The frozen candidate merged to production as
`3802ff8564efb0d24e6c783a23c4b4b65d7cef8f` and includes the required Studio
fix `37655dcd52760992cc2892e096bac30cbaa797ba`. Rules and the reviewed
58-function allowlist were deployed, the exact reviewed IAM self-binding was
applied, and Portal App Hosting rollout `build-2026-09-16-001` is healthy with
100% traffic on revision `fresh-prints-portal-build-2026-09-16-001`.

Studio stable `v1.0.13` is published/latest. Workflow run `35138234015` used the exact
production SHA but failed both Windows and Mac jobs at the release-lint gate:
`current=21`, `baseline=25`, `new=6`, `removed=10`; no draft/release was
created. The six diagnostics are now resolved by the bounded corrective, with
canonical local lint `current=15`, `baseline=25`, `new=0`, `removed=10` and no
baseline edit. Release/lint contracts pass `40/40`, affected regressions pass
`75/75`, both app typechecks pass, and local Studio Windows packaging passes.

Formal Review is `approved_with_changes`; deterministic corrections are applied:
the live `completeStaffGangSheetAndOpenNext` callable is an UPDATE in the
Function closure, and Studio is version `1.0.13`.

The owner explicitly accepted the exact three Rules failures reproduced against
`firestore.transition.rules` as a known baseline emulator limitation: 179/182
tests pass, with no candidate-only regression identified. Final production
readback confirmed the same three failures, the 1,000-expression signature,
passing candidate-specific Rules contracts, and no access broadening.

Current next step: Owner Production Smoke, beginning with Autonomous AI Review.
Do not perform data repair/backfill/Apply, change AI settings beyond the bounded
smoke instructions, change secrets, broaden IAM, or redeploy Rules, Functions,
Portal, indexes, or Storage for this corrective.

Final automated readback: production merge
`ccad1920bf382947dbc5d48d997f16fa037a0277`; corrective commit
`2bf6c59c599ccd702eba4523a035e7d7954aab62`; Studio workflow
`35141319164` succeeded; stable `v1.0.13` is latest with eight verified assets.
All 179 production Functions are ACTIVE, all 94 indexes are READY, the exact
IAM self-binding is present, and the existing Portal revision
`fresh-prints-portal-build-2026-09-16-001` remains at 100% traffic. AI remains
shadow / Autonomous OFF / `gemini-2.5-flash-lite` / Pass 2 absent-OFF;
maintenance is OFF and the production DEV allowlist document is absent.

The prior `selected-print-request-live-sync-studio-portal` DEV QA record remains
included in the cumulative promotion manifest and its signoff evidence.

Hotfix artifacts:

- `docs/workflow/plans/2026-09-16-studio-halftone-background-toggle-hotfix-plan.md`
- `docs/workflow/reviews/2026-09-16-studio-halftone-background-toggle-hotfix-review.md`
- `docs/workflow/reviews/2026-09-16-studio-halftone-background-toggle-hotfix-test-report.md`
- `docs/workflow/reviews/2026-09-16-studio-halftone-background-toggle-hotfix-signoff.md`
