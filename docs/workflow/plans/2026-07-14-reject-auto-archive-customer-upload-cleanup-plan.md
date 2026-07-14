# Plan: Reject 7-day auto-archive + customer-upload full-size cleanup

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | ADR-FP-086 §2–§3; ADR-FP-084 |

---

## Goal

Ship two scheduled-style maintenance callables (callable-first, `dryRun` supported) that implement ADR-FP-086:

1. **Auto-archive** designs that have been `status: rejected` for **≥ 7 days**.
2. **Purge full-size** customer **request** upload Storage (`source` + `production`) after show completion/cancel with no active allocations, **or** never-queued + idle **14 days** — keep thumbnail (and preview).

## Background

Reject → Rejected tab + manual Archive already ship. UI/docs already mention 7-day auto-archive; the job is missing. Customer-upload abandoned cleanup only deletes orphan **source** for unfinished uploads — not production full-size after shows. Catalog donation purge and Portal account UX remain later ADR-FP-086 items.

## Scope

### In Scope

1. Shared constants + pure eligibility helpers (+ unit tests)
2. Callable `archiveStaleRejectedDesigns` (owner/admin, `dryRun`)
3. Callable `purgeIdleCustomerUploadFullSize` (owner/admin, `dryRun`) — **print_request** purpose only
4. Firestore fields: `customerUploads.fullSizePurgedAt` / `fullSizePurgedBy` (Admin-only writes)
5. Rules: clients cannot set purge fields on customer uploads
6. Index: `designs` `status` + `aiReviewedAt` (if needed for query)
7. Docs: DATA_MODEL, BACKEND, SECURITY, ADR-FP-086 consequences, ROADMAP on signoff
8. Manual: deploy + dryRun then real run on `fresh-prints-dev`

### Out of Scope

- Cloud Scheduler wiring (document as follow-up; callable is the product surface)
- Donation Storage cleanup (ADR-FP-086 §4)
- Portal reusable vs past-uploads UI (§5)
- Auto-calling `purgeArchivedDesignAssets` after reject archive (owner still deletes images manually)
- Changing Reject / Archive Studio UX (already correct)

---

## Affected Areas

### Files / Modules

- `packages/shared/src/utils/` — reject cool-off + upload full-size eligibility
- `functions/src/archiveStaleRejectedDesigns.ts`, `purgeIdleCustomerUploadFullSize.ts`, `index.ts`
- `firestore.rules`, `firestore.indexes.json` as needed
- Docs listed above

### Architecture Impact
- [x] Admin SDK maintenance callables mirroring `archiveStaleWorkingPrintRequests` / `cleanupAbandonedCustomerUploads`

### Security Impact
- [x] Owner/admin only; Admin SDK Storage deletes; client cannot forge purge fields

### Data Model Impact
- [x] Reject archive: same soft-archive fields as `archiveDesign` (`previousStatus: rejected`, `archivedAt`, `archivedBy`)
- [x] Uploads: `fullSizePurgedAt`, `fullSizePurgedBy`; clear or null `sourceStoragePath` / `productionStoragePath` after delete (keep thumb/preview paths)

### Backend Impact
- [x] Two new HTTPS callables; no new secrets

### UI / UX Impact
- [x] None required (optional: document invoke via Functions logs / temporary script). Rejected-tab copy already mentions 7-day auto-archive.

### Migration Impact
- [x] None; jobs are idempotent. Already-purged uploads skip.

---

## Approach

### A. Reject auto-archive (7 days)

1. Constant `REJECTED_DESIGN_AUTO_ARCHIVE_AFTER_DAYS = 7`
2. Eligibility: `status === "rejected"` and clock `aiReviewedAt` (fallback `updatedAt`) ≤ now − 7d
3. Query: `status == rejected` + `aiReviewedAt < cutoff` (limit batch); also scan rejects missing `aiReviewedAt` via status-only query + in-memory age on `updatedAt` if needed
4. Soft-archive with Admin SDK: `status: archived`, `previousStatus: rejected`, `archivedAt`, `archivedBy` = caller uid (or `system:archiveStaleRejectedDesigns` when later scheduled)
5. Return scanned / archived counts + ids; honor `dryRun`

### B. Customer request upload full-size purge

1. Constants: idle **14 days**; active allocation statuses = `pending|queued|in_progress`
2. Scan `customerUploads` where `technicalStatus == ready` and `fullSizePurgedAt` absent; purpose `print_request` or missing
3. **Keep full-size if:**
   - Any active show allocation for `customerUploadId`, OR
   - Linked print request still `draft|active|editing` (working/active)
4. **Eligible to purge if:**
   - Has only terminal allocations (`printed|done|canceled`) **and** no active ones, **and** every linked show is `completed|canceled|archived` (or allocation show missing), **OR**
   - Zero allocations ever **and** `updatedAt` (or `createdAt`) older than 14 days **and** not on a working/active print request
5. Delete Storage: `sourceStoragePath`, `productionStoragePath` (ignoreNotFound). **Keep** `thumbnailStoragePath` and `previewStoragePath`.
6. Update doc: `fullSizePurgedAt`, `fullSizePurgedBy`, null out source/production paths
7. `dryRun` + per-id results; batch cap (e.g. 50 purges/run)

---

## Test Strategy

### Automated
| Check | Required |
|-------|----------|
| Unit tests for eligibility helpers | yes |
| Functions build | yes |
| Lint touched files | yes |

### Manual
- Deploy both callables (+ rules/indexes) to `fresh-prints-dev`
- `dryRun: true` then real for each
- Confirm rejected >7d archives; recent rejects untouched
- Confirm request upload production deleted when eligible; active queue untouched; thumbnail remains

---

## Human Checkpoints Anticipated
- [x] Destructive Storage deletes — owner runs real purge after dryRun
- [ ] Production deploy — later
- [x] Manual PASS

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Purge while still needed for gang sheet | high | Active allocation + working request gates |
| Wrong clock on old rejects | medium | `aiReviewedAt` with `updatedAt` fallback |
| Partial Storage delete | medium | ignoreNotFound; mark purged after deletes attempted |
| Donations accidentally purged | medium | Purpose filter `print_request` only |

---

## Rollback Plan

- Redeploy prior Functions; fields remain. Storage objects not restored without backups.

---

## Documentation Updates Required
- [x] DATA_MODEL.md
- [x] BACKEND.md
- [x] SECURITY.md
- [x] DECISIONS.md (ADR-FP-086: jobs shipped)
- [x] ROADMAP.md (signoff)

---

## Open Questions
- [x] None — policy locked in ADR-FP-086

---

## Approval
- Review doc: docs/workflow/reviews/2026-07-14-reject-auto-archive-customer-upload-cleanup-review.md
- Verdict: pending
