# Plan: Portal Add to Show Unmissable (Current Request UX)

| Field | Value |
|-------|-------|
| Date | 2026-08-18 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Goal id | `portal-add-to-show-unmissable` |
| Related | docs/workflow/reviews/2026-08-18-portal-add-to-show-unmissable-review.md |

---

## Goal

Make it obvious in the Portal that building a Current Request is not the end of the flow. Customers must **review the request, choose a show, and add the request to that show**. This is **copy and presentation only** on existing Portal surfaces. Navigation, show picker, callable queue path, and request lifecycle stay unchanged.

This goal is **separate from** `portal-design-engagement-analytics`. It may share a later `development` → `production` Portal rollout, but it is not analytics work and must not mix GA4 changes into this diff.

### DEV QA amendment (2026-08-18)

Owner reviewed the request-review header and asked to replace **Choose a Show** with **Add Request to Whatnot Show**, and to make that button wider/more prominent on desktop and full-width on mobile. Click still only opens `PortalQueueToShowModal`. Modal submit remains **Add to show**.

---

## Background

Customers may treat the Current Request drawer like a conventional ecommerce cart. The primary CTA is currently generic **Review Request**, which can imply they are nearly finished. The product already requires a separate add-to-show step (ADR-FP-066: customer self-queue via trusted callables; one show; no client allocation writes).

Owner screenshots (2026-08-18) show:

- Drawer primary: **Review Request**
- Request-review header competing actions: **Upload Designs**, **Browse Design Library**, **Add Request to Show**

Mental model after this change:

Browse / upload → build Current Request → review request → choose a show → add request to show

---

## Repo inspection (exact paths)

Do not invent paths. Located 2026-08-18 on `development` @ `60f0086`.

| Surface | Exact path | Current behavior |
|---------|------------|------------------|
| **"Current Request"** drawer title + **"Review Request"** CTA | `apps/portal/features/print-requests/components/CurrentRequestDrawer.tsx` | Header `h2` "Current Request" (~441). Filled footer `Link`/`button` copy **"Review Request"** (~675–692). `href={reviewHref}` or `handleReviewWhileCreating`. Does **not** open the show picker. |
| Review-id resolver (nav unchanged) | `apps/portal/features/print-requests/utils/resolveCurrentRequestReviewId.ts` | Prefers working request id, else pending id. |
| Review **route** | `apps/portal/app/(app)/requests/[id]/page.tsx` | Dynamic-imports `PrintRequestDetailView`. |
| Review **page / header CTAs** | `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx` | Drawer lands here. `canQueueToShow = isEditable && items.length > 0 && unallocatedQuantity > 0` (~375). Header when `canQueueToShow`: Upload Designs, Browse Design Library, **Add Request to Show** (~401–430). The show button only calls `setIsQueueModalOpen(true)` — it does **not** queue. Second header branch `isEditable && hasAttachedDesigns` (~432–454): Upload + Browse only. Empty-state section still has Upload / Browse (~486–517). |
| Back link ("Back to Design Library") | `apps/portal/features/print-requests/utils/portalRequestDetailReturn.ts` | `from=library` → `{ href: '/catalog', label: 'Back to Design Library' }`. Rendered in `PrintRequestDetailView` (~379–382). |
| Show picker modal (actual add) | `apps/portal/features/print-requests/components/PortalQueueToShowModal.tsx` | Opened from detail. Footer primary **"Add to show"** (~628–635) runs `handleRequestAddToShow` (existing callable). |
| Editable vs queued | `apps/portal/features/print-requests/hooks/usePrintRequestDetail.ts` | `isEditable = status === 'draft' \|\| status === 'editing'` (~635–636). After queue, `reconcileQueued` sets status `'active'`. |
| Working cart (drawer-only) | `apps/portal/features/print-requests/context/PortalPrintRequestContext.tsx` | Drawer is the Current Request / working cart. Queue success in detail calls `resetWorkingCart()` + `closeCurrentRequestDrawer()`. |
| Collapsible help on review | `apps/portal/features/print-requests/components/PrintRequestDetailGuide.tsx` | Summary label is **"How this works"** (not "How print requests work"). Body already says: "When you are ready, add this request to a show's print run." |
| Help FAQ | `apps/portal/features/help/portalHelpContent.ts` | `start-print-request` already: "then queue the request to an upcoming Fresh Prints Whatnot show when you are ready." |
| Requests-list tab copy | `apps/portal/features/print-requests/utils/portalPrintRequestTabCopy.ts` | Working tab already mentions adding to a show. |
| Drawer CSS | `apps/portal/styles/shell.css` | `.current-request-drawer-*` (~2097–2582). Footer is a column with `gap`. Unused `.current-request-drawer-subtitle` exists (muted, 0.8125rem). |
| Review header CSS | `apps/portal/styles/requests.css` | `.portal-request-detail-header*` (~568+), `.portal-request-detail-header-actions` (~1178+), `.portal-request-detail-meta-pill` (~609). |
| Muted helper class | `apps/portal/app/globals.css` | `.portal-muted` (~311) — secondary text, not alert. |
| Out of scope sibling | `apps/portal/app/(app)/requests/artwork/page.tsx` | Success CTA still **"Review Request"** (~93). Not the drawer. Leave unchanged. |

**Wiring check:** Drawer CTA navigation is not a defect. It correctly goes to `/requests/{id}` (review). Show selection happens later via `PortalQueueToShowModal`. Do **not** bypass review, auto-queue, or auto-select a show.

---

## Scope

### In Scope

1. **Current Request drawer**
   - Primary CTA copy: **Review & Add to Show** (both the `Link` and the preparing `button`, including `aria-label`).
   - Keep `Preparing request…` while the id is resolving.
   - Subtle helper **immediately above** the primary CTA (filled drawer only): `Next step: review your request, then add it to a show.`
   - Optional status cue: **Needs a show** as a small subdued pill/line in the drawer header summary area when the drawer is showing a non-empty working request.

2. **Request-review page** (`PrintRequestDetailView`)
   - Remove **Upload Designs** and **Browse Design Library** from the **primary header action area** (both the `canQueueToShow` branch and the `isEditable && hasAttachedDesigns` branch).
   - Keep **Back to Design Library** (existing back link).
   - Keep empty-state Upload / Browse when there are **no items** (that is not the competing header trio; customers still need a way to add the first design on an empty review page).
   - Show-related header CTA becomes the only prominent header action when `canQueueToShow`. Copy: **Choose a Show** (truthful: it opens the picker).
   - Supporting muted lines near the header / show CTA (not a warning banner):
     - `When your request is ready, add it to a show to have your prints included.`
     - `Final step: choose the show you want this request added to.`
   - Do **not** show "Needs a show" on queued / non-editable requests.

3. **How print requests work / How this works**
   - Inspected: `PrintRequestDetailGuide` and Help FAQ already state that the request must be added / queued to a show.
   - **No copy change** unless Formal Review requires a one-sentence tweak. Preferred: omit to avoid overdoing.

4. **Automated copy tests** (source-read, existing Portal pattern) plus Portal typecheck.

5. **Doc updates:** ROADMAP current-work note; handoff `CURRENT-STATE.md` at signoff. No ADR (no architecture/lifecycle change).

### Out of Scope

- Backend, Functions, Firestore Rules, indexes, schema, new fields, new listeners, polling, new callables
- Changing `PortalQueueToShowModal` behavior or its **"Add to show"** submit copy (that button **does** perform add-to-show)
- Auto-queue, auto-select show, skip review
- Catalog cards, design modal reminders, toasts, blocking modals
- Making Working requests look invalid
- Artwork-page **"Review Request"** CTA (`requests/artwork/page.tsx`)
- Global Help FAQ rewrite
- `portal-design-engagement-analytics`
- Production / App Hosting
- New branches or worktrees (ADR-FP-137)

---

## Optional "Needs a show" — derived-state decision

**Include it, drawer-only.**

Existing state is enough. No new reads:

| Surface | State | Safe? |
|---------|-------|-------|
| Drawer | `workingRequest && !isEmpty` (`CurrentRequestDrawer` already has both) | **Yes.** This drawer only presents the Current Request / working cart. After a successful queue, detail already calls `resetWorkingCart()` and `closeCurrentRequestDrawer()`. A queued request does not remain in this drawer. |
| Review page queued | `!isEditable` / status `active` | **Do not** add "Needs a show" here. Existing status pill already covers non-editable requests. |
| Review page working | `canQueueToShow` | Optional extra cue is redundant with the new header copy; skip to avoid clutter. |

Preferred copy on the drawer: **Needs a show** (short pill). Fallback **Not added to a show yet** only if the pill wraps badly; default to **Needs a show**.

Must **not** appear after the request is queued.

---

## Approach

1. **Drawer CTA** in `CurrentRequestDrawer.tsx`
   - Replace visible **"Review Request"** and matching `aria-label` with **"Review & Add to Show"**.
   - Do not change `reviewHref`, `handleReviewWhileCreating`, or close-on-navigate.

2. **Drawer helper** in the filled footer, **above** the primary button
   - New muted paragraph; CSS in `shell.css` (reuse subtitle scale / `--color-text-secondary`). Not `role="alert"`. Not the existing full-request callout (that uses `TriangleAlert`).

3. **Drawer status cue**
   - When `workingRequest && !isEmpty`, render a subdued pill next to the "Current Request" heading or summary (header, not item rows) so long design titles in the list cannot collide with it.

4. **Review header** in `PrintRequestDetailView.tsx`
   - `canQueueToShow` header actions: **only** the show button, relabeled **Choose a Show**. Keep `onClick={() => setIsQueueModalOpen(true)}`.
   - `isEditable && hasAttachedDesigns && !canQueueToShow`: **no** Upload/Browse header buttons (allocation may still be loading; do not invent a disabled show button).
   - Place the two muted supporting sentences in header copy (under title/pills) and/or immediately beside the show CTA so they stay secondary. Use `.portal-muted`. Not `role="alert"`.

5. **Empty review body**
   - Leave Upload Designs / Browse Design Library in the empty-state panel.

6. **Guide / FAQ**
   - No edit unless Review requires it.

7. **Tests**
   - Source-read tests next to the components (see Test Strategy).
   - Portal typecheck.

8. **Docs**
   - Short ROADMAP note that the drawer/review copy now names add-to-show as the next step.

---

## CTA truth table (must not lie)

| Control | What click does | Copy |
|---------|-----------------|------|
| Drawer primary | Navigate to `/requests/{id}` review | **Review & Add to Show** |
| Review header (when `canQueueToShow`) | `setIsQueueModalOpen(true)` | **Choose a Show** |
| Modal primary | Existing `queuePortalPrintRequestToShow` path | Keep **Add to show** |
| Artwork success | Navigate to review | Keep **Review Request** (out of scope) |

Do not label the review-header button **Add to Show** / **Add Request to Show** — it only opens the picker.

---

## Acceptance criteria

1. Current Request drawer no longer uses the generic primary CTA "Review Request".
2. Drawer primary CTA reads **Review & Add to Show**.
3. Drawer includes the subtle helper: `Next step: review your request, then add it to a show.`
4. Existing button behavior/navigation is preserved.
5. Review flow clearly states that choosing a show is the final step.
6. The CTA that opens show selection clearly communicates show selection (**Choose a Show**).
7. Existing "How this works" / Help copy already mentions adding the request to a show — no extra tutorial; leave as-is unless Review requires a one-line tweak.
8. "Needs a show" uses only existing derived Portal state (non-empty working drawer).
9. No new backend read/listener/write for the reminder.
10. No request lifecycle/status/schema behavior changes.
11. Already-queued requests are not labeled "Needs a show".
12. Mobile and desktop Current Request drawer remain visually clean.
13. Long design titles / multiple request items do not collide with the new helper/status copy.
14. Existing Add to Show flow still works unchanged.
15. Request-review page no longer shows Upload Designs / Browse Design Library in the primary **header** action area.
16. Back to Design Library remains available.
17. The show-related CTA is the only prominent header action (when the request can queue).
18. CTA copy accurately reflects opening show selection vs performing add-to-show.
19. Supporting copy explains that the request must be added to a show.
20. No upload/browse functionality is removed from the Portal globally (nav, drawer empty state, empty review body, artwork page).
21. No show-picker/backend/lifecycle behavior changes.
22. Desktop and mobile layout remain clean after removing the two header buttons.
23. The review page feels like a focused finalization step rather than another browsing page.

---

## Owner DEV QA checklist

**Drawer**

A. Put at least one design in Current Request.

B. Open the Current Request drawer.

Confirm:

- "Review & Add to Show" is prominent
- helper says the next step includes adding to a show
- "Needs a show" appears for the working request with items
- layout still looks clean on desktop/mobile

C. Follow the CTA into request review.

Confirm:

- review page makes it obvious that the request still needs a show
- next CTA is **Add Request to Whatnot Show** (opens picker; does not skip review; wider on desktop, full-width on mobile)

**Review page**

Confirm:

- Upload Designs is gone from the header
- Browse Design Library is gone from the header
- Back to Design Library still works (when `from=library`)
- show CTA is visually dominant
- supporting copy makes the next step obvious
- empty review (no items) still has Upload / Browse in the empty panel
- adding more designs still works through normal Portal navigation / Current Request

**Add to show (unchanged behavior)**

D. Complete the normal existing Add to Show flow.

Confirm:

- no behavior change
- no unexpected extra step
- request queues normally
- modal still uses **Add to show** for the actual queue action

E. Re-open request/progress UI after it is queued.

Confirm:

- no "Needs a show" reminder on a request already added to a show
- Current Request drawer is empty / reset (existing behavior)

F. Check How this works (review-page guide) and/or Help.

Confirm the full flow is understandable:

add designs/uploads → review Current Request → add request to a show

---

## Affected Areas

### Files / Modules (expected)

- `apps/portal/features/print-requests/components/CurrentRequestDrawer.tsx`
- `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx`
- `apps/portal/styles/shell.css`
- `apps/portal/styles/requests.css` (only if header helper/CTA layout needs a small rule)
- New source-read tests next to the touched components
- `docs/project/ROADMAP.md` (short current-work / completed note)
- `.cursor/workflow/state.md` and handoff current-state at phase transitions / signoff

### Architecture Impact

- [x] None — existing Portal feature components only; no new feature layer

### Security Impact

- [x] None — no auth, rules, or data-exposure change

### Data Model Impact

- [x] None — no Firestore field, status, or schema

### Backend Impact

- [x] None — existing `queuePortalPrintRequestToShow` path unchanged (ADR-FP-066)

### UI / UX Impact

- [x] Details: Drawer CTA + helper + optional pill; review header de-clutter + **Choose a Show** + muted instructions. Manual owner DEV QA required (desktop + mobile).

### Migration Impact

- [x] None

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Lint | none dedicated at repo root for this slice | no — document if not run |
| Unit tests | `npx tsx --test` on new source-read tests + any existing print-request tests that would break on copy | yes |
| Build | `npm run build:portal` | no for this copy-only DEV signoff unless typecheck is insufficient |
| Integration | n/a | no |
| E2E | n/a | no |
| Backend/rules | n/a | no |

Source-read tests should prove:

- `CurrentRequestDrawer.tsx` contains **Review & Add to Show** and the next-step helper; no filled-footer **"Review Request"** CTA
- `PrintRequestDetailView.tsx` header `canQueueToShow` block does not contain Upload Designs / Browse Design Library; contains **Choose a Show**; contains the supporting sentences
- Empty-state Upload / Browse strings remain in `PrintRequestDetailView.tsx`
- `PortalQueueToShowModal.tsx` still has **Add to show** as the submit label
- Drawer "Needs a show" is gated with the existing non-empty working condition in source

### Manual

- [x] Owner DEV QA checklist above (desktop + mobile). Automated tests cannot prove visual hierarchy or that queued requests are not mislabeled in the live UI.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review — owner DEV QA (desktop + mobile Current Request drawer + review page + add-to-show)
- [ ] Design approval
- [ ] Business logic decision
- [ ] Production deploy — later, separate `development` → `production` PR + App Hosting authorization; **not** this phase
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars
- [x] Other: Signoff waits on owner DEV QA result (`PASS` / `FAIL` / `PASS WITH NOTES`)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Header flash: `unallocatedQuantity` starts at 0 so `canQueueToShow` is false until allocation loads | Medium | Hide competing Upload/Browse whenever the request has items and is editable; do not invent a new show button. Brief absence of Choose a Show during load is acceptable. |
| "Needs a show" on a queued request | High | Cue only in the working Current Request drawer; never on `!isEditable` detail. |
| Helper looks like an error | Medium | Muted secondary text; no alert role; no warning icon. |
| CTA lies ("Add to Show" but only opens picker) | High | Review header = **Choose a Show**; modal keeps **Add to show**. |
| Scope creep into analytics / catalog | High | Separate goal; no GA4; no catalog-card reminders. |
| Empty review page loses add-design entry | Medium | Keep empty-state Upload / Browse; keep global nav and drawer empty actions. |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert the Portal component/CSS/copy commits on `development`. No data migration. No Functions/Rules rollback. Production is unchanged until a later PR.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [ ] DATA_MODEL.md
- [ ] BACKEND.md
- [ ] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [x] DECISIONS.md — no new ADR (copy-only; ADR-FP-066 / ADR-FP-076 unchanged)
- [x] Other: `docs/project/ROADMAP.md`; `references/project-chatgpt-handoff/CURRENT-STATE.md` at signoff

---

## Open Questions

- [x] None that block planning. Guide/FAQ already mention add-to-show; plan omits extra help copy.

---

## Approval

- Review doc: docs/workflow/reviews/2026-08-18-portal-add-to-show-unmissable-review.md
- Verdict: approved
