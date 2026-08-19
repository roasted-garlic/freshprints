# Features Inventory

## Fresh Prints Studio

### Authentication
Login/logout, profile bootstrap, protected routes via permissions.

### Design Library (`/designs`)
Approved catalog grid; search; category + tag filters; archive toggle; details/edit; request-selection mode for staff print requests; print-size / DPI display; default list **newest uploads first** (`createdAt` desc); Design details modal **full-res Download** of Storage original.

### Imports (`/imports`)
ZIP/folder import; PNG validation; trim + upscale (ADR-FP-080 ≤6× toward 12″); thumbnails/previews; Storage upload; AI enqueue; batch progress. No import-time halftone interrupt.

### AI Review (`/ai-review`)
Processing / Needs Review / Rejected tabs; suggestions panel; approve/reject/skip; re-run AI; keyboard shortcuts; settings-driven model + tag exclusions; staff Halftone toggle (human-only; AI never auto-enables).

### Print Requests (`/print-requests`)
Internal + customer requests; item qty/size autosave; DPI quality feedback; duplicate same design for other sizes; Design Library selection mode.

### Show Queue (`/show-queue`)
Upcoming/Past shows; capacity; attach requests; Working/Queued/Printing/Printed; Whatnot assisted
import; zip export @ 300 DPI; auto-nested gang sheet PNG; Start/Pause/Resume/Finish production
timer; terminal request reconciliation and completed locking; calendar picker; **Portal add-to-show
cutoff hours** setting (`portalQueueCutoffHoursBeforeStart`, ADR-FP-103). Owner QA v18 passed the
full Studio lifecycle and dynamic Portal Printed state on 2026-07-29. Manual gang-sheet builder
deferred.

### Customer Uploads (intake)
Staff review of Portal customer artwork: Pending / Excluded tabs; Send to AI Review; exclude/restore; retry processing; surface library-permission declined (ADR-FP-074).

### Custom Designs
Assisted inbox with stage tabs, request details, audited start/cancel/reject/restore actions, proof staging, and customer-revision visibility. Etsy searches and Suggestions management remain separate tabs.

### Users / Settings / Dev
Team users + customer records; AI enrichment settings; show-queue settings; dashboard scaffold;
**Brand logos** (owner upload Studio/Portal full+collapsed PNGs + display sizes — ADR-FP-114;
soft-deployed fresh-prints-dev); owner/dev-only **Test Data Reset**, including truthful **Legacy
print-limit counters** cleanup for retired, unenforced Cap A documents.

---

## Fresh Prints Portal (`apps/portal`, localhost:**3100**)

| Feature | Status |
|---------|--------|
| Customer register / login | ✅ Live (dev) |
| **Public browse (guest)** | ✅ Repo + UI PASS (ADR-FP-106) — catalog/home without sign-in; cloud rules deploy deferred |
| Guest auth overlay (gated routes) | ✅ Live (UI) — in-shell dimmed overlay; Sign in / Register / Browse designs |
| Catalog Discover + Design Library | ✅ Live (dev) — default browse `createdAt` desc (Studio-newest); metric modes keep metrics |
| Collapsible “How print requests work” hint | ✅ Live |
| Start / continue print request | ✅ Live (one working request — ADR-FP-071) |
| Selection mode: add library designs with quantities | ✅ Live |
| **Upload artwork** (modal; PNG/WebP/folder/ZIP) | ✅ Live (dev) — `/requests/artwork`; optional halftone checkbox (ADR-FP-080) |
| Persistent Current Request / basket drawer | ✅ Live (dev) — hidden for guests; filled CTA **Review & Add to Show** + **Needs a show** |
| Donate designs (`/donate`) | ✅ Live (dev) — ADR-FP-078; guest donate in repo (Anonymous Auth) — cloud deploy deferred |
| Confirm ownership (required) + library permission (optional, default on) | ✅ Live |
| Attach ready uploads to working request | ✅ Live |
| Request item cards: qty, size, DPI badge; save blocked &lt; 200 DPI | ✅ Live |
| Image quality sizing (`image-quality-v2`, ≤6× toward 12″) | ✅ Live (dev) — ADR-FP-080 |
| Progress tabs (Working / Queued / Printing / Printed) | ✅ Live |
| Add request to show (callable + calendar) | ✅ Live — Portal cutoff hours before start (ADR-FP-103); review header CTA **Add Request to Whatnot Show** opens picker |
| Design engagement analytics (GA4) | ✅ Repo (DEV) — modal/share `page_view` + `design_view`; public catalog IDs only (ADR-FP-138); production App Hosting rollout gated |
| Assisted Creation brief + submitted-only updates | ✅ Live (dev) |
| Assisted proof / revision / approval lifecycle | ✅ Live (dev) — owner QA `PASS` |
| Production App Hosting | ⏸ Human approval |

### Customer upload limits (r7)

| Limit | Value |
|-------|-------|
| Files per batch | 100 |
| Single image | 80 MB |
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
| Portal requests | `createPortalPrintRequest`, `duplicatePortalPrintRequestItem`, `listPortalAllocatableShows`, `queuePortalPrintRequestToShow` (cutoff via `settings/showQueue.portalQueueCutoffHoursBeforeStart`) |
| Customer uploads | `createCustomerUploadBatch`, `finalizeCustomerUpload`, `finalizeCustomerUploadZip`, `confirmCustomerUploadsAndAttachToRequest`, promote/exclude/restore/retry, cleanup/wipe helpers |
| Assisted Creation | `submitAssistedCreationRequest`, `customerUpdateAssistedCreationRequest`, `cancelAssistedCreationRequest`, `staffUpdateAssistedCreationStatus`, `staffAddAssistedCreationProof`, `customerRespondToAssistedCreationProof` |
| Brand logos (ADR-FP-114) | `finalizeBrandLogoSlot`, `updateBrandLogoDisplaySizes`; OG via `getPortalGlobalOpenGraph` — soft-deployed **fresh-prints-dev**; production gated |

---

## Not yet built (Phase 9+)

Proof-ready email notifications; Brevo email provider; optional custom-design fee; analytics dashboards; production Portal hosting.
