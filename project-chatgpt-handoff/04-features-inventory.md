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

## Dev Dashboard (`/dev-dashboard`) — permission: `accessDashboard`

| Feature | Status |
|---------|--------|
| Placeholder statistics | ✅ Scaffold |

## Legacy scaffolds (pre-roadmap realignment)

| Route | Notes |
|-------|-------|
| `/show-queue` | Placeholder — will become Print Runs (Phase 7) |
| `/customer-requests` | Placeholder — will become Custom Requests (Phase 9) |

## Backend (Cloud Functions)

| Function | Purpose |
|----------|---------|
| `createTeamUser` | Provision team account + invite |
| `updateTeamUser` | Update role/status |
| `enqueueAiEnrichment` | Queue design for AI processing |
| `updateAiEnrichmentSettings` | Owner/admin model settings |
| `onDesignAiEnrichmentQueued` | Run enrichment pipeline |

## Not yet built (Portal — Phase 8+)

Customer registration, catalog browse, customer print requests, favorites, custom request intake.
