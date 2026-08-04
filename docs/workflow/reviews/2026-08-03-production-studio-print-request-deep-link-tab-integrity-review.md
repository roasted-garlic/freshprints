# Formal Review: Studio Print Request Deep-Link Tab Integrity Plan

Date: 2026-08-03
Plan reviewed: `docs/workflow/plans/2026-08-03-production-studio-print-request-deep-link-tab-integrity-plan.md`
Reviewer stance: independent re-verification against source — not a rubber stamp. This review
re-ran the key file reads and re-derived the mechanism claims from scratch rather than accepting
the Plan's narrative at face value.

## Verdict: APPROVED WITH REQUIRED AMENDMENT

The Plan's overall diagnosis is sound and its architecture-authority correction (§2 of the Plan) is
verified accurate. However, this Review found the Plan **understates the precision and severity of
Defect A's root cause** in a way that matters for how the eventual fix and its test are scoped.
The Plan must be read together with §1 of this Review before implementation begins; no re-issuance
of the Plan document is required, but the amendment below is binding.

## 1. Re-verification of §2 (architecture authority correction)

Independently re-read `packages/shared/src/types/printRequest/printRequest.types.ts:25-34`,
`functions/src/onPrintRequestQueueTabInputsWritten.ts` in full, and ADR-FP-121
(`docs/project/DECISIONS.md:373-427`). Confirmed exactly as the Plan states: `queueTab` is a
Functions-maintained mirror of `derivePrintRequestListTab`'s output, not an independent authority,
and the two are designed to always agree modulo trigger propagation latency. The Plan's correction
of the originating task brief's assumption is accurate and appropriately called out rather than
silently substituted. **No issue.**

## 2. Re-verification of Defect A — and a required amendment

Re-read `UpcomingShowsPage.tsx` lines 108-125 and 445-457, which the Plan's Defect A section does
not cite. This traces exactly where `requestAllocationTotals` (the input the Plan says "may be
stale") actually comes from:

```ts
const { totalsByRequestId: allocationTotalsByRequestId } = usePrintRequestAllocationTotals();
```

`usePrintRequestAllocationTotals()` (`apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequestAllocationTotals.ts`)
loads `upcomingShowService.listAllShowAllocations(user)` — **every show allocation in the entire
collection, across every show** — exactly once on mount, via a `useEffect` with no dependency that
would ever re-trigger it. `UpcomingShowsPage.tsx` destructures only `{ totalsByRequestId }` from this
hook's return value; `reload` (which the hook does expose) is **never called anywhere in this file**.

This means:

1. **The Plan's characterization of Defect A as "may be stale... contingent on freshness" is too
   soft.** `allocationTotalsByRequestId` on this page is not a value that merely *can* race a fresh
   write — it is a **single point-in-time snapshot taken once at page mount that is never refreshed
   for the lifetime of the mounted page**, full stop. Adding a request to a show via `+ Add Print
   Request` (`handleAddRequestToShow`-equivalent flow, confirmed elsewhere in this file to call
   `reloadAllocations()` — the *show's own* allocations for the `useShowAllocations` hook — but not
   `usePrintRequestAllocationTotals`'s `reload`) will correctly update `requestGroups`/
   `attachedRequestIds`/the "Attached Print Requests" list membership itself, but the
   `requestAllocationTotals` used to compute `requestTab` for the newly-added row's link **will not
   reflect the new allocation until the entire page is remounted** (e.g., navigating away and back,
   or a full app reload). This is not a narrow race window measured in milliseconds; it is a
   deterministic, 100%-reproducible staleness for the remainder of that page session.
2. **This exactly matches the owner's reported scenario as the most parsimonious explanation**: add
   a print request to a show, then click its link without leaving/remounting the Show Queue page —
   `requestAllocationTotals` for that request is still the pre-add zero/default value fetched at
   mount, `derivePrintRequestListTab` correctly computes `"working"` from those (accurate-at-mount,
   now-stale) zero totals, and the link is built with `tab=working` — even though the request's
   actual `queueTab` on its own document has already flipped to `"queued"` by the time the owner
   clicks.
3. **Separately, and independently of the staleness question**: `usePrintRequestAllocationTotals`
   itself is a full-collection scan (`listAllShowAllocations` with no bound, no per-show or
   per-request filter) — a second, previously-unflagged violation of this task's explicit
   architecture constraint ("no full-collection scans"), sitting directly upstream of Defect A. The
   Plan's §5 ("What is explicitly NOT the cause — ruled out") does not mention this hook at all and
   should have; this Review adds it as a finding rather than accepting the Plan's ruled-out list as
   complete.

**Required amendment to the Plan before implementation:** §3 and §6 (Required Decision 1) must be
read as follows — the recommended fix (prefer `matchedRequest?.queueTab`, the value already present
on the request document already being fetched via `ensureRequestsLoaded`/the paged tab queries) is
**still the correct fix and remains approved**, and it has the added benefit of sidestepping
`usePrintRequestAllocationTotals`'s staleness entirely for this call site, since `queueTab` doesn't
depend on that hook at all. But the Plan's test plan (§10) must include a specific regression case
for the "add to show without remounting, then click the link immediately" sequence — the softer
"stale summary/allocation-totals" framing in the original Plan would have permitted a weaker test
that only exercises a narrow race window rather than this deterministic same-session scenario. This
Review does **not** require re-scoping `usePrintRequestAllocationTotals`'s full-collection-scan
pattern itself into this task's implementation — it predates this investigation, serves other
consumers of this hook beyond the one call site in scope here, and fixing it is a larger, separable
concern than this deep-link defect. It should be recorded as a new, separate tech-debt/architecture
finding, not folded into this fix's scope.

## 3. Re-verification of Defect B

Independently re-read `useShowQueuePrintRequests.ts` and `showQueuePrintRequestSources.ts` in full.
Confirmed the Plan's mechanism exactly: `ensureRequestsLoaded` is destructured only from the
`working` source's `usePrintRequests("working")` instance, is called unconditionally for every
attached request ID regardless of that request's actual `queueTab`, and `mergePrintRequestsById`
(inside `usePrintRequests.ts`) performs a plain ID-keyed merge into that `working` instance's own
`state.requests` with no `queueTab` filter. `mergeShowQueuePrintRequestSources` then unions all three
sources' `requests` by ID with no tab filtering either. Also independently re-confirmed the Plan's
claim that this **does not** leak into `PrintRequestsPage.tsx` — that page calls its own, separately-
mounted `usePrintRequests(activeListTab)` instance (a distinct React hook call site with its own
`useState`), and the only shared-module state involved, `printRequestsPageReadCache.ts`, is keyed by
query-result cache keys (`list:{tab}:page-1`, `counts`) written exclusively by
`loadPrintRequestsPageCached`, never touched by `ensureRequestsLoaded`'s in-memory merge path.
**Confirmed accurate, no amendment required.**

## 4. Re-verification of the "ruled out" list (§5 of the Plan)

- Firestore Rules/permissions: correctly ruled out — both pages already read data successfully in
  the reported scenario; no permission-denied symptom was reported.
- Wave C read cache: correctly ruled out per the analysis in §3 above (re-confirmed independently,
  not just accepted from the Plan).
- `queueTab` backfill gap: plausible ruling-out, though this Review notes it was not independently
  re-verified against the actual reported request's document (no Firestore console access in this
  environment) — accepted on the reasoning given (a live, actively-allocated, freshly-created 2026
  request cannot be a pre-migration legacy document), which is sound.
- **Amendment**: as found in §2 above, this list should also now include
  `usePrintRequestAllocationTotals`'s full-collection-scan pattern as a **related but out-of-scope**
  finding, explicitly not silently absent from the record.

## 5. Scope, constraints, and required-output compliance check

- No application source code was modified by the Plan or by this Review — confirmed via `git status
  --porcelain` before writing both documents (clean tree; only the two new docs files created).
- No invented file paths found anywhere in the Plan — every path cited was independently re-opened
  and re-confirmed to exist with the cited content during this Review.
- No Portal file, Firestore Rule, index, or Function is proposed for change — confirmed correct scope
  boundary.
- No new dependency proposed.
- No revival of the abandoned Storage-backed read model — confirmed not proposed anywhere in the
  Plan.
- Human checkpoint carried forward correctly: stable `1.0.0` release draft remains unpublished.

## 6. Verdict detail

**APPROVED WITH REQUIRED AMENDMENT** — the Plan's two root-cause diagnoses (Defect A, Defect B) are
independently confirmed correct at the mechanism level. The required amendment (§2 above) sharpens
Defect A from a probabilistic race condition to a deterministic same-session staleness bug and adds
one required test scenario; it does not change the recommended fix, scope boundaries, or file list
in the Plan's §6/§7/§8, all of which remain approved as written. Implementation may proceed once the
owner supplies the approval phrase in the Plan's §9, on the understanding that the Implement phase's
test plan incorporates this Review's §2 amendment.

## Confirmation

No application source code was read-write modified during this Review. Only this document was
created.
