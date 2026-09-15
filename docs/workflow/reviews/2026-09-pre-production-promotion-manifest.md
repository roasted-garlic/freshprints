# Pre-production Promotion Manifest (cumulative)

Compact cumulative list of DEV-closed goals that still need separately gated production promotion.
**DEV Portal QA never requires App Hosting** — localhost `:3100` + `myprintrequest.dev` tunnel only.
App Hosting publication applies to **production** (`myprintrequest.com`) only.

---

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
