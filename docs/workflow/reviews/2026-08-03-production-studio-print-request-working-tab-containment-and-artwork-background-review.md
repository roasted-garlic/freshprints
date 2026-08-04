# Formal Review: Studio Print Request Working-Tab Containment and Artwork Background Plan

Date: 2026-08-03
Plan reviewed: `docs/workflow/plans/2026-08-03-production-studio-print-request-working-tab-containment-and-artwork-background-plan.md`
Branch: `fix/studio-print-request-working-tab-and-artwork-background`
Reviewer stance: independent re-verification against source — re-read every cited file, re-confirmed
every line-number citation, and specifically hunted for scope gaps the Plan's own investigation might
have missed, rather than accepting its narrative as complete.

## Verdict: APPROVED WITH ONE REQUIRED AMENDMENT

Both root-cause diagnoses are independently confirmed correct, precisely scoped, and consistent with
the already-approved PR #37 precedent. This Review found **one concrete scope gap in the Defect B
recommended fix**: the Plan's §6 only proposes adding `artworkBackgroundHex` to
`PrintRequestItemCard.tsx`'s `<DesignThumbnailPanel>` call, but the same component also renders a
`<DesignPreviewLightbox>` (its full-size lightbox view, triggered by clicking the thumbnail) that
independently accepts and requires the identical prop — currently also omitted, and currently also
rendering on the wrong background. This must be added to the Plan's in-scope file list and recommended
fix before implementation begins; it does not change the Plan's conclusion, root-cause diagnosis, or
any other decision, and requires no re-investigation.

## 1. Re-verification of pre-flight git state

Independently re-ran the verification commands: `git status --porcelain` (empty), `git rev-parse
production` and `git rev-parse origin/production` (both `2d2697d022a551fc33bfc1815843e5fa7cfdfa3a`),
`git log -1 --format="%H %s" 2d2697d0...` (confirmed "Merge PR #37: fix Studio print request
deep-link tab integrity"). **Confirmed exactly as the Plan states.**

## 2. Re-verification of Defect A's root cause

Independently re-read `usePrintRequests.ts` in full (330 lines) and re-confirmed the exact cited line
ranges: `mergePrintRequestsById` at lines 53-62 (unconditional ID-keyed merge, zero `queueTab`
awareness), `ensureRequestsLoaded` at lines 236-262 (calls the merge inside an async `setState`
updater with no admission guard). Independently re-confirmed via `grep` that this is the **sole**
call site of `mergePrintRequestsById` in the codebase — the Plan's claim that this is the single
injection point is not merely asserted but structurally verifiable (only one caller exists).

Independently re-traced the race mechanism described in §2.2 of the Plan against
`PrintRequestsPage.tsx`: `activeListTab` is derived from `useSearchParams()` in the same render as
`selectedRequestId`, both driving `usePrintRequests(activeListTab)`'s single argument and the
`ensureRequestLoaded` effect respectively. Confirmed this is a genuine async race, not merely a
theoretical one — `ensureRequestsLoaded`'s `await getPrintRequestsByIds(...)` followed by `await
hydratePage(...)` is two sequential round-trips before its `setState` callback runs, which is easily
slower than a same-tick user click on the Working tab button once the Queued page has already
rendered.

**Additional finding this Review surfaced, not present in the Plan:** `PrintRequestsPage.tsx:538-542`
carries a comment directly asserting the invariant Defect A violates:

```ts
// `requests` already IS the current tab's bounded, server-filtered page (filtered by the
// server-maintained `queueTab` field) — no client-side re-derivation/grouping across tabs is
// needed or possible anymore, since only the active tab's page is loaded (Wave C hydration
// remediation, 2026-07-25). Archived requests are excluded server-side by the callers that
// build tab query options.
const activeTabRequests = useMemo(
  () => requests.filter((request) => isPrintRequestIncludedInListTabs(request.status)),
  [requests],
);
```

`isPrintRequestIncludedInListTabs` (`packages/shared/src/utils/printRequestWorkingTriage.ts:33-35`,
independently re-read) only excludes `status === "archived"` — it has no awareness of `queueTab` at
all, because the surrounding comment's premise ("only the active tab's page is loaded") was true
until `ensureRequestsLoaded`'s contamination path made it false. This is not a defect in
`activeTabRequests` or `isPrintRequestIncludedInListTabs` themselves — both are correctly written for
the invariant they assume — it is confirmatory evidence that the *only* thing that needs to change is
restoring the invariant at its source (`ensureRequestsLoaded`'s merge), exactly where the Plan's
recommended fix already targets. No Plan change required here, but this is worth carrying into the
Implementation Review as an additional confirmation point.

Re-confirmed §2.3's claim that `usePrintRequestDetails.ts` (full file, 227 lines) is a fully
independent hook with its own `useState`, keyed only on `printRequestId`, with zero references to
`usePrintRequests`'s state — **confirmed accurate; no coupling exists to accidentally tighten or
accidentally leave broken.**

Re-confirmed §2.4's claim that every other mutation path in `usePrintRequests.ts` is already safe:
`loadFirstPage`/`loadMore` are server-filtered (`printRequestQueryPlanning.ts:85-86`,
`where("queueTab", "==", ...)`, independently re-read); `insertCreatedRequestLocally`
(`usePrintRequests.ts:305-317`) has its own explicit `if (activeTab !== "working") return;` guard;
`patchRequestLocally`/`patchSummaryLocally` only operate via `.map()`/spread over already-present
entries; `reconcileDeletedOrArchivedRequest`/`reconcileDeletedOrArchivedRequestInState` only
`.filter()`/`.map()` existing entries. **All four independently re-confirmed correct as stated — no
additional guard needed anywhere else in this file.**

## 3. Re-verification of Defect B's root cause — CONFIRMED, with one required amendment

Independently re-read `PrintRequestItemCard.tsx` in full (557 lines). Confirmed the cited
`<DesignThumbnailPanel>` call (lines 400-409) omits `artworkBackgroundHex`. Independently re-read
`DesignThumbnailPanel.tsx` in full (145 lines): confirmed it already accepts the prop (line 18),
already imports `resolveArtworkBackgroundHex` (line 4), and already applies it via a CSS custom
property (lines 47-51) — this component requires no change. Independently re-read
`DesignSelectionCard.tsx`'s relevant sections and confirmed it passes
`artworkBackgroundHex={design.artworkBackgroundHex}` to its own `DesignThumbnailPanel` call — a
valid, already-correct reference pattern.

Independently re-traced the full hydration chain claimed in §3.1: `design.types.ts:24`
(`artworkBackgroundHex?: string` at the top level) → `designService.ts:300-301`
(`mapDesignDocument` copies the raw string through unchanged) → `getDesignById` (`:707`) →
`useReadyDesignsForSelection.ts:49` (calls `getDesignById` per design ID, full `Design` object, no
slim projection) → `PrintRequestsPage.tsx`'s `designById` map → passed as the `design` prop into
`PrintRequestItemCard`. **Confirmed accurate at every step — the field is present and correctly
hydrated; only the final render call omits it, exactly as the Plan states.**

**Required amendment — a genuine scope gap this Review found, not present in the Plan:**
`PrintRequestItemCard.tsx:548-553` (independently re-read, immediately following the closing `</Card>`
tag the Plan's own citation ends at) renders a second consumer of the same design's artwork:

```tsx
<DesignPreviewLightbox
  alt={`${title} preview`}
  isOpen={isLightboxOpen}
  onClose={() => setIsLightboxOpen(false)}
  previewUrl={previewUrl ?? null}
/>
```

`DesignPreviewLightbox.tsx` (independently re-read via targeted grep) **independently accepts and
applies its own `artworkBackgroundHex` prop** (lines 9, 17, 41-44 — a separate `imageStyle` computed
via the same `resolveArtworkBackgroundHex` utility, applied as both a CSS custom property and a direct
`backgroundColor`). `DesignSelectionCard.tsx` — the Plan's own cited reference pattern — already
passes `artworkBackgroundHex={design.artworkBackgroundHex}` to **both** its `DesignThumbnailPanel`
call **and** its `DesignPreviewLightbox` call (confirmed via direct re-read of both call sites in that
file). The Plan's §6 recommended fix and §5 in-scope file list only mention the
`DesignThumbnailPanel` call inside `PrintRequestItemCard.tsx`, silently omitting this second,
sibling call site within the exact same file and exact same component.

**Concrete consequence if unaddressed:** clicking a Print Request item's thumbnail to open its
lightbox (an existing, already-wired interaction — `onImageClick={() => setIsLightboxOpen(true)}` at
line 408, `isLightboxOpen` state already present) would show the artwork on the **default** grey
background even after the primary fix ships, directly contradicting this task's own acceptance
criterion "Image fit, dimensions, quantity, DPI badge, preview path, and lightbox behavior remain
unchanged" — read literally that criterion could be satisfied by leaving the lightbox's (already
wrong) background as-is, but the stated *goal* of this task ("each request item's artwork preview
uses the design's saved `artworkBackgroundHex`... instead of reverting to the default background")
does not distinguish between the inline thumbnail and the lightbox view of the same artwork; a staff
member who opens the lightbox to inspect the Yellowstone design more closely would still see the
wrong mat color, which is the exact symptom class this task was opened to fix.

**Required change to the Plan before implementation:** add
`artworkBackgroundHex={design?.artworkBackgroundHex}` to `PrintRequestItemCard.tsx`'s existing
`<DesignPreviewLightbox>` call (lines 548-553) as well, in the same commit as the
`DesignThumbnailPanel` fix. No other file is implicated — `DesignPreviewLightbox.tsx` itself already
correctly supports the prop and needs no change, identical to `DesignThumbnailPanel.tsx`'s situation.
This is a one-line addition, matching the size and risk profile of the fix already planned; it does
not expand the Plan's architectural scope, does not touch a new file, and does not require new
investigation — the mechanism, fallback behavior, and reference pattern are already fully established
by the Plan's own §3 findings. Test Planning item 3 (the prop-resolution helper) should also cover
this second call site if both calls end up sharing one extracted helper, or should be duplicated as a
second trivial assertion if they remain separate inline expressions — an implementation detail to
finalize during the Test phase, not this Review.

## 4. Re-verification of "no production Firebase change" and scope boundaries

Re-confirmed via `grep`/inspection that neither defect's fix (including this Review's lightbox
amendment) touches Firestore Rules, indexes, Cloud Functions, the `PrintRequest`/`Design` document
schema, or any Storage object. Re-confirmed `usePrintRequestAllocationTotals.ts` is not mentioned as
an in-scope file anywhere in the Plan and is correctly carried forward as a separate, out-of-scope
finding (consistent with both the PR #37 Plan-phase Review and Implementation Review's treatment of
the same hook). Re-confirmed no Portal file is proposed for change — Portal is the reference-correct
rendering per the owner's own reproduction and is appropriately left untouched.

## 5. Re-verification of Test Planning against actual repository state

Independently confirmed via `find`/`grep` across the full Studio app: zero `.test.tsx` files exist,
and no `package.json` in the repository declares `@testing-library/react` or `jsdom` as a dependency.
**Confirmed the Plan's conclusion that Defect B's regression coverage cannot be a rendered-component
test is accurate**, and its proposed approach (extract/assert the prop-resolution logic as a plain,
directly-testable expression or small helper, following the existing `reconcileDeletedOrArchivedRequest.ts`
convention) is the only pattern consistent with this repository's established testing approach.
Independently confirmed `mergePrintRequestsById` is already `export`ed specifically for direct
unit-testing (no other reason for a pure two-array helper function inside a hook file to be exported)
and has no existing test file — consistent with the Plan's proposal to add one, following the same
convention as `reconcileDeletedOrArchivedRequest.test.ts` in the same directory.

## 6. Scope, constraints, and required-output compliance check

- No application source code was modified by the Plan or by this Review — confirmed via `git status
  --porcelain` (only the Plan document present) before writing this Review.
- No invented file path found anywhere in the Plan — every path cited was independently re-opened and
  re-confirmed to exist with the cited content during this Review, including the one path this Review
  adds (`PrintRequestItemCard.tsx`'s `DesignPreviewLightbox` call, lines 548-553, within a file the
  Plan already correctly identified — not a new file).
- No Portal file, Firestore Rule, index, or Function is proposed for change anywhere, including in
  this Review's amendment.
- No new dependency proposed anywhere, including in this Review's amendment.
- No revival of the abandoned Storage-backed read model — not proposed anywhere.
- Human checkpoints carried forward correctly, including the standing "stable `1.0.0` release draft
  remains unpublished" checkpoint from the prior task.

## Verdict detail

**APPROVED WITH ONE REQUIRED AMENDMENT** — both root-cause diagnoses (Defect A: `usePrintRequests.ts`'s
unguarded `ensureRequestsLoaded` merge; Defect B: a missing prop pass in
`PrintRequestItemCard.tsx`) are independently confirmed correct at the mechanism level, matching the
task's own investigation requirements precisely. The required amendment (§3 above) extends Defect B's
fix to a second call site within the same already-identified file
(`PrintRequestItemCard.tsx`'s `<DesignPreviewLightbox>`, alongside its already-planned
`<DesignThumbnailPanel>` fix) — it does not change the Plan's root-cause diagnosis, architecture
decisions, scope boundaries, or Defect A fix in any way. Implementation may proceed once the owner
supplies the approval phrase below, on the understanding that the Implement phase applies the
`artworkBackgroundHex` prop to both `PrintRequestItemCard.tsx` call sites in the same change, and that
the Test phase's Defect B coverage accounts for both.

## Approval phrase to begin implementation

`APPROVE STUDIO PRINT REQUEST WORKING-TAB CONTAINMENT AND ARTWORK BACKGROUND IMPLEMENTATION`

(No narrower phrase is required — the amendment is a same-file scope extension of an already-planned
fix, not a new defect or a new architectural decision requiring separate gating.)

## Confirmation

No application source code was read-write modified during this Review. Only this document was
created.
