# Design Status vs Production Status Separation Plan

| Field | Value |
| --- | --- |
| **Type** | Planning — **Step 6 implemented** (catalog cleanup + approval foundation) |
| **Phase** | Phase 3D |
| **Prerequisite** | Phase 3D Steps 1–5 complete (archive restore, print size, AI review foundation) |
| **Goal** | Separate catalog lifecycle from production workflow so one design can participate in many jobs without mutating catalog state |

---

## 1. Problem statement

Fresh Prints currently defines a single `DesignStatus` enum that mixes two concerns:

1. **Catalog lifecycle** — whether a design is imported, approved for use, rejected, or archived.
2. **Production workflow** — whether a design is queued for a show, printed, or otherwise consumed in operations.

Current enum (`designStatus.types.ts`, `DATA_MODEL.md`, `firestore.rules`):

```txt
imported | processing | ready | rejected | queued | printed | archived
```

`queued` and `printed` describe **work being done with** a design, not the design’s standing in the catalog. In real operations:

* One approved design may appear in **multiple** show queues, customer orders, and reprint batches at the same time.
* A design may be printed in Job A while still queued in Job B.
* Historical production records must remain accurate even if catalog metadata (title, tags, print size) changes later.

If `design.status` transitions `ready → queued → printed`, the design document can only represent **one** production context at a time and loses the ability to model concurrent or historical uses.

Phase 3D Step 5 already introduced a separate `aiReviewStatus` (`pending`, `approved`, `rejected`, `needs_review`). This plan extends that separation principle to production workflow.

---

## 2. Current status model review

### 2.1 Where statuses are defined

| Location | Role |
| --- | --- |
| `src/renderer/src/features/designs/types/designStatus.types.ts` | Canonical TypeScript enum |
| `docs/DATA_MODEL.md` | Global status documentation |
| `firestore.rules` → `isValidDesignStatus()` | Write-time validation |
| `designStatusDisplay.ts` | Library UI labels and badge variants |
| `design-delete-archive-policy-plan.md` | Lifecycle policy (includes `queued` / `printed`) |

### 2.2 Where `queued` and `printed` are used today

| Area | Used? | Notes |
| --- | --- | --- |
| Import pipeline | **No** | Imports end at `status: imported` |
| `designReadyService` | **No** | Uses `imported` / `processing` only; `markDesignReady` exists but is not called from import |
| `designAiReviewService` | **No** | Does not mutate `status` |
| Archive / restore | **No** (runtime) | Tests only assert restore to `queued` as a valid `previousStatus` |
| Design Library filters | **Yes** (display only) | Status filter includes all enum values |
| Firestore production data | **Unlikely** | Phase 6 queue system not built; no code writes `queued` or `printed` |
| `queueCount` on `Design` | **Field only** | Defaults to `0` on create; never incremented in active code |

**Conclusion:** `queued` and `printed` are **documented and typed** but **not used in business logic**. Safe to deprecate before Phase 6.

### 2.3 How other statuses are used today

| Status | Active use | Meaning today |
| --- | --- | --- |
| `imported` | **Yes** | Post-import catalog state; derivatives complete here |
| `processing` | **Yes** | Short-lived during derivative upload (`markDesignProcessing`) |
| `ready` | **Partial** | Reserved for post-AI-review; manual metadata create defaults to `ready` |
| `rejected` | **Enum only** | Not set by import or AI services yet |
| `archived` | **Yes** | Soft-hide via `archiveDesign` / `restoreDesign` |

### 2.4 Related models already in DATA_MODEL.md

Production-oriented collections are **already planned separately**:

| Collection | Status type | Values |
| --- | --- | --- |
| `showQueues` | `QueueStatus` | `draft`, `active`, `completed`, `archived` |
| `showQueueItems` | `QueueItemStatus` | `pending`, `ready`, `printed`, `removed` |

These are the correct home for production workflow. The gap is that `DesignStatus` duplicates item-level production concepts (`queued`, `printed`) and `QueueItemStatus` reuses the word `ready`, which collides with catalog `ready`.

### 2.5 Planning docs referencing production on designs

* `docs/plans/design-delete-archive-policy-plan.md` — lifecycle diagram includes `ready → queued → printed` on the design document.
* `docs/reviews/phase-2a-signoff.md`, `phase-3c-plan-review.md` — same combined lifecycle.
* `docs/WORKFLOWS.md` — Pensacola and customer-to-queue workflows describe production at the **queue item** level conceptually, but design status enum still lists production values.

---

## 3. Recommended design status (catalog only)

### 3.1 Proposed `DesignStatus` enum

```ts
export type DesignStatus =
  | "imported"    // In catalog pipeline; not yet approved for customer/production use
  | "processing"  // Optional: transient infrastructure state (derivatives, future AI job)
  | "ready"       // Approved for catalog and production reference
  | "rejected"    // Failed catalog approval; retained for audit
  | "archived";   // Soft-hidden from default browse
```

**Remove from design status:** `queued`, `printed`.

### 3.2 Status definitions

| Status | Meaning | Who sets it | Allowed transitions | Customer-visible (future website) |
| --- | --- | --- | --- | --- |
| `imported` | Original and derivatives stored; awaiting AI review and/or staff approval | Import pipeline (`createDesign`), restore fallback | → `processing`, → `rejected`, → `archived` | **No** |
| `processing` | Short-lived; derivative generation or future AI enrichment in flight | `designReadyService.markDesignProcessing`, future AI job | → `imported`, → `ready` (via approval service), → `rejected` | **No** |
| `ready` | Catalog-approved; may be referenced by production queue items | Future `catalogApprovalService` after AI approve (owner/admin override) | → `archived`, → `rejected` (rare manual reversal) | **Yes** (published catalog) |
| `rejected` | Catalog rejected; not for production or customer browse | AI review reject, staff reject | → `archived`, → `imported` (re-open, owner/admin) | **No** |
| `archived` | Soft-deleted from default library | `archiveDesign` (all staff) | → prior status via `restoreDesign` | **No** |

**Rules:**

* A design in `ready` **never** becomes `queued` or `printed` on the design document.
* Production progress is tracked on **queue items** / **production jobs**, not on `designs.status`.
* `processing` is optional but recommended to keep for in-flight work that should not appear as catalog-approved.

### 3.3 `queueCount` on designs

Keep `queueCount` as a **denormalized aggregate** (count of active `showQueueItems` referencing this design), not a status substitute.

* Updated by queue services when items are added/removed/completed.
* Used for archive warnings (`queueCount > 0`) per `design-delete-archive-policy-plan.md`.
* Does not imply a single production state.

---

## 4. AI review status model

### 4.1 Recommendation: keep AI review separate

**Yes.** `aiReviewStatus` (Phase 3D Step 5) must remain separate from `DesignStatus`.

| Field | Scope |
| --- | --- |
| `DesignStatus` | Catalog visibility and approval gate |
| `aiReviewStatus` | AI/staff review outcome |
| `aiProcessed` | Whether an AI pipeline has run |
| `aiReviewed` | Legacy boolean; sync when `aiReviewStatus === "approved"` |

### 4.2 `AiReviewStatus` values (unchanged)

```txt
pending | approved | rejected | needs_review
```

### 4.3 Relationship to design status (target coordination)

Future **catalog approval service** (not yet implemented) should coordinate both layers in one transaction:

| Event | `aiReviewStatus` | `DesignStatus` | Notes |
| --- | --- | --- | --- |
| Import completes | `pending` (display fallback until persisted) | `imported` | Current behavior |
| AI auto-approves | `approved` | `ready` | Sets `aiReviewed: true` |
| AI auto-rejects | `rejected` | `rejected` | Design stays in library for audit |
| AI uncertain | `needs_review` | `imported` | Staff must decide |
| Staff approves (override) | `approved` | `ready` | Owner/admin via `designAiReviewService` + approval hook |
| Staff rejects | `rejected` | `rejected` | Owner/admin |
| Staff requests re-review | `pending` | `imported` | Optional reset workflow |

**Phase 3D Step 5 intentionally does not auto-transition `status` to `ready`.** Wiring the table above is a **follow-up implementation step** (recommended Phase 3D Step 6 or Phase 7 UI), not a blocker for AI provider integration planning.

### 4.4 Archive restore interaction

`resolveRestoreStatus` already considers `aiReviewStatus === "approved"` and legacy `aiReviewed`. After separation, restore should return to **catalog** `previousStatus` only (never `queued` / `printed`).

---

## 5. Production status model

### 5.1 Principle

**Production records track work. Design records track catalog approval.**

### 5.2 Recommended entities

Use existing DATA_MODEL collections as primary; extend as Pensacola workflow matures.

| Entity | Collection | Purpose |
| --- | --- | --- |
| Show queue | `showQueues/{queueId}` | A named batch (live show, event, gang sheet run) |
| Queue item | `showQueueItems/{queueItemId}` | One design placement in one queue |
| Production job (future) | `productionJobs/{jobId}` | Optional umbrella for non-show work (customer orders, reprints) |
| Order line (future) | `orderItems/{orderItemId}` | Customer order → design mapping |

Phase 6 should implement **show queue items first** per ROADMAP. `productionJobs` / `orderItems` can follow in Phase 8 (Pensacola).

### 5.3 Recommended `ShowQueueItem` shape (extends DATA_MODEL)

```ts
export interface ShowQueueItem {
  id: string;
  queueId: string;
  designId: string;

  // Optional context
  customerId?: string;
  requestedByName?: string;
  showId?: string;           // future: link to event metadata

  // Production intent (snapshot at add time — see §6)
  quantity: number;
  printWidthInches?: number;
  printHeightInches?: number;
  sizeLabel?: string;        // e.g. "Adult L", "Hat patch"

  status: ProductionItemStatus;
  position: number;

  addedBy: string;
  printedAt?: Timestamp;
  printedBy?: string;
  canceledAt?: Timestamp;
  cancelReason?: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 5.4 Recommended `ProductionItemStatus` (rename from `QueueItemStatus`)

Avoid reusing catalog `ready`. Proposed values:

```ts
export type ProductionItemStatus =
  | "queued"        // In queue; not started
  | "in_progress"   // On press / gang sheet / RIP
  | "printed"       // Completed print
  | "packed"        // Optional fulfillment step
  | "shipped"       // Optional fulfillment step
  | "canceled"      // Removed or voided (prefer over "removed")
  | "failed";       // Print failure; may retry as new item
```

**Migration note:** DATA_MODEL currently defines `QueueItemStatus` as `pending | ready | printed | removed`. Plan to **rename and expand** when Phase 6 starts; map legacy `pending` → `queued`, `ready` → `queued` or `in_progress` per business rule.

### 5.5 Show queue status (unchanged)

`QueueStatus`: `draft | active | completed | archived` — describes the **batch**, not individual designs.

---

## 6. Relationship model

### 6.1 Reference pattern

```txt
showQueues/{queueId}
    └── showQueueItems/{itemId}
            designId  →  designs/{designId}
```

Rules:

* **Many items → one design** allowed.
* **Many items → one queue** allowed.
* Design document is **never** the source of production state.

### 6.2 Historical integrity when catalog metadata changes

When a design is added to a queue, **snapshot production-relevant fields** on the queue item:

| Snapshotted on item | Why |
| --- | --- |
| `printWidthInches`, `printHeightInches` | Staff may edit design print size later |
| `title` (optional) | Display on historical pick lists |
| `originalPath` (optional) | Audit which asset version was intended |
| `effectiveDpi` (optional) | Production QA record |

Do **not** rely on live `designs/{id}` fields for completed job audit. The design document remains the live catalog source; queue items preserve point-in-time intent.

### 6.3 Customer requests linkage

`CustomerRequest.approvedDesignId` → `designs/{id}` (already in DATA_MODEL).  
Approved requests may spawn queue items:

```txt
customerRequest (approved) → design (imported/ready) → showQueueItem (queued)
```

Request fulfillment tracks on **request status** (`fulfilled`) and **queue item status** (`printed`), not `design.status`.

### 6.4 Indexes (future)

Add when Phase 6 implements queries:

```txt
showQueueItems.queueId + position
showQueueItems.designId + status
showQueueItems.status + updatedAt
productionJobs.status + updatedAt   (if introduced)
```

---

## 7. Migration impact

### 7.1 Code impact summary

| Component | Impact |
| --- | --- |
| `designStatus.types.ts` | Remove `queued`, `printed` from enum |
| `designStatusDisplay.ts` | Remove cases |
| `firestore.rules` | Tighten `isValidDesignStatus` after data migration |
| `DesignLibraryPage` filters | Remove deprecated statuses |
| `designArchiveRestore` | Stop treating `queued`/`printed` as operational statuses |
| Import / AI / archive services | **No change** to current behavior |
| Phase 6 (future) | Must **not** write `design.status = queued` |

### 7.2 Data impact

| Question | Answer |
| --- | --- |
| Are `queued` / `printed` used in active Firestore data? | **Unlikely** — no writer exists. Verify with one-time query before rule tightening. |
| Should they remain temporarily for compatibility? | **Yes** — deprecate in types/docs first; keep rules accepting until migration window closes. |
| Deprecate now, remove later? | **Recommended** — mark deprecated in Phase 3D doc + TypeScript `@deprecated` aliases; remove in Phase 6 pre-work. |
| Should Firestore rules keep accepting them until migration? | **Yes** — rules should accept legacy values until documented cutover + optional one-field script. |

### 7.3 Suggested migration phases

| Step | When | Action |
| --- | --- | --- |
| M1 | Phase 3D (planning + doc) | This plan; update DATA_MODEL target state; `@deprecated` on `queued`/`printed` in types (optional comment-only until implementation) |
| M2 | Phase 3D Step 6 or pre-Phase 6 | Implement catalog approval service; remove production statuses from enum |
| M3 | Pre-Phase 6 deploy | Query `designs` where `status in ('queued','printed')`; migrate any rows to `ready` + create queue items if needed |
| M4 | Phase 6 start | Deploy tightened Firestore rules; queue services write only to `showQueueItems` |

### 7.4 Manual create default status debt

`designService.createDesign` defaults `status` to `"ready"` when omitted. Metadata-only creates (Phase 2C) bypass import and AI review. **Recommendation:** change default to `imported` when separation is implemented, or require explicit status on create.

---

## 8. UI impact (future structure)

| Page | Shows catalog status | Shows AI review status | Shows production status |
| --- | --- | --- | --- |
| **Imports** | `imported` on success | Pending (fallback) | — |
| **AI Review** (Phase 7) | `imported` / `rejected` | `pending`, `needs_review`, `approved`, `rejected` | — |
| **Design Library** | `imported`, `ready`, `rejected`, `archived` (+ `processing` badge) | Read-only in Details | `queueCount` badge optional (“In N queues”) |
| **Production Queue** (Phase 6) | Link to design; show catalog badge read-only | — | Per-item `ProductionItemStatus` |
| **Design Details** | Catalog badge | AI Review section (exists) | “Active queue placements” list (future) |

**Do not** show `queued` / `printed` on design cards after separation. Show production state on queue item rows instead.

Edit Design status dropdown (owner/admin): catalog values only.

---

## 9. Security impact

### 9.1 Current permissions (unchanged intent)

| Action | Owner | Admin | Helper |
| --- | --- | --- | --- |
| View designs / AI review fields | Yes | Yes | Yes |
| Approve / reject / override AI review | Yes | Yes | No |
| Archive / restore designs | Yes | Yes | Yes |
| Edit catalog status manually | Yes | Yes | No (`canEditDesignStatus`) |

### 9.2 Future production permissions (Phase 6+)

| Action | Recommended |
| --- | --- |
| Create queue / add items | Owner, admin, helper (`canManageQueues`) |
| Reorder / remove items | Owner, admin, helper |
| Mark item `in_progress` / `printed` | Owner, admin, helper (production floor) |
| Cancel item | Owner, admin; helper with policy TBD |
| Delete queue | Owner, admin |

Production mutations must **not** require `canEditDesignStatus`. Separate `canManageProductionQueue` / `canUpdateProductionItemStatus` keys when Phase 6 implements services.

### 9.3 Firestore rules (future)

* `designs` — staff read/write; validate catalog-only `status` after migration.
* `showQueueItems` — staff read/write; validate `ProductionItemStatus`.
* Customers — no direct queue access; future website reads approved design metadata only (`status == ready`).

---

## 10. Roadmap sequencing

### 10.1 Recommended timeline

| Phase | Work |
| --- | --- |
| **Phase 3D (now)** | **Planning** (this document). Optional Step 6: catalog approval coordinator (`aiReview approved` → `status: ready`). Deprecate `queued`/`printed` in types/docs. |
| **Phase 4** | Search/organization — filter on catalog `ready` only; no production status on designs |
| **Phase 6** | Implement `showQueues` + `showQueueItems` with `ProductionItemStatus`. **Must not** mutate `design.status` for queue placement. |
| **Phase 7** | AI Review UI + providers; use `designAiReviewService`; wire approval to catalog `ready` |
| **Phase 8** | Pensacola production — `productionJobs`, gang sheet export, optional `packed`/`shipped` |

### 10.2 Must this happen before AI Review implementation?

| Topic | Recommendation |
| --- | --- |
| AI review **data foundation** (Step 5) | **Already done** — separate `aiReviewStatus` |
| AI review **UI + providers** (Phase 7) | Can proceed; use current `DesignStatus` temporarily |
| AI approve → `ready` transition | Should use **catalog approval service** — implement in Phase 3D Step 6 **or** first Phase 7 sprint **before** production queue |
| Production queue (Phase 6) | **Must** use separated model — **do not** implement queue until `queued`/`printed` removed from design enum or explicitly deprecated with guardrails |

**Critical path:** Complete enum separation **before Phase 6 code**. AI review can overlap if approval wiring sets `ready` without using production statuses on the design document.

### 10.3 Phase 3D suggested steps (additive)

| Step | Scope |
| --- | --- |
| 3D-P (this plan) | Architecture decision document |
| 3D-6 | `catalogApprovalService`: coordinate `aiReviewStatus` + `DesignStatus`; deprecate design-level production statuses in types |
| 3D-7 | AI Review page shell (optional; may move to Phase 7) |

---

## 11. Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Phase 6 built on old model | **High** | Gate Phase 6 kickoff on enum migration; code review checklist |
| `QueueItemStatus.ready` naming collision | **Medium** | Rename to `ProductionItemStatus` before implementation |
| Legacy Firestore rows with `queued`/`printed` | **Low** | Pre-migration query; rules backward compatibility window |
| Manual create defaults to `ready` | **Medium** | Change default to `imported`; separate staff-only fast path |
| Staff confusion (two status columns) | **Medium** | Clear UI labels: “Catalog status” vs “Queue status” |
| Customer website exposes wrong designs | **High** | Query `status == ready` only; never use production item status for catalog browse |
| `queueCount` drift | **Medium** | Update via transactions or Cloud Function; periodic reconcile job |

---

## 12. Firestore impact summary

| Change | Deploy required? |
| --- | --- |
| Planning only (this step) | **No** |
| Add `showQueueItems` collection rules (Phase 6) | **Yes** |
| Tighten `isValidDesignStatus` (remove `queued`, `printed`) | **Yes** — after data migration |
| New indexes for queue queries | **Yes** — `firestore.indexes.json` |

Current rules already allow any valid design status including `queued` and `printed`. No change until migration M4.

---

## 13. Implementation checklist (future — not in scope now)

- [ ] Update `DesignStatus` type and `isValidDesignStatus`
- [ ] Update DATA_MODEL, WORKFLOWS, SECURITY, design-delete-archive-policy-plan
- [ ] Add `catalogApprovalService` coordinating AI + catalog status
- [ ] Migrate any legacy `queued`/`printed` design documents
- [ ] Rename `QueueItemStatus` → `ProductionItemStatus` in DATA_MODEL
- [ ] Implement `showQueueItemService` with snapshot-on-add
- [ ] Update Design Library filters and Details queue placements list
- [ ] Add production permissions to `permissionService`
- [ ] Deploy Firestore rules + indexes

---

## 14. Final recommendation

**Adopt a strict two-layer model:**

1. **`designs.status`** — catalog only: `imported`, `processing` (transient), `ready`, `rejected`, `archived`.
2. **`showQueueItems.status`** (and future production entities) — production workflow: `queued`, `in_progress`, `printed`, etc.

**Keep `aiReviewStatus` separate** and coordinate transitions through a future `catalogApprovalService` when AI or staff approves.

**Deprecate `queued` and `printed` on `DesignStatus` immediately in documentation and types** (implementation in Phase 3D Step 6). **Do not build Phase 6 queue features** until production state lives on queue items only.

This separation is **not a blocker** for Phase 7 AI provider work if approval wiring follows the coordination table in §4.3. It **is a blocker** for any feature that sets `design.status` to `queued` or `printed`.

**Next action:** Phase 6 must implement production status on `showQueueItems` only. AI Review UI should call `catalogApprovalService` for staff approve/reject.

### Phase 3D Step 6 implementation (complete)

| Item | Status |
| --- | --- |
| Deprecate `queued`/`printed` on designs | Done — read compatibility retained |
| UI filter/dropdown cleanup | Done |
| Block new writes to deprecated statuses | Done — `designService.validateWritableDesignStatus` |
| `catalogApprovalService` | Done — `approveDesignForCatalog`, `rejectDesignFromCatalog` |
| Import `aiReviewStatus: pending` | Done |
| Firestore rules | Comment only — legacy values still accepted |

---

## References

* `docs/DATA_MODEL.md` — Design, ShowQueue, ShowQueueItem
* `docs/WORKFLOWS.md` — Import, AI review foundation, Pensacola workflow
* `docs/ROADMAP.md` — Phases 4, 6, 7, 8
* `docs/SECURITY.md` — Design and AI review permissions
* `docs/plans/design-delete-archive-policy-plan.md` — Archive and lifecycle policy
* `src/renderer/src/features/designs/types/designStatus.types.ts`
* `src/renderer/src/features/designs/types/aiReview.types.ts`
* `src/renderer/src/features/designs/services/designAiReviewService.ts`
