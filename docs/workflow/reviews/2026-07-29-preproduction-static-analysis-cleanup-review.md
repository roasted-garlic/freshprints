# Formal Review: Pre-Production Static-Analysis Cleanup

| Field | Value |
|-------|-------|
| Date | 2026-07-29 |
| Reviewer | Independent FreshForge Review Agent |
| Plan | `docs/workflow/plans/2026-07-29-preproduction-static-analysis-cleanup-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

The Plan is appropriately limited to the currently reproduced static-analysis baseline and
explicitly forbids strictness, lint, configuration, dependency, security, data-model, and deployment
shortcuts. Independent execution reproduced exactly 29 TypeScript diagnostics in 17 Studio/shared
files and 41 lint findings (31 errors and 10 warnings), so the proposed inventory has a stable,
auditable boundary.

Approval is conditional on three binding implementation requirements below. Most importantly,
`UpcomingShowsPage` cannot resolve its new required `usePrintRequests(activeTab)` argument by
arbitrarily selecting one list tab: the current Show Queue picker intentionally evaluates requests
across lifecycle classifications. The correction must preserve that behavior through an explicitly
bounded source, or stop for a reviewed Plan amendment.

---

## Independent Baseline Verification

| Command | Exit | Result |
|---------|------|--------|
| `npm run build:studio` | `2` | 29 TypeScript diagnostics in the 17 files inventoried by the Plan |
| `npm run lint` | `1` | 41 findings: 31 errors and 10 warnings |

The lint total decomposes consistently:

- 13 invalid `@next/next/no-img-element` disable directives;
- 9 dead-binding / `prefer-const` errors;
- 3 `no-control-regex` errors;
- 6 lazy-`sharp` findings (three stale disable directives plus three `require` calls); and
- 10 `react-hooks/exhaustive-deps` warnings.

Within `useAddDesignToRequestFlow.ts`, the current command reports five warning diagnostics covering
seven missing-dependency references, not “six findings.” The root 10-warning total remains correct
and is the authoritative completion gate.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass with condition | Exact 29/41 baseline reproduced; Show Queue caller correction requires the boundedness condition below |
| Architecture alignment | pass | Existing Portal, Studio renderer, Electron, Functions, and shared boundaries are preserved |
| Security impact addressed | pass with condition | Control-character behavior and original-download fail-closed behavior require boundary tests |
| Data model impact addressed | pass | Plan correctly preserves optional `PrintRequestItem.designId` for `customer_upload` items |
| Backend impact addressed | pass with condition | Lazy native loading needs direct discovery-time proof, not output tests alone |
| Test strategy adequate | pass with condition | Broad matrix is adequate after the binding tests/evidence below are included |
| Human checkpoints identified | pass | No deployment is authorized; reduced owner QA is conditional on unautomated hook behavior |
| Roadmap alignment | pass | This is the next queued pre-production goal |
| Documentation plan | pass | Workflow artifacts are sufficient unless a durable convention changes |
| No silent scope expansion | pass | Config, dependency, Rules, schema, deployment, and product work are explicitly excluded |

---

## Architecture Review

The Plan respects the documented Component → Hook → Service boundary and keeps Electron filesystem
logic out of shared/Portal code. Its preference for narrow helpers or controllers is acceptable when
needed to test behavior-sensitive closures, provided those helpers do not become a broad refactor.

Source inspection found a material ambiguity in the five-diagnostic caller/interface group:

- `usePrintRequests` now requires one `PrintRequestListTab` and loads only the first bounded page for
  that tab.
- `UpcomingShowsPage` currently consumes the resulting requests both for the Add-to-Show picker and
  to resolve attached request presentation.
- Its picker explicitly filters all not-yet-fully-printed requests. Those candidates may span
  Working, Queued, and Printing classifications; attached records may also sit outside whichever
  tab is chosen.

Passing a convenient literal such as `"working"` or `"queued"` would make TypeScript green while
silently narrowing Show Queue behavior. Restoring the former unbounded corpus read would violate the
approved Wave C architecture.

**Required changes:**

- [x] Binding requirement 1: preserve the Show Queue picker’s cross-classification eligibility and
  exact attached-request presentation through a bounded, service-owned read strategy. Tests must
  cover eligible Working, Queued, and Printing requests, exclusion of fully Printed requests,
  attached IDs outside the picker page/tab, and the relevant pagination boundary. Do not pass an
  arbitrary single tab, restore a default/unbounded hook contract, or hide the error with a cast. If
  current service primitives cannot satisfy both behavior and boundedness without a meaningful new
  product/read contract, stop and return for a reviewed Plan amendment.

---

## Security Review

No auth, role, Rules, secret, or live-data change is proposed. The security-sensitive lint changes
are correctly identified: filename sanitization and Etsy input validators must retain the exact
U+0000–U+001F boundary, and the nullable original-download path must fail closed.

**Required changes:**

- [x] Preserve and test U+0000, U+001F, the adjacent allowed U+0020 boundary, existing forbidden
  filename characters, and fallback-name behavior.
- [x] Prove a missing `Design` cannot invoke the original-download service; do not substitute an
  empty or fabricated source.

**Human approval needed before production:**

- [x] No production action is part of this goal. Any later deployment remains a separate gate.

---

## Data Model Review

The Plan aligns with the authoritative source model in `DATA_MODEL.md`: `designId` is required for
catalog-backed or legacy-default items and is intentionally absent for `sourceType:
"customer_upload"`. The proposed fixes correctly require discrimination or stable source-aware keys,
not manufactured catalog IDs or global type changes.

Fixture corrections must use current exported unions and required fields while retaining the
original policy branch each assertion was designed to exercise.

**Required changes:**

- [x] Do not use `as`, non-null assertions, empty strings, or fabricated identifiers to make optional
  request-item fields compile. Source-aware behavior tests are mandatory.

---

## Backend Review

The three Functions helpers deliberately defer loading native `sharp` because `functions/src/index.ts`
exports callables that transitively import all three modules during deployment discovery. Replacing
`require("sharp")` with a static import could load the native module during discovery and is
therefore rejected.

Dynamic import, `createRequire`, or a narrow loader can be acceptable only if the emitted CommonJS
and call contracts remain correct. Existing image-output tests alone do not prove import-time
laziness.

**Required changes:**

- [x] Binding requirement 2: after the Functions CommonJS build, add/run a direct discovery/import
  verification that imports the compiled affected modules—or the compiled Functions index when
  practical—while proving `sharp` is not loaded before an image function is invoked. Then prove one
  invocation loads it successfully and subsequent invocations use the intended module cache. Retain
  the existing image bytes/error regression tests. Static `sharp` imports are not approved.
- [x] No export, callable/trigger registration, deployment configuration, dependency, or package
  change is authorized.

---

## Testing Review

The Plan’s primary gates, Portal typecheck/build, Functions build, focused suites, changed-file lint,
and diff check are proportionate. Its behavior-sensitive test list appropriately covers optional
request sources, upload state, timers, callbacks, gang-sheet state, validation, and native image
processing.

Hook-warning resolution requires more than a final clean lint result. Several callbacks perform
writes or own timers, and mechanically appending dependencies could introduce duplicate work,
render loops, stale auth decisions, or cleanup of another render’s resources.

**Required changes:**

- [x] Binding requirement 3: the test report must include a warning-by-warning closure ledger for all
  10 current hook diagnostics: warned line, execution-time value required, resource/callback owner,
  chosen correction, identity/frequency impact, and the automated test that proves repeated-render,
  freshness, cleanup, or exactly-once behavior. If deterministic coverage is genuinely unavailable,
  identify that exact warning and open only the Plan’s reduced owner checkpoint.
- [x] Record exact command, exit code, test count, pass count, and fail count for each focused suite
  and both primary gates. A newly surfaced diagnostic directly caused by a scoped edit must be
  resolved; an unrelated newly discovered baseline requires a reviewed scope decision.

---

## Documentation Review

No permanent architecture, schema, backend, security, or workflow documentation should change
because product behavior is required to remain equivalent. Update `TESTING.md` only if implementation
establishes a genuinely reusable command or convention. Workflow Plan, test report, independent
Implementation Review, signoff, state, and handoff records remain required.

---

## Required Changes

1. Do not satisfy `UpcomingShowsPage` with an arbitrary single print-request tab. Preserve the
   cross-tab Show Queue candidate/attached-record contract with bounded service reads and the stated
   regression coverage, or stop for a reviewed Plan amendment.
2. Prove lazy `sharp` behavior at compiled Functions discovery/import time, including first-load and
   cache behavior; static import is forbidden.
3. Produce warning-by-warning closure evidence and deterministic tests for all 10 hook diagnostics,
   using reduced owner QA only for a specifically documented automation gap.
4. Treat the reproduced command output as authoritative: `useAddDesignToRequestFlow.ts` currently has
   five warning diagnostics (seven dependency references), while the repository total is 10.

---

## Blockers

None before implementation, provided the binding changes above are followed. Any need to change a
product contract, restore an unbounded read, add a dependency/configuration exception, or alter
deployment behavior is a stop condition requiring a reviewed Plan amendment.

---

## Verdict Rationale

**approved_with_changes.** The Plan has a sound bounded baseline, strong anti-suppression rules, and
an adequate verification matrix. The required changes close one real source-level behavior risk
that the Plan currently describes too loosely and strengthen proof for the two areas where a clean
compiler/linter alone cannot establish equivalence: Functions deploy discovery and React closure
ownership. No application implementation, deployment, or production action was performed during
this review.

---

## Next Step

Implement only the approved scope while treating all four required changes as binding. Stop and
return to Plan/Review if the bounded Show Queue contract or lazy-load proof cannot be achieved without
scope expansion.
