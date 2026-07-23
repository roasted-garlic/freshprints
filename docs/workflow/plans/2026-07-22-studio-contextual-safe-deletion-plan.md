# Plan: Studio Contextual Safe Deletion and Historical Tombstones

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-22-studio-contextual-safe-deletion-review.md |
| Goal id | `studio-contextual-safe-deletion` |
| Dev target | `fresh-prints-dev` only (no production deploy) |

---

## Goal

Move every legitimate Studio deletion capability out of (or beside) development-only Test Data tools and onto the entity’s relevant Studio page, with **server-authoritative dependency checks**, clear relational warnings, safe Storage cleanup, and **historical tombstones** where hard deletion would damage operational history. Deletion must be **policy-based**, never a silent cascade.

---

## Background

- Roadmap alignment: Studio + backend data-integrity hardening across completed Phases 2, 6, 7, and 8.
- Today, hard-destructive multi-entity deletion lives primarily in **Test Data** (`wipeOperationalTestData`, `ownerDeleteUser`) on `fresh-prints-dev`.
- Entity pages already use safer patterns for some entities (design/category/tag archive; staff deactivate; Portal account-deletion **request**).
- ADR-FP-084 deferred full design hard-delete/tombstones; ADR-FP-104 shipped Portal deletion **request** + owner hard-delete for scratch cleanup.
- Product now requires the opposite of current `ownerDeleteUser` customer cascade for production-shaped history: **preserve** print-request/show history and **reserve** usernames permanently after account deletion.

---

## Pass 0 — Repository inventory (complete)

### A. Development / Test Data delete surfaces

| ID | Operation | UI | Implementation | Collections / Storage / Auth | Nature | Relocate vs replace |
|----|-----------|----|----------------|------------------------------|--------|---------------------|
| A1 | Operational wipe (multi-target) | `TestDataResetPage` | Callable `wipeOperationalTestData` + `operationalWipeTargets.ts` | Ordered hard delete of selected ops collections; optional Storage prefixes; **not** Auth/users/customers/usernames | Hard + cascade + Storage | **Keep development-only**; do not expose as entity-page “delete” |
| A2 | Owner permanent user delete | `OwnerDeleteUserModal` | Callable `ownerDeleteUser` | Staff: inbox side-docs + `users` + Auth delete. Customer: **full cascade** of print graph, uploads, assisted, etsy, notifications, favorites, **`customerUsernames`**, `customers`, `users`, Storage prefixes, Auth delete | Hard + cascade + Storage + Auth delete | **Replace** for product flows — unsafe for historical retention |
| A3 | Archive stale rejected designs | Retention panel | `archiveStaleRejectedDesigns` | `designs` → archived | Soft status | Optional relocate to Designs/AI Rejected admin |
| A4–A5 | Purge idle / promoted-donation full-size | Retention panel | `purgeIdleCustomerUploadFullSize`, `purgePromotedDonationFullSize` | Storage purge; docs kept | Storage purge | Optional relocate to Customer Uploads |
| A6 | Chromium DevTools | Sidebar | Electron IPC | N/A | N/A | Out of scope |

### B. Entity-page / service delete-related operations

| ID | Entity | Current surface | Implementation | Dep validation | Outcome today | Target page |
|----|--------|-----------------|----------------|----------------|---------------|-------------|
| B1 | Design | Design Library / AI Review | `designService.archiveDesign` / restore; callable `purgeArchivedDesignAssets` | Archive: none beyond status; purge: archived + confirm | Soft archive; Storage purge of originals+previews | Keep; strengthen delete vs archive distinction |
| B2 | Category | Category management | `categoryService.archiveCategory` → `isActive: false` | Client may not check design refs deeply | Soft off; rules deny hard delete | Keep; add **server** referenced-design block before archive-or-delete policy |
| B3 | Tag | Tag management | `catalogTagService.archiveTag` → `status: archived` | Similar | Soft archive; rules deny hard delete | Keep; add server referenced-design count |
| B4 | Print request | **No UI** | `printRequestService.deletePrintRequest` → `deleteDoc` parent only | **None** | Hard delete parent → **orphan risk** | Print Requests — **replace** with callable + policy |
| B5 | Print request item | Print Requests / Portal | Studio `removePrintRequestItem`; Portal `removePortalPrintRequestItem` / `clearPortalWorkingPrintRequest` | Portal: draft/editing | Hard delete item (not shared design/upload) | Keep; ensure delete-request path does not delete shared assets |
| B6 | Upcoming show | **No UI** | `upcomingShowService.deleteUpcomingShow` → `deleteDoc` show only | **None** | Hard delete show → **orphan risk** | Show Queue — **replace** |
| B7 | Show allocation | Show Queue / Print Requests | `removeShowAllocation` / `removeShowAllocationsForRequest` | Blocked when show production advanced | Hard delete allocation + qty recalc | Keep as workflow prerequisite |
| B8 | Staff user | Users | `updateTeamUser` → Auth `disabled` + `isActive: false` | Self-edit / owner protections in permissionService | Disable (not delete) | Keep; add optional owner hard-delete only if policy allows |
| B9 | Customer / staff hard delete | Test Data only | `ownerDeleteUser` | Last-owner; no self; project allowlist | Full hard cascade | Users page — **new tombstone path** |
| B10 | Portal account deletion | Portal account settings | `requestPortalAccountDeletion` / `cancel…` | Auth customer | Request only (`pending`/`cancelled`/`fulfilled`) | Keep request UI; fulfill via new shared backend policy |
| B11 | Customer upload | Customer Uploads | `excludeCustomerUploadFromCatalog`; cleanup callables | Partial | Soft exclude / Storage purge | Add eligible hard-delete callable for unattached/unpromoted |
| B12 | Favorites / assisted / etsy | Portal / Studio | Various cancel/deactivate | Domain-specific | Status transitions | **Do not** rebrand as delete; keep as domain transitions |

### C. Orphan / unsafe client APIs (must not relocate as-is)

1. `printRequestService.deletePrintRequest` — parent-only hard delete.
2. `upcomingShowService.deleteUpcomingShow` — show-only hard delete.
3. `ownerDeleteUser` customer path — deletes historical print graph + frees username — **conflicts with product principle**.

### D. Username uniqueness (resolved)

| Mechanism | Detail |
|-----------|--------|
| Reservation | `customerUsernames/{username}` → `{ customerId, createdAt, updatedAt }` |
| Validation | `packages/shared/src/utils/customerUsername.ts` |
| Today on hard delete | `ownerDeleteUser` **deletes** reservation → username reusable |
| Required product behavior | **Keep** reservation (and customer/user tombstone) so username never becomes available |

### E. Portal self-delete UI (repo check resolved)

| Item | Finding |
|------|---------|
| Portal request UI | **Exists** — account settings deletion section + typed `DELETE` confirm |
| Fulfillment | Currently owner Test Data `ownerDeleteUser` (hard cascade) |
| This phase | Implement shared backend tombstone fulfillment usable by Studio; **do not** add a new Portal self-delete UI unless plan expands. Wire Studio fulfillment; optionally mark Portal request as `fulfilled` under new policy |

### F. Owner / last-owner protections (repo check resolved)

| Protection | Where |
|------------|-------|
| Cannot self-delete | `ownerDeleteUser` |
| Cannot delete last active owner | `ownerDeleteUser` query `role==owner && isActive==true` |
| Staff deactivate | `permissionService.canDeactivateUser` / `isProtectedOwnerAccount` |
| Wipe / owner delete project gate | `isOperationalWipeAllowedProjectId` → `fresh-prints-dev` |

---

## Deletion policy matrix (proposed)

| Entity | Relevant page | Current delete implementation | Dependencies | Allowed outcome | Historical retention | Storage cleanup | Required permission | Warning behavior |
|--------|---------------|-------------------------------|--------------|-----------------|----------------------|-----------------|---------------------|------------------|
| Customer (Portal auth) | Users → Customers | `ownerDeleteUser` cascade (**unsafe**) | Print requests, allocations, uploads, username, Auth | **Tombstone** + Auth **disable** (preferred) | Keep `customers` + `users` + `customerUsernames`; display `username (Deleted)` | Do **not** delete upload Storage tied to historical requests; optional later purge of unused personal Storage only after reference check | Owner (fulfill); customer may **request** only | Block if product chooses “must cancel open work first”; otherwise tombstone and block new activity; never cascade-delete requests |
| Customer (guest, no Auth) | Users → Customers | Same cascade | Requests / username | Tombstone / deactivate guest record | Keep identity + username reservation | N/A Auth | Owner | Same display rules |
| Staff user | Users → Team | Deactivate via `updateTeamUser`; hard via `ownerDeleteUser` | Audit attribution, last owner | **Prefer disable**; hard delete only if no required attribution **and** not last owner — default this phase: **disable only** on Users page | Keep `users` doc | N/A | Owner/admin per existing deactivate rules; hard delete remains Test Data only unless owner approves product hard-delete | “Disable account” copy; block self / last owner |
| Print request (unused working) | Print Requests | Orphan `deletePrintRequest` | No allocations; no printing/printed history; items only | **Hard delete** request + child items only | N/A | Do not delete shared designs/uploads | Staff with print-request manage | “Delete unused request”; list item counts |
| Print request (allocated) | Print Requests | None safe | `showAllocations` / show | **Blocked** | Keep | None | — | Name blocking show(s); link to Show Queue |
| Print request (produced / historical) | Print Requests | None | Item production statuses | **Domain transition** → `archived` (existing status); never hard delete | Keep | None | Staff | “Archive request” not “Delete” |
| Print request item | Print Requests | `removePrintRequestItem` | Allocation may block | Keep existing remove rules | — | Never delete design/upload | Staff | Existing |
| Upcoming show (empty upcoming) | Show Queue | Orphan `deleteUpcomingShow` | No allocations; not in production/past | **Hard delete** show | N/A | None | Staff manage shows | “Delete empty show” |
| Upcoming show (with allocations) | Show Queue | Remove allocation workflow | Allocations | **Blocked** until removed | Keep | None | — | Count + request names; link to remove flow |
| Upcoming show (production / past) | Show Queue | Archive flags exist (`isArchived`, productionStatus) | History | **Archive / cancel** — no hard delete | Keep | None | Staff | Use existing archive language |
| Design (referenced) | Design Library | Archive | Items / allocations / promotion | **Archive only** | Keep doc | Purge assets only after archive per ADR-FP-084 | Archive: staff; purge: owner | Distinguish Archive vs Delete |
| Design (unused disposable) | Design Library | Wipe only | No refs | **Hard delete** optional **Pass 5+** after owner approval; default this phase: archive (+ optional purge) | Tombstone deferred (ADR-FP-084) unless owner approves new fields | After zero refs | Owner | If hard delete deferred, do not show “Delete permanently” |
| Customer upload (attached / promoted) | Customer Uploads | Exclude / purge full-size | Items / `promotedDesignId` | **Blocked** hard delete; exclude OK | Keep | Full-size purge only per retention ADRs | Staff / owner | State attachment or promotion |
| Customer upload (unattached, unpromoted) | Customer Uploads | Wipe / abandoned cleanup | None | **Hard delete** doc + Storage (server) | N/A | Server-authoritative, idempotent | Owner or staff (decide in review) | “Delete unused upload” |
| Category | Category UI | Soft `isActive: false` | Designs with `categoryId` | **Blocked** while referenced; soft-off when unused | Keep | None | Owner/admin | Show design count; no silent reassignment |
| Tag | Tag UI | Soft `status: archived` | Designs with tag | Same | Keep | None | Owner/admin | Show design count |
| Import / AI queue / batches | Imports / AI Review / Test Data | Wipe / archive rejected | Child designs | **No new hard-delete UI** this phase; design lifecycle owns designs | Preserve AI/approval history | Temp FS only via Electron | — | Maintenance-only |
| Ops wipe targets (etsy, assisted, sequences, …) | Test Data | `wipeOperationalTestData` | Scratch | **Remain development-only** | N/A | As today | Owner + allowlist | Keep typed phrase |
| Notifications / inbox / rate-limits / seed | Various | Side effects of wipe/delete | — | Maintenance / domain cancel only | — | — | — | Do not expose on entity pages |

---

## Scope

### In Scope

- Pass 0 inventory (this plan) and policy matrix approval.
- Shared deletion **result contracts** (allowed / blocked / tombstone / archive / failed) in `packages/shared`.
- Domain-specific Cloud Functions (not one generic delete endpoint):
  - Customer account tombstone fulfillment (Studio; shared policy for future Portal fulfill).
  - Safe print-request delete / archive.
  - Safe upcoming-show delete / archive.
  - Eligible customer-upload hard delete.
  - Category/tag delete-or-archive with referenced-design counts (server).
- Contextual Studio UI on Users, Print Requests, Show Queue, Design Library (clarify archive vs delete), Customer Uploads, category/tag modals.
- Remove or gate unsafe client `deletePrintRequest` / `deleteUpcomingShow` (delegate to callables or delete methods).
- Retire or clearly quarantine `ownerDeleteUser` for product use: keep as **scratch-only** Test Data tool **or** replace its customer path to match tombstone policy (owner decision).
- Unit/Functions tests for policy decisions, race recheck, username reservation, display helper.
- Docs: DATA_MODEL, BACKEND, DECISIONS ADR, SECURITY notes, manual QA checkpoint.
- Manual QA checkpoint; no production deploy.

### Out of Scope

- Production deployment / production Auth or rules relaxation.
- New Portal self-delete UI (request UI already exists).
- Automatic destructive cascades (user→all requests, show→all allocations, design→all items).
- Universal unrestricted delete callable.
- New npm packages.
- Full design hard-delete / `designTombstones` collection (deferred unless owner explicitly expands; ADR-FP-084).
- Exposing ops wipe entities on normal Studio pages.
- Electron changes except if a local FS cleanup already exists and needs wiring (unlikely).

---

## Affected Areas

### Files / Modules (expected)

**Shared**

- `packages/shared/src/types/` — new deletion result / request types (account, printRequest, show, upload, category/tag).
- `packages/shared/src/utils/` — deleted-customer display helper (`formatDeletedCustomerUsername` or similar); username reservation helpers if needed.
- Possibly extend `portalAccountSettings.types.ts` / customer types with tombstone fields.

**Functions**

- New callables (names follow existing camelCase callable convention), e.g.:
  - `tombstoneCustomerAccount` (or `fulfillCustomerAccountDeletion`)
  - `deleteEligiblePrintRequest`
  - `deleteEligibleUpcomingShow`
  - `deleteEligibleCustomerUpload`
  - `archiveOrDeleteCategory` / `archiveOrDeleteTag` (or preflight + execute pairs)
  - Optional `getDeletionImpact*` preflight callables
- Modify or quarantine: `ownerDeleteUser.ts` (customer cascade vs tombstone).
- Reuse: `lib/caller.ts`, `lib/errors.ts`, `lib/admin.ts`, permission patterns from wipe/owner delete.
- `functions/src/index.ts` exports.

**Studio**

- `features/users/` — customer/staff destructive actions + confirm dialogs.
- `features/print-requests/` — contextual delete/archive; remove unsafe direct `deleteDoc` path.
- `features/upcoming-shows/` — contextual delete/archive; remove unsafe direct path.
- `features/designs/` — ensure delete language not confused with archive; no new hard delete unless approved.
- `features/customer-uploads/` — eligible delete action.
- Category/tag modals — referenced counts + blocked messaging.
- `features/test-data-reset/` — label scratch tools; stop implying product-safe delete.
- `features/permissions/services/permissionService.ts` — new can* methods.
- Hooks + confirm dialogs mirroring `DeactivateUserConfirmDialog` / typed phrases where warranted.

**Rules**

- Prefer Admin SDK callables for destructive cross-doc work; avoid relaxing client delete rules.
- May need client **read** of tombstone fields; deny client writes of deletion fields.

**Docs**

- `DATA_MODEL.md`, `BACKEND.md`, `DECISIONS.md` (new ADR), `SECURITY.md`, `TESTING.md`, handoff `CURRENT-STATE.md` at signoff.

### Architecture Impact

- [x] Details: Services + callables own policy; components render confirmations/warnings; hooks wire state; no Firebase from components; no generic delete endpoint.

### Security Impact

- [x] Details: Server recheck dependencies; Auth disable preferred for customers; permissionService + server role checks; no secrets/PII in UI errors; project allowlist decisions for scratch tools vs product tombstone (product tombstone may need to work on staging later — **this phase targets fresh-prints-dev**).

### Data Model Impact

- [x] Details: Propose tombstone fields on `customers` and/or `users` (exact names TBD in implement, suggested below). Preserve `customerUsernames`. Possibly `deletedAt`, `deletedBy`, `deletionSource` (`studio_owner` | `portal_request`), `isDeleted` or `accountStatus: "deleted"`. Display-only `(Deleted)` suffix.

### Backend Impact

- [x] Details: New callables; Auth disable vs delete; staged Firestore then Auth then Storage; idempotent retries.

### UI / UX Impact

- [x] Details: Contextual danger actions; entity-specific confirm buttons; blocked-state panels with navigation; manual QA required.

### Migration Impact

- [x] Forward: No mandatory backfill; new fields optional on write. Existing hard-deleted scratch users cannot be resurrected.
- [x] Rollback: Feature-flag or withhold UI; callables no-op if undeployed; do not reverse Auth disable without explicit restore flow (out of scope unless added).

---

## Approved tombstone fields (owner 2026-07-22)

**`customers/{id}`**

- `isDeleted: true`
- `deletedAt`, `deletedBy`, `deletionSource` (`studio_owner` | `portal_request` | similar)
- Keep `username` **unchanged**
- Keep `userId` (Firebase UID) for history
- Always allow tombstone even when working/historical requests exist; keep all requests intact

**`users/{uid}`** (customer role)

- `isActive: false` for access control
- Mirror deletion metadata when useful for session gates

**`customerUsernames/{username}`**

- **Retain** document pointing at original `customerId` (never delete on product tombstone)

**Auth**

- **Approved:** `adminAuth.updateUser(uid, { disabled: true })` — do **not** delete the Firebase Auth user

**Display**

- Shared helper: if deleted → `${username} (Deleted)` in Studio/Portal history UIs only
- Registration continues to fail on reserved username

**Staff**

- Deactivate only (existing path); no Users-page hard delete; keep self + last-owner protections

**Designs**

- Out of scope for hard delete; archive + existing asset purge only

**Customer upload hard delete**

- Owner-only this phase; unattached + unpromoted only

**`ownerDeleteUser`**

- Remove customer-delete from Test Data UI
- Callable may remain quarantined for internal/dev tests only — not reachable via normal Studio UI
- Users-page action uses tombstone policy only

### Failure recovery matrix (review required change)

| Stage completed | Failure | Observable state | Recovery |
|-----------------|---------|------------------|----------|
| None | Preflight/authz fail | Unchanged | Retry after fix |
| Firestore tombstone written | Auth disable fails | `isDeleted` true, Auth still enabled | Retry callable (idempotent: re-attempt Auth disable); surface user-safe “disable failed” |
| Tombstone + Auth disabled | Storage optional cleanup fails | Account deleted; Storage may remain | Log entity id; retry Storage-only cleanup later; do not undelete |
| Already tombstoned | Repeat call | No-op success | Idempotent OK response |
| Print request/items partial batch | Mid-batch fail | Prefer transaction/batched deletes sized under limits; fail closed before parent delete if items remain | Retry; never leave parent without clearing items first in reverse order on retry |
| Upload doc deleted | Storage delete fails | Doc gone / marked; files may remain | Log paths; maintenance retry by path prefix |

---

## Approach (delivery passes)

### Pass 0 — Inventory and policy approval (this document)

- Done in plan; await Review + owner decisions listed below.

### Pass 1 — Shared contracts and backend guards

1. Add shared TypeScript result types: `DeletionOutcome`, blocked reasons with user-safe messages + machine codes, impact previews.
2. Add domain callables with: authz → load entity → dependency query → fail closed → mutate → optional Storage → map errors.
3. Preflight callables optional but recommended for rich UI; **execute path always rechecks**.
4. Document staged non-atomicity: Firestore transaction/batch limits; Auth and Storage outside transactions; retry idempotency via `isDeleted` / missing-doc checks.

### Pass 2 — Users and customers

1. Users page: “Delete customer account” → impact preview → confirm (“Disable customer account” / tombstone language).
2. Implement tombstone callable; fulfill pending `accountDeletionRequests` when applicable.
3. Staff: keep deactivate; do not move hard delete onto Users unless owner expands scope.
4. Quarantine Test Data `OwnerDeleteUserModal`: rename to “Scratch hard delete (destroys history)” or rewrite customer path to tombstone-only.

### Pass 3 — Print requests

1. Replace `deletePrintRequest` with callable `deleteEligiblePrintRequest`.
2. Eligibility: status in working set (`draft`/`active`/`editing`); zero allocations; no item with printing/printed/completed production history (exact status set from enums at implement time).
3. On success: delete items then request (batched); never touch designs/uploads.
4. Else if historical: offer archive transition using existing `archived` status.
5. Blocked UI lists shows and required action.

### Pass 4 — Shows

1. Replace `deleteUpcomingShow` with callable.
2. Eligibility: no allocations; productionStatus not in printing/fully_printed/completed/archived (exact set at implement); preferably upcoming/not past.
3. Else archive via existing `isArchived` / production archive patterns.
4. Never change design lifecycle statuses.

### Pass 5 — Designs and customer uploads

1. Designs: keep archive + purge; **no hard delete UI** unless owner approves expansion beyond ADR-FP-084.
2. Uploads: callable deletes only when no `printRequestItems` ref and not promoted; delete Storage paths then doc (or doc then Storage with recovery flag — document choice).
3. Idempotent retries; log partial Storage failures.

### Pass 6 — Categories, tags, remaining

1. Server check design reference counts before archive/delete-equivalent.
2. Block with count + link to Design Library filter if routing supports it.
3. Keep wipe/retention as Test Data / admin maintenance.

### Pass 7 — Docs, tests, manual checkpoint

1. Update docs + ADR.
2. Run automated checks; entity-by-entity manual QA (20 scenarios from goal).
3. Stop for owner PASS / FAIL / PASS WITH NOTES.
4. No production deploy.

---

## Exact service / callable naming (convention)

Follow existing exports in `functions/src/index.ts` (camelCase callables). Proposed names (adjust only if collision found at implement):

| Proposed callable | Role |
|-------------------|------|
| `previewCustomerAccountDeletion` | Optional preflight |
| `tombstoneCustomerAccount` | Execute customer tombstone + Auth disable |
| `previewPrintRequestDeletion` | Optional preflight |
| `deleteEligiblePrintRequest` | Hard delete unused request+items OR return blocked |
| `archivePrintRequest` | Explicit archive when history present (if not already covered) |
| `previewUpcomingShowDeletion` | Optional preflight |
| `deleteEligibleUpcomingShow` | Hard delete empty eligible show |
| `deleteEligibleCustomerUpload` | Hard delete unattached upload + Storage |
| `previewCategoryDeletion` / `archiveCategoryWithGuards` | Referenced design guards |
| `previewTagDeletion` / `archiveTagWithGuards` | Referenced design guards |

Studio services: thin wrappers calling `httpsCallable` (mirror `ownerDeleteUserService.ts` / `wipeOperationalTestDataService.ts`).

---

## Concurrency and integrity

1. UI may call preview.
2. User confirms.
3. Execute callable re-queries dependencies inside server handler (and transactions where multi-doc Firestore-only).
4. If new allocation appeared → `failed-precondition` with updated blocked payload.
5. Customer tombstone: set Firestore tombstone fields **before** Auth disable when possible; if Auth disable fails, leave tombstone + surface recovery (“account marked deleted but Auth disable failed”).
6. Storage cleanup after Firestore refs cleared; failures logged with entity id for retry.
7. Retries: if already `isDeleted` / already gone → success idempotent response.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit tests (policy, display, username reserve) | `npx tsx --test` on new `*.test.ts` | yes |
| Functions unit / build | `npm --prefix functions run build` + targeted `npx tsx --test functions/src/**/*.test.ts` | yes when Functions change |
| Studio typecheck | `npm --prefix apps/studio exec tsc -- --noEmit` | yes |
| Lint | `npm run lint` | yes (changed TS/TSX) |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes if Portal display helper shared |
| E2E | — | no (manual QA) |
| Rules emulator | if rules change | yes if rules change |

### Manual

- Full 20-scenario checklist in `docs/workflow/reviews/2026-07-22-studio-contextual-safe-deletion-manual-checkpoint.md` (created at Test phase).
- Includes stale-confirmation race simulation and unauthorized role checks.

---

## Human Checkpoints Anticipated

- [x] Business logic decisions (policy matrix outcomes) — **required before Implement**
- [x] Auth behavior change (disable vs delete) — **required before Implement**
- [ ] Database migration / backfill — only if owner requires backfill of existing fields
- [ ] Manual UI/UX review — at Test phase
- [ ] Production deploy — **forbidden this phase**
- [ ] Username uniqueness change — **required** (stop deleting reservation)
- [ ] New persisted deletion status fields — **required approval** of field names/semantics

---

## Owner decisions (recorded 2026-07-22)

1. **Customer Auth:** Disable Auth account. Do **not** delete the Firebase Auth user.
2. **Customers with requests:** Always allow tombstone. Keep all working and historical requests intact. Staff may still complete/cancel/archive open work; deleted customer cannot sign in or create new activity.
3. **`ownerDeleteUser`:** Remove destructive customer-delete from Test Data UI. Users-page uses tombstone only. Callable may remain quarantined for internal/dev tests — not in normal Studio UI.
4. **Design hard delete:** Out of scope. Archive + approved asset-purge only.
5. **Upload hard-delete permission:** Owner-only this phase.
6. **Staff hard delete:** Out of scope. Deactivate only; existing self + last-owner protections.
7. **Tombstone fields:** `isDeleted: true` + `deletedAt`, `deletedBy`, `deletionSource`. Keep `users.isActive: false`. Preserve username + `customerUsernames`. `(Deleted)` is display-only.

Review required changes also folded: typed confirm for irreversible hard deletes; quarantine cascade UI; failure recovery matrix; request+items delete; taxonomy soft-archive only; design hard delete out of scope.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Continuing to use `ownerDeleteUser` destroys history | Critical | Quarantine UI; replace with tombstone callable |
| Username freed → identity collision / CR confusion | High | Never delete `customerUsernames` on product delete |
| Orphan client delete APIs | High | Remove/replace before wiring UI |
| Race: allocation added after confirm | High | Server recheck; fail closed |
| Auth/Storage/Firestore non-atomic | Medium | Ordered stages + idempotent retry + observable failure |
| Confusing Archive vs Delete in UI | Medium | Entity-specific copy and separate actions |
| Scope creep into design tombstones / wipe relocation | Medium | Strict out-of-scope list; re-review if expanded |
| Partial cascade leftover from old scratch deletes | Low | Document; no automatic repair this phase |

---

## Rollback Plan

- Undeploy or stop exporting new callables; hide Studio actions behind permission false.
- Do not run production.
- Scratch `ownerDeleteUser` remains reversible only by not using it; tombstone accounts can later gain an explicit restore flow (future phase).

---

## Documentation Updates Required

- [x] DATA_MODEL.md — tombstone fields, username retention, deletion outcomes
- [x] BACKEND.md — callables, Auth disable, failure recovery
- [x] DECISIONS.md — new ADR superseding conflicting parts of ADR-FP-104 cascade for product deletion
- [x] SECURITY.md — Auth disable; deny client tombstone writes
- [x] TESTING.md — new test commands/paths if needed
- [ ] PROJECT_BRIEF.md — only if product wording changes
- [x] Manual checkpoint + signoff + handoff CURRENT-STATE at close
- [x] STYLE_GUIDE.md — deleted username display if needed

---

## Open Questions

- [x] Inventory of Test Data deletes — resolved in Pass 0
- [x] Portal self-delete UI location — resolved (exists as request)
- [x] Owner/last-owner protections — resolved in `ownerDeleteUser` + permissionService
- [x] Owner decisions 1–7 — recorded 2026-07-22
- [x] Categories/tags — soft-archive only this phase (block when referenced)
- [ ] Exact print-request item production statuses that forbid hard delete — finalize at Implement from enums + DATA_MODEL

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-22-studio-contextual-safe-deletion-review.md
- Verdict: approved_with_changes (owner decisions applied; plan Status → approved)
- Owner decisions recorded: 2026-07-22
- Implementation authorized: yes (fresh-prints-dev only; no production deploy)

---

## Acceptance criteria mapping

Plan covers inventory, matrix, architecture, Auth/username, passes 0–7, unsafe API replacement, testing, manual QA list, and human gates. Implementation acceptance remains the checklist in the managed-phase goal; signoff will tick each item after Test.
