# Plan: Pre-Production Static-Analysis Cleanup

| Field | Value |
|-------|-------|
| Date | 2026-07-29 |
| Author | FreshForge Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | `docs/workflow/reviews/2026-07-29-preproduction-static-analysis-cleanup-review.md` |

---

## Goal

Resolve the current, reproduced static-analysis baseline without changing product behavior:

- make `npm run build:studio` exit `0`, eliminating all 29 current TypeScript diagnostics across
  17 Studio/shared files; and
- make root `npm run lint` exit `0`, eliminating all 41 current findings (31 errors and 10 warnings)
  across Portal, Studio, Functions, and shared code.

The correction must preserve TypeScript strictness, the root `--max-warnings 0` lint gate, existing
security and service boundaries, and all affected user workflows. It must not hide findings with
blanket suppressions or convert this bounded cleanup into a product refactor.

## Background

The two baselines were rerun during Plan:

| Command | Exit | Reproduced result |
|---------|------|-------------------|
| `npm run build:studio` | `2` | 29 TypeScript diagnostics in 17 files |
| `npm run lint` | `1` | 41 findings: 31 errors, 10 warnings |

These are the known pre-production baselines deferred from the signed-off
`portal-print-request-prelaunch-stability` goal. The worktree also contains extensive existing
changes from earlier managed goals. Implementation must attribute every edited line to this Plan
and preserve all unrelated tracked and untracked work.

Thirteen lint errors are stale
`eslint-disable-next-line @next/next/no-img-element` directives. Root `.eslintrc.cjs` does not
configure `@next/eslint-plugin-next` or that rule, so the directives themselves are invalid. The
bounded correction is to remove only those stale directives. This Plan does not authorize adding
the plugin, enabling/disabling the rule globally, weakening image policy, or replacing working
image rendering solely to satisfy a rule that is not part of the repository lint contract.

## Scope

### In Scope

- Correct all 29 reproduced Studio/shared TypeScript diagnostics by resolving their actual type or
  contract mismatch.
- Correct all 31 reproduced lint errors and 10 warnings.
- Update stale test fixtures to current production types and enum values when the production
  contract is already authoritative.
- Add explicit narrowing/defaults for optional and discriminated data instead of non-null
  assertions or unsafe casts.
- Remove the 13 invalid `@next/next/no-img-element` disable comments, and only those comments.
- Remove genuinely dead bindings, use `const` where values are not reassigned, and replace
  lint-invalid control-character regular expressions with behavior-equivalent testable logic.
- Preserve the existing lazy native `sharp` loading/deploy-discovery behavior while making its
  implementation conform to the configured lint rules.
- Analyze every hook dependency warning for stale-closure and cleanup-capture behavior before
  editing its dependency list.
- Add or update focused tests for behavior-sensitive changes, especially print-request source
  discrimination, request summaries, upload session persistence, callback freshness, timer
  cleanup, Studio intake callbacks, gang-sheet state, filename sanitization, validation, and lazy
  image processing.
- Re-run both primary gates plus Portal, Functions, focused-test, and diff checks.

### Out of Scope

- New features, copy, visual redesign, workflow changes, schema changes, migrations, backfills, or
  behavior changes.
- Changing Firebase Auth, Firestore/Storage data, Rules, indexes, Functions deployment configuration,
  secrets, environment variables, dependencies, or package versions.
- Installing/configuring `@next/eslint-plugin-next`, adopting a new image policy, or converting
  existing `<img>` elements to `next/image` in this cleanup.
- Disabling TypeScript strictness, `noUnusedLocals`, `--max-warnings 0`, ESLint rules, or lint
  reporting.
- Blanket file/config suppressions, broad `eslint-disable`, `@ts-ignore`, `@ts-expect-error`,
  unsafe `as` casts used to silence errors, non-null assertions without a proven invariant, or
  excluding files from build/lint.
- Broad component/hook/service refactors, formatting sweeps, generated-file rewrites, or fixing
  findings not reproduced by the two baseline commands unless a scoped correction reveals a new
  directly caused diagnostic.
- Any dev or production deployment, live Firebase write, destructive action, or production action.
- Starting `customer-upload-oversized-image-normalization-and-processing-performance`,
  `production-release`, or any other queued goal.
- Reverting, cleaning, committing, staging, or otherwise modifying unrelated dirty-worktree
  changes.

---

## Baseline Classification and Expected Files

Paths below are expected, not permission for unrelated cleanup. Implementation must re-run the
baseline immediately before editing and adjust this inventory only when the current source proves
that a diagnostic moved.

### A. TypeScript: stale fixtures and compile-time contract drift

Use current production types/constants as authority; update fixtures without broad casts.

- `apps/studio/src/renderer/src/features/ai-review/utils/suggestedNewTags.test.ts`
  - supply the current `AiReviewDraftForm` halftone/background fields.
- `apps/studio/src/renderer/src/features/print-requests/constants/printRequestRoutes.test.ts`
  - correct empty-array inference so the route case remains meaningfully typed.
- `packages/shared/src/utils/assistedCreationAnswerDisplay.test.ts`
  - replace six removed enum literals with current supported values while retaining equivalent
    display-policy coverage.
- `packages/shared/src/utils/assistedCreationProofKind.test.ts`
  - provide the required proof filename field and retain the intended non-catalog proof case.
- `apps/studio/src/renderer/src/features/firebase/utils/createSharedFirestoreSubscription.test.ts`
  - correct the test unsubscribe callback typing without weakening the production API.

Expected result: 11 of the 29 diagnostics resolved in test code.

### B. TypeScript: optional/discriminated runtime data

Preserve real optionality. Narrow or default at the consumer boundary and add tests for each
meaningful absent-value path.

- `apps/studio/src/renderer/src/features/customer-uploads/hooks/useCustomerUploadIntake.ts`
  - carry the current `fullSizePurgedAtMs` field through optimistic row construction.
- `apps/studio/src/renderer/src/features/designs/components/DesignDetailsModal.tsx`
  - prevent a nullable design from reaching original-download service invocation.
- `apps/studio/src/renderer/src/features/print-requests/components/SplitDesignPickerModal.tsx`
  - handle upload-backed `PrintRequestItem` records whose `designId` is legitimately absent; do not
    manufacture a catalog design ID.
- `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequestSelectionMode.ts`
  - use the existing print-request item source discriminator and preserve the selection-mode
    contract for catalog items without misclassifying customer-upload items.
- `apps/studio/src/renderer/src/features/print-requests/utils/printRequestQueryPlanning.ts`
  - compute unique item/design counts with a stable key for both catalog and upload-backed items;
    reuse the canonical source helper or summary semantics where possible.
- `apps/studio/src/renderer/src/features/customer-requests/components/AssistedCreationRequestsSection.tsx`
  - use a valid DOM ref type and normalize optional preview availability to the required boolean
    where settled state requires it.
- `apps/studio/src/renderer/src/features/users/services/userAuditTrailActivityService.ts`
  - replace the nullable map/filter/type-predicate mismatch with explicit type-safe accumulation or
    narrowing before sort; preserve ordering and optional detail semantics.

Expected result: 13 diagnostics resolved through behavior-preserving runtime-safe handling.

### C. TypeScript: caller/interface synchronization

Synchronize the narrow caller or local interface to an already-current contract. Do not roll back
the authoritative contract to match a stale caller.

- `apps/studio/src/renderer/src/features/settings/services/portalSocialMetaSettingsService.ts`
  - include the current `libraryOgRotationInterval` in the sanitized input mapping with the
    established default/validation policy.
- `apps/studio/src/renderer/src/features/staff-inbox/components/StaffInboxBell.tsx`
  - align the passed ref type with the rendered element/ref contract.
- `apps/studio/src/renderer/src/features/staff-inbox/components/StaffInboxProvider.tsx`
  - resolve the stale `subtitle` construction against the current `StaffInboxToast` contract;
    preserve the current rendered message/title behavior rather than silently expanding the shared
    interface.
- `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx`
  - pass the intended current list tab to required `usePrintRequests(activeTab)`, based on this
    page's actual request-list need; do not restore an unbounded/default hook contract.

Expected result: the remaining 5 diagnostics resolved.

### D. Lint: invalid Next-rule directives

Remove only the 13 stale `@next/next/no-img-element` disable comments in:

- `apps/portal/features/account/components/AccountArtworkGallery.tsx`
- `apps/portal/features/account/components/AccountArtworkGalleryModal.tsx`
- `apps/portal/features/assisted-creation/components/AssistedCreationDetailPanels.tsx`
- `apps/portal/features/assisted-creation/components/AssistedCreationMediaThumbs.tsx`
- `apps/portal/features/assisted-creation/components/AssistedCreationReferenceUpload.tsx`
- `apps/portal/features/assisted-creation/components/AssistedCreationStatusPanel.tsx`
- `apps/portal/features/print-requests/components/CurrentRequestDrawer.tsx`

No JSX/image behavior is authorized to change in this group.

### E. Lint: dead bindings and const correctness

Remove unused destructuring/parameters only after proving there is no intended UI use, and preserve
public callback/function signatures when callers rely on them:

- `apps/portal/features/catalog/components/CatalogDesignCard.tsx`
- `apps/portal/features/catalog/components/CatalogDesignDetailsModal.tsx`
- `apps/portal/features/catalog/components/CatalogSelectionCard.tsx`
- `apps/portal/features/catalog/services/catalogStorageService.ts`
- `apps/portal/features/customer-uploads/hooks/useCustomerUploadBatch.ts`
- `apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx`
- `apps/portal/features/print-requests/hooks/useAddDesignToRequestFlow.ts`
- `functions/src/lib/customerUploadProcessing.ts`
- `packages/shared/src/utils/portalBiddingAcknowledgmentCopy.ts`

Where an intentionally accepted-but-unused compatibility parameter exists, prefer a signature or
call-site correction justified by current consumers; do not add a suppression or dummy read.

### F. Lint: control-character validation/sanitization

Replace `no-control-regex` violations with a small explicit character-code predicate, equivalent
segmentation, or another readable rule-compliant implementation. Preserve all current rejection or
replacement boundaries, especially U+0000 through U+001F:

- `apps/studio/electron/services/download/downloadFirebaseStorageUrlToFile.ts`
- `functions/src/lib/etsyRecommendationSuggestionValidation.ts`
- `functions/src/lib/etsySuggestionRequestValidation.ts`

Prefer a shared helper only within an existing dependency boundary and only if it removes actual
duplication without widening this phase. Do not move Electron-only filesystem behavior into shared
code.

### G. Lint: lazy native image-module loading

The current comments suppress `@typescript-eslint/no-require-imports`, but the configured lint rule
reporting the calls is `@typescript-eslint/no-var-requires`. Remove the stale comments and use a
rule-compliant lazy-load boundary that preserves the deliberate avoidance of cold native `sharp`
loading during Functions deploy discovery:

- `functions/src/ai/prepareAiAnalysisImage.ts`
- `functions/src/lib/customerUploadProcessing.ts`
- `functions/src/lib/portalOgImageCompose.ts`

Formal Review must reject a static-import correction unless evidence proves it preserves the
deploy-discovery requirement. Dynamic import, `createRequire`, or a narrow loader abstraction may
be used only after checking CommonJS output, synchronous/async caller contracts, module caching,
and focused image-processing tests.

### H. Lint: React hook dependency and cleanup correctness

Each of the 10 hook warnings is behavior-sensitive. For each warning:

1. Identify what value the closure must observe when it executes.
2. Determine whether the dependency identity is stable and whether adding it changes effect or
   callback frequency.
3. Prefer stable destructuring/callbacks, functional state, or a deliberately synchronized ref
   when current-state-at-execution is required.
4. For cleanup, capture the exact collection/resource owned by that effect instance.
5. Add focused tests around stale values, repeated renders, cleanup, and exactly-once work where a
   test seam exists.
6. Do not mechanically append dependencies or retain/add suppressions.

Warnings to resolve:

- `apps/portal/features/customer-uploads/hooks/useCustomerUploadBatch.ts`
  - `activeRows`: persistence must use the same current rows used for cap calculation, not a stale
    render snapshot.
- `apps/portal/features/print-requests/components/CurrentRequestDrawer.tsx`
  - `flushTimersRef.current`: cleanup must capture/clear the effect-owned timer map safely.
- `apps/portal/features/print-requests/hooks/useAddDesignToRequestFlow.ts`
  - six findings involving `announceDesignAdded` and/or `requireSignedIn`; callback behavior must
    use current auth/announcement functions without duplicate writes or stale navigation.
- `apps/studio/src/renderer/src/features/customer-uploads/pages/CustomerUploadsPage.tsx`
- `apps/studio/src/renderer/src/features/customer-uploads/pages/DonatedDesignsPage.tsx`
  - `intake`: stabilize/destructure the invoked action so callbacks follow current intake state
    without recreating unnecessarily.
- `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx`
  - `exportGangSheetPngState`: preserve selected-show/settings refresh semantics, cache invalidation,
    and Strict Mode safety without the existing dependency suppression.

## Affected Areas

### Files / Modules (expected)

- The files enumerated in Baseline Classification sections A–H.
- Adjacent existing test files for those modules.
- New narrowly scoped pure-helper or hook/controller tests only where the existing test surface
  cannot verify a behavior-sensitive correction.
- No configuration or dependency file is expected to change.

### Architecture Impact

- [x] None.
- Existing Portal, Studio, Functions, Electron, and shared boundaries remain unchanged.
- No Firebase call may move into a component, no Electron API may move into Portal/shared code, and
  no new cross-layer dependency may be introduced merely to share a lint helper.

### Security Impact

- [x] No authorization, authentication, permission, secret, or Rules behavior change.
- Filename sanitization and Etsy input validation are security-sensitive even though their edits are
  lint-driven. Their exact control-character rejection/replacement behavior requires regression
  tests and may not be relaxed.
- Original-download null guarding must fail closed and must not broaden download eligibility.

### Data Model Impact

- [x] None.
- Current optional fields and discriminated print-request sources are honored; no field is made
  required/optional globally to silence a caller.
- No persisted records, enums, statuses, or migrations change.

### Backend Impact

- [x] No externally observable backend behavior.
- Functions source may change for lint compliance, but callable/trigger exports, image bytes,
  validation results, native-module laziness, and error behavior must remain equivalent.
- No Function or Rules deployment is required or authorized.

### UI / UX Impact

- [x] No intended visual, copy, accessibility, or workflow change.
- Runtime guards/defaults may prevent invalid absent data from reaching UI/service calls.
- Hook corrections must preserve upload, print-request, intake, and gang-sheet interactions.

### Migration Impact

- [x] None.
- [x] Forward steps: source/test corrections only.
- [x] Rollback / compatibility: revert only this goal's attributed hunks; no data rollback exists.

---

## Approach

1. Re-run `npm run build:studio` and `npm run lint`; record exact exit codes, counts, and paths.
   Compare with the 29/41 baseline before touching source.
2. Capture `git status --short` and inspect each candidate file's current diff so unrelated prior
   work is preserved. Never use a destructive reset/checkout or bulk formatter over the repository.
3. Resolve fixture-only TypeScript drift first, using current exported types/constants and preserving
   each test's semantic assertion.
4. Resolve production TypeScript errors by root cause:
   - discriminate optional print-request sources;
   - add runtime guards/defaults at the narrow consumer boundary;
   - synchronize stale callers with current interfaces; and
   - use explicit typed accumulation instead of casts for nullable transforms.
5. Run the focused TypeScript-adjacent tests and `npm run build:studio`. Do not proceed while any
   introduced failure is unexplained.
6. Remove only the invalid Next-rule disable directives and resolve mechanical dead-binding/`const`
   findings without altering rendering or APIs unnecessarily.
7. Correct control-character and lazy-`sharp` lint findings with behavior-equivalent, tested
   implementations. Verify Functions CommonJS build and native processing tests.
8. Resolve hook warnings one at a time following the closure analysis in section H. Add a pure
   controller/helper seam when necessary rather than relying on an untested dependency-array edit.
9. Run focused tests after each behavior-sensitive group, then the complete verification matrix.
10. Inspect `git diff --check`, changed-file lint, the final root diff, and final diagnostic counts.
    Report unrelated baseline/environment findings honestly; do not describe a non-zero result as
    clean.

## Behavior-Sensitive Test Requirements

At minimum, implementation or adjacent existing tests must prove:

- catalog and upload-backed print-request items produce stable, non-colliding summary counts;
- split/selection UI does not look up an absent upload item `designId` or create a fabricated one;
- original download cannot start with a missing design;
- optimistic upload intake retains `fullSizePurgedAtMs`;
- audit entries drop invalid/null rows and retain deterministic newest-first ordering;
- Portal social metadata carries the established rotation interval;
- current request timers are cleared on unmount without clearing a replacement render's resources;
- upload-session persistence uses the latest active rows and does not exceed the cap;
- add-design callbacks use current auth/announcement behavior and do not duplicate mutations;
- Studio intake page callbacks invoke the latest intended action;
- gang-sheet refresh/reset/cache actions run for the intended show/settings change only;
- filename sanitization still replaces forbidden/control characters and protects fallback names;
- Etsy validators still reject the same control-character range;
- all three native image paths retain lazy loading and their existing output/error behavior.

If direct component/hook coverage is impractical, extract only the smallest pure decision/controller
needed for deterministic tests. A broad testing-framework introduction is out of scope.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Toolchain record | `npx tsc -v` | yes |
| Primary Studio gate | `npm run build:studio` | yes; exit 0 |
| Primary repository lint gate | `npm run lint` | yes; exit 0 with 0 warnings |
| Changed-file lint during iteration | `npx eslint <exact changed .ts/.tsx files> --report-unused-disable-directives --max-warnings 0` | yes |
| Focused Studio/shared TypeScript tests | `npx tsx --test <affected existing and new Studio/shared test files>` | yes |
| Focused Portal behavior tests | `npx tsx --test <affected existing and new Portal test files>` | yes when Portal behavior-sensitive files change |
| Focused Functions behavior tests | `npx tsx --test <affected Functions tests>` | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Portal production build | `npm run build:portal` | yes |
| Functions build | `npm run build --prefix functions` | yes |
| Diff whitespace/integrity | `git diff --check` | yes |

Focused test selection must include at least the adjacent tests identified during inspection:

- `apps/studio/src/renderer/src/features/ai-review/utils/suggestedNewTags.test.ts`
- `apps/studio/src/renderer/src/features/firebase/utils/createSharedFirestoreSubscription.test.ts`
- `apps/studio/src/renderer/src/features/print-requests/constants/printRequestRoutes.test.ts`
- `apps/studio/src/renderer/src/features/print-requests/utils/printRequestQueryPlanning.test.ts`
- `packages/shared/src/utils/assistedCreationAnswerDisplay.test.ts`
- `packages/shared/src/utils/assistedCreationProofKind.test.ts`
- `packages/shared/src/constants/portal/portalSocialMetaSettings.constants.test.ts`
- `packages/shared/src/staffInbox/deriveStaffInboxItems.test.ts`
- `packages/shared/src/utils/portalBiddingAcknowledgmentCopy.test.ts`
- `apps/studio/electron/services/download/firebaseStorageDownloadUrl.test.ts` plus a focused
  sanitizer test seam if the current test does not cover filenames
- `functions/src/ai/prepareAiAnalysisImage.test.ts`
- `functions/src/lib/customerUploadProcessing.test.ts`
- `functions/src/lib/etsyRecommendationSuggestionValidation.test.ts`
- `functions/src/lib/etsySuggestionRequestValidation.test.ts`
- `functions/src/lib/portalOgImageCompose.test.ts`
- any new focused hook/controller tests required by section H.

Rules tests are not required because Rules are out of scope and must remain unchanged. If source
inspection unexpectedly proves a Rules, schema, dependency, or deployment change is necessary,
stop and return to Plan/Review rather than expanding implementation.

### Manual

- [x] Conditional only.
- No owner QA is required for fixture, comment, dead-binding, or demonstrably pure type corrections.
- If one or more hook warnings cannot be fully covered by deterministic automated tests, open one
  reduced owner checkpoint covering only the affected live behaviors:
  1. Portal upload: append to an existing batch and confirm all active rows persist once.
  2. Portal Current Request/add-design: add and rapidly adjust/remove an item, navigate away, and
     confirm no delayed duplicate/stale mutation.
  3. Studio Customer Uploads/Donated Designs: invoke the affected intake action once.
  4. Studio Show Queue: switch shows/settings and confirm gang-sheet cache state refreshes for the
     selected show only.
- The Test Agent must state exactly which behavior lacked automated coverage; manual QA must not be
  added merely because UI files were touched.

## Human Checkpoints Anticipated

- [ ] Manual UI/UX review
- [ ] Design approval
- [ ] Business logic decision
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars
- [x] Other: conditional reduced owner QA only if a behavior-sensitive hook correction cannot be
  fully covered automatically.

No blocking business question is currently proven. Formal Review may require a Plan amendment if
the source shows that satisfying a diagnostic would alter an intentional product contract.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Mechanical hook dependency edits introduce stale closures, repeated writes, or render loops | High | Perform per-warning closure analysis; stabilize dependencies or use synchronized refs/functional updates based on execution-time needs; add focused repeated-render/unmount tests |
| Print-request optional `designId` is silenced with a fake value, breaking upload-backed items | High | Use canonical source discrimination and distinct stable keys; test catalog and upload items together |
| Static `sharp` imports change Functions deploy discovery/cold-load behavior | High | Preserve lazy loading explicitly; verify CommonJS build, caching, image tests, and reject unevidenced static import |
| Control-character lint fix weakens sanitization/validation | High | Preserve exact U+0000–U+001F and forbidden-character behavior with boundary tests |
| A broad cast/non-null assertion makes the build green while hiding invalid data | High | Require runtime narrowing/defaults and focused absent-value tests; Review rejects diagnostic-only casts |
| Unrelated dirty-worktree changes are overwritten or reformatted | High | Inspect per-file diffs before edits; use narrow patches; no reset/checkout/global formatter; final attribution review |
| Stale test fixtures are changed so assertions no longer test their original policy | Medium | Use current valid enum values that exercise the same display branch and retain assertion intent |
| Removing unused parameters accidentally changes a compatibility API | Medium | Inspect all callers; preserve signature when externally meaningful and instead correct destructuring/callers |
| Fixing the 13 invalid directives expands into a Next image migration or lint-config change | Medium | Remove comments only; explicitly forbid plugin/config/image-policy work |
| Full Studio build reaches packaging and exposes an environmental failure after TypeScript is fixed | Medium | Record the exact new phase/exit; resolve only code failures within scope and report environmental blockers honestly |
| Portal build is affected by an active dev process or `.next` file lock | Medium | Stop the conflicting local dev process only if owned/authorized, or record the exact environment blocker; do not call it a pass |
| Scope expands to newly surfaced unrelated warnings | Low | Fix only current baseline and direct regressions caused by scoped edits; amend/review before meaningful expansion |

See `.cursor/workflow/risk-checklist.md`. No persistent new product risk is created by this Plan, so
no Risk Register entry is required at Plan time.

## Rollback Plan

This goal has no deployment or data migration. If verification fails, revert only the exact hunks
attributed to this goal while preserving pre-existing dirty-worktree content. Restore prior callback
and loader implementations together with their tests, then re-run both baselines to prove the
rollback did not alter unrelated work. Do not use `git reset --hard`, broad checkout, worktree clean,
or deletion of untracked files.

## Documentation Updates Required

- [ ] `PROJECT_BRIEF.md`
- [ ] `ARCHITECTURE.md`
- [ ] `DATA_MODEL.md`
- [ ] `BACKEND.md`
- [x] `TESTING.md` only if implementation establishes a durable command/test convention not already
  documented
- [ ] `DEPLOYMENT.md`
- [ ] `STYLE_GUIDE.md`
- [ ] `DECISIONS.md`
- [x] Workflow Plan, Formal Review, test report, independent Implementation Review, signoff/state,
  and handoff records per FreshForge.

No permanent product documentation change is expected because product behavior and architecture are
required to remain unchanged.

## Acceptance Criteria

- [ ] `npm run build:studio` exits `0`; all 29 reproduced diagnostics are resolved.
- [ ] `npm run lint` exits `0` with 0 errors and 0 warnings; all 41 reproduced findings are resolved.
- [ ] TypeScript strictness, ESLint rules, `--max-warnings 0`, and build/lint file coverage are not
  weakened.
- [ ] No blanket suppression, unsafe diagnostic-only cast, or exclusion is added.
- [ ] The 13 invalid `@next/next/no-img-element` directives are removed without adding/configuring
  that plugin/rule or changing image behavior.
- [ ] Optional catalog/upload item sources are handled truthfully with focused regression coverage.
- [ ] All 10 hook warnings are resolved through documented stale-closure/ownership analysis, not
  mechanical dependency edits.
- [ ] Filename and Etsy control-character protection remains behaviorally equivalent.
- [ ] Functions native image loading remains lazy and all affected image tests pass.
- [ ] Portal typecheck/build, Functions build, focused affected tests, and `git diff --check` pass.
- [ ] Unrelated dirty-worktree content is preserved.
- [ ] No Firebase Rule, index, schema, environment, dependency, deployment, live-data, or production
  action occurs.
- [ ] Conditional manual QA is requested only for behavior-sensitive UI work lacking full automated
  coverage.

## Open Questions

- [x] None blocking.

Implementation may choose among equally safe local typing forms, but any change to a product
contract, dependency, lint configuration, static-analysis strictness, deploy behavior, or persisted
data model requires a reviewed Plan amendment.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-07-29-preproduction-static-analysis-cleanup-review.md`
- Verdict: pending
