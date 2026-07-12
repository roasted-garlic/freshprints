# Plan: Portal Customer Artwork Upload — Manual E2E Remediation

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Author | Agent |
| Status | ready_for_review → **revised after review round 1** |
| Workflow | managed-phase (remediation under `portal-customer-artwork-upload`) |
| Trigger | Manual E2E **FAIL** — 7 issues |
| Parent | `docs/workflow/plans/2026-07-11-portal-customer-artwork-upload-plan.md` |
| Related | Sub-phase G manual checkpoint — do **not** sign off G/parent until retest PASS |

---

## Goal

Fix all seven manual-E2E findings: dedicated Customer Uploads Studio page + badge, smaller action buttons, Portal discovery copy, upload item label, upload Duplicate, and Studio Design Library / Show Queue load failures — then return to the same manual checkpoint.

---

## Investigation summary (issues 6–7)

**ErrorState** uses default eyebrow `"Unavailable"` — matches the reported “UNAVAILABLE” chrome; the body message is the real failure.

| Issue | Root cause (documented) | Fix approach |
|-------|-------------------------|--------------|
| **#6 Design Library** | Studio `mapDesignDocument` **throws** on any incomplete `ready` design (`originalPath` / `uploadedBy` / timestamps). Portal `mapCatalogDesign` **skips** incomplete docs. One bad catalog doc fails the entire Studio `loadAll` loop; error is remapped via `getFirestoreErrorMessage` to `"Unable to load designs. Please try again."` | Skip incomplete designs (log once); keep strict mapping for docs that pass the gate. Do **not** weaken rules. |
| **#7 Show Queue** | `listUpcomingShows` maps every doc with `mapUpcomingShowData` — one incomplete show throws and fails the page. Separately, allocation lists (and uncaught totals) can throw on upload-backed rows if mapper still requires `designId`. Working-tree mapper is source-aware; harden to **skip** malformed allocation docs rather than fail the whole list. | Skip incomplete shows/allocations with warn; ensure upload allocations without `designId` map correctly. Fix allocation **update** rules if they still require `designId` equality (write-path bug from D). |

---

## Scope

### In scope (all seven)

#### 1. Dedicated Customer Uploads page (ADR-FP-009)

**Recommendation (binding if approved):**

| Item | Value |
|------|-------|
| Nav label | **Customer Uploads** |
| Route | `/customer-uploads` |
| Permission | `importDesigns` / `canViewCustomerUploadIntake` (same as today) |
| Placement | Sidebar near **Imports** / **AI Processing** (operational area), **not** a fourth design-lifecycle workspace |

**ADR interpretation:** ADR-FP-009’s three workspaces (Imports → AI Processing → Design Library) remain the **design catalog lifecycle**. Customer Uploads is an **operational intake queue for Portal request artwork** (like Print Requests), which may **hand off** to AI Processing via promote. Document this clarification in `DECISIONS.md` (short ADR addendum / ADR-FP-073 note) + `ARCHITECTURE.md`.

**Work:**
- Move `CustomerUploadIntakeSection` off `ImportsPage`
- New page under `features/customer-uploads/pages/` (or `imports` → relocate to customer-uploads feature)
- `AppRoutes` + `Sidebar` entry
- Live badge: Firestore `onSnapshot` on `catalogReviewStatus == "pending_staff_review"` (doc count) so the nav badge stays accurate across promote/exclude/retry and multi-staff use; reuse intake query fields
- Promote still navigates to `/ai-review` only
- Incomplete mapper skips: `console.warn` with document id (dedupe per id per session acceptable)

#### 2. Smaller action buttons

- Use existing `Button` `size="sm"` (and consistent `variant`) for Open linked request / Send to AI Review / Do not add to catalog / Reverse exclusion / Retry
- Primary = promote; secondary = open/retry/restore; secondary or danger-outline for exclude per STYLE_GUIDE — no one-off CSS heights

#### 3. Portal discovery messaging

**Proposed copy (binding if approved):**

> A print request can include designs from the Design Library, artwork you upload yourself, or both. Uploaded artwork is for your request only — it is not automatically added to the shared Design Library.

Place the approved paragraph near **Start request / Continue request** on both Discover and full Library modes (shared `CatalogPageContent` or equivalent). Concise, mobile-friendly; no second request flow; one-working-request unchanged.

#### 4. Label

Replace `Your upload · not in Design Library yet` with **`Your uploaded design`** everywhere that subtitle appears (Portal request item card; grep for siblings).

#### 5. Duplicate upload items

- Portal: show Duplicate for upload items; extend `duplicatePrintRequestItem` to create a new item with same `customerUploadId` / `sourceType: customer_upload`, qty, sizes, notes/sortOrder per existing rules — **do not** clone Storage or `customerUploads` docs
- Studio: extend `addPrintRequestItem` / `duplicatePrintRequestItem` so upload-backed items duplicate with the same source fields (not designId-only)
- Tests for catalog + upload duplicate paths (Portal and Studio as applicable)

#### 6–7. Studio load resilience + D rules fix

- Design list: skip incomplete designs (Portal parity)
- Upcoming shows list: skip incomplete shows
- Allocations list/all: skip incomplete; upload branch without `designId`
- Firestore rules: allocation update must not require `designId` when `sourceType == customer_upload`
- Deploy rules to `fresh-prints-dev` if changed
- Regression unit tests for mappers

### Out of scope

- Production deploy
- Wipe track / allowlist
- AI prompt changes
- Parent/G signoff before manual retest PASS
- Broad Design Library rewrite beyond skip-incomplete resilience

---

## Affected areas (expected)

| Area | Paths |
|------|-------|
| Studio nav/routes | `Sidebar.tsx`, `AppRoutes.tsx` |
| Intake UI move | `ImportsPage`, new Customer Uploads page, intake components/hooks |
| Buttons | `CustomerUploadIntakeSection` |
| Portal copy | `CatalogPageContent` (+ discover helpers if split) |
| Portal label + duplicate | `PortalPrintRequestItemCard`, `portalPrintRequestService` |
| Studio duplicate | `printRequestService` |
| Mappers | `designService`, `upcomingShowService` |
| Rules | `firestore.rules` allocation update |
| Docs | ARCHITECTURE, DECISIONS (ADR-FP-009 clarification), ROADMAP notes, G checkpoint |

---

## Test strategy

| Check | Required |
|-------|----------|
| Unit: design/show/allocation mappers skip incomplete | yes |
| Unit: wipe/upload duplicate service tests | yes |
| Portal typecheck + build | yes |
| Studio typecheck (touched) / build if feasible | yes |
| Functions build if rules-only may skip; if Functions change yes | as needed |
| Deploy rules (+ any Functions) to `fresh-prints-dev` | if rules changed |
| Smoke: optional light; manual retest is hard gate | yes |

---

## Human checkpoints

- Manual E2E retest after automated green — same checkpoint doc, updated for 7 issues
- ADR naming: reviewed as part of this plan (Customer Uploads / `/customer-uploads`)

---

## Acceptance criteria

- [ ] Intake removed from Imports; dedicated page + live pending badge
- [ ] Action buttons use standard `sm` sizing
- [ ] Portal discovery copy approved text shipped
- [ ] Label `Your uploaded design`
- [ ] Duplicate works for upload-backed items (Portal + Studio)
- [ ] Design Library and Show Queue load on Studio with incomplete-doc resilience
- [ ] Allocation update rules support upload allocations
- [ ] Docs updated for ADR-FP-009 clarification
- [ ] Return to manual checkpoint — no G/parent signoff until PASS

---

## Risks

| Risk | Mitigation |
|------|------------|
| Skipping incomplete docs hides data issues | Log/warn with design/show id; residual risk note |
| “Fourth workspace” confusion | Explicit ADR clarification: operational queue ≠ design lifecycle triad |
| Duplicate creates orphan confusion | Same `customerUploadId`; no Storage clone |

---

## FreshForge impact

Product + docs only; no starter surface.
