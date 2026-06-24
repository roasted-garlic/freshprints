# Phase 2A Signoff

## Overview

### Purpose of Phase 2A

Phase 2A established the **secure, typed data foundation** for the Fresh Prints Design Library — the catalog layer where processed DTF design metadata will live after future import, validation, and AI enrichment workflows.

Phase 2A delivered Firestore collections, TypeScript types, service-layer CRUD, permission integration, security rules, query indexes, and storage path conventions **without** building the Design Library UI or any import/processing pipeline.

### Relationship to the Design Library Roadmap

Per `docs/plans/design-library-plan.md` and `docs/ROADMAP.md`, the Design Library milestone is split into sub-phases:

```txt
Phase 2A  Data model, services, rules          ← This signoff
Phase 2B  Design Library UI shell
Phase 2C  Manual design CRUD (testing only)
```

Phase 2A owns step 4’s **backend foundation** in the end-to-end workflow (catalog storage and access). Steps 1–3 (import, validation, AI) remain explicitly deferred to Phase 3 and Phase 7.

### What Phase 2A Was Intended to Accomplish

Phase 2A was intended to:

* Define canonical `designs` and `categories` document types aligned with `docs/DATA_MODEL.md`
* Centralize Firestore access in `designService` and `categoryService`
* Extend `permissionService` with design-library permission helpers
* Enforce staff-only catalog access in Firestore rules
* Define composite indexes for planned catalog queries
* Document storage path conventions for future asset uploads
* Verify the foundation against real Firebase services before UI work begins

**Signoff date:** 2026-06-20  
**Reviewer:** AI-assisted architecture review (implementation + verification alignment)  
**Stakeholder testing status:** Phase 2A reported complete and manually verified by project owner (owner/admin verification suite)

---

## Scope Completed

### Data Model

#### Design types

Location: `src/renderer/src/features/designs/types/`

| File | Contents |
| --- | --- |
| `design.types.ts` | `Design`, `CreateDesignInput`, `UpdateDesignInput` |
| `designStatus.types.ts` | `DesignStatus`, `designStatuses`, `isDesignStatus()` |
| `designMetadata.types.ts` | `AiMetadata`, `DesignTechnicalMetadata` (typed for Phase 7; not written to Firestore in Phase 2A) |
| `designQuery.types.ts` | `DesignListQuery` (status, categoryId, tag, limitCount filters) |

`Design` fields match `docs/DATA_MODEL.md`: title, description, categoryId, tags, status, storage paths, technical metadata, `uploadedBy`, pipeline flags (`queueCount`, `aiProcessed`, `aiReviewed`), and timestamps.

#### Category types

Location: `src/renderer/src/features/designs/types/category.types.ts`

| Type | Purpose |
| --- | --- |
| `Category` | Canonical category document |
| `CreateCategoryInput` | Category creation input |
| `UpdateCategoryInput` | Partial category updates |
| `CategoryListOptions` | `includeInactive` filter for listing |

#### Metadata types

`AiMetadata` and `DesignTechnicalMetadata` are defined in `designMetadata.types.ts` for future phases. Phase 2A stores only `aiProcessed` / `aiReviewed` booleans on design documents; `aiMetadata` sub-objects are not written.

#### Status types

`DesignStatus` lifecycle enum (canonical):

```txt
imported → processing → ready → queued → printed → archived
                    ↘ rejected
```

Default for manual/test records: `ready`. Archive uses `status: "archived"`. Categories use soft-disable via `isActive: false`.

#### Supporting utilities

| File | Purpose |
| --- | --- |
| `utils/designTagNormalizer.ts` | Trim, lowercase, dedupe; max 20 tags, 40 chars each |
| `constants/designStoragePaths.ts` | Path helpers for originals, thumbnails, previews |

#### Collection constants

`FIRESTORE_COLLECTIONS` in `src/renderer/src/features/firebase/constants/firestoreCollections.ts` includes `designs` and `categories`. Access via `firestoreCollectionService.getDesignsCollection()` and `getCategoriesCollection()`.

---

### Services

#### designService

Location: `src/renderer/src/features/designs/services/designService.ts`

| Method | Description |
| --- | --- |
| `listDesigns(caller, query?)` | Filtered list by status, categoryId, single tag; ordered by `updatedAt` desc |
| `getDesignById(caller, designId)` | Single design read |
| `createDesign(caller, input)` | Create with validation, tag normalization, path checks |
| `updateDesign(caller, designId, input)` | Partial update; optional fields cleared via `deleteField()` |
| `archiveDesign(caller, designId)` | Sets `status: "archived"` |

Permission checks run in the service layer before Firestore calls. No component-level Firestore access.

#### categoryService

Location: `src/renderer/src/features/designs/services/categoryService.ts`

| Method | Description |
| --- | --- |
| `listCategories(caller, options?)` | Active categories by default; optional `includeInactive` |
| `getCategoryById(caller, categoryId)` | Single category read |
| `createCategory(caller, input)` | Create with unique active-name check |
| `updateCategory(caller, categoryId, input)` | Partial update |
| `archiveCategory(caller, categoryId)` | Sets `isActive: false` |

#### Firestore write safety

Location: `src/renderer/src/features/firebase/utils/firestoreDocument.ts`

* `withoutUndefinedFields()` — omits optional fields on create (Firestore rejects `undefined`)
* `assertNoUndefinedFirestoreFields()` — guards update payloads

---

### Permissions

#### Design permissions

Extended in `permissionService` (`src/renderer/src/features/permissions/services/permissionService.ts`) and `permission.types.ts`:

| Method / Key | Roles |
| --- | --- |
| `canViewDesigns` / `viewDesigns` | owner, admin, helper |
| `canCreateDesigns` / `createDesigns` | owner, admin, helper |
| `canEditDesigns` / `editDesigns` | owner, admin, helper |
| `canArchiveDesigns` / `archiveDesigns` | owner, admin, helper |
| `canManageDesigns` | Delegates to `canViewDesigns` (backward compatible) |

#### Category permissions

| Method / Key | Roles |
| --- | --- |
| `canManageCategories` / `manageCategories` | owner, admin only |

Helpers may assign existing categories to designs (via design updates in Phase 2C) but cannot create, update, or archive category documents.

#### Role matrix

| Capability | Owner | Admin | Helper | Customer |
| --- | :---: | :---: | :---: | :---: |
| View designs | ✓ | ✓ | ✓ | ✗ |
| Create designs | ✓ | ✓ | ✓ | ✗ |
| Edit designs | ✓ | ✓ | ✓ | ✗ |
| Archive designs | ✓ | ✓ | ✓ | ✗ |
| View categories | ✓ | ✓ | ✓ | ✗ |
| Manage categories | ✓ | ✓ | ✗ | ✗ |
| Desktop app access | ✓ | ✓ | ✓ | ✗ |

Customer website read permissions for approved catalog metadata are documented in `docs/SECURITY.md` but **not implemented** in Phase 2A Firestore rules.

---

### Firebase

#### Firestore rules

Location: `firestore.rules`

| Collection | Read | Write | Notes |
| --- | --- | --- | --- |
| `designs/{designId}` | Active staff | Active staff (create/update) | Field validation; immutable `id`, `uploadedBy`, `createdAt`; delete denied |
| `categories/{categoryId}` | Active staff | Owner/admin only | Field validation; delete denied |
| `users/{userId}` | Unchanged from Phase 1 | Writes blocked | Team mutations via Cloud Functions |
| All other collections | Denied | Denied | Default deny preserved |

Customers and unauthenticated users cannot read or write design or category documents.

#### Firestore indexes

Location: `firestore.indexes.json` (referenced from `firebase.json`)

| Index | Fields |
| --- | --- |
| Designs by status | `status` ASC, `updatedAt` DESC |
| Designs by category + status | `categoryId` ASC, `status` ASC, `updatedAt` DESC |
| Designs by tag + status | `tags` ARRAY_CONTAINS, `status` ASC |
| Active categories by sort | `isActive` ASC, `sortOrder` ASC |
| Active categories by name | `isActive` ASC, `name` ASC |

#### Storage path strategy

Location: `src/renderer/src/features/designs/constants/designStoragePaths.ts`

| Asset | Path pattern |
| --- | --- |
| Original | `/originals/{designId}.png` |
| Thumbnail | `/thumbnails/{designId}.webp` |
| Preview | `/previews/{designId}.webp` |

Helpers: `getOriginalStoragePath()`, `getThumbnailStoragePath()`, `getPreviewStoragePath()`, `isCanonicalDesignStoragePath()`.

Firestore stores paths, not download URLs. Upload workflows and `storage.rules` are deferred to Phase 3.

---

### Documentation Updates

| Document | Updates |
| --- | --- |
| `docs/DATA_MODEL.md` | Tag normalization rules; TypeScript implementation locations; composite index list |
| `docs/FIREBASE.md` | Phase 2A services, indexes, path helpers, deployment commands |
| `docs/SECURITY.md` | Desktop vs future customer website design access; category write restrictions |

---

### Temporary Verification Tool (Dev Only)

A non-production verification harness was added to validate Phase 2A without building the Design Library UI:

| Item | Location |
| --- | --- |
| Page | `#/dev/phase-2a-verify` — `Phase2AVerificationPage.tsx` |
| Dashboard card | `Phase2AVerificationDashboardCard.tsx` on Dashboard |
| Orchestration | `phase2AVerificationService.ts` (calls `designService` / `categoryService` only) |

This tool is **temporary** and should be removed after Phase 2A signoff or before Phase 2B ships.

---

## Verification Results

Verification was performed using the **Temporary Phase 2A Verification** tool against the live Firebase project (not emulators), with Firestore rules and indexes deployed.

### Owner/Admin Verification

**Result:**

```txt
6 passed
0 failed
0 skipped
```

Tests executed in order:

| # | Test | Result |
| --- | --- | --- |
| 1 | Create test category | Passed |
| 2 | List categories | Passed |
| 3 | Create test design | Passed |
| 4 | List designs | Passed |
| 5 | Archive test design | Passed |
| 6 | Archive test category | Passed |

Owner/admin users can create and archive both categories and designs. Created records use `phase-2a-verify-*` naming and are archived (not hard-deleted) at the end of a successful run.

### Helper Verification (Expected Behavior)

Helper verification was designed into the tool (category create/archive expected to fail or skip). Owner/admin full-suite pass is the Phase 2A gate documented here. Helper behavior aligns with permission and Firestore rule design:

* Category create → permission denied (expected failure = pass)
* Design CRUD → allowed
* Category archive → skipped when no category was created

### Defect Found During Verification

#### Symptom

Create test design failed with:

```txt
Function setDoc() called with invalid data.
Unsupported field value: undefined (found in field previewPath)
```

#### Root cause

`designService.createDesign()` built a Firestore document object that included optional fields set to JavaScript `undefined`. When `previewPath` (and other optional fields) were not provided, they were still present on the object passed to `setDoc()`. Firestore rejects `undefined` values.

Affected optional fields on create included: `previewPath`, `description`, `categoryId`, `width`, `height`, `dpi`, `requestedByCustomerId`.

#### Fix applied

1. Added `withoutUndefinedFields()` in `src/renderer/src/features/firebase/utils/firestoreDocument.ts` to omit optional fields on create.
2. Applied sanitization in `designService.createDesign()` and `categoryService.createCategory()`.
3. Added `assertNoUndefinedFirestoreFields()` on update payloads in both services.
4. Update path already used `deleteField()` to clear optional fields (unchanged pattern).

#### Re-test result

After remediation, owner/admin verification was re-run:

```txt
6 passed
0 failed
0 skipped
```

### Final Verification Result

All Phase 2A verification tests **passed successfully** after the undefined-field remediation. The design and category service layer is confirmed working against deployed Firestore rules and indexes.

---

## Architecture Review

### Separation of concerns

| Layer | Responsibility | Phase 2A compliance |
| --- | --- | --- |
| Components | Render UI; trigger actions | Verification page uses hook → service only |
| Hooks | Coordinate state and service calls | `usePhase2AVerification` does not call Firestore |
| Services | Business logic, validation, Firestore access | `designService`, `categoryService` own all writes |
| Firebase rules | Authoritative access control | Staff/category rules mirror `permissionService` |
| Types | Document contracts | Feature-local types under `features/designs/types/` |

`App.tsx` remains a thin provider/route shell. Routes extended in `AppRoutes.tsx` only.

### Service layer usage

* Components do not import `getDocs`, `setDoc`, or `updateDoc` for catalog data.
* Validation (title, paths, tags, status) lives in services.
* Permission checks precede Firestore operations.
* Error messages normalized via `firestoreErrorMessage.ts`.

### Firestore access patterns

* Collection references centralized in `firestoreCollectionService`.
* List queries use indexed constraints (`status`, `categoryId`, `tags`, `updatedAt`).
* Soft archive preferred over hard delete (aligned with `docs/DATA_MODEL.md`).
* Optional fields omitted on create; cleared with `deleteField()` on update.

### Permission architecture

* UI permission helpers in `permissionService` (not authoritative).
* Firestore rules enforce staff vs owner/admin category writes.
* Customer role has no desktop catalog access in Phase 2A.

### Security posture

**Strengths:**

* Default deny for all collections except explicitly ruled paths.
* Field-level validation in rules for design and category documents.
* Immutable creator and timestamp fields on design update.
* No customer read access to admin catalog data.

**Remaining concerns / technical debt:**

| Item | Severity | Notes |
| --- | --- | --- |
| No `storage.rules` yet | Medium | Required before Phase 3 uploads; path constants only in Phase 2A |
| No Cloud Functions for design mutations | Low | Acceptable per plan; revisit if privileged workflows need server enforcement |
| No audit log writes for design changes | Low | Recommended before production catalog use |
| Category name uniqueness | Low | Enforced in service layer only; not in Firestore rules |
| Temporary verification tool in repo | Low | Remove before or with Phase 2B |
| Pagination cursor not implemented | Low | `limitCount` only; sufficient for Phase 2B shell |
| `queueCount` not transactionally maintained | Low | Deferred to Phase 6; field exists with default `0` |

---

## Known Limitations

The following are **intentionally not built** in Phase 2A:

| Capability | Target phase |
| --- | --- |
| Design Library UI (grid, filters, detail panel) | Phase 2B |
| Manual design create/edit forms | Phase 2C |
| ZIP import pipeline | Phase 3 |
| Folder scanning | Phase 3 |
| DPI validation | Phase 3 |
| File type / dimension validation | Phase 3 |
| Thumbnail generation | Phase 3 |
| Preview image generation | Phase 3 |
| Storage upload workflow | Phase 3 |
| AI categorization | Phase 7 |
| AI tagging | Phase 7 |
| Auto-renaming | Phase 7 |
| AI vision / `AiMetadata` writes | Phase 7 |
| Show queue integration (`queueCount` updates) | Phase 6 |
| Customer website catalog access | Future website milestone |
| `storage.rules` deployment | Phase 3 prep |
| Full-text / advanced search | Phase 4 |

---

## Deployment Status

| Asset | Status |
| --- | --- |
| Firestore rules (`designs`, `categories`) | Deployed — verified via live verification suite |
| Firestore indexes (`firestore.indexes.json`) | Deployed — list/filter queries succeed |
| Cloud Functions | No Phase 2A function changes |
| Storage rules | Not deployed (deferred) |
| Verification environment | Real Firebase project (not local emulators) |

Deploy commands used:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

---

## Risks

### Low

| Risk | Justification |
| --- | --- |
| Temporary verification tool left in codebase | Clearly labeled; removal planned before Phase 2B production UI |
| No audit logging for design CRUD | Acceptable for development catalog; add before production use |
| Client-side tag/title search only in Phase 2B | Aligned with plan; indexed metadata queries sufficient for initial shell |
| `queueCount` defaults to `0` without queue phase | Documented; Phase 6 will own transitions |

### Medium

| Risk | Justification |
| --- | --- |
| No `storage.rules` | Upload pipeline in Phase 3 requires rules before production file access; path constants exist |
| Category name uniqueness service-only | Race condition possible under concurrent creates; low likelihood in current team size |
| Helper can create designs without category assignment | By design; category assignment optional until Phase 2C forms |

### High

| Risk | Justification |
| --- | --- |
| None identified for Phase 2A scope | Foundation is rules-backed, verified, and scoped correctly. Remaining items are planned deferrals, not blockers. |

---

## Recommendation

### Proceed to Phase 2B — Design Library UI Shell

**Recommendation: Go**

**Reasons:**

1. All Phase 2A deliverables from `docs/plans/design-library-plan.md` are implemented.
2. Owner/admin verification suite passed 6/6 after defect remediation.
3. Firestore rules and indexes are deployed and validated against real services.
4. Architecture follows project standards: services own Firestore, permissions centralized, types aligned with `DATA_MODEL.md`.
5. No scope creep into import, AI, or queue features.
6. Known limitations are documented and mapped to future phases.

Phase 2B can begin building the catalog browsing experience (`DesignLibraryPage`, grid, filters, read-only detail) on top of the existing `designService` and `categoryService`.

---

## Phase 2B Prerequisites

The following must already be true before Phase 2B begins (all satisfied):

- [x] `designs` and `categories` TypeScript types defined
- [x] `designService` and `categoryService` implemented and verified
- [x] `permissionService` extended with design/category helpers
- [x] Firestore rules deployed for `designs` and `categories`
- [x] Composite indexes deployed for planned list queries
- [x] Storage path helpers defined (`designStoragePaths.ts`)
- [x] Tag normalization utility in place
- [x] `docs/DATA_MODEL.md`, `docs/FIREBASE.md`, `docs/SECURITY.md` updated
- [x] Phase 2A verification passed (6 passed / 0 failed / 0 skipped)
- [x] No undefined-field write defect open on design create

**Before Phase 2B ships to stakeholders:**

- [ ] Remove or hide temporary Phase 2A verification tool (`#/dev/phase-2a-verify`)
- [ ] Add `#/designs` route behind `manageDesigns` / `viewDesigns` permission
- [ ] Enable Design Library sidebar nav item (currently disabled placeholder)

---

## Final Signoff

Phase 2A — **Design Library Data Foundation** — is **complete and accepted**.

The catalog data model, services, permissions, Firestore security rules, and query indexes are in place, verified against live Firebase, and aligned with project architecture documentation. One defect (undefined Firestore field values on design create) was found during verification, remediated, and re-verified successfully.

**Status:** Approved to proceed to **Phase 2B — Design Library UI Shell**.

---

*References: `docs/plans/design-library-plan.md`, `docs/ROADMAP.md`, `docs/reviews/phase-1-final-signoff.md`*
