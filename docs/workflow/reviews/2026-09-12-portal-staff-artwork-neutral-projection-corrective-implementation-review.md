# Staff Artwork Neutral Projection Corrective — Implementation Review

Date: 2026-09-12
Goal: `portal-staff-artwork-neutral-projection-corrective`
Authorization: Owner accepted the Plan/Formal Review and authorized Implement → Test → DEV preparation.

Implemented locally:

- Added the strict shared `PortalPrintRequestItem` allowlist and neutral `Staff-added artwork` projection.
- Added the Admin `onPrintRequestItemPortalProjectionWritten` synchronizer (create/update/delete, idempotent).
- Added trusted `updatePortalStaffArtworkPrintRequestItemSize`; Staff Artwork sizing is revalidated server-side using private dimensions and the existing size policy.
- Cut Portal request-item reads/listeners/detail/drawer/queue to `portalPrintRequestItems`; removed all Portal `staffArtworks` reads and `/staff-artwork` URL construction.
- Staff Artwork rows now show a neutral no-image label and retain quantity/requested-size editing; catalog and customer-upload paths remain source-specific.
- Denied customer reads of canonical `printRequestItems`, `staffArtworks`, and `/staff-artwork/...`; added customer-owned projection reads and denied direct Staff Artwork item updates.
- Added the projection query index and focused shared, Functions, Firestore, and Storage coverage.

Assisted Creation, proof-round/progress, Add-to-Request consent, retention, and multi-proof runtime were not modified in this corrective.

DEV cutover is intentionally not performed yet. The reviewed plan requires existing canonical request items to be materialized by a bounded, idempotent Admin-SDK DEV population mechanism before customer canonical reads are denied. Repository inspection found no executable mechanism with an owner gate, page limit/cursor, DEV-only guard, and resumable response for this new projection. No unreviewed migration/backfill tool was invented; this is the current implementation blocker.

No staging, commit, push, freeze, production deploy, production data mutation, or maintenance action occurred.
