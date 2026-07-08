# Gang Sheet Builder — Reference Export

> **This folder is a read-only reference copy. Do not run it directly.**
> All files are copied from the live Radical Prints project. No files were modified.
> Use this as the source of truth when building a standalone gang sheet builder for another project, or when handing this logic off to another developer.

---

## What Is a Gang Sheet Builder?

A "gang sheet" is a single large print film (typically 22" wide) onto which a customer arranges multiple individual artwork images for DTF (Direct to Film) printing. The builder is an interactive canvas that lets the customer drag, resize, rotate, and arrange those images before submitting the design for production.

---

## Architecture Overview

```
┌───────────────────────────────────────────────────────────┐
│  Browser (React + Vite)                                   │
│  frontend/src/pages/Builder.tsx           │
│  ┌─────────────────────┐  ┌──────────────────────────┐   │
│  │  Left Panel          │  │  Canvas (react-rnd)       │   │
│  │  - Images (upload)   │  │  - Drag / Resize items   │   │
│  │  - Library (saved)   │  │  - Collision detection   │   │
│  │  - Projects (CRUD)   │  │  - Zoom / Pan            │   │
│  │  - Orders (history)  │  │  - Multi-sheet support   │   │
│  └─────────────────────┘  └──────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
          │ fetch (REST)                  │ export
          ▼                              ▼
┌────────────────────┐       jsPDF + jszip + /api/stitch
│  Express API Server│       (PNG tile stitching)
│  /api/projects     │
│  /api/library      │
│  /api/storage      │
│  /api/stitch       │
└────────────────────┘
          │ drizzle-orm (PostgreSQL)
          ▼
┌────────────────────────────────┐
│  PostgreSQL tables             │
│  gang_sheet_projects           │
│  gang_sheet_library            │
│  gang_sheet_orders             │
└────────────────────────────────┘
          │ object storage (GCS)
          ▼
┌────────────────────────────────┐
│  User-uploaded images          │
│  Served via /api/storage/objects│
└────────────────────────────────┘
```

---

## Copied Files

### Frontend — Main Builder

| File | Original Path | What It Does |
|------|--------------|-------------|
| `frontend/src/pages/Builder.tsx` | Same | **Primary builder component** (~5,500 lines). Contains the entire canvas UI, all left-panel sub-components (`LibraryPanel`, `ProjectsPanel`, `OrdersPanel`), collision detection, DPI injection, image upload flow, export logic, and the cart checkout integration. This is the most important file in the reference. |
| `frontend/src/pages/GangSheets.tsx` | Same | Browse pre-made gang sheet products from Shopify. Not part of the interactive builder but linked from the same product domain. |
| `frontend/src/pages/GangSheetDetails.tsx` | Same | Product detail page for a single pre-made gang sheet. Same note as above. |
| `frontend/src/App.tsx` | Same | Application router. Shows that `/builder` renders `Builder.tsx` full-screen, outside the standard page layout. |

### Frontend — Components Used by Builder

| File | Original Path | What It Does |
|------|--------------|-------------|
| `frontend/src/components/FunkyFreshLogo.tsx` | Same | SVG/CSS brand logo rendered in the builder header. |
| `frontend/src/components/ui/dialog.tsx` | Same | Radix UI dialog primitive — used for save-project modal, delete confirmations. |
| `frontend/src/components/ui/tooltip.tsx` | Same | Radix UI tooltip — used on toolbar icon buttons. |
| `frontend/src/components/ui/toast.tsx` | Same | Toast notification component. |
| `frontend/src/components/ui/toaster.tsx` | Same | Toast provider rendered at the app root. |
| `frontend/src/components/ui/sonner.tsx` | Same | Alternative toast using the `sonner` library. |
| `frontend/src/components/ui/button.tsx` | Same | Styled button primitive. |
| `frontend/src/components/ui/input.tsx` | Same | Styled text input. |
| `frontend/src/components/ui/select.tsx` | Same | Styled select / dropdown. |
| `frontend/src/components/ui/slider.tsx` | Same | Slider — used for zoom controls. |
| `frontend/src/components/ui/tabs.tsx` | Same | Tab navigation (left panel tabs). |
| `frontend/src/components/ui/scroll-area.tsx` | Same | Scrollable region — left panels. |
| `frontend/src/components/ui/separator.tsx` | Same | Visual divider. |
| `frontend/src/components/ui/badge.tsx` | Same | Small status badge. |
| `frontend/src/components/ui/spinner.tsx` | Same | Loading spinner. |
| `frontend/src/components/ui/skeleton.tsx` | Same | Loading placeholder skeleton. |

### Frontend — Hooks

| File | Original Path | What It Does |
|------|--------------|-------------|
| `frontend/src/hooks/use-auth.tsx` | Same | Auth context + hook. Wraps Shopify customer session (login/logout, profile fetch). Builder uses `useAuth()` to gate features behind login and to attach uploads to a customer account. |
| `frontend/src/hooks/use-toast.ts` | Same | Toast notification state management (vanilla React, no external library). |
| `frontend/src/hooks/use-mobile.tsx` | Same | Returns `true` when viewport is below 768 px. Used in the builder to adapt layout. |
| `frontend/src/hooks/use-cart.tsx` | Same | Cart context. Builder calls `addItem()` when adding the completed gang sheet to the Shopify cart for checkout. |

### Frontend — Utilities

| File | Original Path | What It Does |
|------|--------------|-------------|
| `frontend/src/lib/utils.ts` | Same | `cn()` helper — merges Tailwind class names with `clsx` + `tailwind-merge`. Used throughout components. |
| `frontend/src/lib/shopify.ts` | Same | Shopify Storefront API client. Builder uses `getProductByHandle('created-gang-sheet')` to fetch the gang sheet product variant ID needed for cart checkout. Also contains cart mutation helpers. |

### Frontend — Styles

| File | Original Path | What It Does |
|------|--------------|-------------|
| `frontend/src/index.css` | Same | Global CSS. Sets up Tailwind base layers, custom CSS variables (retro color palette), and font-face declarations. |

### Frontend — Package Manifest

| File | Original Path | What It Does |
|------|--------------|-------------|
| `frontend/package.json` | Same | Lists all frontend dependencies. Key builder deps: `react-rnd`, `react-dropzone`, `jspdf`, `jszip`, `lucide-react`, `wouter`, `@radix-ui/*`, `tailwindcss`. |

---

### Backend — API Routes

| File | Original Path | What It Does |
|------|--------------|-------------|
| `backend/src/routes/projects.ts` | Same | CRUD for gang sheet projects. Endpoints: `GET /api/projects`, `GET/PUT/DELETE /api/projects/draft`, `GET/POST/PUT/DELETE /api/projects/:id`. Projects store the full canvas state (library + sheets + sheet names) as JSONB. |
| `backend/src/routes/library.ts` | Same | Manages the user's persistent image library. `GET /api/library` lists images; `POST /api/library` registers a newly-uploaded image; `DELETE /api/library/:id` soft- or hard-deletes (preserving images referenced by past orders). |
| `backend/src/routes/storage.ts` | Same | Handles object (image) storage. `POST /storage/uploads/request-url` generates a presigned GCS upload URL. `GET /storage/objects/*` proxies private image downloads. `GET /storage/public-objects/*` serves public assets. |
| `backend/src/routes/stitch.ts` | Same | **Export stitch endpoint.** `POST /api/stitch` accepts an array of PNG tile files (multipart), concatenates their raw RGBA pixel buffers, and returns a single stitched PNG at 300 DPI. Used during export when the sheet is too tall for a single browser canvas render. |
| `backend/src/routes/orders.ts` | Same | Records a gang sheet order snapshot after checkout. Stores a frozen copy of the project data (library + sheets) so order history survives future library edits. |
| `backend/src/routes/index.ts` | Same | Route registration — shows how all routes are mounted on the Express app. **Note:** this file imports several routes that were not copied into this reference folder (`auth`, `health`, `print-files`, `webhooks`, `draft-checkout`) because they are not part of the gang sheet builder itself. It is included for structural context only and cannot be executed as-is without those omitted files. |
| `backend/package.json` | Same | Backend dependencies. Key: `express`, `sharp` (tile stitching), `multer`, `drizzle-orm`, `@google-cloud/storage`. |

---

### Database — Schema

| File | Original Path | What It Does |
|------|--------------|-------------|
| `db/src/schema/gangSheetProjects.ts` | Same | Drizzle ORM table definition for `gang_sheet_projects`. Columns: `id`, `shopifyCustomerId`, `name`, `data` (JSONB — full canvas state), `isDraft`, timestamps. Also exports TypeScript interfaces `ProjectLibraryImage`, `ProjectCanvasItem`, `ProjectData`. |
| `db/src/schema/gangSheetLibrary.ts` | Same | Table for `gang_sheet_library`. Per-customer image registry: `objectPath`, `naturalW/H`, `fileDpi`, `docWidthIn/H`, `deletedAt` (soft-delete). |
| `db/src/schema/gangSheetOrders.ts` | Same | Table for `gang_sheet_orders`. Order snapshot: `projectSnapshot` (JSONB frozen copy of `ProjectData`), `canvasWidthIn/H`, `sheetCount`, `imageCount`, `totalPrice`, `printFileUrl`, `status`. |
| `db/src/schema/index.ts` | Same | Re-exports all schema tables. |
| `db/src/index.ts` | Same | Creates and exports the Drizzle `db` instance (database connection). |
| `db/package.json` | Same | DB lib dependencies: `drizzle-orm`, `drizzle-kit`, `pg`. |

---

### Shared Library — Object Storage Web

| File | Original Path | What It Does |
|------|--------------|-------------|
| `shared/object-storage-web/src/index.ts` | Same | Barrel export for the browser-side object storage utility. |
| `shared/object-storage-web/src/ObjectUploader.tsx` | Same | React component that wraps the presigned URL upload flow (request URL → PUT to GCS → register). |
| `shared/object-storage-web/src/use-upload.ts` | Same | Hook that manages upload state (progress, errors) for the `ObjectUploader`. |
| `shared/object-storage-web/package.json` | Same | Dependencies for the shared upload library. |

---

### Shared Library — API Client

| File | Original Path | What It Does |
|------|--------------|-------------|
| `shared/api-client-react/src/index.ts` | Same | Barrel export for the generated React API client. |
| `shared/api-client-react/src/custom-fetch.ts` | Same | Custom fetch wrapper used by the generated client (credentials, base URL). |
| `shared/api-client-react/src/generated/api.ts` | Same | Auto-generated React Query hooks for all API endpoints (from OpenAPI spec via Orval). |
| `shared/api-client-react/src/generated/api.schemas.ts` | Same | Auto-generated Zod schemas for all request/response types. |
| `shared/api-client-react/package.json` | Same | Dependencies: `@tanstack/react-query`, `orval` (codegen). |

---

### API Specification

| File | Original Path | What It Does |
|------|--------------|-------------|
| `shared/api-spec/openapi.yaml` | Same | OpenAPI 3 specification for the entire API server. Defines all endpoints, request bodies, and response shapes. Used to generate the React client and Zod validators. Start here to understand the full API surface. |

---

### Shopify Theme (Liquid)

| File | Original Path | What It Does |
|------|--------------|-------------|
| `theme/radical-gang-builder-page.liquid` | Same | Shopify theme section for a standalone builder landing page. Renders a product (defaulting to `gang-sheet-builder` handle), its variant picker, and an `@app` block slot where the React builder iframe would be injected. |
| `theme/radical-gang-builder-product.liquid` | Same | Shopify theme section for the builder rendered on a product page. Same structure but uses the current product context (`product`) instead of a section setting. Includes a pricing teaser below the product title. |

---

## Files NOT Included (and Why)

| File / Area | Reason Excluded |
|-------------|----------------|
| `frontend/src/pages/Cart.tsx` | Pure checkout UI. Builder only calls `addItem()` from `use-cart` — it does not render the cart page itself. |
| `frontend/src/pages/UploadPrint.tsx` | Different upload flow for single prints, not gang sheets. |
| `frontend/src/pages/UploadGangSheet.tsx` | Pre-built file upload path (no builder canvas). Different feature. |
| `frontend/src/pages/Account.tsx` | Customer account management. Unrelated to builder canvas. |
| `backend/src/routes/auth.ts` | Shopify OAuth session management. Needed by the server but not builder-specific. |
| `backend/src/routes/draft-checkout.ts` | Shopify draft order creation. Post-builder, not part of the builder itself. |
| `backend/src/routes/webhooks.ts` | Shopify webhook handlers (order paid, etc.). Post-purchase. |
| `backend/src/routes/print-files.ts` | Print file management after an order is placed. Post-purchase. |
| `funky-horizon/` (all other liquid files) | Theme shell, header, footer, cart, product grid, etc. None are required to understand the builder. |
| `lib/api-zod/` | Zod validators generated from the same OpenAPI spec. The `api-client-react` library is sufficient for understanding the API contract. |
| Tailwind config, Vite config, tsconfig | Build tooling. Not needed to understand builder logic, but `package.json` files cover dependencies. |

---

## Quick-Start for a Standalone Desktop Version

1. **Study `Builder.tsx`** — it is the entire builder in one file. The key areas:
   - Lines 1–265: Collision detection helpers + PNG DPI utilities
   - Lines 266–500: Type definitions, draft/project persistence helpers, image upload flow
   - Remainder: React component with canvas, toolbar, left panel, export logic
2. **Replace the API layer** — swap the `fetch()` calls to `/api/projects`, `/api/library`, `/api/storage`, and `/api/stitch` with local file system equivalents (e.g. Electron IPC or a local Express server).
3. **Replace auth** — remove `useAuth` and the login gate; in a desktop app the user is always "logged in."
4. **Replace cart checkout** — replace the `addItem()` call at the end of the export flow with a local file save or print dialog.
5. **Keep all canvas logic** — `react-rnd`, collision detection, DPI injection, `jspdf`/`jszip` export, and the tile-stitching pattern are all portable and self-contained.
