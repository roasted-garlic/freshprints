# Features Inventory — Fresh Prints Studio

> Route map from `AppRoutes.tsx`. Permission gates noted where applicable.

## Authentication

| Feature | Route / location | Notes |
|---------|------------------|-------|
| Login / logout | `/login` | Email/password, remember-me |
| Auth bootstrap gate | All routes | Loads Firestore profile before app |
| Protected routes | All authenticated routes | Permission-based via `ProtectedRoute` |

## Design Library (`/designs`) — permission: `viewDesigns`

| Feature | Status |
|---------|--------|
| Design grid with thumbnails | ✅ Live |
| Search (title, description, tags) | ✅ Live |
| Category filter | ✅ Live |
| Multi-select tag filter modal | ✅ Live |
| Pagination (load more, 100/page) | ✅ Live |
| Archived catalog toggle | ✅ Live |
| URL query param persistence | ✅ Live |
| Design details panel | ✅ Live |
| Edit design metadata modal | ✅ Live |
| Archive / restore design | ✅ Live |
| Print size display (300/150/72 DPI equivalents) | ✅ Live |
| Manual design creation (Phase 2C) | ✅ Live |
| Category CRUD with contiguous active ordering and drag reorder | ✅ Live |
| Request-selection mode for Print Requests | ✅ Live |

**Not in Design Library:** AI review queue, import status filters, production queue. In request-selection mode, Design Library still shows approved catalog designs only.

## Imports (`/imports`) — permission: `importDesigns`

| Feature | Status |
|---------|--------|
| Single ZIP import | ✅ Live |
| Folder batch import | ✅ Live |
| Nested ZIP support | ✅ Live |
| PNG validation (type, dimensions, DPI) | ✅ Live |
| Print size assessment during import | ✅ Live |
| Thumbnail + preview generation (sharp) | ✅ Live |
| Upload to Firebase Storage | ✅ Live |
| Firestore design record creation | ✅ Live |
| Automatic AI enrichment enqueue | ✅ Live |
| Batch import progress UI | ✅ Live |
| Import completion → link to AI Review | ✅ Live |
| 2GB ZIP limit | ✅ Live |
| Auto-upscale low-resolution PNGs (3000px / 10in @ 300 DPI target) | ✅ Live |
| Trim transparent padding at import | ✅ Live |
| `IMAGE_UPSCALED` / `IMAGE_TRIMMED` informational warnings | ✅ Live |

## AI Review (`/ai-review`) — permission: `viewAiReview`

| Feature | Status |
|---------|--------|
| Three tabs: Processing, Needs Review, Rejected | ✅ Live |
| Oldest-first queue (no search/filter in inbox) | ✅ Live |
| Preview panel + image zoom | ✅ Live |
| AI processing stepper (pipeline stages) | ✅ Live |
| AI suggestions panel (title, description, category, tags) | ✅ Live |
| Staff catalog form (edit before approve) | ✅ Live |
| Approve & Next / Reject & Next / Skip | ✅ Live |
| Auto-advance toggle | ✅ Live |
| Keyboard shortcuts (J/K navigation, approve/reject) | ✅ Live |
| Re-run AI suggestions | ✅ Live |
| Re-run overlay stepper | ✅ Live |
| Rejected tab: Reopen for Review, Re-run AI | ✅ Live |
| Cross-tab navigation with selection preserved | ✅ Live |
| OCR/arched text validation feedback | ✅ Live |
| Configurable OpenAI vision model (Settings) | ✅ Live |
| Tag exclusions (Settings) | ✅ Live |
| Queue stop control | ✅ Live |
| Main panel height management | ✅ Live |

## Settings (`/settings`) — permission: `manageSettings`

| Feature | Status |
|---------|--------|
| AI enrichment vision model selector | ✅ Live |
| Tag exclusion list | ✅ Live |

## Users (`/users`) — permission: `viewUsers`

| Feature | Status |
|---------|--------|
| Team user list (search/filter) | ✅ Live |
| Create team user (Cloud Function + invite email) | ✅ Live |
| Edit role/status (Cloud Function) | ✅ Live |
| Owner vs admin visibility rules | ✅ Live |
| Customer record create/edit | ✅ Live |
| Cross-directory duplicate email prevention | ✅ Live |

## Print Requests (`/print-requests`) — permission: `viewPrintRequests`

| Feature | Status |
|---------|--------|
| Print request list/detail workspace | ✅ Live |
| Internal print requests | ✅ QA pass |
| Customer print requests | ✅ QA pass |
| Create/update request flows | ✅ QA pass |
| Request item list/edit/remove | ✅ QA pass |
| Add approved catalog designs from Design Library | ✅ QA pass |
| Quantity selection | ✅ QA pass |
| Request item persistence after reload/revisit | ✅ QA pass |
| Design lifecycle status remains catalog-only | ✅ QA pass |

## Show Queue (`/show-queue`) — permission: `viewShowQueue`

| Feature | Status |
|---------|--------|
| Combined Whatnot show + print run list/detail | ✅ Live |
| Manual add/update show (Whatnot URL → show ID, schedule) | ✅ Live |
| Upcoming / Past tabs | ✅ Live |
| Capacity tracking + progress bars + Open/Full/Over Max | ✅ Live |
| Split allocation across shows | ✅ Live |
| Add to Show / attach Print Requests | ✅ Live |
| Working / Queued / Printed request tabs | ✅ Live |
| Staff-assisted Whatnot show-list import | ✅ Live |
| Show Queue settings (`settings/showQueue`, gang sheet layout) | ✅ Live |
| **Export** — per-show zip (300 DPI resize per allocation) | ✅ Signed off 2026-07-07 |
| Export multiply-by-quantity option | ✅ Signed off 2026-07-07 |
| **Export Gang Sheet** — auto-nested PNG export | ✅ Signed off 2026-07-07 |
| Gang Sheet Builder manual canvas (`/show-queue/:showId/gang-sheet`) | ⏸ Deferred (unlinked from nav) |

## Dev Dashboard (`/dev-dashboard`) — permission: `accessDashboard`

| Feature | Status |
|---------|--------|
| Placeholder statistics | ✅ Scaffold |

## Legacy scaffolds (pre-roadmap realignment)

| Route | Notes |
|-------|-------|
| `/customer-requests` | Placeholder — will become Custom Requests (Phase 9) |

## Backend (Cloud Functions)

| Function | Purpose |
|----------|---------|
| `createTeamUser` | Provision team account + invite |
| `updateTeamUser` | Update role/status |
| `enqueueAiEnrichment` | Queue design for AI processing |
| `updateAiEnrichmentSettings` | Owner/admin model settings |
| `onDesignAiEnrichmentQueued` | Run enrichment pipeline |

## Fresh Prints Portal (Phase 8 — dev)

| Feature | Status |
|---------|--------|
| Customer registration / login | ✅ Live (dev) |
| Catalog browse, search, filters | ✅ Live (dev) |
| Customer print requests (create, edit, tabs) | ✅ Live (dev) |
| Progress tracking (Working / Queued / Printing / Printed) | ✅ Live (dev) |
| **Add to show** (customer show selection) | ✅ Signed off 2026-07-08 |
| Production App Hosting deploy | ⏸ Pending human approval |

## Not yet built (Phase 9+)

Favorites, custom request intake, analytics counters.
