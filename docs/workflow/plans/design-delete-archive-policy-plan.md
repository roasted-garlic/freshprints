# Design Delete and Archive Policy Plan

## Document status

| Field | Value |
| --- | --- |
| **Type** | Planning only — **no implementation** |
| **Prerequisite** | Phase 3C nearing signoff; `docs/plans/print-size-dpi-normalization-plan.md` created |
| **Parent context** | `docs/DATA_MODEL.md`, `docs/SECURITY.md`, `docs/WORKFLOWS.md`, `docs/plans/design-library-plan.md` |
| **Current implementation** | Soft archive with `previousStatus` / `archivedAt` / `archivedBy` (Phase 3D Step 1); restore returns to `previousStatus` with legacy fallback; **no permanent delete**; Firestore rules **deny hard delete** |
| **Out of scope** | Code, Firebase rules, Storage rules, UI, schema migrations |

**Goal:** Document a long-term policy for design **archive**, **restore**, **permanent delete**, **Storage retention**, **relationship safety**, **audit**, and **bulk actions** so future phases (queues, customer requests, AI, customer catalog) do not create broken references or unrecoverable data loss.

---

## 1. Executive summary

Fresh Prints today uses a **soft archive** model:

* `designService.archiveDesign` sets `status: "archived"` and captures `previousStatus`, `archivedAt`, `archivedBy` (all active staff)
* `designService.restoreDesign` restores `previousStatus` and clears archive metadata (legacy fallback: `imported`, or `ready` when `aiReviewed`)
* Storage assets (`/originals/`, `/thumbnails/`, `/previews/`) are **not** removed on archive
* Firestore **hard deletes are denied** in security rules (`docs/SECURITY.md`)
* Permanent delete is **not implemented** (`docs/WORKFLOWS.md`, Phase 2C signoff)

**Recommended policy direction:**

| Action | Default stance |
| --- | --- |
| **Archive** | Reversible soft-hide; all staff; Storage retained |
| **Restore** | Reversible; restore **previous operational status**; Storage unchanged |
| **Permanent delete** | **Owner-only**; requires archive first + relationship checks + typed confirmation; Storage cleanup after tombstone; **never** for designs with active production/order references |
| **Customer-facing history** | Never hard-delete designs referenced by fulfilled customer or production history — archive or preserve snapshots |

---

## 2. Design lifecycle definitions

### 2.1 Operational statuses (`DesignStatus`)

These describe **pipeline and production state**. They are stored in `design.status` while the design is active in the catalog.

| Status | Meaning | Typical entry | Customer-visible (future) |
| --- | --- | --- | --- |
| `imported` | Original in Storage; Firestore record exists; derivatives may or may not be complete | Import pipeline (Phase 3A–3C) | **No** |
| `processing` | Short-lived; derivative upload or future AI/queue work in flight | `markDesignProcessing`, future AI | **No** |
| `ready` | Staff- or AI-approved for catalog/production use (post-review) | Future `markDesignReady` after AI | **Yes** (when published) |
| `rejected` | Failed review or quality gate; retained for audit | Future AI / manual review | **No** |
| `queued` | Assigned to an active show/production queue | Phase 6 queue add | **No** (internal) |
| `printed` | Completed production run (terminal operational state) | Phase 6 queue completion | **Optional** (history) |
| `archived` | **Soft-hidden** from default library browse; record and Storage retained | Staff archive action | **No** |

**`archived` is both an operational terminal state and a visibility gate.** It is not the same as permanent delete.

### 2.2 Non-status lifecycle concepts

| Concept | Definition | Stored as |
| --- | --- | --- |
| **Draft** | Not used in Phase 3C. Optional future pre-import workspace record. | Defer — not in current `DesignStatus` enum |
| **Deleted (permanent)** | Irreversible removal of catalog record from active `designs` collection; minimal tombstone retained | `designTombstones/{id}` or tombstone fields (future) |
| **Tombstone** | Minimal audit record after hard delete | Separate collection (recommended) |

### 2.3 Lifecycle diagram (target state)

```txt
Import / create
    ↓
imported ──→ processing ──→ ready ──→ queued ──→ printed
    │              │           │          │
    │              └── rejected  │          │
    │                          │          │
    └──────────────────────────┴──────────┴──→ archived (soft-hide, reversible)
                                                    │
                                                    ↓ (owner-only, gated)
                                              permanent delete
                                                    ↓
                                              tombstone + Storage cleanup
```

### 2.4 Known current debt (to fix in implementation)

| Issue | Current behavior | Target behavior |
| --- | --- | --- |
| Restore status | Restores `previousStatus` (Phase 3D Step 1) | Restore `previousStatusBeforeArchive` |
| Archive copy in UI | References “default ready filter” | Update to default **non-archived** filters |
| `queueCount` enforcement | Field exists; not enforced on archive | Block or warn when `queueCount > 0` (Phase 6) |

---

## 3. Archive policy

### 3.1 Purpose

Archive removes a design from **normal staff browsing** without destroying assets, metadata, or historical referential integrity.

### 3.2 Who can archive

| Role | Archive designs | Rationale |
| --- | --- | --- |
| `owner` | Yes | Full catalog control |
| `admin` | Yes | Operations lead |
| `helper` | Yes | **Keep current policy** — helpers organize library daily; archive is reversible |

Matches `permissionService.canArchiveDesigns` (all active staff) and `docs/SECURITY.md`.

### 3.3 Who can restore

| Role | Restore designs | Rationale |
| --- | --- | --- |
| `owner` | Yes | |
| `admin` | Yes | |
| `helper` | Yes | **Keep current policy** — symmetric with archive; restore is low risk |

**Recommendation:** Restore permission stays aligned with `canEditDesigns` (all staff). Permanent delete is where owner-only restriction applies.

### 3.4 Reversibility

| Question | Recommendation |
| --- | --- |
| Should archive be reversible? | **Yes** — required for mistaken archives and seasonal catalog management |
| Cooling period before delete? | **Yes** — require `archived` for ≥ 7 days before permanent delete (configurable constant) |
| Restore to which status? | **Previous operational status** captured at archive time (`previousStatus` field) |

Proposed fields on archive:

```txt
previousStatus: DesignStatus   // captured when entering archived
archivedAt: Timestamp
archivedBy: string
```

### 3.5 Search and browse behavior

| Surface | Archived designs |
| --- | --- |
| Default Design Library filters | **Hidden** (exclude `archived` unless filter selected) |
| Status filter = Archived | **Visible** |
| Client-side search | **Include** when Archived filter active; exclude otherwise |
| Future Firestore text search | Same rule — default queries exclude `archived` |
| Direct link / ID lookup | **Allowed** for staff (detail by ID for support) |
| Customer website | **Never** visible |

### 3.6 Archive workflow (target)

```txt
Staff opens Design Details
    ↓
Archive → confirm dialog (existing)
    ↓
designRelationshipService.assertCanArchive(designId)
    ↓ (block or warn if active references)
designService.archiveDesign:
  previousStatus = design.status
  status = "archived"
  archivedAt, archivedBy, updatedAt, updatedBy
    ↓
auditLogService.record("design.archived", ...)
    ↓
No Storage changes
```

### 3.7 Archive confirmation (current + recommended)

| Requirement | Current | Recommended |
| --- | --- | --- |
| Confirm dialog | Yes | Keep |
| Show blocking references | No | **Yes** when Phase 6+ relationships exist |
| Typed confirmation | No | **No** for archive (reversible) |

---

## 4. Permanent delete policy

### 4.1 Should permanent delete exist?

**Yes — but narrowly scoped.**

Rationale:

* GDPR/right-to-erasure and mistaken imports may eventually require removal
* Storage costs accrue for abandoned assets
* Soft archive alone does not free Storage

Rationale for restriction:

* Production history, customer requests, and queue records must not dangle
* Accidental delete is catastrophic

### 4.2 Who may permanently delete

| Role | Permanent delete |
| --- | --- |
| `owner` | **Yes** |
| `admin` | **No** (recommend) — or optional admin with owner approval workflow in distant future |
| `helper` | **No** |

**Recommendation:** **Owner-only** for permanent delete. Admins may archive; only owners purge.

New permission: `permissionService.canPermanentlyDeleteDesigns(user)` → `isOwner(user)`.

### 4.3 Preconditions (recommended)

All must pass before permanent delete:

1. Design `status === "archived"`
2. `archivedAt` at least **7 days** ago (`MIN_ARCHIVE_DAYS_BEFORE_DELETE`)
3. `designRelationshipService.assertCanDelete(designId)` — no blocking references (Section 5)
4. Owner confirms via **typed confirmation** — user types `DELETE` or the design ID
5. Optional second owner password re-auth — defer unless compliance requires

### 4.4 Delete workflow (target)

```txt
Owner opens archived design
    ↓
Permanent delete (owner-only action)
    ↓
Show relationship summary + Storage paths + irreversibility warning
    ↓
Typed confirmation: DELETE
    ↓
designRelationshipService.assertCanDelete(designId)  // hard block
    ↓
designTombstoneService.createFromDesign(design)      // minimal record
    ↓
designService.deleteDesignRecord(designId)           // remove from designs collection
    ↓
storageCleanupService.deleteDesignAssets(designId)   // async best-effort
    ↓
auditLogService.record("design.deleted", ...)
```

### 4.5 What permanent delete is NOT

* Not available from default browse
* Not available for non-archived designs
* Not available when blocking relationships exist
* Not a substitute for archive
* Not exposed to helpers or customers

---

## 5. Relationship safety matrix

Future features must declare how they reference `designs/{designId}` and which delete/archive policy applies.

### 5.1 Reference types

| Relationship | Collection / field | Phase | On archive | On permanent delete |
| --- | --- | --- | --- | --- |
| **Active show queue item** | `showQueueItems.designId` | 6 | **Block** archive if item `pending`/`ready` | **Block** delete |
| **Historical queue item** | `showQueueItems` (printed/removed) | 6 | Allow archive | **Block** delete — preserve record |
| **Design `queueCount`** | `designs.queueCount` | 6 | Block if `> 0` | Block if `> 0` |
| **Customer request (open)** | `customerRequests.approvedDesignId` | 5+ | Warn | **Block** delete |
| **Customer request (fulfilled)** | `customerRequests.approvedDesignId` | 5+ | Allow archive | **Block** delete |
| **AI review record** | Future `designAiReviews/{id}` | 7 | Allow archive | **Block** delete if review linked to production |
| **AI metadata** | On-design or subcollection | 7 | Archive with design | Delete with tombstone snapshot |
| **Order / production history** | Future `orders`, `productionRuns` | Later | Allow archive | **Block** delete — **snapshot required** |
| **Customer catalog / favorites** | Future customer-facing | 6+ | Hide when archived | Remove from catalog; history uses snapshot |
| **Licensing / ownership** | Future | Later | Allow archive | **Block** delete if license active |
| **Audit logs** | `auditLogs.entityId` | 1+ | N/A | **Preserve** logs (entity may be tombstone) |
| **Category assignment** | `design.categoryId` | 2 | Allow archive | Delete does not delete category |
| **Import provenance** | `uploadedBy`, paths | 3 | Allow archive | Tombstone retains provenance summary |

### 5.2 Recommended enforcement layer

```txt
designRelationshipService (renderer)
  assertCanArchive(designId)
  assertCanDelete(designId)
  listBlockingReferences(designId)
```

* Called by `designService` before archive/delete mutations
* Returns structured blockers for UI (`ArchiveDesignConfirmDialog`, future delete dialog)
* Queue phase increments `queueCount` denormalized field for fast checks (`docs/plans/design-library-plan.md`)

### 5.3 Strategy per pattern

| Pattern | When to use |
| --- | --- |
| **Block** | Active production, open requests, active queue items |
| **Soft delete (archive)** | Default staff action — design hidden, references intact |
| **Preserve record** | Historical transactions always point to stable `designId` |
| **Snapshot** | Customer-facing history displays denormalized title/thumbnail at time of order — immune to later archive |
| **Tombstone** | After owner hard delete — `designTombstones` retains id, title, deletedAt, deletedBy |

### 5.4 Customer request linkage

`CustomerRequest.approvedDesignId` links a fulfilled request to a catalog design.

| Scenario | Policy |
| --- | --- |
| Request in progress | Do not archive design without staff override warning |
| Request fulfilled | Archive allowed; delete **blocked** |
| Request-only image (`uploadedImagePath`) | Independent of design delete — separate retention policy |

---

## 6. Storage cleanup policy

### 6.1 Assets per design

| Path | Format | Purpose |
| --- | --- | --- |
| `/originals/{designId}.png` | PNG | Source production file |
| `/thumbnails/{designId}.webp` | WebP | Library grid |
| `/previews/{designId}.webp` | WebP | Detail / lightbox |

### 6.2 By lifecycle action

| Action | Original PNG | Thumbnail | Preview | Timing |
| --- | --- | --- | --- | --- |
| **Archive** | Retain | Retain | Retain | No Storage I/O |
| **Restore** | Retain | Retain | Retain | No Storage I/O |
| **Permanent delete** | Delete | Delete | Delete | **After** tombstone write; best-effort async |
| **Import rollback** (existing) | Delete on Firestore create failure | N/A | N/A | Immediate best-effort (Phase 3A) |
| **Derivative pipeline failure** (existing) | Retain original | Delete partial derivatives | Delete partial derivatives | Best-effort (Phase 3C) |

### 6.3 Storage cleanup service (future)

`storageCleanupService.deleteDesignAssets(designId)`:

* Uses existing `designDerivativeStorageService.deleteDesignDerivatives` + original delete helper
* Returns per-path outcomes (pattern from `DerivativeDeleteOutcome`)
* Failures logged; tombstone records `storageCleanupStatus: "partial" | "complete" | "failed"`
* **No renderer direct Storage calls from components** — service layer only

### 6.4 Orphan prevention

| Risk | Mitigation |
| --- | --- |
| Firestore deleted but Storage remains | Retry cleanup job; tombstone `storageCleanupStatus` |
| Storage deleted but Firestore remains | Delete order: tombstone → Firestore remove → Storage |
| Archived design Storage cost | Acceptable; purge only via owner permanent delete |

### 6.5 Customer Storage access

Archived and deleted designs must not be readable on customer Storage rules. Staff-only paths unchanged until customer CDN policy (Phase 6+).

---

## 7. Bulk actions

### 7.1 Recommendations summary

| Action | Owner | Admin | Helper | Max batch | Confirmation |
| --- | --- | --- | --- | --- | --- |
| **Bulk archive** | Yes | Yes | Yes | 50 | Standard confirm + per-item blocker summary |
| **Bulk restore** | Yes | Yes | Yes | 50 | Standard confirm |
| **Bulk permanent delete** | Yes | No | No | **10** | Typed `DELETE` + per-item relationship check |

### 7.2 Bulk archive

* Select from Design Library grid (future UI)
* Skip items with blockers; report partial success (pattern from batch import)
* No Storage changes
* Each success writes audit log entry

### 7.3 Bulk restore

* Only designs with `status: archived`
* Restore each to `previousStatus`
* Failures do not roll back siblings (report partial success)

### 7.4 Bulk permanent delete

* **Owner-only**
* **Defer to Phase 6+** implementation — after relationship service exists
* Stricter batch cap (10) than archive
* Require typed confirmation once per batch, not per item
* All items must pass `assertCanDelete` before any delete begins (all-or-nothing recommended for delete)

### 7.5 Safety limits

| Constant | Proposed value |
| --- | --- |
| `MAX_BULK_ARCHIVE_COUNT` | 50 |
| `MAX_BULK_RESTORE_COUNT` | 50 |
| `MAX_BULK_DELETE_COUNT` | 10 |
| `BULK_ACTION_RATE_LIMIT` | Per-user cooldown 30s (optional) |

---

## 8. Audit requirements

### 8.1 Audit log collection

Use existing `auditLogs` schema (`docs/DATA_MODEL.md`):

```ts
{
  action: "design.archived" | "design.restored" | "design.deleted" | ...
  entityType: "design"
  entityId: designId
  metadata: { title, previousStatus, ... }
}
```

### 8.2 Events to record

| Event | Actor | Metadata (minimum) |
| --- | --- | --- |
| `design.archived` | Staff uid | `title`, `previousStatus`, `designId` |
| `design.restored` | Staff uid | `title`, `restoredStatus`, `designId` |
| `design.deleted` | Owner uid | `title`, `designId`, `storageCleanupStatus` |
| `design.bulk_archived` | Staff uid | `count`, `designIds[]` (or count only if large) |

### 8.3 Tombstone record (hard delete)

**Recommendation:** Separate collection `designTombstones/{designId}`:

| Field | Purpose |
| --- | --- |
| `id` | Same as former design ID |
| `title` | Human-readable audit |
| `deletedAt`, `deletedBy` | Accountability |
| `archivedAt`, `archivedBy` | Chain of custody |
| `previousStatus` | Last operational status |
| `originalPath`, `thumbnailPath`, `previewPath` | Storage audit (paths only) |
| `storageCleanupStatus` | `pending` \| `complete` \| `partial` \| `failed` |
| `blockingReferencesSnapshot` | Optional JSON at delete time |

**Do not** retain full design document or customer PII beyond what compliance requires.

### 8.4 What survives hard delete

| Survives | Does not survive |
| --- | --- |
| `auditLogs` entries | Active `designs/{id}` document |
| `designTombstones/{id}` | Storage assets (after cleanup) |
| Historical `showQueueItems` with `designId` | Customer catalog listing |
| Order snapshots (future) with denormalized title | Helper browse by default |

---

## 9. Future customer impact

### 9.1 Customer-facing catalog (Phase 6+)

| Design state | Customer catalog |
| --- | --- |
| `ready` (published) | Visible per publish rules |
| `imported`, `processing`, `rejected` | Hidden |
| `queued`, `printed` | Hidden or history-only per product decision |
| `archived` | **Hidden immediately** on archive |
| Permanently deleted | **Never visible**; historical orders use **snapshot** |

### 9.2 Safest long-term approach

1. **Never hard-delete** designs referenced by customer orders, fulfilled requests, or production history.
2. **Denormalize** `title`, `thumbnailPath` (or public URL), and `printSize` onto order/queue snapshots at transaction time.
3. **Archive** instead of delete for catalog delisting.
4. **Owner permanent delete** only for mistakes, test data, and designs with no blocking references after cooling period.
5. Customer favorites/bookmarks should reference `designId` but gracefully show “no longer available” if archived — not 404 from missing doc.

### 9.3 Published vs ready

Future distinction (document now, implement later):

| Term | Meaning |
| --- | --- |
| `ready` | Internal approval (AI + staff) |
| `published` / `customerVisible` | Explicit flag or sub-status for website |

Archive should clear customer visibility even if status were `ready`.

---

## 10. Security review — role permission matrix

### 10.1 Target matrix

| Permission | Owner | Admin | Helper | Customer |
| --- | --- | --- | --- | --- |
| View designs | Yes | Yes | Yes | Ready/published only (future) |
| Edit metadata | Yes | Yes | Yes | No |
| Edit status | Yes | Yes | No | No |
| Archive | Yes | Yes | Yes | No |
| Restore | Yes | Yes | Yes | No |
| Permanent delete | **Yes** | No | No | No |
| Bulk archive | Yes | Yes | Yes | No |
| Bulk delete | **Yes** | No | No | No |
| View tombstones | Yes | Yes | No | No |

Aligns with `docs/SECURITY.md` staff model; extends with owner-only delete.

### 10.2 Firestore rules (future implementation note)

| Rule | Policy |
| --- | --- |
| Hard delete `designs/{id}` | Deny client delete; use Cloud Function or privileged owner callable for tombstone path **or** soft-delete flag only |
| `designTombstones` | Owner/admin read; owner write via Function |
| Storage delete | Staff today; restrict permanent delete path to owner-verified operation |

**Planning note:** Current rules deny all hard deletes — implementation must add a **controlled** delete path (likely Cloud Function with Admin SDK) rather than widening client `delete` in rules.

### 10.3 Service-layer authority

* UI permissions are not sufficient — `designService` enforces role checks
* Relationship checks run server-side in service (renderer) today; consider Cloud Function for delete when customer website launches

---

## 11. Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Restore sets wrong status | **Resolved** (Phase 3D Step 1) | `previousStatus` field; legacy fallback documented |
| Helper archives production-critical design | Medium | Phase 6 blocker when `queueCount > 0`; audit log |
| Owner deletes design with order history | **High** | Relationship blocks; snapshots on orders |
| Storage orphan after delete | Medium | Tombstone cleanup status + retry job |
| Customer 404 on archived favorite | Medium | “Unavailable” UI; not hard delete |
| Bulk delete partial failure | High | All-or-nothing transaction for delete batch |
| Firestore client delete widens attack surface | **High** | Owner delete via Function; keep rules deny |
| Audit log PII retention | Low | Document retention policy per compliance |
| Archived design still in Storage costs | Low | Owner purge policy; monitoring |

---

## 12. Testing requirements

### 12.1 Archive / restore

- [ ] Staff archives design → `status: archived`, `previousStatus` saved
- [ ] Default library filter hides archived design
- [ ] Archived filter shows design
- [ ] Restore returns to `previousStatus` (not always `ready`)
- [ ] Storage objects unchanged after archive and restore
- [ ] Helper can archive and restore
- [ ] Audit log entry written

### 12.2 Relationship blocks (when Phase 6+ exists)

- [ ] Archive blocked when `queueCount > 0`
- [ ] Delete blocked when active queue item exists
- [ ] Delete blocked when fulfilled `customerRequests.approvedDesignId` references design
- [ ] UI shows blocker list in confirm dialog

### 12.3 Permanent delete (when implemented)

- [ ] Non-owner cannot delete
- [ ] Non-archived design cannot delete
- [ ] Design archived < 7 days cannot delete
- [ ] Typed confirmation required
- [ ] Tombstone created before Firestore doc removed
- [ ] Storage cleanup runs best-effort
- [ ] Partial Storage failure recorded on tombstone
- [ ] `auditLogs` retains delete event

### 12.4 Bulk actions

- [ ] Bulk archive respects per-item blockers and reports partial success
- [ ] Bulk delete owner-only; enforces batch cap
- [ ] Bulk delete all-or-nothing when any blocker present (if policy confirmed)

### 12.5 Regression

- [ ] Import pipeline unaffected
- [ ] Design Library thumbnails load for archived when filtered
- [ ] Firestore rules still deny unauthorized hard delete

### 12.6 Security

- [ ] Helper cannot permanent delete (UI + service + rules/Function)
- [ ] Customer cannot read archived designs (future rules test)

---

## 13. Implementation sequencing recommendation

### 13.1 Placement overview

| Work package | Recommended phase | Justification |
| --- | --- | --- |
| **This policy document** | Post–3C planning | Establishes rules before 3D/4/6 |
| **Restore `previousStatus` fix** | **Done** (Phase 3D Step 1) | Low risk; fixes known debt; no delete |
| **Print size / DPI normalization** | **Phase 3D** (primary) | Already planned; orthogonal to delete |
| **Audit log writes for archive/restore** | **Phase 4** | Search/organization phase; audit infrastructure maturity |
| **Relationship service + archive blocks** | **Phase 6** (queue) | `queueCount`, `showQueueItems` go live |
| **Customer request delete blocks** | **Phase 5/6** (requests) | When `approvedDesignId` is written |
| **Permanent delete + tombstones + Storage cleanup** | **Phase 6 late or Phase 7** | Requires relationships + owner Function |
| **Bulk archive/restore** | **Phase 4 or 6** | After single-item flows stable |
| **Bulk permanent delete** | **Phase 7+** | Owner-only; highest risk |

### 13.2 Phase 3D (immediate next)

* Implement print size plan (`docs/plans/print-size-dpi-normalization-plan.md`)
* **Done (Phase 3D Step 1):** `previousStatus` / `archivedAt` / `archivedBy` on archive; `restoreDesign` restores prior status
* **Do not** implement permanent delete in 3D

### 13.3 Phase 4 (search and organization)

* `auditLogService` integration for design mutations
* Bulk archive/restore UI (if prioritized)
* Design Library filters documented for archived browse

### 13.4 Phase 6 (queue + customer)

* `designRelationshipService` with queue and request checks
* Block archive when design active in queue
* Order/queue snapshots with denormalized design fields
* Customer catalog hides archived designs

### 13.5 Phase 7+ (AI + hardened delete)

* AI review records as delete blockers where appropriate
* Owner permanent delete via Cloud Function
* `designTombstones` collection
* `storageCleanupService` with retry
* Bulk owner delete (strict caps)

### 13.6 Why not permanent delete in Phase 3D

* No relationship service yet — delete would be unsafe
* Phase 3C just stabilized import assets — premature Storage purge risk
* Owner-only delete requires Function/rules design not present today

---

## 14. Documentation updates (at implementation time)

| Document | Updates |
| --- | --- |
| `docs/DATA_MODEL.md` | `previousStatus`, tombstone collection, delete vs archive |
| `docs/WORKFLOWS.md` | Archive/delete workflows; restore behavior |
| `docs/SECURITY.md` | Owner delete; tombstone access |
| `docs/FIREBASE.md` | Storage cleanup; Function delete path |
| `docs/ROADMAP.md` | Phase milestones for delete policy |
| `docs/plans/phase-3c-implementation-plan.md` | Cross-reference this policy |
| `docs/plans/print-size-dpi-normalization-plan.md` | Note orthogonal scope |

---

## 15. Open decisions for stakeholder signoff

| # | Question | Recommendation |
| --- | --- | --- |
| 1 | Helpers can archive? | **Yes** (keep current) |
| 2 | Permanent delete owner-only? | **Yes** |
| 3 | Admin ever delete? | **No** (initially) |
| 4 | Archive before delete? | **Yes** + 7-day minimum |
| 5 | Typed confirmation for delete? | **Yes** — type `DELETE` |
| 6 | Tombstone collection separate? | **Yes** — `designTombstones` |
| 7 | Delete via Cloud Function? | **Yes** when implemented |
| 8 | Bulk delete all-or-nothing? | **Yes** |
| 9 | Archive block when `queueCount > 0`? | **Yes** (Phase 6) |
| 10 | Fulfilled request blocks delete? | **Yes** — archive only |

---

## 16. Completion criteria (planning)

This planning artifact is complete when:

- [x] Lifecycle statuses defined
- [x] Archive and restore policy recommended
- [x] Permanent delete policy evaluated
- [x] Relationship safety matrix documented
- [x] Storage cleanup rules defined
- [x] Bulk action recommendations provided
- [x] Audit and tombstone strategy defined
- [x] Customer impact addressed
- [x] Security role matrix provided
- [x] Implementation sequencing justified
- [x] Risks and testing requirements listed

**No code, schema, Firebase, or UI changes are part of this document.**

---

*References: `docs/AI_RULES.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/FIREBASE.md`, `docs/SECURITY.md`, `docs/WORKFLOWS.md`, `docs/ROADMAP.md`, `docs/plans/design-library-plan.md`, `docs/plans/print-size-dpi-normalization-plan.md`, `docs/reviews/phase-2c-signoff.md`, `src/renderer/src/features/designs/services/designService.ts`*
