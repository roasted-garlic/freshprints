# Fresh Prints — Current State Snapshot

> **Refresh before every external AI session.**
> Source: `.cursor/workflow/state.md` (authoritative) + `docs/project/ROADMAP.md`
> Last updated: **2026-07-05**

---

## At a Glance

| Field | Value |
|-------|-------|
| **App** | Fresh Prints — DTF design catalog & print planning |
| **Active app** | Fresh Prints Studio (Electron desktop, staff only) |
| **Roadmap phase** | **Phase 7** — Show Queue (combined Whatnot show + print run) — **SIGNED OFF PASS on 2026-07-05**; live Whatnot sync still planned for a future phase |
| **Managed workflow goal** | `print-runs-foundation` — **complete and signed off**; see `docs/workflow/reviews/2026-07-05-print-runs-foundation-signoff.md` |
| **Workflow phase** | signoff (closed) |
| **Status** | Phase 7 Show Queue foundation complete. `/show-queue` is the single combined Whatnot-show/print-run workflow; `/print-runs` redirects to it; `upcomingShows`/`showAllocations` are canonical. |
| **Human checkpoint** | Dev Firestore rules deploy remains outstanding and requires separate approval: `firebase deploy --only firestore:rules --project fresh-prints-dev` (needed for the `editing` `printRequests.status` value and `upcomingShows`/`showAllocations`/`settings/showQueue` rules to work live). No other checkpoint open. |

---

## Workflow Snapshot (FF)

```txt
Mode:           managed-phase
Goal:           print-runs-foundation
Phase:          test
Status:         implementation complete; automated verification passed; manual authenticated QA pending
Plan:           docs/workflow/plans/2026-07-04-print-runs-foundation-plan.md
Test report:    docs/workflow/reviews/2026-07-04-print-runs-foundation-test-report.md
Signoff:        pending
DONE:           no
```

### Current Managed Phase (Phase 7 — Show Queue)

`print-runs-foundation` originally split Phase 7 into `upcomingShows` (schedule) and `printRuns`/
`printRunItems` (production) as two collections and two pages. Manual QA on 2026-07-05 **failed**:
the manual-add modal required typing a Whatnot show ID instead of parsing it from a URL, had no
date/time picker, and a Firestore `orderBy("scheduledStartAt")` query silently excluded shows missing
that field so saved shows never appeared in the list or could be attached to a run. The user also
corrected the product model: a Whatnot show is its own print run, so the two workflows were combined.

The corrected model (see `docs/project/DECISIONS.md` ADR-FP-049, supersedes ADR-FP-048):
`upcomingShows` is now the single combined show/print-run entity with a separate `productionStatus`
field (open/full/printing/fully_printed/completed/archived/canceled) alongside the existing Whatnot
`status`, plus staff-editable capacity (`maxTotalQuantity`/`allocatedQuantity`/`maxQuantityOverridden`).
A new `showAllocations` collection (replacing `printRunItems`) allocates Print Request item quantities
to a show, supporting a request being split across multiple shows. `printRuns`/`printRunItems` and the
`/print-runs` feature were removed; `/print-runs` redirects to `/show-queue`. Print Request queue/print
state (`not_queued`/`partially_queued`/`queued`/`partially_printed`/`printed`) is derived live from
allocations, not persisted. Live Whatnot fetch/sync, a scheduled Function, a manual-refresh callable,
and Pensacola export remain planned and unimplemented.

A second manual QA pass on the combined model then failed on UI/flow polish (see ADR-FP-050): dark-theme
readability of the Add to Show / Add Print Request pickers, a show-title-first layout instead of a
date-grouped one, per-item attach instead of whole-request attach, no confirm step on removal, no
default-capacity setting, unnecessary intro/header copy, a buried/undisabled `Add to Show` action,
vertically stacked Show Detail pills, a confusing chevron toggle on Request Detail, and no control over
which monitor the Whatnot link opened on. All were corrected: `AddToShowModal`/`+ Add Print Request`
now use a compact date-grouped selector and readable dark-theme cards; `+ Add Print Request` attaches
a whole Print Request in one action; removal uses a two-step confirm; a Show Queue settings cog exposes
a default show capacity (`settings/showQueue`, direct client read/write) applied only to new shows;
intro copy was removed and `Add to Show` moved to a prominent, items-gated action area; Show Detail
pills align horizontally; Request Detail uses a bottom-right `Edit` button; and external links (the
Whatnot show URL) now open in an in-app window positioned on the same display as the app via a new
`fresh-prints:app:open-external-link` IPC channel (Electron cannot control the real OS default
browser's placement, so this trades that off for guaranteed same-monitor behavior).

No Firebase deploy was performed; local (undeployed) Firestore rules edits exist for `upcomingShows`,
`showAllocations`, and the new `settings/showQueue` doc.

A third manual QA pass then failed on split-allocation control, capacity accuracy, and request/show
lifecycle grouping (see ADR-FP-051): staff had no way to choose which designs/quantities went to which
show when a request didn't fully fit; removing a request from a show didn't decrease the show's
`allocatedQuantity`; and queued requests still displayed `DRAFT`. All were corrected: `AddToShowModal`
now has a real split flow (pick a show, add the whole remainder if it fits, or "Choose designs for this
show" to assign specific per-design quantities, repeating across shows as needed, with a danger override
still available); `removeShowAllocationsForRequest()` deletes every allocation for a request on a show
in one operation and `recalculateShowAllocatedQuantity()` recomputes the show's total from its remaining
allocations rather than subtracting a remembered value, so the total can no longer drift; removal is
blocked once a show's `productionStatus` is `printing`/`fully_printed`/`completed`/`archived`; a request
now transitions `draft` → `active` on its first allocation and → `completed` once fully printed (no new
persisted queue field); the Print Requests page has Working/Queued/Printed tabs and locks a queued
request's items/detail read-only until removed from its show; the Show Queue page has Upcoming/Past
tabs; and several smaller items (settings cog beside `Add show`, full-width `Add to Show`, clearer
summary copy, `Show ID` label, no-seconds date/time display) were fixed. No Firestore rules or index
changes were required for this round.

A fourth manual QA pass then failed on Add to Show wording, a stale tab/detail selection, and de-queued
request status display (see ADR-FP-052): the modal always spoke in "remaining"/"still need a show"
terms even for a request that fully fit its first selected show; adding a request to a show while the
Working tab was open left the right-side detail panel showing that (now-queued) request instead of
syncing to the tab; and a request removed from a show queue displayed `Active`, indistinguishable from
one still queued. All were corrected: the modal's "remaining" wording and its secondary "Add remaining
N prints" button now only appear once staff have actually committed at least one show leg
(`shouldShowRemainingWording()`) — a full-fit request shows only the plain summary and the normal
footer `Add to show` button commits it directly; `resolveSelectedRequestIdForTab()` keeps the selected
request and active tab in sync, falling back to the tab's first request or clearing to an empty state
whenever the selection no longer belongs to the visible tab; and a new `editing` `PrintRequestStatus`
value is set (`markPrintRequestEditingIfNoActiveAllocations()`) once a request loses every active
allocation, distinguishing "was queued, now back for revision" from both `draft` (never queued) and
`active` (currently queued) — re-queuing an `editing` request returns it to `active`, never `draft`.
This is a local Firestore rules change (`isValidPrintRequestStatus` now allows `editing`) that has not
been deployed; it must be deployed before `editing` status writes will succeed against a live project.

A fifth manual QA pass then failed on the split-allocation flow's polish and the Add to Show modal's
layout (see ADR-FP-053): the design/quantity chooser was plain text rows with no thumbnails and no
strong running total, the modal was narrow and grew tall quickly, show options were stacked square
cards, and the split warning repeated the override explanation already given by the override checkbox.
All were corrected: a new `SplitDesignPickerModal` shows each remaining design as a card with a full,
uncropped thumbnail, title, requested/remaining quantity, and a quantity input, plus a live totals
strip ("Selected for this show," "Show capacity," "Remaining after this show," "Request total") that
updates on every change; both the Add to Show modal and the picker widened to the existing
`modal-panel-lg` class (no new dependency); show options in the date-grouped picker became compact
horizontal list rows (date/time, capacity, status badge) instead of tall square cards; and the split
warning simplified to "Only N of M prints can be added to this show. The remainder will need to be
added to another show. Choose the prints to be added to this show." with no override mention. This was
a UI-only correction — no Firestore rules or index changes were needed.

A sixth manual QA pass then failed on the split picker's wording clarity and input styling (see
ADR-FP-054): the totals strip's "Show capacity: 25 remaining" and "Remaining after this show" labels
were ambiguous about what "remaining" meant, "Request total" duplicated the plain-language summary
shown a step earlier, design cards said the confusing "Requested 25, 25 remaining," and the quantity
inputs looked like unstyled native browser controls. All were corrected: the totals strip now shows
just three values — "Selected for this show," "Available on this show" (live: show capacity minus the
current selection), and "Remaining for another show" — with "Request total" removed; design cards now
show "{quantity} requested," "{alreadyAssigned} already assigned" (when non-zero), and "{remaining}
available to place"; and the quantity input reuses the app's existing `.print-requests-number-input`
styling (no native spinners, dark-theme box/border/focus state matching the Print Request item card's
stepper). Also confirmed (no code change needed) that the `OPEN` production-status pill's color is
derived only from `show.productionStatus`, never from the picker's in-progress selection — over-capacity
coloring is a separate, capacity-only CSS modifier. This was also a UI-only (copy/CSS) correction.

A seventh manual QA pass then failed because the split picker's `Add to this show` quantity inputs
loaded pre-filled (e.g. `25` and `0`) instead of blank, making it look like the app had already chosen
the split rather than staff choosing it (see ADR-FP-055). Fixed by replacing the greedy pre-seeding
state initializer with a plain empty string map for raw input text; a derived numeric map (blank
parses to `0`) still feeds all totals/validation, so the totals strip now correctly starts at `0
prints` selected with full show capacity available and the full unallocated request quantity
remaining. The assign button remains disabled until at least one positive quantity is entered, and
blank inputs still cannot create allocations — this was purely a component-state representation fix.

An eighth manual QA pass then failed because staged split allocation summaries in the Add to Show
modal (e.g. `8:00 PM: 25 prints`) showed only the show's time, leaving staff unable to tell which show
a leg belonged to once a split spans shows on different dates (see ADR-FP-056). Fixed by swapping the
staged-leg label's formatter call from the time-only helper to the existing `formatShowDateTimeLabel()`
already used for Show Queue/Show Detail displays (date, time, no seconds) — no new formatter was
added, and the show-date-picker's compact time-only badges are unaffected.

A ninth manual QA pass then failed because the split-needed warning only described the split path,
leaving staff unaware they could simply pick a different show above for the full request, and because
the warning/button/checkbox stack in the decision area looked visually loose (see ADR-FP-057). Fixed
by rewording the warning to explain both paths ("You can choose which prints to add here and place the
rest on another show, or select a different show for the full request.") and by wrapping the warning,
"Choose designs for this show" button, and override checkbox in one bordered callout matching the
split picker's totals-strip styling, with the button spanning the callout's full width and the
override row visually separated by a top border.

A tenth manual QA pass then failed because the split picker's design cards showed
`{quantity} requested` and `{remaining} available to place`, and staff misread "available to place" as
the quantity available on the currently selected show rather than its actual meaning — the design's own
remaining, unassigned request quantity (see ADR-FP-058). Fixed by removing that line entirely; cards
now show only the requested quantity plus an "already assigned" line when a prior split leg has
touched that item, since the totals strip above the card list already covers capacity information.

An eleventh manual QA pass then flagged that the Print Requests page's `Add to Show` button rendered
disabled on the `Queued` tab, where every request is queue-locked by definition, so the button served
no purpose (see ADR-FP-059). Fixed by hiding the action row entirely while the selected request is
queue-locked, rather than showing it disabled with a tooltip; the button still reappears once a
request is fully removed from its show(s) and becomes `editing`.

A twelfth manual QA pass then failed because Show Detail's capacity progress bar/text didn't clearly
communicate fullness and the Add to Show modal's show option pill always showed `OPEN` even at or over
capacity, so staff couldn't tell at a glance how full a show was (see ADR-FP-060). Fixed by adding
`shared/utils/showCapacityDisplay.ts`: green/yellow/red progress-bar thresholds, clear "N of M used" /
"N spots left" text, and a derived status pill (`getDerivedShowStatusDisplay()`) that prioritizes
production lifecycle states (Printing/Fully Printed/Completed/Archived/Canceled) over a
capacity-derived Open/Full/Over Max fallback. Full/Over Max is computed live from
`allocatedQuantity`/`maxTotalQuantity` at render time and never persisted, so every existing show shows
the correct color/pill immediately after a refresh with no migration or delete/re-add. Full and
over-capacity shows also get a whole-card warning/danger-tinted background and border, not just a red
bar, on the sidebar show card, Show Detail capacity card, and Add to Show option cards.

A thirteenth manual QA pass then failed because selecting an already-full show for an 8-print request
still showed "Only 0 of 8 prints can be added to this show..." plus a "Choose designs for this show"
button opening a picker with zero capacity to place anything into (see ADR-FP-061). Fixed by adding
`isSelectedShowFull` (true when the show can accept none of the remaining request): the decision area
now shows plain full-show copy and hides the "Choose designs" button entirely, leaving only the staff
override checkbox/button as the way to add anything to a full show. A show with partial remaining
capacity is unaffected and still uses the normal split-decision path.

A final polish pass followed before signoff (see ADR-FP-062): the "Not queued" badge label was renamed
"Working" to match the tab name; the Add to Show button and the detail-panel queue-state pill both had
a flash/disappear bug when switching tabs or cards, fixed by deriving both from the stable
allocation-totals map instead of a per-selection value that briefly reset on every selection change;
`onAdded` now also reloads the request and list so a re-add's status flip (`editing` -> `active`)
shows immediately instead of leaving a stale pill; internal request cards show notes (or "No notes")
instead of a redundant "Internal" word; and the Queued tab gained compact show-link pills (qty, show
date/time, external-link icon, full name on hover) plus a two-step-confirm "Remove from show queue"
action that is multi-show-aware and returns the request to Working on success.

**`print-runs-foundation` was signed off PASS on 2026-07-05** after the user ran full authenticated
manual QA covering the entire corrected workflow. `/show-queue` is confirmed as the single combined
Whatnot-show/print-run workflow (`/print-runs` redirects to it); `upcomingShows` and `showAllocations`
are the sole canonical collections (the original split `printRuns`/`printRunItems` model was removed
in the first correction round). No production deploy, Functions deploy, migration, backfill, live
Whatnot fetch/scrape, secrets, Portal, Custom Request, ecommerce, shipping, gang-sheet export, or image
mutation was performed at any point in this phase. Live Whatnot sync, scheduled Functions, a manual
refresh callable, and Pensacola export remain Planned for a future, separately approved phase. A dev
Firestore rules deploy (`firebase deploy --only firestore:rules --project fresh-prints-dev`) remains an
outstanding, separately-approved checkpoint before the `editing` status and Show Queue rules work
against the live `fresh-prints-dev` project. Signoff doc:
`docs/workflow/reviews/2026-07-05-print-runs-foundation-signoff.md`.

### Previous Phase 6 Signoff

### Current Managed Phase

`print-request-item-preview-and-dpi-polish` is signed off PASS. The planning artifact is:

- `docs/workflow/plans/2026-07-04-print-request-item-preview-and-dpi-polish-plan.md`

The automated verification artifact is:

- `docs/workflow/reviews/2026-07-04-print-request-item-preview-and-dpi-polish-test-report.md`

The signoff artifact is:

- `docs/workflow/reviews/2026-07-04-print-request-item-preview-and-dpi-polish-signoff.md`

The phase implements narrow Print Request item-card polish from the previous oversized-selection
signoff follow-up notes:

- TD-019: Print Request item thumbnails should use contained fit in the same card footprint.
- TD-020: Print Request item thumbnails should open in a lightbox preview.
- TD-021: Oversized requested item dimensions should still show accurate calculated DPI instead of
  `0 DPI`.

Implementation, automated verification, and user-run authenticated manual QA are complete.

Implemented behavior:

- `PrintRequestItemCard.tsx` now renders item thumbnails with `imageFit="contain"` in the existing
  item-card footprint.
- Item thumbnails reuse `DesignPreviewLightbox`.
- Item preview URL resolution follows the existing Design Library pattern:
  `design.previewPath ?? design.thumbnailPath`.
- Missing/unresolved images keep the fallback thumbnail state and do not render a broken lightbox.
- `assessPrintRequestItemSize()` now calculates requested-size DPI and quality before applying the
  22-inch standard-size save block.
- Over-22 requested dimensions still block autosave with the existing Custom Request guidance.
- Over-22 requested dimensions no longer show `0 DPI` solely because they are oversized.
- Quantity, width, and height inputs now keep transient text state while editing, allow blank
  width/height without coercing to `0`, block autosave for blank/invalid values, and auto-select
  their current value on focus.

Automated verification passed on 2026-07-04:

- `npx tsx --test src/renderer/src/features/print-requests/utils/printRequestItemSizingAndNaming.test.ts src/renderer/src/features/print-requests/utils/printRequestOversizedSelection.test.ts` — PASS, 21/21.
- `npx tsc --noEmit` — PASS.
- `npm run lint` — PASS.
- `npx vite build` — PASS with the existing circular manual-chunk warning only.
- `git diff --check` — PASS with standard Windows LF/CRLF warnings only.

Manual authenticated QA passed in the user's dev session on 2026-07-04:

- Opened `/print-requests`.
- Opened a request with items.
- Confirmed quantity, width, and height inputs auto-select their current value on focus.
- Confirmed blank width/height edits do not coerce to `0`, show validation, and do not autosave.
- Confirmed valid width/height edits recalculate the paired dimension through aspect-ratio lock and autosave.
- Confirmed quantity edits autosave cleanly.
- Confirmed over-22 requested dimensions still show Custom Request guidance, still block autosave,
  and still show accurate DPI instead of `0 DPI`.
- Confirmed item thumbnails keep the same card footprint, use contained fit, and open in a
  closable lightbox.
- Confirmed duplicate/remove behavior, CR/IR naming, and request origin badges still work.
- Confirmed catalog dimensions and image files are unchanged.
- Confirmed no design lifecycle status changes occurred.

No Firebase deploy, Firestore rules/index deploy, migration/backfill, image mutation/regeneration/
resizing/compression/downscaling, catalog dimension mutation, request naming change, origin badge
change, Portal, Print Runs, Custom Requests, or design lifecycle change was performed.

### Recent Print Request Signoffs

- `print-request-oversized-selection-unblock` signed off PASS WITH FOLLOW-UP NOTES on 2026-07-04:
  `docs/workflow/reviews/2026-07-04-print-request-oversized-selection-unblock-signoff.md`.
- Manual QA verified that an approved `30 x 36` catalog/default-size test design now adds
  successfully from Design Library request-selection mode, initializes as about `10 x 12`
  requested inches, keeps catalog/default dimensions at `30 x 36`, does not mutate image files,
  still blocks over-22 requested item edits, autosaves after resizing back to 22 inches or less,
  preserves duplicate requested size, and does not affect CR/IR naming, origin badges, or design
  lifecycle status.


- `print-request-origin-tracking` signed off PASS on 2026-07-04:
  `docs/workflow/reviews/2026-07-04-print-request-origin-tracking-signoff.md`.
- Dev Firestore rules were deployed for origin tracking with:
  `firebase deploy --only firestore:rules --project fresh-prints-dev`.
- Manual authenticated QA passed for new and legacy origin badges, unchanged CR/IR naming, item
  autosave, duplicate/remove behavior, no Portal/customer Auth behavior, and no design lifecycle
  status changes.

- `print-request-item-preview-and-dpi-polish` signed off PASS on 2026-07-04:
  `docs/workflow/reviews/2026-07-04-print-request-item-preview-and-dpi-polish-signoff.md`.
- Manual authenticated QA passed for contained item thumbnails, thumbnail lightbox open/close,
  accurate oversized DPI feedback, blank width/height edits that no longer coerce `0`, focus
  auto-select on quantity/width/height, unchanged CR/IR naming and origin badges, unchanged
  catalog dimensions/image files, and no design lifecycle status changes.


- `print-request-detail-autosave-and-name-locking` signed off PASS on 2026-07-04:
  `docs/workflow/reviews/2026-07-04-print-request-detail-autosave-and-name-locking-signoff.md`.
- That implemented scope covered:

- Print Request item autosave for normal quantity/width/height edits.
- Removing native browser number spinners from quantity, width, and height inputs.
- Replacing item-level save buttons and noisy success alerts with a subtle item autosave indicator.
- Updating duplicate item behavior so the detail list updates dynamically without disruptive page-wide reloads.
- Stable request item visual ordering so saves do not move items to the top.
- Locking customer request names and request sequence numbers.
- Hiding request status editing from the Print Request detail page.
- Revising customer request names to `username-CR001`.
- Revising internal request names to `baseName-IR001`, with editable internal base name and locked `IR` sequence.
- Internal create uses an `Internal base name` input that starts blank; blank input normalizes to
  `internal` on create.
- Item quantity, item width, and item height autosave through the subtle bottom-right indicator.
- Request Detail fields do not autosave. Internal base-name edits update the generated request-name
  preview while staff type, and visible request notes/internal base-name changes persist only when
  staff manually saves the Request Detail section.
- Legacy internal requests remain readable. They upgrade only when staff edits internal base name
  and a usable locked `requestSequenceNumber` exists; otherwise their legacy name is not guessed or
  rewritten.
- Stable item ordering must keep existing items without `sortOrder` visible. Preferred first
  implementation keeps reads request-scoped by `printRequestId` and sorts client-side by
  `sortOrder`, then `createdAt`, then document ID.
- Local Firestore rules were updated and deployed to `fresh-prints-dev` for
  `printRequests.internalBaseName`, `printRequests.nameFormatVersion`, and
  `printRequestItems.sortOrder`.
- Dev rules deploy command used:
  `firebase deploy --only firestore:rules --project fresh-prints-dev`.
- QA correction after user observation: Request Detail uses manual save; item fields remain autosave.

Automated verification passed on 2026-07-04:

- `npx tsx --test src/renderer/src/features/print-requests/utils/printRequestItemSizingAndNaming.test.ts src/renderer/src/features/print-requests/utils/printRequestQueryPlanning.test.ts` — 20/20 tests.
- `npx tsc --noEmit` — pass.
- `npm run lint` — pass.
- `npx vite build` — pass with existing circular manual-chunk warning.
- `git diff --check` — pass with standard Windows LF/CRLF warnings.

Manual authenticated QA passed in the user's dev session on 2026-07-04. The user verified request
cards, customer labels, item counts, internal/customer request naming, locked status/sequence/name
fields, item autosave, dynamic duplicate/remove behavior, stable item ordering, legacy item
visibility, hidden standard item notes/status UI, no design lifecycle status changes, and the
corrected Request Detail manual-save behavior.

- `print-request-item-sizing-and-username-naming` signed off PASS WITH FOLLOW-UP NOTES on 2026-07-04:
  `docs/workflow/reviews/2026-07-04-print-request-item-sizing-and-username-naming-signoff.md`.
- Dev Firestore rules were deployed for that phase with:
  `firebase deploy --only firestore:rules --project fresh-prints-dev`.
- Manual authenticated QA passed for customer usernames, username reservations, request counters,
  item sizing/DPI validation, duplicate same-design rows, quantity controls, hidden standard item
  notes/status UI, and no design lifecycle status changes.
- `print-request-query-index-hardening` signed off on 2026-07-03:
  `docs/workflow/reviews/2026-07-03-print-request-query-index-hardening-signoff.md`.
- Dev Firestore indexes for Print Request query hardening were deployed with:
  `firebase deploy --only firestore:indexes --project fresh-prints-dev`.

### AI Processing Baseline

AI Processing local fixes through the July 2026 provider/prompt work are signed off locally. Some
Cloud Functions prompt/provider changes still require a separate human-approved Functions deploy
before they are live in Firebase environments.

Notes:

- Cloud Functions changes from the latest provider/prompt work still require a separate human-approved `firebase deploy --only functions` before taking effect wherever not already deployed.
- `print-request-item-preview-and-dpi-polish` is signed off PASS. No active Print Request
  follow-up is currently in implementation or test.

---

## Roadmap Phase Status

| Phase | Name | Status |
|-------|------|--------|
| 1 | Foundation (Auth, roles, shell) | Complete |
| 2 | Design Library (2A–2C) | Complete |
| 3 | Import System (3A–3D) | Complete |
| 4 | Catalog Search & Cleanup | Complete |
| 5 | AI Review Workflow / enrichment baseline | Complete through Phase 0 deploy gate |
| **5** | **AI Review Workflow / enrichment baseline** | **Complete through Phase 0 deploy gate; advanced AI controls signed off locally** |
| **6** | **Customers & Print Requests** | **PASS WITH NOTES; item preview/DPI polish signed off** |
| **7** | **Show Queue (combined Whatnot show + print run)** | **Combined-model implemented after QA-driven rework; live Whatnot sync and Pensacola export still planned** |
| 8 | Fresh Prints Portal (customer web) | Planned |
| 9 | Custom Request Q&A | Planned |
| 10 | Analytics & Popularity | Planned |

---

## Studio Workspaces (live routes)

| Route | Workspace | Purpose |
|-------|-----------|---------|
| `/designs` | Design Library | Approved catalog only (`status: ready`) |
| `/imports` | Imports | ZIP/folder batch import, validation, AI review intake |
| `/ai-review` | AI Review | Processing / Needs Review / Rejected tabs |
| `/print-requests` | Print Requests | Internal/customer request lists and request items |
| `/users` | Team management | Owner/admin team CRUD plus customer record create/edit |
| `/settings` | Settings | AI enrichment model + reasoning selection plus owner/admin AI playground |
| `/show-queue` | Show Queue | Combined Whatnot show + print run: schedule, capacity, attached Print Requests (manual entry; live sync not implemented) |
| `/print-runs` | Redirect | Redirects to `/show-queue` for link compatibility |
| `/customer-requests` | Legacy placeholder | Future Custom Requests (Phase 9) |

Default landing: `/designs` (Design Library).

---

## Open Blockers & Risks

1. **No `npm test` script / no CI** — tests are run through explicit `npx tsx --test ...`, lint, typecheck, and build commands.
2. **Functions deploy is a separate human checkpoint** — pushing Cloud Function source to GitHub does not deploy it.
3. **Old Firestore AI records may show historical provider/prompt metadata** — do not backfill without an approved migration.
4. **Portal not built** — customer-facing app is Phase 8; all current UI is Studio.
5. **Existing circular manual-chunk warning remains** — `npx vite build` still reports the
   pre-existing `vendor -> react-vendor -> vendor` circular chunk warning, which remains unrelated
   to the signed-off Print Request phases.

---

## How to Update This File

1. Read `.cursor/workflow/state.md`
2. Update **Workflow Snapshot**, **Roadmap Phase Status**, and **Next Managed Bug**
3. Move completed items into **Recent Completed Work**
4. Bump **Last updated** date
5. Upload this file to your external AI chat
