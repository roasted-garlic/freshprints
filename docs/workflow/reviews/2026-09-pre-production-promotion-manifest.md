# Pre-production Promotion Manifest (cumulative)

Compact cumulative list of DEV-closed goals that still need separately gated production promotion.
**DEV Portal QA never requires App Hosting** — localhost `:3100` + `myprintrequest.dev` tunnel only.
App Hosting publication applies to **production** (`myprintrequest.com`) only.

---

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
