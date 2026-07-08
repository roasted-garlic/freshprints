# Gang Sheet Builder — Code Map

A complete structural map of how the gang sheet builder is built, how the files connect, and which code controls which behavior.

---

## Table of Contents

1. [Original File Paths & Responsibilities](#1-original-file-paths--responsibilities)
2. [Overall Structure](#2-overall-structure)
3. [Layout Control](#3-layout-control)
4. [Styling Control](#4-styling-control)
5. [Canvas Behavior](#5-canvas-behavior)
6. [Image Upload & Placement](#6-image-upload--placement)
7. [Saving, Loading & State Management](#7-saving-loading--state-management)
8. [Third-Party Libraries](#8-third-party-libraries)
9. [Code Not Copied — with Reasons](#9-code-not-copied--with-reasons)

---

## 1. Original File Paths & Responsibilities

### Frontend (React + Vite)

| Original Path | Responsibility |
|--------------|----------------|
| `frontend/src/pages/Builder.tsx` | Entire builder UI — canvas, toolbar, left panels, export. ~5,500 lines. |
| `frontend/src/pages/GangSheets.tsx` | Browse pre-made gang sheet products from Shopify. |
| `frontend/src/pages/GangSheetDetails.tsx` | Single pre-made gang sheet product detail page. |
| `frontend/src/App.tsx` | App router; mounts Builder at `/builder` outside the standard layout. |
| `frontend/src/components/FunkyFreshLogo.tsx` | Branding logo used in builder header. |
| `frontend/src/components/ui/dialog.tsx` | Modal dialog — save project, delete confirmations. |
| `frontend/src/components/ui/tooltip.tsx` | Hover tooltip on toolbar buttons. |
| `frontend/src/components/ui/toast.tsx` | Toast notification UI component. |
| `frontend/src/components/ui/toaster.tsx` | Toast container rendered at app root. |
| `frontend/src/components/ui/button.tsx` | Styled button primitive. |
| `frontend/src/components/ui/input.tsx` | Styled text input. |
| `frontend/src/components/ui/select.tsx` | Styled dropdown select. |
| `frontend/src/components/ui/slider.tsx` | Slider for zoom level control. |
| `frontend/src/components/ui/tabs.tsx` | Left panel tab navigation. |
| `frontend/src/components/ui/scroll-area.tsx` | Scrollable left panel region. |
| `frontend/src/components/ui/separator.tsx` | Visual divider. |
| `frontend/src/components/ui/badge.tsx` | Small status label. |
| `frontend/src/components/ui/spinner.tsx` | Loading spinner. |
| `frontend/src/components/ui/skeleton.tsx` | Skeleton loading state. |
| `frontend/src/hooks/use-auth.tsx` | Shopify customer auth context (login, session, profile). |
| `frontend/src/hooks/use-toast.ts` | Toast state management (no external dependency). |
| `frontend/src/hooks/use-mobile.tsx` | Mobile viewport detection hook. |
| `frontend/src/hooks/use-cart.tsx` | Cart context; `addItem()` called on checkout. |
| `frontend/src/lib/utils.ts` | `cn()` Tailwind class name merger. |
| `frontend/src/lib/shopify.ts` | Shopify Storefront API client; used to fetch the gang sheet product variant. |
| `frontend/src/index.css` | Global styles, Tailwind layers, CSS variables, font-faces. |
| `frontend/package.json` | Frontend dependency manifest. |

### Backend (Express)

| Original Path | Responsibility |
|--------------|----------------|
| `backend/src/routes/projects.ts` | CRUD for canvas projects (save, load, draft, delete). |
| `backend/src/routes/library.ts` | Customer image library management. |
| `backend/src/routes/storage.ts` | Presigned upload URL generation; image proxy/download. |
| `backend/src/routes/stitch.ts` | PNG tile stitching for large export files. |
| `backend/src/routes/orders.ts` | Order snapshot recording on checkout. |
| `backend/src/routes/index.ts` | Route mounting on the Express app. |
| `backend/package.json` | Backend dependency manifest. |

### Database (PostgreSQL + Drizzle ORM)

| Original Path | Responsibility |
|--------------|----------------|
| `db/src/schema/gangSheetProjects.ts` | `gang_sheet_projects` table + `ProjectData` TypeScript interface. |
| `db/src/schema/gangSheetLibrary.ts` | `gang_sheet_library` table (user image registry). |
| `db/src/schema/gangSheetOrders.ts` | `gang_sheet_orders` table (immutable order snapshots). |
| `db/src/schema/index.ts` | Schema barrel export. |
| `db/src/index.ts` | Drizzle DB instance (connection). |
| `db/package.json` | DB lib dependency manifest. |

### Shared Libraries

| Original Path | Responsibility |
|--------------|----------------|
| `shared/object-storage-web/src/index.ts` | Barrel export. |
| `shared/object-storage-web/src/ObjectUploader.tsx` | React component wrapping the presigned upload flow. |
| `shared/object-storage-web/src/use-upload.ts` | Upload progress/error state hook. |
| `shared/object-storage-web/package.json` | Upload lib dependency manifest. |
| `shared/api-client-react/src/index.ts` | Barrel export. |
| `shared/api-client-react/src/custom-fetch.ts` | Fetch wrapper (base URL, credentials). |
| `shared/api-client-react/src/generated/api.ts` | Generated React Query hooks for all API endpoints. |
| `shared/api-client-react/src/generated/api.schemas.ts` | Generated Zod schemas for request/response types. |
| `shared/api-client-react/package.json` | API client dependency manifest. |
| `shared/api-spec/openapi.yaml` | Full OpenAPI 3 spec — canonical contract for all API endpoints. |

### Shopify Liquid Theme

| Original Path | Responsibility |
|--------------|----------------|
| `theme/radical-gang-builder-page.liquid` | Shopify landing page for the builder — renders product info + `@app` slot for the React embed. |
| `theme/radical-gang-builder-product.liquid` | Product page variant — same layout but uses `product` Liquid context. |

---

## 2. Overall Structure

The builder is a **single large React component** (`Builder.tsx`) that renders a full-screen page (no navigation shell). It is split into these logical zones:

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER BAR                                                      │
│  Logo | Sheet name | Undo/Redo | Zoom | Sheet tabs | Cart/User  │
├────────────────┬────────────────────────────────────────────────┤
│  LEFT PANEL    │  CANVAS AREA                                   │
│  (tab switcher)│  ┌──────────────────────────────────────────┐  │
│                │  │  22" × dynamic-height canvas             │  │
│  Images tab    │  │  react-rnd items (drag/resize/rotate)    │  │
│  Library tab   │  │  ruler overlay                           │  │
│  Projects tab  │  │  price-per-inch indicator                │  │
│  Orders tab    │  └──────────────────────────────────────────┘  │
│                │  TOOLBAR (below canvas)                        │
│                │  Align | Flip | Delete | Export | Add to Cart  │
└────────────────┴────────────────────────────────────────────────┘
```

### Key Constants (all in `Builder.tsx`)

| Constant | Value | Purpose |
|----------|-------|---------|
| `CANVAS_WIDTH_IN` | 22 | Canvas always 22 inches wide (DTF standard) |
| `CANVAS_BASE_WIDTH` | 520 | Base pixel width at default zoom |
| `PX_PER_INCH_BASE` | 520 / 22 ≈ 23.6 | Pixels per inch at zoom 1× |
| `MIN_GAP_PX` | ~1 | Minimum enforced gap between images |
| `PRICE_PER_INCH` | $0.26 | Cost per linear inch of sheet height |
| `MAX_HEIGHT_IN` | 25 × 12 = 300 | Max sheet height in inches (25 feet) |
| `EXPORT_MAX_TILE_IN` | 24 | Max tile height per export pass (browser canvas limit) |

---

## 3. Layout Control

**File:** `frontend/src/pages/Builder.tsx`

The builder renders outside the app's `<Layout>` shell (see `App.tsx` line 40). The full-screen layout is controlled entirely within `Builder.tsx` using Tailwind utility classes and inline styles.

Key layout elements:
- The outer wrapper is a fixed-position full-screen div (`position: fixed; inset: 0`).
- The header bar is a fixed-height flex row at the top.
- The content area beneath is a horizontal flex: left panel (fixed width) + canvas scroll area (flex-grow).
- The canvas scroll container uses `overflow: auto` and centers the canvas element with margin.
- The canvas `<div>` has explicit pixel dimensions derived from `canvasWidthPx` and `canvasHeightPx` state variables (which scale with zoom level).
- Each canvas item is absolutely positioned inside the canvas div.

**Shopify integration layout** (`theme/`): The Liquid sections render a product information card on the Shopify storefront. The React builder itself is loaded as an embedded app (iframe or app block) within the `@app` block slot — the Liquid does not directly control the builder canvas.

---

## 4. Styling Control

**Primary file:** `frontend/src/index.css`

- Sets up Tailwind CSS base/components/utilities layers.
- Defines CSS custom properties for the retro color palette:
  - `--retro-pink`, `--retro-yellow`, `--retro-purple`, `--retro-cyan`
- Declares font-face rules for display fonts (`font-display` class).
- Sets global body background and text defaults.

**Component-level styling:** Every UI element in `Builder.tsx` and the UI components under `components/ui/` is styled with Tailwind utility classes. There are no separate CSS modules or SCSS files for the builder.

**Canvas-specific inline styles:**
- Canvas dimensions are set as inline `width`/`height` on the canvas div (computed from zoom level + inches).
- Canvas items use inline `transform: rotate(Xdeg)` for rotation and `scaleX(-1)` / `scaleY(-1)` for flips.
- Collision-highlighted items get a red border color applied inline.
- The ruler overlay uses a repeating CSS background gradient to draw inch tick marks.

---

## 5. Canvas Behavior

**File:** `frontend/src/pages/Builder.tsx`

### Drag & Drop (placement)

- Library: `react-rnd` (`<Rnd>` component) wraps each canvas item.
- `onDragStop` → calls `resolveCollision()` to prevent overlaps → updates item position in state.
- `onResizeStop` → calls `resolveResizeCollision()` → updates item dimensions in state.

### Collision Detection

Two pure functions, both in `Builder.tsx` (lines 41–223):

**`aabbOverlap(ax, ay, aw, ah, bx, by, bw, bh)`**
- Simple axis-aligned bounding box overlap test. Returns `true` if two rectangles overlap.

**`resolveCollision(dragging, proposedX, proposedY, prevX, prevY, others, buffer)`**
- Sweep-based continuous collision detection. Traces the drag movement vector and finds the earliest time of contact with any obstacle. Stops the dragging item there and slides it along the colliding wall (up to 4 iterations). The `buffer` parameter enforces a minimum gap (`MIN_GAP_PX`) between images.
- Returns the safe final `{x, y}` and a `Set<string>` of IDs of items that were collided with (used to highlight them red).

**`resolveResizeCollision(item, proposedX, proposedY, proposedW, proposedH, others, canvasBoundW, canvasBoundH)`**
- Handles resize operations. Clamps the new bounding box against canvas edges and other items. Detects which edges grew and only resolves collisions on the grown sides.
- Returns safe `{width, height, x, y}` and colliding IDs.

### Snapping

Items snap to the canvas boundaries (left edge = 0, right edge = canvas width) and also snap to other items' edges when dragged close enough. The snap distance is derived from `MIN_GAP_PX`.

### Zoom / Pan

- `zoomLevel` state (number, e.g. `1.0` = 100%).
- Canvas pixel dimensions = `CANVAS_BASE_WIDTH * zoomLevel` wide, `canvasHeightIn * PX_PER_INCH_BASE * zoomLevel` tall.
- Item positions and sizes stored in **base pixel units** (not zoom-relative), then rendered with the zoom factor applied to the canvas container via CSS `transform: scale()` — or equivalently by computing pixel sizes directly.
- Mouse wheel on canvas changes zoom. Zoom slider in the toolbar also controls it.

### Rotation & Flip

- `rotation` (degrees, 0–360) stored per `CanvasItem`.
- Applied via CSS `transform: rotate(${rotation}deg)` on the item wrapper.
- Horizontal flip: `flipH` boolean → `scaleX(-1)`.
- Vertical flip: `flipV` boolean → `scaleY(-1)`.
- Undo/redo history tracks all mutations.

### Multi-Sheet Support

- `sheets: CanvasItem[][]` — array of sheets, each an array of canvas items.
- `sheetNames: string[]` — display name for each sheet.
- `activeSheetIndex: number` — which sheet is currently shown.
- Sheet tabs are rendered in the header. Adding items to the canvas appends to `sheets[activeSheetIndex]`.
- Each sheet's height auto-expands as items are added (computed from the tallest item's bottom edge).

### DPI Checking

- `readPngMeta(file: File)` — reads pHYs chunk from PNG binary data to extract pixels-per-meter → converts to DPI. Also scans for embedded Photoshop XMP metadata to read document dimensions in inches.
- At 300 DPI a correctly sized image placed on the canvas will have a 1:1 pixel-to-print mapping. The builder warns users when images are placed at a size that would print at less than 150 DPI.
- `injectPngDpi(blob: Blob, dpi: number)` — patches the pHYs chunk into the exported PNG so downstream software (print RIPs, Photoshop) interprets the resolution correctly.

---

## 6. Image Upload & Placement

**File:** `frontend/src/pages/Builder.tsx` (upload flow inside `LibraryPanel`)

### Session Upload (Images Tab)

1. User drops files onto the dropzone (`react-dropzone`).
2. `readPngMeta()` extracts DPI and document dimensions.
3. Browser creates a local blob URL for instant preview.
4. A temporary `UploadedImage` item with `uploading: true` is added to the local library list.
5. `POST /api/storage/uploads/request-url` → receives a presigned GCS upload URL.
6. `PUT <presignedUrl>` uploads the raw file bytes directly to GCS.
7. The stable CDN URL is constructed: `/api/storage/objects/<objectPath>`.
8. `POST /api/library` registers the image in the database with pixel dimensions, DPI, and object path.
9. The temp item is replaced with the confirmed item (real ID, stable URL).

### Library Upload (Library Tab)

Same flow as above but images are persisted to the database and associated with the logged-in customer. They survive page refreshes and can be reused across projects.

### Placing Images on Canvas

- Clicking or double-clicking an image in either panel calls `addToCanvas(item)`.
- `addToCanvas` computes initial canvas dimensions in pixels from the image's natural pixel size and DPI, then appends a new `CanvasItem` to `sheets[activeSheetIndex]`.
- The default placement position is the next available spot that does not collide with existing items (using the same collision logic).

### Placement Data Model

```typescript
type CanvasItem = {
  id: string;          // Unique ID for this canvas instance
  imageId: string;     // Links back to the source UploadedImage
  url: string;         // CDN URL of the image
  name: string;
  x: number;           // Left edge in base pixels
  y: number;           // Top edge in base pixels
  width: number;       // Width in base pixels
  height: number;      // Height in base pixels
  naturalW: number;    // Original image width in pixels
  naturalH: number;    // Original image height in pixels
  fileDPI: number;     // DPI read from the file
  rotation?: number;   // Degrees (0–360)
  flipH?: boolean;
  flipV?: boolean;
};
```

---

## 7. Saving, Loading & State Management

All state is managed with React `useState` inside `Builder.tsx`. There is no external state management library (no Redux, no Zustand).

### Local Draft Persistence (localStorage)

Constants: `DRAFT_LS_KEY = 'radical_prints_draft'`, `ACTIVE_PROJECT_LS_KEY = 'rp_active_project'`

- `saveDraftToLS(payload)` — serializes `{library, sheets, sheetNames, savedAt}` to `localStorage`.
- `loadDraftFromLS()` — reads and parses the draft on mount.
- `clearDraftFromLS()` — called when the user explicitly saves or clears the project.
- This provides crash recovery: if the user closes the tab accidentally, their work survives the next page open.

### Server-Side Draft (API)

- `PUT /api/projects/draft` — upserts a draft row in `gang_sheet_projects` with `isDraft: true`.
- Called automatically at intervals (autosave) and explicitly on user action.
- `GET /api/projects/draft` — loaded on mount when the user is logged in.
- `DELETE /api/projects/draft` — called when the user explicitly saves as a named project.

### Named Projects (API)

- `GET /api/projects` — lists all named projects for the customer.
- `POST /api/projects` — creates a new named project (deletes draft first).
- `PUT /api/projects/:id` — updates an existing project (name or data).
- `DELETE /api/projects/:id` — removes a project.
- Projects panel (`ProjectsPanel` sub-component inside `Builder.tsx`) shows the list and handles load/save/delete UI.

### Project Data Schema

The entire canvas state is serialized as a `ProjectData` object (defined in `db/src/schema/gangSheetProjects.ts`):

```typescript
interface ProjectData {
  library: ProjectLibraryImage[];   // Images available in the session library
  sheets: ProjectCanvasItem[][];    // One array per sheet, each containing canvas items
  sheetNames: string[];             // Display names for each sheet
}
```

### Undo / Redo

- `history: CanvasItem[][][]` — array of past sheet states.
- `historyIndex: number` — current position.
- Every mutation to `sheets` pushes a copy onto `history`.
- Undo pops back one step; redo advances forward.

### Order Snapshots

When the user checks out:
1. `addItem()` from `use-cart` adds the gang sheet product to the Shopify cart.
2. `POST /api/orders` records an immutable snapshot of the current `ProjectData` in `gang_sheet_orders`.
3. The snapshot is never mutated — it preserves the exact layout the customer submitted, even if they later delete images from their library.

---

## 8. Third-Party Libraries

### Frontend

| Library | Version (see package.json) | Used For |
|---------|---------------------------|----------|
| `react-rnd` | latest | Draggable + resizable canvas items. Core of the canvas interaction. |
| `react-dropzone` | latest | File drop zones in the Images and Library panels. |
| `jspdf` | latest | Generates PDF export of the gang sheet. Renders the canvas to PDF pages. |
| `jszip` | latest | Bundles multi-sheet PNG exports into a ZIP file for download. |
| `lucide-react` | latest | Icon set used throughout the builder toolbar and panels. |
| `wouter` | latest | Client-side routing; builder is mounted at `/builder`. |
| `@radix-ui/react-dialog` | latest | Accessible modal dialogs (save project, confirm delete). |
| `@radix-ui/react-tooltip` | latest | Toolbar icon tooltips. |
| `@radix-ui/react-select` | latest | Sheet size selector, sort/filter dropdowns. |
| `@radix-ui/react-tabs` | latest | Left panel tab navigation. |
| `@radix-ui/react-slider` | latest | Zoom level slider. |
| `@radix-ui/react-scroll-area` | latest | Scrollable library/projects panel. |
| `@tanstack/react-query` | latest | Used by the generated API client hooks. |
| `clsx` + `tailwind-merge` | latest | Used by `cn()` in `utils.ts` for class name composition. |
| `tailwindcss` | latest | All UI styling (utility classes). |

### Backend

| Library | Version (see package.json) | Used For |
|---------|---------------------------|----------|
| `express` | latest | HTTP server framework. |
| `sharp` | latest | **PNG tile stitching** in `/api/stitch`. Decodes PNG tiles to raw RGBA, concatenates, re-encodes. |
| `multer` | latest | Multipart file upload handling for the `/api/stitch` endpoint. |
| `drizzle-orm` | latest | Type-safe PostgreSQL ORM for all database operations. |
| `drizzle-kit` | latest | Schema migration tooling. |
| `pg` | latest | PostgreSQL driver used by Drizzle. |
| `@google-cloud/storage` | latest | GCS object storage client (presigned URLs, upload, download, delete). |
| `zod` | latest | Request body validation (via `api-zod` library). |

---

## 9. Code Not Copied — with Reasons

| File / Area | Reason |
|-------------|--------|
| `backend/src/routes/auth.ts` | Shopify OAuth session setup (login redirect, callback, session cookie). Required at runtime but not specific to the gang sheet builder. A standalone desktop app would replace this with a different auth mechanism. |
| `backend/src/routes/draft-checkout.ts` | Creates Shopify draft orders. Post-builder checkout step, not part of the canvas. |
| `backend/src/routes/webhooks.ts` | Processes Shopify `orders/paid` webhooks. Post-purchase. |
| `backend/src/routes/print-files.ts` | Manages production print files after orders are placed. Post-purchase. |
| `artifacts/api-server/src/middlewares/` | Express middleware (auth guard, error handler). Needed by the server but not builder-specific. |
| `artifacts/api-server/src/lib/objectStorage.ts` | Server-side GCS abstraction. Relevant only if you keep the Express backend. |
| `artifacts/api-server/src/lib/objectAcl.ts` | Access control layer for GCS objects. Same note. |
| `frontend/src/pages/Cart.tsx` | Full-screen cart page. Builder only uses `addItem()` from the cart hook. |
| `frontend/src/pages/UploadPrint.tsx` | Single-print upload flow. Different product category. |
| `frontend/src/pages/UploadGangSheet.tsx` | Pre-built file upload (no interactive canvas). Separate feature. |
| `frontend/src/pages/Account.tsx` | Customer account management. Unrelated to canvas. |
| `frontend/src/pages/Home.tsx`, `Shop.tsx`, `Contact.tsx`, `FAQ.tsx`, etc. | Marketing and e-commerce pages. Completely separate from the builder. |
| `frontend/src/components/Layout.tsx` | Site nav/footer shell. Builder bypasses it entirely. |
| `frontend/src/components/RetroButton.tsx` | Used only in pre-made gang sheet pages (`GangSheets.tsx`), not in the interactive builder. |
| `frontend/src/components/ui/` (remaining files) | UI primitives not imported by `Builder.tsx` (accordion, alert, calendar, carousel, chart, etc.). |
| `lib/api-zod/` | Server-side Zod validators generated from the same OpenAPI spec. The `api-client-react` types already cover the client side. |
| `db/drizzle.config.ts` | Drizzle Kit migration config. Tooling, not logic. |
| `funky-horizon/` (all non-builder liquid files) | Theme shell, product grid, header, footer, cart. None are part of the builder canvas. |
| `theme/radical-gang-sheet-hub.liquid` | Landing page hub for the gang sheets section — links to builder and pre-made sheets. UI shell, not the builder itself. |
| `theme/radical-upload-gang-sheet-product.liquid` | Upload (non-builder) product page. Different flow. |
| Vite config, Tailwind config, tsconfig files | Build tooling. Not needed to understand builder logic. |
