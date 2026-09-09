# Plan: Customer upload / donation intake Load More + name/username search

| Field | Value |
|-------|-------|
| Date | 2026-09-08 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-09-08-customer-upload-intake-load-more-and-search-review.md |

---

## Goal

On Studio **Uploaded Designs** and **Donated Designs**, staff can **Load More** beyond the first page and **search by uploader display name and username** across the full intake set for the active tab (Pending / Excluded)—not only rows already on screen.

## Background

Owner follow-up after Inbox glance metrics. Both surfaces share `useCustomerUploadIntake` + `CustomerUploadIntakeSection`. Today the purpose-scoped listener uses a fixed `limit(50)` with no Load More and `search: null` in the shell header. Customer name/username are not on `customerUploads`; they are enriched from `customers`. Client-only filter of the loaded page would miss older uploads.

## Scope

### In Scope
- Load More for both `print_request` (Uploaded) and `catalog_donation` (Donated) intake lists (Pending + Excluded).
- Header search by uploader **display name** and **username**.
- Search resolves matching customers first, then loads their uploads for the active purpose + catalog review filter (entire matching set path, not “filter visible rows only”).
- Surface username in enrichment/list subtitle where useful.
- Focused unit/contract tests for query helpers / search matching.
- Workflow docs + state.

### Out of Scope
- Algolia / new search indexes for uploads.
- Denormalizing name/username onto `customerUploads` (migration).
- Firestore Rules changes / new composite indexes unless mechanically required and reviewed.
- Changing promote/exclude/halftone flows.
- Commit, push, Studio publish, production.

---

## Affected Areas

### Files / Modules (expected)
- `apps/studio/.../customer-uploads/utils/customerUploadIntakeQueries.ts` (+ tests)
- `apps/studio/.../customer-uploads/hooks/useCustomerUploadIntake.ts`
- `apps/studio/.../customer-uploads/components/CustomerUploadIntakeSection.tsx`
- `apps/studio/.../customer-uploads/pages/CustomerUploadsPage.tsx`
- `apps/studio/.../customer-uploads/pages/DonatedDesignsPage.tsx`
- `apps/studio/.../customer-uploads/services/customerUploadIntakeService.ts` (username enrichment)
- Optional small search helper under `customer-uploads/utils/`
- `apps/studio/.../styles/layout.css` (or customer-upload styles) for Load More row
- Possibly thin staff list helper on `customerService` gated by intake view permission (Rules already allow staff customer reads)

### Architecture Impact
- [x] Details: Keep intake in customer-uploads feature; search orchestrates customers → uploads. Prefer existing `customerUid`+`createdAt` index for per-customer upload fetches. Browse mode grows live query `limit` for Load More to preserve realtime promote/exclude behavior.

### Security Impact
- [x] Details: Staff-only reads already allowed for `customers`, `customerUsernames`, `customerUploads`. Client permission for intake search must allow any staff who can view intake (not only owner/admin `canManageCustomers`).

### Data Model Impact
- [x] None persisted

### Backend Impact
- [x] None (no Functions/Rules)

### UI / UX Impact
- [x] Details: Shell header search on both pages; Load More under the left list; empty states for no search matches; manual visual QA.

### Migration Impact
- [x] None

---

## Approach

### Browse (no search)
1. Keep purpose + `catalogReviewStatus` + `createdAt desc` live `onSnapshot`.
2. Track `pageSize` starting at `CUSTOMER_UPLOAD_INTAKE_PAGE_SIZE` (50).
3. Load More increases `pageSize` by one page and re-subscribes with the new limit (legacy missing-purpose companion unchanged for print_request).
4. `hasMore` when last primary snapshot size `>= pageSize`.
5. Reset `pageSize` when filter/purpose changes.

### Search (name / username)
1. Debounced shell search string.
2. Resolve matching customers (staff-readable customer list + same substring match on displayName/username as directory search; optional exact username reservation lookup).
3. For each matched customer (bounded concurrency), fetch uploads via `customerUid` + `orderBy createdAt desc` (existing index), filter to active purpose + catalogReviewStatus (+ catalog intake eligibility for Pending), merge/sort.
4. Replace browse listener while search is active; clearing search restores browse mode.
5. Load More in search mode increases per-customer fetch limit or result window as needed so staff can page through large match sets.
6. Do **not** implement “filter only currently loaded browse rows” as the search strategy.

### UI
- Wire `useShellHeaderConfig.search` on both pages.
- Load More button at bottom of intake list when `hasMore`.
- Show username in list subtitle when available (`Name · @username · status` or similar, matching Studio norms).

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Query / search helper unit tests | `npx tsx --test` on touched test files | yes |
| Existing intake query tests still pass | same | yes |

### Manual
- Uploaded + Donated: Load More reveals older items beyond first 50.
- Search by display name and username finds uploads not on the first page.
- Pending/Excluded both work; clear search restores browse.
- Promote/exclude still remove/update rows under live browse.

---

## Human Checkpoints Anticipated
- Owner visual QA on both pages.
- Commit/push/publish separately gated.

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Growing live limit re-reads more docs on each promote | Acceptable for staff tool; page steps of 50 |
| Full customer directory scan for name search | Same class of cost as admin directory; staff Rules already allow; debounce |
| Guest / missing username | Match displayName; show fallbacks |

**Rollback:** Revert intake hook/UI/query helper changes.

---

## Open Questions
- None blocking. Prefer growing live limit over cursor `getDocs` for browse to keep realtime intake behavior.

---

## FreshForge Impact Classification
- Starter Surface: no
- Documentation: workflow + ROADMAP note on close
- App code: Studio customer-uploads only
