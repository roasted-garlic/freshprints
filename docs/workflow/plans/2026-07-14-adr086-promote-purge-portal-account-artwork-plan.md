# Plan: ADR-FP-086 promote donation purge + Portal account artwork sections

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | ADR-FP-086 §4–§5 |

---

## Goal

Finish remaining ADR-FP-086 items in one phase:

1. **Promote-path donation cool-off purge** — 14 days after promote to AI Review, purge customer-upload source+production (keep thumb/preview); catalog assets live on the design.
2. **Portal account Reusable vs Past uploads** — split `/dashboard` artwork into two sections per ADR.

## Scope

### In Scope
- Shared eligibility + unit tests for promoted-donation cool-off
- Callable `purgePromotedDonationFullSize` (owner/admin, `dryRun`) — or extend retention callable equivalently
- Set `promotedAt` on promote (Admin) for a stable cool-off clock; fallback `updatedAt`
- Studio Retention maintenance button
- Portal `/dashboard`: **Reusable** (favorites + previously requested catalog designs that are `ready` and not image-purged) and **Past uploads** (existing customerUploads gallery)
- Reusable tiles link/open catalog add flow where existing patterns allow (at minimum open design details / library); Past uploads remain lightbox-only
- Docs: ADR consequences, DATA_MODEL, BACKEND, ROADMAP

### Out of Scope
- Cloud Scheduler
- Changing Favorites page
- Production deploy

---

## Approach

### A. Promote cool-off purge
1. On `promoteCustomerUploadToAiReview`, set `promotedAt: serverTimestamp()`
2. Eligibility: `purpose === catalog_donation`, `catalogReviewStatus === sent_to_ai_review`, `promotedDesignId` set, `fullSizePurgedAt` null, clock ≥ 14d
3. Delete source+production; set `fullSizePurged*`; keep thumb/preview
4. Wire Studio Retention panel

### B. Portal account sections
1. Hook/service: load favorites + distinct `designId`s from customer’s print request items (catalog); fetch ready designs; exclude `assetsPurgedAt`
2. UI: two sections on dashboard gallery; Past uploads = current gallery renamed
3. Empty-state copy updated

---

## Test Strategy
- Unit tests for promote cool-off eligibility
- Functions build
- Portal typecheck / lint touched
- Manual: dryRun promote purge; Portal dashboard two sections

## Approval
- Review: approved (same pass as planning — bounded ADR finish)
