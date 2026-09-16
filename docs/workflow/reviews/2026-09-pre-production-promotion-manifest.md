# Pre-production Promotion Manifest (cumulative)

Compact cumulative list of DEV-closed goals that still need separately gated production promotion.
**DEV Portal QA never requires App Hosting** — localhost `:3100` + `myprintrequest.dev` tunnel only.
App Hosting publication applies to **production** (`myprintrequest.com`) only.

---

## 2026-09-16 — `print-request-count-parity-across-show-queue-and-summary-surfaces` — READY FOR OWNER DEV QA / production promotion pending

| Kind | Final production promotion requirement / actual scope |
|------|-------------------------------------------------------|
| Studio release | **Required for production**: source-aware full-request Designs/Items summaries, active-allocation Show Queue counters/tier/price parity, Staff Inbox glance parity, Add-to-Show summary parity, and customer history card labels. |
| Portal App Hosting | **Required for production**: request list/detail card counts, queue-to-show remaining summary, and continuable-request picker counts. DEV remains localhost + `myprintrequest.dev` tunnel; no DEV App Hosting step. |
| Functions | **Required for production**: existing `getPortalAdminUpcomingShowQueueDashboard` runtime changed to carry `printRequestItemId` into the shared active metric summary; callable/DTO shape unchanged. |
| Firestore Rules | **NONE** |
| Storage Rules | **NONE** |
| Indexes | **NONE** |
| Schema migration | **NONE** |
| Backfill | **NONE** |
| Production data mutation | **NONE** |
| Minimal production smoke | Not authorized in this goal. If separately approved later: one request with duplicate artwork rows and canceled allocation history; verify full-request 19/25 and selected-show active 19/25 with matching tiers and `$56`, plus history-only behavior. |
| Boundary | Owner DEV QA and repository Signoff are still pending. No production deploy, data write, release, commit, or push occurred. |

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
