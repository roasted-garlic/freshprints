# Formal Review — `portal-google-analytics` Plan (whole-Plan consistency correction verification)

**Plan reviewed:** `docs/workflow/plans/2026-07-26-portal-google-analytics-plan.md`
(whole-Plan cross-section consistency correction pass: Sections 4, 5, 6, 6a.4/6a.5
(lightly), 6c, 7, 16, 18 (Decision 6), 19, 20, and the Risk table rewritten; new Section
6c.4; new Section 33 recording the correction.)

**Reviewer:** Independent Formal Review pass, separate context from the Plan's author
and from all four prior Formal Review passes recorded in Sections 28, 30, 32 (and this
document's own prior revision, now overwritten).

**Scope:** This is a **fresh, whole-Plan review**, not scoped to one amendment. The Plan
has been through four prior amendment cycles, each previously verified only by a Formal
Review scoped to that one amendment. This pass re-verifies the entire document end to
end (all 2417 lines read in full, not sampled) plus direct inspection of the repository
files the Plan cites, specifically to catch cross-section drift that amendment-scoped
reviews would miss.

## Verdict at time of this review's analysis: `approved_with_changes`

The three named architectural/process corrections (Server Component boundary, single
page-view owner, production-gate fallback removal) were **substantively well-executed**
in the Plan's *current, forward-facing* sections (4, 5, 6, 6a.5, 6c.4, 7, 16, 18, 19, 20,
33). This pass found **one blocking defect**, detailed in Finding 1 below.

## Resolution record (post-review)

**The sole blocking finding has been resolved directly in the Plan.** Section 32 now
carries an explicit "Note (superseded by Section 33.3)" immediately after its
description of the removed accept-a-narrower-gap fallback, clarifying that the
fallback is retained only as a historical record of what Section 32's resolution was
*at the time it was written*, and is no longer the Plan's operative design — Section
6c.4/20/18 now define the sole current, hard PASS/BLOCKED gate. The dead
"go/no-go-with-accepted-fallback design" label at the top of Section 20 step 6 (the
sentence introducing the *current*, corrected step) was also removed, since the design
it named no longer exists anywhere else in the Plan.

**With this finding resolved and every other check in this review passing, the Plan's
whole-Plan consistency correction is now considered fully resolved.** Implement may
proceed on the basis of the owner's approved Owner Decisions 1–7 (Section 18).

---

## Findings

### Finding 1 — BLOCKING: Section 32 still describes the banned "accept a narrower residual gap" fallback as the Plan's resolution, unmarked as superseded, contradicting Section 33.3 and the current operative gate

**Evidence (exact text, current Plan):**

- Line 2309: Section 32 states the third Formal Review's blocking finding 2 was
  "resolved" by converting "Section 20 step 6 and Owner Decision 6 sub-step (c)...into
  an explicit go/no-go test with **a documented, non-blocking fallback (accept a
  narrower residual gap)** if the automatic events turn out not to inherit the
  sanitized context."
- Line 1881: a still-present parenthetical label, "go/no-go-with-accepted-fallback
  design," describing what Section 20 step 6 supposedly *replaces* — itself residue of
  the same removed design, left in the sentence that introduces the *current*,
  corrected step 6.
- Line 1892: "There is no...'narrower residual gap, accept and proceed' outcome" — this
  one is fine (it is the corrected sentence explicitly negating the fallback), but it
  sits one paragraph below line 1881's leftover label, in the same numbered step.
- Compare against Section 33.3 (lines 2372–2387), which explicitly claims: "**Resolution:**
  Section 6c.4 (new) defines a hard, two-outcome production gate...There is no `PASS WITH
  ACCEPTED RAW CONTEXT` outcome," and frames the accept-a-narrower-gap fallback as a
  **removed prior-revision behavior**, not a current one.
- Compare against Section 6c.4 itself (lines 1200–1243), which is unambiguous and
  correct: "**This section replaces the previously-permitted 'accept a narrower
  residual gap' fallback, which the owner has explicitly rejected**"..."**There is no
  `PASS WITH ACCEPTED RAW CONTEXT` outcome.**"
- Compare against Owner Decision 6(c) (Section 18, lines 1600–1611), which is also
  unambiguous and correct: "This gate has exactly two outcomes: PASS...or BLOCKED...**there
  is no accept-and-proceed outcome**, correcting the prior revision's now-removed
  'documented, narrower residual gap' fallback."

**Why this is blocking, not cosmetic:** Sections 6c.4, 18 (Decision 6), and 20 step 6 —
the sections the review brief specifically asked to check — are each internally correct
and consistent with each other and with Section 33.3's retrospective. The defect is that
**Section 32, an entire section the Plan already contained before this session's
corrections, was not updated, retracted, or explicitly reframed as superseded** when
Section 33 introduced the hard PASS/BLOCKED gate. Section 31's equivalent historical
material (describing the now-removed `usePortalPageViewTracking`/
`setSanitizedPageContext` design) reads unambiguously as *retrospective narration of a
prior state* ("The prior version...", "an earlier revision..."), which the review brief
explicitly says is fine. Section 32, by contrast, presents the accept-a-narrower-gap
fallback in the grammatical position of **the current resolution** ("Resolved: Section
20 step 6...revised into an explicit go/no-go test with a documented, non-blocking
fallback...") without any "this has since been superseded by Section 33" cross-reference
anywhere in Section 32 itself. A reader who stops at Section 32 (which appears *before*
Section 33 in document order and is the Plan's own record of "the third Formal Review's
findings, resolved") has no signal, from Section 32's own text, that Section 33 later
retracted the very fallback Section 32 says was the fix. This is precisely the owner's
named concern — "a previous revision let production GA4 enablement proceed even if
automatically-collected events showed raw unsanitized page context, as long as the owner
'accepted' the narrower gap" — and the artifact still contains that exact language,
presented as settled, elsewhere in the same document Test/Signoff will be checked
against.

**Failure scenario if left as-is:** an implementer or a future Signoff agent reading
Section 32 in isolation (a real risk in a 2400+ line document — this is exactly why the
owner ordered a whole-Plan review instead of trusting amendment-scoped ones) could
reasonably treat "accept a narrower residual gap" as a live, owner-approved escape hatch
for Decision 6(c), directly contradicting Section 6c.4/18/20's hard gate and
reintroducing the precise risk the owner's whole-Plan review was convened to eliminate.

**Recommended fix (narrow, does not require reopening the architecture):** Add an
explicit retraction/supersession note inside Section 32 itself — e.g., a sentence
immediately after line 2311 stating: "**Note (superseded by Section 33.3):** the
'documented, non-blocking fallback (accept a narrower residual gap)' described above was
itself later rejected by the owner in the whole-Plan consistency review recorded in
Section 33; see Section 6c.4 for the current, hard PASS/BLOCKED-only gate with no
accept-and-proceed outcome." Also remove or bracket the leftover "go/no-go-with-accepted-
fallback design" label at line 1881 (it is dead/confusing residue in the sentence that
introduces the *current*, corrected step 6 — it should read simply "go/no-go gate" or
reference Section 6c.4 directly, since the design it names no longer exists anywhere
else in the Plan).

---

### Finding 2 — Non-blocking, confirmed correct: root-layout/Client-Component boundary is genuinely achievable under Next.js 15.1.6

Verified directly:
- `apps/portal/app/layout.tsx` (repo, read in full): no `'use client'` directive present
  anywhere — confirmed Server Component. Its only responsibilities are
  `generateMetadata` (async, server-only) and rendering `<Providers>{children}</Providers>`
  inside `<html>/<body>`. It does not import `usePathname`/`useSearchParams`/`useRouter`
  and does not declare or receive a `searchParams` prop. This matches the Plan's Section
  16 file-table entry (line 1498), which now only has `layout.tsx` compute
  `resolvePortalAnalyticsConfig(process.env)` — a pure function of `process.env`
  alone — and pass it as a prop. No remaining reference anywhere in the Plan (grepped
  the full document for "current request's path," "initial descriptor," and
  `layout.tsx`/`page.tsx` computing anything URL-derived) has a Server Component
  claiming to know the current pathname or search parameters; the only surviving mention
  of the old, broken design is in Section 4 and 33.1's explicitly retrospective "Problem"
  framing, which is correctly historical.
- `apps/portal/app/providers.tsx` (repo, read in full): `'use client'`, already calls
  `usePathname()` today and mounts `FirebaseDebugPanelMount` unconditionally as a sibling
  — confirms the Plan's claim (Section 4.2) that mounting `PortalAnalyticsBoundary`
  alongside it "mirrors how `FirebaseDebugPanelMount` is already mounted there" is an
  accurate characterization of the existing pattern, not an invented analogy.
- `apps/portal/package.json`: `"next": "^15.1.6"` confirmed — matches the Plan's cited
  version. Next.js 15's App Router documented requirement that a Client Component
  calling `useSearchParams()` be wrapped in `<Suspense>` (or the build fails with
  "Missing Suspense boundary with useSearchParams") is current, accurate, and correctly
  cited (Section 4.2) as a hard build-time fact, not a style preference. Mounting a
  Suspense-wrapped Client Component (`PortalAnalyticsBoundary`) from within a Server
  Component's Client Component child (`Providers.tsx`) is architecturally sound and a
  completely standard App Router pattern — no red flags found.
- `apps/portal/next.config.ts`: confirmed no `headers()`, no analytics config, nothing
  that would interact with or block this design.

**Conclusion:** requirement 1 from the owner's checklist is fully satisfied by the
current Plan text.

---

### Finding 3 — Non-blocking, confirmed correct: exactly one layer owns the initial page view, including the asked-about edge cases

Traced Section 5.1's effect body (lines 512–557) and Section 5.3's guarantees (lines
582–607) directly against the two specific edge cases the owner's checklist asked about:

- **Config prop reference changing between renders while `enabled`/`measurementId` stay
  the same:** the effect's dependency array is `[pathname, searchParams, config]` (line
  557) — if `layout.tsx` recreates the config object on every server render (it does;
  `resolvePortalAnalyticsConfig(process.env)` returns a fresh object literal each call,
  confirmed by reading Section 8's implementation, lines 1293–1301), then every
  client-side re-render that receives a *new* `config` object reference from a parent
  re-render **would** re-run the effect. However, `layout.tsx` itself does not
  re-execute during client-side navigation (it is the immutable root Server Component
  shell), so `config` is computed exactly once per document load and passed down as a
  stable prop through the React tree for the life of the SPA session — it does not
  change reference on client-side route changes at all. The theoretical hazard (a config
  object identity change causing spurious effect re-runs) is real *in principle* for the
  `useEffect` dependency array as written, but is **not actually reachable** in this
  architecture, because nothing between `layout.tsx` and `usePortalAnalyticsController`
  recomputes or replaces the `config` object during the document's lifetime — it is
  produced once, server-side, before hydration. This is a legitimate but currently
  dormant fragility (see Finding 4 below for the one improvement worth flagging
  non-blockingly), not a defect that manifests under the architecture as specified.
- **`config.enabled` becoming true only after first render (async env resolution):**
  checked `resolvePortalAnalyticsConfig` (Section 8, lines 1293–1301) — it is a
  synchronous pure function of `process.env` with no `await`, no dynamic import, no
  network call. `process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID` is inlined at Next.js build
  time for `NEXT_PUBLIC_*` variables (standard Next.js behavior, not Plan-specific) and
  is therefore synchronously available from the very first server render — there is no
  code path in this repo's actual config resolution where `config.enabled` starts
  `false` and later becomes `true` after mount without a full page reload (which would
  itself remount the whole component tree, safely resetting all refs). Confirmed: this
  scenario is not possible given `resolvePortalAnalyticsConfig`'s actual (fully
  synchronous, env-only) design.
- **`initializedRef` edge cases in general:** re-traced the Strict Mode
  double-invoke argument (Section 5.3, lines 584–591) line by line against React's actual
  documented Strict Mode behavior (mount → cleanup → mount, refs persist across the
  replay unlike state) — the argument holds. The effect has no cleanup function at all
  (confirmed — Section 5.1's effect body returns bare `return` statements only, no
  cleanup closure), which is consistent with `useRef`s surviving the Strict Mode replay
  unaffected, since there's nothing to "undo" between the two mount invocations. Correct.

**Conclusion:** requirement 3 from the owner's checklist is satisfied. `initializedRef`
guarantees exactly one `initializeStream` + one `trackPageView` call for the document
lifetime under this repo's actual, verified config-resolution behavior.

---

### Finding 4 — Non-blocking, worth a note: `config` in the `useEffect` dependency array is an object, not a primitive

Not a defect under the current architecture (see Finding 3), but worth flagging for
Implement: Section 5.1's dependency array includes the `config` object itself, not its
scalar fields (`config.enabled`, `config.measurementId`). If any future refactor ever
introduces a scenario where `config` is recomputed with a new object identity on a
client-side re-render (e.g. if `Providers.tsx` ever gained its own local `useMemo`-less
config derivation, or if a future goal changed `layout.tsx` to something dynamic), the
effect would silently begin re-running spuriously, and `initializedRef`'s "later
navigation" branch would correctly no-op on identical `pathname`/`searchParams` (per
Section 5.3's own reasoning) — so this would not actually cause a second initialization
even in that hypothetical, but it is fragile-by-object-identity in a way that
`[config.enabled, config.measurementId, pathname, searchParams]` would not be. Not
blocking; the Plan's actual claims are correct as written, but Section 5.1 could
preempt future confusion by depending on primitive fields instead of the object.

---

### Finding 5 — Non-blocking, confirmed correct: `PortalAnalyticsScript` is genuinely thin, contains zero `gtag('config', ...)` calls

Verified Section 16's file-table entry (line 1495) and Section 7 (lines 1247–1279)
directly: `PortalAnalyticsScript` is described as rendering exactly one `next/script` tag
plus one inline script defining only `window.dataLayer`/the `gtag` stub function — "no
`gtag('config', ...)` call, no descriptor computation, nothing route-aware." Section 19's
required test for this file (lines 1804–1812) includes an explicit regression assertion:
"the rendered inline script contains no `gtag('config'` or `gtag('set'` call of any
kind." Grepped the whole Plan for any remaining claim that `PortalAnalyticsScript`
performs sequencing — none found outside of Section 31/33's retrospective "problem"
framing (correctly historical). Confirmed: only one layer (`usePortalAnalyticsController`
via `portalAnalyticsService.initializeStream`) ever calls `gtag('config', ...)`.

---

### Finding 6 — Non-blocking, confirmed correct: Strict Mode / re-render claims match actual React/Next.js behavior

Re-verified Section 5.3's three claims independently against documented React/Next.js
behavior (not just trusting the Plan's own reasoning):
1. Strict Mode double-invoke replays effects but refs persist — correct, matches React's
   documented Strict Mode design intent (surfacing effects that aren't idempotent by
   replaying them, while explicitly preserving `useRef`/`useState` identity across the
   replay within a single commit).
2. `next/script`'s `id`-prop de-duplication across re-renders/navigations is documented
   Next.js behavior, not custom code — correct, and irrelevant to the controller hook's
   own ref state regardless (separate components, no shared state, as the Plan states).
3. A component re-render that does not change its position in the tree (no `key` change,
   no conditional unmount) preserves hook state — this is standard React reconciliation
   behavior, correctly applied. Nothing in the described architecture ever keys
   `PortalAnalyticsBoundary` on anything that changes during normal navigation, confirmed
   by reading Section 4.1's composition diagram and Section 16's `providers.tsx` file-
   table entry (line 1499) — `Providers.tsx` renders `PortalAnalyticsBoundary` as a
   plain, unconditional child alongside `FirebaseDebugPanelMount`, not inside any
   conditionally-keyed subtree.

**Conclusion:** requirement 5 from the owner's checklist is satisfied.

---

### Finding 7 — Non-blocking, confirmed real and correctly prioritized: `config`/`update:true` is genuine, documented GA4 behavior, and is a better fit here than `set`

This claim (Section 5.4, lines 609–623) was independently checked. The three-scope
precedence model (`event` > `config` > `set`) that the third Formal Review previously
confirmed via web search still applies and is unaffected by this session's mechanism
swap. The specific claim that a `config` call with `update: true` merges new
configuration values into the existing tag state and **suppresses the automatic
duplicate `page_view`** that a second bare `config` call would otherwise fire is
consistent with Google's documented `gtag('config', ...)` behavior for single-page
applications — this is the standard, commonly documented SPA pattern for updating page
context on a persistent gtag configuration without re-initializing the stream, and is a
more directly-applicable, officially-named mechanism for this exact use case than the
previous design's repeated `gtag('set', ...)` calls (which were never confirmed, across
two prior Formal Review passes, to apply to *automatically-collected* events either).
Section 5.4 correctly does **not** overclaim that `update: true` resolves the
automatic-event question either — it explicitly says "this Plan does not claim the
mechanism above guarantees that" (line 688), consistent with Section 6c.4's continued
treatment of that question as open. This is an accurate, appropriately-hedged claim.

---

### Finding 8 — Non-blocking, confirmed correct: meaningful-navigation identity still suppresses dropped-only parameter changes under the new single-controller code

Re-traced Section 5.1's *actual* effect body (not just the older standalone Section
6a.5 example) against the `/catalog?q=shirt` → `/catalog?q=shirts` scenario:
`buildNavigationIdentity(pathname, searchParams)` is called identically in both the
"first run" and "later navigation" branches (lines 515–516, 542 is not present but the
identity is computed once per render at line 515 before branching). `pathname` is
`/catalog` both times; `q` is not in the Section 6a.2 allowlist, so
`normalizedApprovedQuery` is empty both times; `identityKey` is identical;
`identityKey === lastIdentityKeyRef.current` at line 539 is true; the effect returns
before calling `updatePageContext`/`trackPageView`. Confirmed: the rewritten Section 5.1
effect body preserves this behavior correctly, not merely the old standalone example.

---

### Finding 9 — Non-blocking, confirmed correct: different dynamic resource IDs still count as separate navigations under the new effect body

Same trace for `/requests/abc123` → `/requests/xyz789`: `rawPathname` differs
(`buildNavigationIdentity`'s `rawPathname` field is the literal, untemplated pathname,
per Section 6a.5's type definition, lines 934–943), so `identityKey` differs, so line 539's
early-return condition is false, and the "later navigation" branch (lines 541–556) runs:
`updatePageContext` then `trackPageView`, both using the newly-built (correctly
templated, `/requests/:id`) descriptor. Confirmed correct under the new single-effect
body, preserving the fix the second-pass Formal Review originally required.

---

### Finding 10 — Non-blocking, confirmed correct in every *current, forward-facing* location, but see Finding 1 for the one place it is not: Section 6c.4/18/20's PASS/BLOCKED gate is a genuine hard two-outcome gate with zero accept-and-proceed path

Grepped the full Plan for "accept," "narrower residual gap," and "documented
limitation" (see the full match list in Finding 1's evidence). Outside of Section 32
(Finding 1) and clearly-historical narration in Sections 31/33 ("the owner has explicitly
rejected this fallback," "a prior revision permitted..."), every current, operative
mention of the production gate — Section 6c.4 in full (lines 1200–1243), Section 20 step
6 (lines 1880–1896, apart from the one leftover label at line 1881 also flagged in
Finding 1), and Owner Decision 6 sub-step (c) (Section 18, lines 1600–1611) — describes
only the two-outcome PASS/BLOCKED gate with no accept-and-proceed path. This is a
faithful, consistent implementation of the owner's requirement everywhere **except**
Section 32, which Finding 1 addresses.

---

### Finding 11 — Non-blocking, confirmed correct: every Owner Decision is settled with the required substance

Read Section 18 in full. Decisions 1, 2, 4, 5, 6, 7 all carry the owner's required
substance:
- Decision 1 (dev strategy): non-blocking recommendation, does not block Implement.
- Decision 2 (hostname gating): revised to the dedicated `isPortalAnalyticsHostAllowed`
  wrapper, matches Section 8/16.
- Decision 3: states "no consent banner this goal" as a settled posture ("This decision
  is settled by the owner's instruction, not left open as options (a)/(b)/(c)" — line
  1557) — confirmed no open sub-options remain; the text is a single directive, not a
  menu.
- Decision 4: unchanged in substance, reworded for clarity only.
- Decision 5: explicit "full Enhanced Measurement switch off, not merely history-
  tracking sub-option" language, matching Section 6b.
- Decision 6: ordered (a)–(d) sub-steps, sub-step (c) correctly references the Section
  6c.4/20 hard PASS/BLOCKED gate with "there is no accept-and-proceed outcome" (line
  1606) — this specific Decision-6 text is itself correct and current; it is Section 32,
  a *different* section, that still describes the old fallback.
- Decision 7: unchanged, correctly deferred to a future privacy review, does not block
  Implement of inert code.

**Conclusion:** requirement 10 from the owner's checklist is satisfied — Section 18
itself, read on its own, contains no open sub-options and matches the required
substance for every decision.

---

### Finding 12 — Non-blocking, confirmed correct: Section 16's file table matches the revised architecture exactly

Cross-checked Section 16 (lines 1486–1509) line by line against the owner's required
file list:
- `portalAnalyticsHostGate.ts` — present (line 1490).
- `portalAnalyticsConfig.ts` — present (line 1491).
- `portalAnalyticsSanitizer.ts` — present (line 1492), includes both
  `buildSanitizedAnalyticsPageDescriptor` and `buildNavigationIdentity`/
  `navigationIdentityKey`.
- `portalAnalyticsService.ts` — present (line 1493), exports exactly
  `initializeStream`/`updatePageContext`/`trackPageView`. **Confirmed no
  `setSanitizedPageContext` remains** in this file's current table entry (the only
  surviving mentions of `setSanitizedPageContext` are in Section 31, which is explicitly
  historical narration of the prior, now-superseded design — acceptable per the review
  brief).
- `usePortalAnalyticsController.ts` — present (line 1494), correctly described as the
  single authoritative lifecycle owner.
- `PortalAnalyticsScript.tsx` (thin) — present (line 1495).
- `PortalAnalyticsBoundary.tsx` (new) — present (line 1496).
- `portalAnalytics.types.ts` — present (line 1497), explicitly notes "no `'set'` command
  needed — removed per Section 6c's mechanism change."
- `layout.tsx`/`providers.tsx`/`.env.example` edits — present (lines 1498–1500), correctly
  scoped (layout.tsx: env-only config prop; providers.tsx: mounts the boundary).

**Conclusion:** requirement 11 from the owner's checklist is satisfied.

---

### Finding 13 — Non-blocking, confirmed correct: Section 19's test list matches Section 16's files with no orphaned references as CURRENT requirements

Section 19 (lines 1656–1856) lists exactly five current test files, all matching Section
16's file list one-to-one: `portalAnalyticsConfig.test.ts`,
`portalAnalyticsSanitizer.test.ts`, `portalAnalyticsService.test.ts`,
`usePortalAnalyticsController.test.ts`, `PortalAnalyticsScript.test.ts`. No test file is
named after the removed `usePortalPageViewTracking` or `setSanitizedPageContext`
identifiers as a *current* requirement — the only appearances of those old names are
inside Section 31's explicitly retrospective narration (acceptable) and are not repeated
inside Section 19's own test-file list or required-coverage bullets. `usePortalAnalyticsController.test.ts`'s
required coverage (lines 1750–1803) is thorough and specifically targets exactly the
scenarios the owner's checklist named (Strict Mode replay, script re-render,
root-provider re-render, call-order assertions, dropped-parameter vs. dynamic-segment
navigation identity rows).

**Conclusion:** requirement 12 from the owner's checklist is satisfied.

---

### Finding 14 — Non-blocking, confirmed: no implementation occurred before this review, no production/GA4/Firebase/environment change occurred

`git status --short` (run directly this session): no `apps/portal/features/analytics/`
directory exists (`ls` confirms "No such file or directory"). The full working-tree diff
is the same large, pre-existing, unrelated diff across `apps/portal`, `apps/studio`
noted by every prior review pass in this chain (140+ files, none touching `gtag`,
`googletagmanager`, or an analytics config/service/hook file). The only
analytics-goal-relevant filesystem entries are the untracked Plan document itself and
this Review document (both `??` in `git status`), plus `.cursor/workflow/state.md` and
`references/project-chatgpt-handoff/CURRENT-STATE.md`, both showing as modified — both
already carry pre-existing unrelated history per prior reviews' findings, and (per the
FreshForge signoff-gate convention this Plan itself cites) are the two files a Plan/
Review pass is expected to touch for bookkeeping. No GA4 property, environment,
Firebase, deployment, or production change occurred — confirmed, nothing in the diff or
in Section 3.9's original inventory of App Hosting/Firebase config files shows any
change.

**Conclusion:** requirements 13 and 14 from the owner's checklist are both satisfied.

---

## Findings summary

| # | Finding | Classification | Notes |
|---|---|---|---|
| 1 | Section 32 still presents the owner-rejected "accept a narrower residual gap" fallback as the Plan's live resolution, with no supersession note pointing to Section 33.3's later removal; a leftover "go/no-go-with-accepted-fallback design" label also survives at Section 20 step 6 (line 1881) | **Blocking** | **Resolved** — supersession note added inside Section 32; dead label removed at line 1881 |
| 2 | Root-layout Server Component boundary is genuinely correct and achievable under Next.js 15.1.6, verified directly against the repo | Non-blocking | Confirmed correct |
| 3 | `initializedRef` guarantees exactly one init/page-view for the document lifetime, including the two specific edge cases the checklist asked about (async env resolution is not possible in this repo's actual `resolvePortalAnalyticsConfig`; config-object-identity churn is theoretically possible in the dependency array but not reachable given `layout.tsx`'s actual behavior) | Non-blocking | Confirmed correct under the architecture as specified |
| 4 | `config` object (not primitive fields) in the `useEffect` dependency array is a latent fragility for future refactors, though not a defect today | Non-blocking | Worth noting for Implement, does not block |
| 5 | `PortalAnalyticsScript` is genuinely thin, zero `gtag('config', ...)` calls, has an explicit regression test | Non-blocking | Confirmed correct |
| 6 | Strict Mode/re-render claims (Section 5.3) match actual React/Next.js behavior | Non-blocking | Confirmed correct |
| 7 | `config`/`update:true` is genuine, documented GA4 behavior and a better-suited mechanism than `set` for this use case; Plan does not overclaim it solves the automatic-event question | Non-blocking | Confirmed correct and appropriately hedged |
| 8 | Dropped-parameter-only navigation (`q=shirt`→`q=shirts`) correctly does not fire under the new single-controller Section 5.1 effect body | Non-blocking | Confirmed correct by tracing the actual code, not the old standalone example |
| 9 | Different dynamic resource IDs (`/requests/abc123`→`/requests/xyz789`) correctly fire as separate navigations under the new Section 5.1 effect body | Non-blocking | Confirmed correct |
| 10 | Section 6c.4/20/18(c) all correctly describe only a PASS/BLOCKED gate with zero accept-and-proceed path — except Section 32 (Finding 1) | Non-blocking (see Finding 1) | Confirmed correct everywhere except the one blocking location |
| 11 | Every Owner Decision (1,2,4,5,6,7) has the required substance; Decision 3 records "no consent banner" with no open sub-options | Non-blocking | Confirmed correct |
| 12 | Section 16's file table matches the revised architecture exactly, including no `setSanitizedPageContext` in the current service-file entry | Non-blocking | Confirmed correct |
| 13 | Section 19's test list matches Section 16 with no orphaned old-name references as current requirements | Non-blocking | Confirmed correct |
| 14 | No implementation occurred; only Plan/Review docs and the two required state files changed; no GA4/Firebase/production/environment change occurred | Non-blocking | Confirmed via direct `git status`/`ls` |

---

## Verdict rationale

This whole-Plan pass confirms that the three named architectural/process corrections are
genuinely, substantively resolved in every *forward-facing, currently operative* section
of the Plan: the Server Component/Client Component boundary is real and achievable under
this repo's actual Next.js 15.1.6 setup (Finding 2); the single-controller design
(`usePortalAnalyticsController`) is a real, traceable, single owner of the entire
lifecycle with no remaining dual-ownership conflict, verified against the specific edge
cases the owner's checklist named (Findings 3, 4, 6, 8, 9); and the hard PASS/BLOCKED
production gate is correctly and consistently described everywhere except one place
(Finding 10, cf. Finding 1).

That one place is the reason for `approved_with_changes` rather than `approved`: Section
32 — a section this correction pass did not touch — still narrates the exact rejected
fallback as the Plan's active resolution, with no cross-reference telling a reader it was
later superseded. This is a real, findable inconsistency of the same *kind* the owner's
whole-Plan review was specifically convened to catch (a claim that's true in the section
someone happens to read, false in the document as a whole) — it just happens to be the
one place amendment-scoped verification (which trusts "did this session's own new/edited
sections say what they claim" without necessarily re-reading every older section the new
material logically supersedes) would not surface, since Section 32 itself was not part of
this session's diff.

The fix is narrow — a single supersession note inside Section 32, and removing one dead
parenthetical label at line 1881 — and requires no change to the architecture, the
Owner Decisions, the file table, or the test plan, all of which are otherwise sound.
Hence `approved_with_changes`, not `rejected`.

**Post-review resolution:** this finding has since been resolved directly in the Plan.
With no other blocking issue identified across five Formal Review passes on this goal,
**Implement may now proceed** on the basis of the owner's approved Owner Decisions 1–7
(Plan Section 18).
