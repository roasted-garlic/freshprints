# Features Inventory

> 2026-08-24: Upcoming Shows (`/shows`) uses the **sidebar footer** theme toggle (same as other app-shell pages). Production App Hosting still `build-2026-08-24-001` until the chrome hotfix rolls out. Show discovery + Studio workflow/grouped sheets + **1.0.9** pins are on production Git (PR #88 @ `94a1ed0`). Published Studio remains **1.0.8** until Gate F.

## Fresh Prints Studio

### Authentication
Login/logout, profile bootstrap, protected routes via permissions.

### Design Library (`/designs`)
Approved catalog grid; search (including paste of a full Firestore design ID); **case- and separator-insensitive** text match shared with Portal; category + tag filters; archive toggle; details/edit; request-selection mode for staff print requests; print-size / DPI display; default list **newest uploads first** (`createdAt` desc); Design details modal **full-res Download** of Storage original. **Load more** only when another catalog page exists. **Scroll position preserved** after save (anchor to edited card).

### Imports (`/imports`)
ZIP/folder import; PNG validation; trim + upscale (ADR-FP-080 ≤6× toward 12″); thumbnails/previews; Storage upload; AI enqueue; batch progress. No import-time halftone interrupt. **Normalized Files** modal is condensed with internal scroll.

### AI Review (`/ai-review`)
Processing / Needs Review / Rejected tabs; suggestions panel; approve/reject/skip; re-run AI; keyboard shortcuts; settings-driven model + tag exclusions; staff Halftone toggle (human-only; AI never auto-enables). **Needs Review search** with shared normalization, AI-suggestion field match, and 500-design hydration batches.

### Print Requests (`/print-requests`)
Internal + customer requests in **separate lists** (Customer Requests default; Internal Requests via `isInternal`, ADR-FP-140); list sections **grouped by primary upcoming show** (`+N more shows` badge; Unassigned last); item qty/size autosave; DPI quality feedback; **manual save ≥200 DPI and ≤22″** (approved-max is initial/processing only); duplicate same design for other sizes; Design Library selection mode adds **new** catalog designs only (existing items keep ID/size/quantity).
**Convert to Internal Request** (callable, ADR-FP-141) under overflow ⋯; Customer primary action **Add to Show**; Internal primary action **Add to Internal Gangsheet**.

### Show Queue (`/show-queue`)
Upcoming/Past shows; capacity; attach requests; Working/Queued/Printing/Printed; Whatnot assisted
import; zip export @ 300 DPI; gang sheet PNG via **Generate** menu:
- **Standard** (efficiency nesting — default when `layoutMode` omitted; ADR-FP-143)
- **Grouped by customer** (section headings + `-Continued` spillover; separate cache fingerprint)
Standard and Grouped caches coexist. Start/Pause/Resume/Finish production timer; **Past + Printing Whatnot shows Finish automatically (or Mark Complete)** (ADR-FP-139); Internal Gang Sheet Mark Complete reconciles eligible internal requests to **Printed**; terminal request reconciliation and completed locking; calendar picker; **Portal add-to-show cutoff hours** setting (`portalQueueCutoffHoursBeforeStart`, ADR-FP-103). Manual gang-sheet builder deferred.

### Customer Uploads (intake)
Staff review of Portal customer artwork: Pending / Excluded tabs; Send to AI Review; exclude/restore; retry processing; surface library-permission declined (ADR-FP-074).

### Custom Designs
Assisted inbox with stage tabs, request details, audited start/cancel/reject/restore actions, proof staging, and customer-revision visibility. Etsy searches and Suggestions management remain separate tabs.

### Users / Settings / Dev
Team users + customer records; AI enrichment settings; show queue settings; dashboard scaffold;
sidebar footer **Studio Updates** (desktop staff, including Helpers) is an application-level overlay;
approved-tag pickers close after a suggestion is selected;
**Brand logos** (owner upload Studio/Portal full+collapsed PNGs + display sizes — ADR-FP-114;
soft-deployed fresh-prints-dev); owner/dev-only **Test Data Reset**, including truthful **Legacy
print-limit counters** cleanup for retired, unenforced Cap A documents.

---

## Fresh Prints Portal (`apps/portal`, localhost:**3100**; production App Hosting)

| Feature | Status |
|---------|--------|
| Customer register / login | ✅ Live — username field accepts mixed case; normalizes to lowercase; Whatnot guidance |
| Auth return-to / deep-link | ✅ Live — return after login to public browse / show paths |
| **Public browse (guest)** | ✅ Live — catalog/home without sign-in (ADR-FP-106) |
| Guest auth overlay (gated routes) | ✅ Live — in-shell dimmed overlay; Sign in / Register / Browse designs |
| Catalog Discover + Design Library | ✅ Live — default browse `createdAt` desc; **case/separator-insensitive search** |
| Discover show rails | ✅ Live — Next Show + This Week design rails; **DEV polish (2026-08-24):** independent per-rail loading on Discover; compact This Week rail presentation reversed; View All canonical order unchanged |
| **Our Shows** (`/shows`) | ✅ Live on App Hosting (`build-2026-08-24-001`) — public calendar + per-show catalog gallery (ADR-FP-142); private uploads never exposed. Theme toggle belongs in **sidebar footer** (hotfix on `development`; production chrome follow-up) |
| Collapsible “How print requests work” hint | ✅ Live |
| Start / continue print request | ✅ Live (one working request — ADR-FP-071) |
| Selection mode: add library designs with quantities | ✅ Live |
| **Upload artwork** (modal; PNG/WebP/folder/ZIP) | ✅ Live — `/requests/artwork`; optional halftone checkbox (ADR-FP-080) |
| Persistent Current Request / basket drawer | ✅ Live — hidden for guests; filled CTA **Review & Add to Show** + **Needs a show** |
| Donate designs (`/donate`) | ✅ Live — ADR-FP-078; guest donate (Anonymous Auth) |
| Confirm ownership (required) + library permission (optional, default on) | ✅ Live |
| Attach ready uploads to working request | ✅ Live |
| Request item cards: qty, size, DPI badge; save blocked &lt; 200 DPI | ✅ Live |
| Image quality sizing (`image-quality-v2`, ≤6× toward 12″) | ✅ Live — ADR-FP-080 |
| Progress tabs (Working / Queued / Printing / Printed) | ✅ Live — converted requests show **Converted to Internal Request · Closed** in Printed |
| Add request to show (callable + calendar) | ✅ Live — Portal cutoff hours (ADR-FP-103); review header **Add Request to Whatnot Show** |
| Design engagement analytics (GA4) | ✅ Live — modal/share `page_view` + `design_view`; public catalog IDs only (ADR-FP-138) |
| Assisted Creation brief + submitted-only updates | ✅ Live |
| Assisted proof / revision / approval lifecycle | ✅ Live |
| Production App Hosting | ✅ Live at `https://myprintrequest.com` — rebuild for PR #88 content = **Gate E** |

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
| Portal public shows (ADR-FP-142) | `listPortalPublicShows`, `listPortalShowCatalogDesigns` — **on production Git; Gate D deploy pending** |
| Print request conversion (ADR-FP-141) | `convertCustomerPrintRequestToInternal` — **Gate D deploy pending** |
| Staff gang sheet complete | `completeStaffGangSheetAndOpenNext` (updated reconciliation) — **Gate D update pending** |
| Customer uploads | `createCustomerUploadBatch`, `finalizeCustomerUpload`, `finalizeCustomerUploadZip`, `confirmCustomerUploadsAndAttachToRequest`, promote/exclude/restore/retry, cleanup/wipe helpers |
| Assisted Creation | `submitAssistedCreationRequest`, `customerUpdateAssistedCreationRequest`, `cancelAssistedCreationRequest`, `staffUpdateAssistedCreationStatus`, `staffAddAssistedCreationProof`, `customerRespondToAssistedCreationProof` |
| Brand logos (ADR-FP-114) | `finalizeBrandLogoSlot`, `updateBrandLogoDisplaySizes`; OG via `getPortalGlobalOpenGraph` |

---

## Not yet built (Phase 9+)

Create My Design with AI; design fee / Stripe; questionnaire branching; remaining email polish; analytics dashboards beyond GA4 events.
