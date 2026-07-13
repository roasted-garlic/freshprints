# Features Inventory

## Fresh Prints Studio

### Authentication
Login/logout, profile bootstrap, protected routes via permissions.

### Design Library (`/designs`)
Approved catalog grid; search; category + tag filters; archive toggle; details/edit; request-selection mode for staff print requests; print-size / DPI display.

### Imports (`/imports`)
ZIP/folder import; PNG validation; trim + upscale; thumbnails/previews; Storage upload; AI enqueue; batch progress.

### AI Review (`/ai-review`)
Processing / Needs Review / Rejected tabs; suggestions panel; approve/reject/skip; re-run AI; keyboard shortcuts; settings-driven model + tag exclusions.

### Print Requests (`/print-requests`)
Internal + customer requests; item qty/size autosave; DPI quality feedback; duplicate same design for other sizes; Design Library selection mode.

### Show Queue (`/show-queue`)
Upcoming/Past shows; capacity; attach requests; Working/Queued/Printed; Whatnot assisted import; zip export @ 300 DPI; auto-nested gang sheet PNG; production timer; calendar picker. Manual gang-sheet builder deferred.

### Customer Uploads (intake)
Staff review of Portal customer artwork: Pending / Excluded tabs; Send to AI Review; exclude/restore; retry processing; surface library-permission declined (ADR-FP-074).

### Users / Settings / Dev
Team users + customer records; AI enrichment settings; show-queue settings; dashboard scaffold.

---

## Fresh Prints Portal (`apps/portal`, localhost:**3100**)

| Feature | Status |
|---------|--------|
| Customer register / login | ✅ Live (dev) |
| Catalog Discover + Design Library | ✅ Live (dev) |
| Collapsible “How print requests work” hint | ✅ Live |
| Start / continue print request | ✅ Live (one working request — ADR-FP-071) |
| Selection mode: add library designs with quantities | ✅ Live |
| **Upload artwork** (modal; PNG/WebP/folder/ZIP) | ✅ Live (dev) — dedicated `/requests/artwork` page planned next |
| Persistent Current Request / basket drawer | 🔄 Planned (`portal-persistent-current-request`) |
| Confirm ownership (required) + library permission (optional, default on) | ✅ Live |
| Attach ready uploads to working request | ✅ Live |
| Request item cards: qty, size, DPI badge; save blocked &lt; 200 DPI | ✅ Live |
| Progress tabs (Working / Queued / Printing / Printed) | ✅ Live |
| Add request to show (callable + calendar) | ✅ Live |
| Production App Hosting | ⏸ Human approval |

### Customer upload limits (r7)

| Limit | Value |
|-------|-------|
| Files per batch | 100 |
| Single image | 100 MB |
| Batch uncompressed / ZIP | 2 GB |
| Concurrent finalize | 8 |
| Daily finalize images | 200 |
| Daily create-batch sessions | 100 |
| Formats | Transparent PNG, static WebP |

---

## Cloud Functions (selected)

| Area | Callables / triggers |
|------|----------------------|
| Team | `createTeamUser`, `updateTeamUser` |
| AI | `enqueueAiEnrichment`, `onDesignAiEnrichmentQueued`, settings/playground |
| Portal requests | `createPortalPrintRequest`, `duplicatePortalPrintRequestItem`, `listPortalAllocatableShows`, `queuePortalPrintRequestToShow` |
| Customer uploads | `createCustomerUploadBatch`, `finalizeCustomerUpload`, `finalizeCustomerUploadZip`, `confirmCustomerUploadsAndAttachToRequest`, promote/exclude/restore/retry, cleanup/wipe helpers |

---

## Not yet built (Phase 9+)

Custom Request Q&A / Etsy fee flow; analytics dashboards; favorites; production Portal hosting.
