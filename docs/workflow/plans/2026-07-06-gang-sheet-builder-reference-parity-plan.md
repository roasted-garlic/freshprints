# Gang Sheet Builder — Reference-Parity Frontend Refactor Plan

## Product intent — read this first

**The target is reference parity, not light inspiration.** The user has explicitly stated the goal
is to clone/adapt the reference builder's frontend UX, layout, and interaction model as closely as
practical into Fresh Prints Studio — not to selectively borrow a few ideas while keeping most of the
current custom builder. The rule is:

> Clone/adapt the reference builder frontend into Fresh Prints Studio, while replacing only the
> parts that do not belong in Fresh Prints (ecommerce, Shopify, REST/Postgres backend, uploads).

Concretely, this means the full-screen shell, top toolbar layout and behavior, left assets panel,
main canvas, right object-properties panel, sheets-panel direction, drag/resize feel, 90°-rotation
model, flip, duplicate/delete, zoom controls, image rendering, and the save/load *concept* should all
end up matching the reference builder's frontend as closely as practical — adapted onto Firestore
`gangSheets`/`gangSheetItems` and show-allocated assets instead of the reference's backend and
upload/library flow. Where this plan says "adopt" or "match the reference," read that as the default;
deviations from the reference's frontend behavior should be called out explicitly with a reason
(usually: it's ecommerce/backend-specific, or it's explicitly deferred to a later slice), not treated
as freely optional.

## Status

**Fully approved. Implementation in progress.**

**Approved by the user:**
- The overall direction — refactor toward reference parity on the frontend, per the product intent
  above.
- The 90°-increment-only rotation model, specifically because it's how the reference builder avoids
  rotated-bounding-box bugs (matches the reference exactly, not a Fresh-Prints-specific compromise).
- `react-rnd` as a new dependency — installation was explicitly approved (a separate checkpoint from
  the conceptual agreement), and `react-rnd@^10.5.3` has been installed via `npm install react-rnd`.
  `npm audit` was reviewed: all reported vulnerabilities are pre-existing transitive issues in
  `electron`/`electron-builder`/`vite`, none introduced by `react-rnd` (which has no dependencies of
  its own beyond a couple of small, zero-risk transitive packages like `clsx`/`object-assign`).
  `npx tsc --noEmit` was re-run immediately after installation and passed cleanly. See Dependency
  Decision below for the full reasoning; that section is now a record of an approved and completed
  decision, not an open question.

**No other new dependencies are approved.** Everything else in this plan continues to use Fresh
Prints' existing stack (its own component library instead of Radix/Tailwind, `react-router-dom`
instead of `wouter`, no `react-dropzone`/`jspdf`/`jszip`).

This plan **supersedes the in-progress Slice 1 signoff path** — do not sign off the prior custom
DOM/pointer builder; it is being replaced by this refactor.

## Why this plan exists

Slice 1 shipped a basic custom DOM/pointer-event canvas. Two rounds of manual QA correction fixed a
full-screen layout bug, image rendering, an incomplete-record read race, drag lag, overlap, and
out-of-bounds movement. Each round patched a real bug, but the underlying pattern — hand-rolled
pointer math for drag/resize, hand-rolled collision, hand-rolled bounds clamping — is the same class
of problem the reference builder already solved with a mature library (`react-rnd`) and a proven
interaction model. The user has decided against continuing to patch bugs one at a time in a custom
implementation that keeps diverging further from a builder they've already confirmed is close to
what they want. This plan instead targets **matching the reference builder's frontend as closely as
practical** — layout, toolbar, panels, drag/resize/rotate/flip/duplicate feel, zoom — while keeping
Fresh Prints' own data model, services, and Firebase-only backend in place of the reference's
Express/Postgres/Shopify stack.

## Reference inspected

- `gang-sheet-builder-reference/README.md`
- `gang-sheet-builder-reference/gang-sheet-builder-map.md`
- `gang-sheet-builder-reference/frontend/src/pages/Builder.tsx` (~5,500 lines; read in full via a
  structural pass — see "Reference architecture notes" below)
- `gang-sheet-builder-reference/frontend/package.json`
- Relevant `components/ui/*` primitives referenced by `Builder.tsx`

## Reference architecture notes (what was actually found)

**Overall shape**: one large component (`Builder.tsx`) rendering full-screen (`position: fixed;
inset: 0`, mounted outside the app's normal `<Layout>` in `App.tsx`), fixed header/toolbar, a
horizontal flex body: left panel (tabs) + canvas (flex-grow, native `overflow: auto` scroll for
panning) + right panel (object properties **and** sheet list/tabs — sheet tabs live in the right
panel, not the header).

**react-rnd usage**: exactly one `<Rnd>` call-site, one per placed item. It is a **fully controlled**
component — `size`/`position` come from React state, not from react-rnd's own internal state — with
a `scale` prop set to the canvas's current zoom multiplier so react-rnd's internal pointer-delta math
stays correct under CSS zoom. `bounds="parent"` keeps items from leaving the canvas div by
construction. `lockAspectRatio` is a single global toggle (not per-item) passed straight into `<Rnd>`.

**Rotation is not native to react-rnd.** The reference restricts rotation to 90° increments and
layers it two ways: (1) at 90°/270°, the `CanvasItem`'s own `width`/`height` are swapped so the
`<Rnd>` bounding box itself stays axis-aligned (no rotated hit-box math needed at all); (2) the
rotation is purely a CSS `transform: rotate()` on the *inner* `<img>`, with `translate(-50%,-50%)`
re-centering when width/height are swapped. This sidesteps the "how do you collide-detect and
bounds-clamp a rotated rectangle" problem entirely — the Rnd box is always axis-aligned in canvas
space, and only the pixels inside it visually rotate.

**Collision is resolved live, every pointer-move**, not just on drop: `onDrag` reads the last
constrained position from a ref (avoiding stale-closure lag), adds the raw pointer delta, clamps to
canvas bounds, calls a continuous-collision resolver (`resolveCollision`, a sweep/slide algorithm)
on every move, and writes the result back into the controlled `position` prop. History/undo is only
committed once, in `onDragStop`. Resize's live path in this reference build detects/flags new overlap
without blocking movement; only drag literally blocks/slides.

**Toolbar/object-properties**: duplicate, delete, rotate ±90°, flip H/V, a 3×3 align grid (computed
as a single group-preserving `dx`/`dy` offset), "Standard Sizes" (resize to a preset then re-pack the
sheet), "Add Quantity". No explicit bring-to-front/send-to-back — z-order is array order.

**Zoom**: header buttons only (25%→3000% in 25% steps) plus a preset dropdown; no mouse-wheel zoom,
no keyboard shortcut. Stored item coordinates are zoom-independent fixed base-pixels; only a CSS
`transform: scale()` on the canvas div changes with zoom, and react-rnd's `scale` prop is kept in
sync so drag math stays correct.

**Left panel** ("Images"/"Library" tabs): both are a flat array of
`{id, url, name, naturalW, naturalH, fileDPI, docWidthIn?, docHeightIn?}`-shaped items rendered as a
2-column grid of thumbnails with a hover "+Add" overlay; clicking calls `addToCanvas(item)`, which
computes initial placement size from doc-inches (if embedded) or `naturalW/naturalH ÷ fileDPI`,
scales down if wider than the canvas, and finds the next non-overlapping position. This function's
*shape* (not its upload plumbing) is the direct analog for a "place this allocated design" action.

**Multi-sheet**: `sheets: CanvasItem[][]`, `sheetNames: string[]`, `activeSheetIndex`. Sheet tabs
(right panel) show a live-scaled thumbnail per sheet with inline rename. Each sheet's height
auto-expands to fit its tallest item (up to a max), shrinks back down when emptied.

**Save/load**: the entire serialized payload is `{ library, sheets, sheetNames }`. A local-only
`localStorage` draft always saves (regardless of login); a debounced API draft additionally saves
when logged in; named projects autosave on an interval. None of this backend plumbing is portable
as-is (it's REST+Postgres), but the **shape** of "one document holds sheets, each sheet holds an
array of items" maps directly onto multi-sheet Slice 2 later.

**Export**: `sharp`/tile-based DPI-aware PNG rendering with jsPDF/jszip for multi-format output,
gated behind a 24-inch-tall tile limit (browser canvas + jsPDF unit caps) and a `/api/stitch` backend
fallback for taller sheets. Direction-only reference for the future export slice — no code from this
path should be adopted yet.

**Auto-layout**: a real skyline bin-packing function (`packSheet`/`packAllSheets`) exists, but it is
**not** exposed as a standalone "Auto Arrange" button in this build — it's only invoked as a
side-effect of "Standard Sizes" resize and quantity-add flows. If Fresh Prints wants a general-purpose
Auto Builder pass, this packing function can be lifted directly as its algorithm (not its call sites).

## Comparison: current Fresh Prints Slice 1 vs. reference target

Default posture per the product intent above: **match the reference's frontend behavior** unless the
gap is a data/backend concern (kept on Fresh Prints' side) or an explicitly deferred later slice.

| Concern | Current Fresh Prints (Slice 1 + 2 QA rounds) | Reference | Target |
|---|---|---|---|
| Full-screen shell, no sidebar | Done (`AuthenticatedRouteGate`, dedicated route, fixed-height CSS) | Same pattern (`position: fixed`, mounted outside layout) | **Already at parity** — keep, do not rebuild |
| Drag | Custom pointer events, RAF-throttled, local-preview + commit-on-up | `<Rnd>`, fully controlled, live collision resolution during drag | **Match the reference**: adopt `react-rnd` |
| Resize | Custom, aspect-ratio-preserving math, commit-on-change | `<Rnd>` resize handles, live overlap flagging | **Match the reference**: adopt `react-rnd` |
| Rotation | Free-form degrees stored, rotated-AABB bounds/collision math (`rotatedBoundingBox`) | Restricted to 90° increments, box stays axis-aligned, only inner `<img>` rotates | **Match the reference exactly** (user-approved) — removes an entire class of rotated-rectangle math bugs |
| Collision | AABB overlap checked once on commit; revert-on-invalid | Continuous resolve-and-slide during drag | **Partial parity this slice**: keep validate-on-commit for now, but structure the new `<Rnd>` wrapper so live sliding (full reference parity) can follow without a rewrite — see Risks |
| Bounds clamping | Custom `clampRectToSheetBounds`/`fitsWithinSheetBounds` | `bounds="parent"` on `<Rnd>`, free by construction | **Match the reference**: `bounds="parent"` + 90°-only rotation eliminates almost all of the custom bounds math |
| Zoom | Not implemented yet | Button-based 25%–3000%, zoom-independent stored coords, `scale` prop kept in sync | **Match the reference**: same button-based range/behavior and zoom-independent-coordinate pattern |
| Toolbar actions | Resize buttons, rotate 90°, delete | Duplicate, delete, rotate ±90°, flip H/V, align grid | **Match the reference** for duplicate/delete/rotate/flip; align grid is the one reference toolbar action deferred to a later polish pass (not required to prove out the core interaction model first) |
| Left panel | Allocated show assets, already Firestore-backed | Session/persisted image upload library | **Match the reference's rendering pattern** (thumbnail grid, hover "+Add", click-to-place); data source is Fresh Prints' own show allocations, not the reference's upload/library — this is the one deliberate, ecommerce-driven substitution, not a scope cut |
| Save/load | Firestore `gangSheets`/`gangSheetItems`, per-action persistence | One JSON blob per project (localStorage/Postgres) | **Keep Fresh Prints' per-item Firestore documents** — the reference's save *concept* (autosave as you edit, reload restores the same layout) is preserved; the storage shape is a deliberate backend substitution, not a UX gap. See mapping section below |
| Multi-sheet | `sheetNumber` field modeled, one sheet only | Full sheets array + tabs + auto-expand height | Reference direction confirmed as the target; deferred to a later slice — `sheetNumber` already reserves the field so this slice doesn't block it |
| Auto-layout | None | Skyline bin-packing (`packSheet`), not exposed as a button in reference | Deferred to the separate, already-drafted Auto Builder plan; do not pull in the packing algorithm this slice |
| Export | None | Tile-based `sharp`/canvas/jsPDF pipeline + backend stitch endpoint | Reference direction confirmed for later; Fresh Prints already has `sharp` available in `package.json` for a future Electron-main equivalent — do not adopt the backend stitch endpoint or jsPDF/jszip this slice |

## Dependency decision: `react-rnd`

**Decision: adopted. `react-rnd@^10.5.3` is installed.** The user first confirmed conceptual
agreement that `react-rnd` is the right tool to reach reference parity on drag/resize instead of
rebuilding it from scratch, then — as a separate, distinct approval step — explicitly approved
installing it. `npm install react-rnd` has been run; `package.json`/`package-lock.json` reflect the
addition. Reasoning (recorded for context, not as an open recommendation):
- It's the same library the reference builder itself uses for drag/resize, so adopting it is the
  most direct path to matching the reference's actual feel rather than approximating it with more
  custom code.
- It directly replaces three custom, currently-buggy systems (drag math, resize math, bounds
  clamping) with one library that has already solved them, is widely used, MIT-licensed, has no
  transitive backend/Shopify/ecommerce dependencies, and has clean peer deps (`react >=16.3.0`,
  `react-dom >=16.3.0` — compatible with this project's React 18.3.1).
- Combined with the reference's 90°-increment rotation model (rotate only the inner image, keep the
  Rnd box axis-aligned), this also **eliminates** the need for `rotatedBoundingBox`,
  `clampRectToSheetBounds`, and `fitsWithinSheetBounds` from `shared/utils/gangSheetLayoutUnits.ts` —
  `bounds="parent"` handles containment, and axis-aligned boxes make overlap checking a plain AABB
  test with no rotation math at all.
- The alternative (keep patching custom DOM/pointer code) has already produced three rounds of bugs
  in this feature and would still not match the reference's feel; there is no indication a fourth
  custom pass would get closer to parity than the library the reference itself relies on.

Installation approval was obtained as its own explicit step, separate from the conceptual agreement,
per repo rule and per the user's own repeated instruction. `npm audit` after installation showed only
pre-existing transitive vulnerabilities in `electron`/`electron-builder`/`vite` (ASAR integrity,
`node-tar` path traversal, `esbuild` dev-server CORS, etc.) — none introduced by `react-rnd` itself.
`npx tsc --noEmit` passed cleanly immediately after installation.

No other new dependencies are recommended. Specifically **not** recommended for adoption:
`react-dropzone` (Fresh Prints has no user-upload flow in the builder — assets come from show
allocations), `jspdf`/`jszip` (export slice, not this slice, and Fresh Prints already has `sharp`
available for an Electron-main equivalent), `@radix-ui/*`/Tailwind (Fresh Prints has its own
component library — `Button`, `Card`, `Badge`, etc. — and its own CSS convention; do not introduce a
second design system), `wouter` (Fresh Prints already uses `react-router-dom`).

## What to keep from the current Slice 1 implementation

- Route (`/show-queue/:showId/gang-sheet`) and the `AuthenticatedRouteGate`/full-screen shell
  pattern — already correct and matches the reference's "mounted outside the normal layout" approach.
- `Build gang sheet` entry point on Show Queue detail.
- Firestore `gangSheets`/`gangSheetItems` collections and types
  (`shared/types/gangSheet/gangSheet.types.ts`) — keep the per-item-document model (see mapping
  section below); do not collapse into one JSON blob per the reference's project shape.
- `gangSheetService` CRUD operations, including the `resolveDesignDocumentTimestamps` fix and
  quarantine-on-read behavior from the second QA round.
- `useGangSheetShowAssets` — already loads allocated designs with thumbnail/title/remaining-quantity,
  which is the direct Fresh Prints analog of the reference's library panel data.
- `gangSheetItemQuantity.ts` (placed-copy-vs-allocation validation) — unaffected by this refactor.
- `originalPathSnapshot` preservation on every placed item.
- `sheetNumber` field (forward-compat for multi-sheet).

## What to replace

- The custom pointer-event drag/resize implementation in `GangSheetBuilderPage.tsx`
  (`handleItemPointerDown`/`Move`/`Up`, `dragStateRef`, `pendingMoveFrameRef`) → replaced by `<Rnd>`
  per item.
- Free-form rotation storage/math → replaced by 90°-increment rotation (box stays axis-aligned;
  `rotationDegrees` continues to exist on `GangSheetItem` but the UI only ever writes `0/90/180/270`,
  and the inner image element carries the CSS rotation).
- `shared/utils/gangSheetLayoutUnits.ts`'s `rotatedBoundingBox`, `clampRectToSheetBounds`,
  `fitsWithinSheetBounds` → no longer needed once rotation is axis-aligned and `bounds="parent"`
  handles containment; `clampRectToSheetOrigin` and the plain (non-rotated) overlap check in
  `gangSheetLayoutCollision.ts` remain useful and are kept.
- `commitItemTransform`'s bounds/overlap-revert flow in `useGangSheetBuilder.ts` is kept in spirit
  (validate before persisting) but simplified since it no longer needs rotated-bounds math.
- Manual RAF-throttling of pointer-move (`pendingMoveFrameRef`) → no longer needed; `<Rnd>` handles
  its own drag performance.

## What must be removed / never adopted from the reference

- `Builder.tsx`'s Shopify `use-auth`/`use-cart`, `lib/shopify.ts`, Add to Cart, checkout, pricing
  (`PRICE_PER_INCH`), Standard Sizes-as-product-variant logic.
- All `backend/` (Express routes: `projects.ts`, `library.ts`, `storage.ts`, `stitch.ts`,
  `orders.ts`) and `db/` (Drizzle schema, Postgres) — no REST API layer, no Drizzle, no Postgres.
  Fresh Prints stays Firestore + Storage + Electron IPC only.
  `shared/object-storage-web` (presigned-upload React component) — Fresh Prints assets come from
  existing `designs`/Storage, not a new customer upload flow.
- `shared/api-client-react` (generated React Query client from an OpenAPI spec) — no REST backend to
  generate a client for.
- `theme/` Shopify Liquid files — no Shopify storefront.
- Order snapshot recording (`gang_sheet_orders`) — no ecommerce order concept in Fresh Prints Studio.
- Image upload/library panels (`react-dropzone`, presigned upload flow) — replaced entirely by
  show-allocated assets already in Firestore/Storage.

## How Firestore `gangSheets`/`gangSheetItems` map onto the reference's project/save model

Keep the existing Fresh Prints model — **do not** adopt the reference's single-JSON-blob project
shape. Rationale already documented in the original foundation plan (Firestore document size limits,
per-item queryability/diffing) and unchanged by this refactor. Concretely:

| Reference concept | Fresh Prints equivalent |
|---|---|
| `ProjectData.sheets: CanvasItem[][]` | One `gangSheets` document per sheet (`sheetNumber` distinguishes sheets), each sheet's items are `gangSheetItems` documents with `gangSheetId` — already modeled |
| `CanvasItem.x/y/width/height` (base pixels) | `GangSheetItem.xInches/yInches/widthInches/heightInches` (inches) — keep inches as the persisted unit; convert to pixels only at render time (already the existing pattern) |
| `CanvasItem.rotation` (0/90/180/270 in the adopted model) | `GangSheetItem.rotationDegrees` — keep the field, but going forward the UI only ever writes the four cardinal values |
| `CanvasItem.flipH/flipV` | `GangSheetItem.flipHorizontal/flipVertical` — already modeled, not yet wired to UI; this slice can wire simple toggle buttons since the data model already supports it |
| Debounced localStorage + API draft autosave | Not needed — Fresh Prints already persists each place/move/resize/rotate/delete as an individual Firestore write (per-action persistence), which is simpler and already correct |
| `sheetNames`/`activeSheetIndex` | Deferred to the multi-sheet slice; `sheetNumber` already reserves the field |

## How show allocated assets replace the reference's upload/library flow

- Keep `useGangSheetShowAssets` exactly as-is as the data source.
- Replace only the **rendering pattern** of the left panel to match the reference's thumbnail-grid +
  hover "+Add" interaction (a UI/CSS change, not a data-layer change).
- `placeAsset` in `useGangSheetBuilder.ts` remains the integration point analogous to the reference's
  `addToCanvas` — it already computes initial size from allocation/design dimensions and (post-QA-2)
  finds a non-overlapping origin; this logic is kept, just simplified once rotation is axis-aligned
  (no rotated-bounds check needed for the initial placement search).

## How to keep `originalPathSnapshot` for future high-res export

No change to this pattern. `originalPathSnapshot` continues to be written on every placed
`gangSheetItem` from `asset.design.originalPath`, independent of whatever the canvas renders for
interactive editing (thumbnail today, exactly as Slice 1 already does). `react-rnd` only affects how
the on-screen box is manipulated; it has no bearing on which image path is persisted.

## How to support Auto Builder as the entry step

Not built in this slice. The separate `docs/workflow/plans/2026-07-06-gang-sheet-builder-auto-builder-plan.md`
already covers this and remains the right home for it. One adjustment worth noting for that plan
once this refactor lands: Auto Builder's placement pass can write directly into the same
`gangSheetItem` create path this refactor keeps, and could optionally borrow the reference's skyline
`packSheet` algorithm's *shape* (not code) as a stronger alternative to the simple left-to-right/wrap
row algorithm currently planned there — that is a decision for the Auto Builder plan's own review,
not this one.

## How to later support high-res transparent PNG export without copying the reference backend

Not built in this slice. Direction only, consistent with the original foundation plan: an Electron
IPC handler using the `sharp` dependency already present in `package.json`, composing each item from
its canonical `originalPathSnapshot` at full resolution, positioned/sized from the same inches-based
`gangSheetItem` fields this refactor keeps. The reference's tile-stitching backend endpoint and
jsPDF/jszip bundling are not needed — `sharp` in Electron main can compose a single sheet directly
without a 24-inch tile cap (that cap exists in the reference because of *browser* canvas/jsPDF
limits, which do not apply to a Node-side `sharp` composition in Electron main).

## Proposed implementation slice: "Reference-based Gang Sheet Builder shell and canvas refactor"

### Scope

- Replace the custom pointer-drag canvas item with `<Rnd>` per placed item (dependency installed and
  approved), fully controlled from `GangSheetItem` state, `bounds="parent"`, `scale` prop wired to a
  new zoom state.
- Adopt 90°-increment-only rotation: box stays axis-aligned in storage; only the inner image element
  gets a CSS `rotate()` transform. Simplifies `rotateSelectedItem` to always add/subtract 90.
- Remove `rotatedBoundingBox`/`clampRectToSheetBounds`/`fitsWithinSheetBounds` from
  `gangSheetLayoutUnits.ts`; keep plain-AABB `overlapsAnyOtherItem` (no rotation input needed once
  boxes are always axis-aligned) and `clampRectToSheetOrigin`-equivalent behavior via
  `bounds="parent"`.
- Add basic zoom controls (button-based, reference-style: zoom in/out + preset dropdown), with
  stored item coordinates staying zoom-independent (inches, as today) and only a CSS `scale()` on the
  canvas wrapper changing.
- Reference-style left asset panel: thumbnail grid with hover "+Add" overlay, sourced from
  `useGangSheetShowAssets` (no data-layer change, CSS/rendering-pattern change only).
- Reference-style right object-properties panel: keep existing W/H/rotate/delete controls, add
  duplicate and flip H/V (data model already supports `flipHorizontal`/`flipVertical`; wiring them to
  the UI is new).
- Reference-style top toolbar: keep existing placed/allocated count + sheet size badge, add zoom
  controls and (if time allows within this slice) duplicate/flip buttons for the selected item.
- Overlap prevention: plain AABB check (no rotation math needed) at commit time, same
  revert-with-message behavior as today.
- Bounds: `bounds="parent"` on `<Rnd>` — items structurally cannot leave the canvas.
- Save/reload: continues to use existing `gangSheetService`/Firestore `gangSheets`/`gangSheetItems`
  exactly as today; no change to the persistence layer's shape.

### Explicitly out of scope for this slice

- Multi-sheet tabs/UI (sheet-switching, per-sheet thumbnails) — `sheetNumber` stays reserved but
  unused beyond `1`.
- Auto Builder entry step (separate plan).
- Align-grid toolbar action (nice-to-have from the reference; can follow in a later polish pass).
- High-resolution PNG export, Electron IPC export, gang sheet upload to Storage.
- Printing timer, production-state reconciliation.
- Portal, live Whatnot sync, ecommerce, shipping, fulfillment, Add to Cart, checkout, Shopify.
- Any write of production status to `designs`.
- Any new dependency beyond the now-approved `react-rnd`.

### Files likely to touch

- `package.json`/`package-lock.json` — `react-rnd` added (done).
- `src/renderer/src/features/gang-sheets/pages/GangSheetBuilderPage.tsx` — replace custom
  pointer-drag JSX/handlers with `<Rnd>` per item; add zoom state/controls; restyle left panel to the
  thumbnail-grid pattern; add duplicate/flip buttons to the right panel.
- `src/renderer/src/features/gang-sheets/hooks/useGangSheetBuilder.ts` — simplify
  `commitItemTransform`/`moveSelectedItem`/`resizeSelectedItem`/`rotateSelectedItem` for
  axis-aligned-only rotation; add `duplicateSelectedItem`/`flipSelectedItem` actions using the
  existing `addGangSheetItem`/`updateGangSheetItemTransform` service calls (no new service methods
  expected, but confirm during implementation).
- `shared/utils/gangSheetLayoutUnits.ts` (+ test) — remove `rotatedBoundingBox`/
  `clampRectToSheetBounds`/`fitsWithinSheetBounds`, keep the rest.
- `shared/utils/gangSheetLayoutCollision.ts` (+ test) — simplify `overlapsAnyOtherItem` to plain AABB
  (drop the `rotationDegrees` parameter now that boxes are always axis-aligned).
- `src/renderer/src/styles/components/gang-sheet-builder.css` — reference-style panel/toolbar/zoom
  styling; remove now-unused item-drag cursor/touch-action rules specific to the custom pointer
  implementation.
- No changes expected to `shared/types/gangSheet/gangSheet.types.ts`, `firestore.rules`,
  `firestore.indexes.json`, or the route/permission wiring — confirm during implementation.

### Risks

- `react-rnd`'s `scale` prop must be kept perfectly in sync with the canvas's CSS zoom transform, or
  drag math will feel "off" at non-100% zoom — needs careful manual QA at multiple zoom levels.
- Restricting rotation to 90° increments is a real behavior change from the current free-form
  rotation Slice 1 shipped — the user has already approved this, specifically because it matches how
  the reference builder avoids rotated-bounding-box bugs. No further confirmation needed before
  implementation; noted here only as a behavior-change risk to call out in manual QA (staff should
  not expect the earlier free-form rotation to still be available).
- `bounds="parent"` requires the canvas div to be the actual positioned ancestor with the correct
  pixel dimensions at every zoom level; any mismatch would let items clip at the wrong edge.
  Live-collision-during-drag (matching the reference's `onDrag` resolver) is deferred — this slice
  keeps commit-time validation, which is a slightly different feel (item can visually overlap during
  the drag itself, then snaps back on release) than the reference's continuous slide-away behavior.
  This gap should be called out explicitly in manual QA rather than silently left as a surprise.
- Migrating existing placed items that already have non-cardinal `rotationDegrees` values (from the
  current free-form implementation) — none should exist yet since this hasn't shipped/been signed
  off, but confirm no dev-session data needs a compatibility read-path.

### Acceptance criteria

- Builder still opens full-screen with no Fresh Prints sidebar.
- Left panel lists allocated show assets as a thumbnail grid with a working place action.
- Placed items render their thumbnail image, visible immediately.
- Drag, resize are handled by `<Rnd>`, feel smooth or better than a normal design editor.
- Rotation works in 90° increments via toolbar, image content rotates, item box stays axis-aligned.
- Flip horizontal/vertical works via toolbar and persists.
- Duplicate works via toolbar and persists a new item.
- Items cannot be dragged/resized outside the sheet (`bounds="parent"`).
- Overlap is prevented or clearly blocked/reverted with a user-facing message.
- Zoom controls work; item coordinates remain correct (in inches) regardless of zoom level.
- Save/reload continues to work against existing `gangSheets`/`gangSheetItems`.
- `designs.status` unchanged; original assets unchanged; `originalPathSnapshot` preserved.
- No export, timer, reconciliation, Portal, Whatnot sync, ecommerce, or new dependency beyond the
  approved `react-rnd` present.

### Manual QA checklist (for after implementation)

1. Open the builder for a show with allocations — confirm full-screen, no sidebar.
2. Confirm left panel shows a thumbnail grid of allocated designs with remaining-quantity info.
3. Place two or more items — confirm thumbnails render immediately on the canvas.
4. Drag an item — confirm smooth, real-time movement (compare qualitatively to the earlier laggy
   behavior).
5. Resize an item via its `<Rnd>` handles — confirm aspect ratio behavior matches expectations
   (confirm whether lock-aspect-ratio is on by default per the plan's design decision).
6. Rotate an item via the toolbar — confirm only 90° increments are available, image content
   rotates, and the item's footprint on the sheet stays axis-aligned.
7. Flip an item horizontally and vertically — confirm the image mirrors and persists after
   reload.
8. Duplicate an item — confirm a second copy appears without exceeding the allocation's remaining
   quantity (duplicate should still respect `canPlaceAnotherCopy`).
9. Try to drag/resize an item outside any sheet edge — confirm it cannot leave the canvas.
10. Try to overlap two items — confirm the overlap is prevented or reverted with a clear message.
11. Zoom in and out — confirm items stay positioned correctly and drag/resize still feel correct at
    each zoom level.
12. Delete an item — confirm it's removed and quantity availability updates.
13. Reload the builder — confirm the saved layout (including rotation/flip) reloads correctly.
14. Confirm `designs.status` is unchanged.
15. Confirm original Storage assets are unchanged.
16. Confirm no export, timer, production reconciliation, Portal, live Whatnot sync, ecommerce, or
    generated PNG upload behavior is present anywhere in the builder.

## Immediate correction needed before the larger refactor?

No. The second QA round's fixes (incomplete-record error, drag lag mitigation, overlap, bounds) are
functionally correct as they stand — they are just about to be superseded by this refactor's better
underlying approach, not broken in a way that needs a separate urgent patch first. It is safe to move
straight into this refactor once approved, without an interim patch.

## Human checkpoints

- Overall refactor direction: **approved** (reference-parity target, per the product intent section).
- 90°-increment-only rotation: **approved**, specifically because it matches how the reference
  builder avoids rotated-bounding-box bugs.
- `react-rnd`: **approved and installed** (both the conceptual decision and the separate, explicit
  installation approval have been given; `npm install react-rnd` has been run).
- No Firestore rules/index deploy without separate approval (none expected to be needed this slice).
- No implementation of Auto Builder, export, timer, or production reconciliation under this plan.
- No dependency beyond `react-rnd` without its own separate explicit approval.
