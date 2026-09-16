# Pre-production Promotion Manifest (cumulative)

Compact cumulative list of DEV-closed goals that still need separately gated production promotion.
**DEV Portal QA never requires App Hosting** — localhost `:3100` + `myprintrequest.dev` tunnel only.
App Hosting publication applies to **production** (`myprintrequest.com`) only.

---

## 2026-09-16 — `studio-print-request-item-download-dirty-preset-fix` — CLOSED DEV / production promotion pending

| Kind | Final production promotion requirement / actual scope |
|------|-------------------------------------------------------|
| Source commit | `37655dcd52760992cc2892e096bac30cbaa797ba` (`fix(studio): restore Print Request item Download for standard size presets`) |
| Studio release | **REQUIRED**: include the Studio `PrintRequestItemCard` dirty-signature fix and strengthened `printRequestExport` contract in the next stable Studio build. The fix restores Download for clean Print Request items carrying `standardSizePresetKey`; existing size/source/permission/save-state gates remain unchanged. |
| Portal App Hosting | **NONE from this goal** |
| Functions | **NONE** |
| Firestore Rules | **NONE** |
| Storage Rules | **NONE** |
| Indexes | **NONE** |
| Schema migration | **NONE** |
| Backfill | **NONE** |
| Production data mutation | **NONE** |
| Dependency ordering | No runtime dependency on the already inventoried Functions, Rules, indexes, Portal, or other Studio candidates. Coalesce this commit into the same stable Studio release built from the final promoted production SHA; do not build a release from a SHA that predates `37655dcd`. It may be verified after the backend/Portal rollout, but neither backend nor Portal rollout is a prerequisite for this client-only behavior. |
| Minimal production smoke | After separately authorized promotion: open a Print Request containing a saved standard-size preset item and confirm Download is enabled and succeeds; confirm genuinely dirty edits and existing missing-size/source/in-flight-save gates remain disabled. Verification only — no writes or repairs. |
| Boundary | DEV Signoff **approved** with 8/8 export contracts and Studio typecheck passing. This commit alone authorizes no production merge, deployment, data operation, or Studio publication. |

---

## 2026-09-16 — `print-request-count-parity-across-show-queue-and-summary-surfaces` — CLOSED DEV / production promotion pending

| Kind | Final production promotion requirement / actual scope |
|------|-------------------------------------------------------|
| Studio release | **REQUIRED**: Studio Show Queue active counters/tier/price/capacity parity; source-aware Print Request/Add-to-Show summaries; Staff Inbox glance; customer history labels. The Studio staff remove behavior also requires the updated callable bundle below in the environment used by the release. |
| Portal App Hosting | **REQUIRED**: request list/detail counts, queue-to-show remaining summary, continuable-request picker counts, and successful queue/unqueue cache invalidation. DEV remains localhost + `myprintrequest.dev` tunnel; no DEV App Hosting step. |
| Functions | **REQUIRED — exact existing Functions**: `getPortalAdminUpcomingShowQueueDashboard` (adapter now carries existing `printRequestItemId` into shared active metrics) and `unqueueStudioCustomerPrintRequestFromShow` (staff remove now audited soft-cancels allocations). Callable/DTO shape remains unchanged for the dashboard; no new Function was added. |
| Firestore Rules | **NONE** |
| Storage Rules | **NONE** |
| Indexes | **NONE** |
| Schema migration | **NONE** |
| Backfill | **NONE** |
| Production data mutation | **NONE** |
| Minimal production smoke | **Required after separately authorized promotion; not performed now**: (1) open `sassymommasam-CR002` and its affected Show Queue card; (2) confirm `19 Designs | 25 Items`; (3) confirm `Reg Full 19 · Reg Oversize 6`; (4) confirm `$56`; (5) confirm canceled historical allocations remain available for History and do not inflate current counters; (6) spot-check one additional canceled/re-added request if available; (7) because Portal runtime changed, confirm Portal/Studio count parity on one request. Verification only — no writes or repairs. |
| Boundary | Owner DEV QA **PASS WITH NOTES** and repository Signoff **approved_with_notes** are complete. Production deployment, Portal publication, Studio release, Functions deployment, data writes, and production smoke remain separately authorized checkpoints. Commit/push is limited to this reviewed `development` closeout. |

---

## 2026-09-16 — `studio-pre-release-pr-item-download-and-intake-navigation` — CLOSED DEV / production promotion pending

| Kind | Final production promotion requirement / actual scope |
|------|-------------------------------------------------------|
| Studio release | **Required for production**: Print Request per-item native PNG download using the saved-size/source-aware export path, dismissible success feedback, and Uploaded/Donated list ArrowUp/ArrowDown selection navigation. |
| Portal App Hosting | **NONE from this goal** |
| Functions | **NONE** |
| Firestore Rules | **NONE** |
| Storage Rules | **NONE** |
| Indexes | **NONE** |
| Schema migration | **NONE** |
| Backfill | **NONE** |
| Production data mutation | **NONE** |
| Minimal production smoke | Studio Print Request catalog/upload/Staff Artwork download dimensions and cancellation/failure handling; Uploaded and Donated list selection boundaries, lightbox guards, and editable-focus behavior. |
| Boundary | Owner DEV QA **PASS** and repository Signoff are complete. Studio release and all production promotion remain separately owner-authorized; no production action occurred. |

## 2026-09-15 — `portal-admin-staff-artwork-upload` — CLOSED DEV / production promotion pending

| Kind | Final production promotion requirement / actual scope |
|------|-------------------------------------------------------|
| Portal App Hosting | **Required for production**: Admin navigation, `/admin/staff-artwork`, and browser PNG upload UI. No DEV App Hosting exists or is required; DEV remains localhost + `myprintrequest.dev` tunnel. |
| Studio release | **Required for production**: Design Library and Staff Artwork Multiple Select → Send to AI Review, full-card selection/modal suppression, and corrected Auto-process handling. |
| Functions | **Required for production** for the actual changed exported Functions: `promoteStaffArtworkToAiReview`, `reprocessReadyDesignWithAi`, and `enqueueAiEnrichment`. DEV QA used ACTIVE revisions `promotestaffartworktoaireview-00008-daj`, `reprocessreadydesignwithai-00032-gab`, and `enqueueaienrichment-00127-vod`. Production deployment was not performed. |
| Firestore Rules | **NONE from this goal** |
| Storage Rules | **NONE from this goal** |
| Indexes | **NONE** |
| Schema migration | **NONE** |
| Backfill | **NONE** |
| Production data mutation | **NONE** |
| Minimal production smoke | Portal Admin Show Queue ↔ Staff Artwork Upload navigation; one PNG → Ready → visible in Studio Staff Artwork; Design Library Multiple Select → AI Review → approval → Ready; Staff Artwork bulk promotion; Auto-process ON/OFF; existing Show Queue smoke. |
| Boundary | Production Functions, Portal App Hosting, Studio release, Rules/Storage Rules, indexes, migrations, backfills, data, IAM, and secrets remain separately owner-authorized checkpoints. |

## 2026-09-15 — `pre-release-lifecycle-image-parity-and-dev-environment-hardening`

| Kind | Entry |
|------|-------|
| Functions | Mark Complete / finish→reconcile path updates (`completeStaffGangSheetAndOpenNext` and related); `getPortalAdminShowQueueRequestDesigns` honesty |
| Portal | Banner + explicit noindex / middleware / empty DEV sitemap — **prod App Hosting when promoting** |
| Studio | Mark Complete cache/UI sync |
| IAM | Prod TokenCreator if later confirmed |
| Notes | Historical Queued-on-completed deferred to next goal |

---

## 2026-09-15 — `historical-internal-reconciliation-admin-artwork-previews-and-dev-access-hardening`

| Kind | Entry |
|------|-------|
| Functions | `previewInternalGangSheetHistoricalReconciliation`, `applyInternalGangSheetHistoricalReconciliation`, `getPortalAdminShowQueueRequestDesigns` (Staff Artwork derivatives), `registerCustomer` (prod no-op), `getPortalDevCustomerAccessSettings`, `updatePortalDevCustomerAccessSettings`, `checkPortalDevCustomerAccess` |
| Rules | `settings/portalDevCustomerAccess` |
| Portal publication | **Required for production** App Hosting (`myprintrequest.com`) — overlay + allowlist UX. **Not** a DEV App Hosting step. |
| Studio release | History reconcile UI + DEV customer access Settings |
| Production IAM | TokenCreator self-binding **if** read-only confirms signBlob gap (B) — separate checkpoint |
| One-time data | Prod Internal History Preview → authorize → Apply |
| Minimal smoke | Repaired historical Internal PR Printed; Admin View Designs all three artwork types; prod login/register open; no DEV overlay/gate |

---

*Append new closed pre-production goals above as additional dated sections. Do not invent DEV App Hosting steps.*
