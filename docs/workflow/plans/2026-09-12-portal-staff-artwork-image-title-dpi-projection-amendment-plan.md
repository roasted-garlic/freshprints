# Plan Amendment — Restore Staff Artwork image, title, and DPI via projection

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Author | Planning Agent |
| Status | **ready_for_review** |
| Workflow | managed-phase Plan Amendment |
| Goal | `portal-staff-artwork-neutral-projection-corrective` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Supersedes | Prior owner-accepted **neutral no-image/no-title/no-DPI** Portal Staff Artwork contract |
| Related | Base plan `docs/workflow/plans/2026-09-12-portal-staff-artwork-neutral-projection-corrective-plan.md`; population amendment; visibility mapper corrective |
| Environment | Design for `fresh-prints-dev` first; production untouched this turn |

---

## Goal

Restore the useful previous Portal Staff Artwork request-card experience (preview image, actual artwork title, DPI quality feedback, size/quantity editing) while **keeping** the server-maintained `portalPrintRequestItems` projection as the deliberate customer boundary.

Do **not** restore broad Portal `getDoc(staffArtworks/{id})` or unrestricted customer reads of the Staff Artwork library. Expand the strict projection allowlist and the Admin synchronizer so customers receive only the owner-approved customer-visible fields.

---

## Background

Owner product decision (2026-09-12):

> `OWNER DECISION: RESTORE STAFF ARTWORK IMAGE + TITLE + DPI IN PORTAL — START PLAN AMENDMENT`

The earlier neutral placeholder (`Staff-added`, blank preview, no DPI) was intentional under the prior privacy contract. The owner now supersedes that UX contract. The projection architecture remains required: Firestore cannot field-mask canonical `printRequestItems`, and reopening full `staffArtworks` client reads would reintroduce Outcome B.

Owner-approved customer-visible Staff Artwork information:

- preview image
- title
- effective DPI / sizing quality bands
- requested size, quantity, normal request-item state
- `staffArtworkId` if technically useful (not sensitive; do not display raw ID without UX need)

Remain internal unless required: Studio customer-association extras, notes, archive/AI-review/audit metadata, production originals, unrelated enhancement internals.

---

## Scope

### In Scope

1. Expand shared `PortalPrintRequestItem` + `projectPortalPrintRequestItem` allowlist for `staff_artwork`.
2. Enrich projection writes in `onPrintRequestItemPortalProjectionWritten` by Admin-reading `staffArtworks` (never from Portal).
3. Optionally refresh projections when a Staff Artwork document changes while attached (bounded Admin query).
4. Narrow Storage Rules for customer-readable **preview/thumbnail only** (not production originals).
5. Keep Firestore customer deny on `staffArtworks` collection documents.
6. Restore Portal card / drawer / Queue-to-Show title + preview + DPI UX for Staff Artwork.
7. Preserve the mapper visibility fix: Staff Artwork does **not** require `designId`.
8. Update population script to the same enrichment mapper contract; document DRY RUN → UPDATE classification; **no APPLY this turn**.
9. Focused tests + Owner DEV QA checklist amendment.

### Out of Scope

- Restoring Portal direct `staffArtworks` document reads
- Customer access to production originals / interactive production derivatives
- Broad `/staff-artwork/...` read of all object types
- Studio library, allocations, exports, gang sheets, AI Review promotion changes
- Assisted Creation / customer-upload retention / maintenance changes
- Production deploy, Signoff, commit/push/freeze
- DEV population APPLY (separate owner checkpoint after Implement → Test)
- Mandatory restore of interactive Upscale UI for Staff Artwork in this amendment (see Open Questions); baseline DPI from projected pixels is in scope

---

## Affected Areas

### Files / Modules (expected)

| Area | Paths |
|---|---|
| Shared types/mapper | `packages/shared/src/types/portal/portalPrintRequestItem.types.ts`, `packages/shared/src/utils/portalPrintRequestItemProjection.ts` (+ tests) |
| Synchronizer | `functions/src/onPrintRequestItemPortalProjectionWritten.ts` (+ contract tests); possible new refresh helper/trigger for `staffArtworks` writes |
| Population script | `functions/scripts/backfill-portal-print-request-items-dev.ts` (+ tests) — enrichment + allow Admin **read** of `staffArtworks` for projection only |
| Portal service/UI | `portalPrintRequestService.ts` (`mapPrintRequestItem`), `PortalPrintRequestItemCard.tsx`, `CurrentRequestDrawer.tsx`, `PortalQueueToShowModal.tsx`, detail preview resolvers |
| Rules | `storage.rules` (narrow preview/thumb); `firestore.rules` only if projection field docs need comment/ADR — keep `staffArtworks` customer deny |
| Docs | `DATA_MODEL.md`, Owner QA checklist, this amendment’s review |

### Architecture Impact

- [x] Details: Keep layered flow:

```text
printRequestItems (canonical)
  → Admin synchronizer (+ Admin staffArtworks enrichment)
  → portalPrintRequestItems (customer-readable allowlist)
  → Portal UI
```

Portal must not call `getDoc(staffArtworks/...)`.

### Security Impact

- [x] Details: Customer-visible surface grows by intentional allowlisted fields. `staffArtworks` documents stay staff-only. Storage opens **only** `preview.webp` / `thumbnail.webp` for authenticated customers; production objects stay staff-only. Residual risk: any customer who learns a `staffArtworkId` could download that preview/thumb if Storage is path-authenticated rather than ownership-checked. Acceptable under owner guidance that preview + ID are customer-facing; document in Risk Register note. Tighter alternative (signed URL callable) is reserved if Formal Review demands ownership-checked URLs.

### Data Model Impact

- [x] Details: Expand `portalPrintRequestItems` projected fields for `staff_artwork` (below). No new collection. Canonical `printRequestItems` / `staffArtworks` schemas unchanged.

### Backend Impact

- [x] Details: Projection trigger enrichment; population script enrichment; `updatePortalStaffArtworkPrintRequestItemSize` remains Admin private re-read (no required API change). Possible additive `staffArtworks` write → reproject attached items.

### UI / UX Impact

- [x] Details: Staff Artwork cards regain preview, title, DPI bands, Standard Sizes where already wired for pixel-based sizing; drawer/queue show title (and drawer preview). Badge may remain `STAFF-ADDED` / `sourceLabel` while title shows artwork title.

### Migration Impact

- [x] Forward: After Implement → Test, DEV dry-run of population script; Staff Artwork rows → `UPDATE`; catalog/upload unchanged or already-correct. APPLY only after new owner checkpoint.
- [x] Rollback: Revert mapper/UI/Rules; optional reverse APPLY to strip fields (separate authorization).

---

## Exact recommended customer-safe projection fields

### Shared / already present (unchanged semantics)

`id`, `printRequestId`, `sourceType`, `quantity`, `printWidthInches`, `printHeightInches`, `sizeLabel`, `standardSizePresetKey`, `sortOrder`, `status`, `addedBy`, `createdAt`, `updatedAt`

### Staff Artwork — add / restore on projection

| Field | Source at projection time | Purpose |
|---|---|---|
| `sourceLabel` | Constant `"Staff-added"` | Source pill / badge only |
| `titleSnapshot` | Prefer live `staffArtworks.title`; else canonical `titleSnapshot` | Customer-facing artwork title |
| `staffArtworkId` | Canonical item | Source identity; Storage path binding; not shown raw in UI |
| `previewStoragePath` | Live `staffArtworks.previewStoragePath` | Preview via existing client `getDownloadURL` pattern |
| `thumbnailStoragePath` | Live `staffArtworks.thumbnailStoragePath` | Fallback thumb |
| `widthPx` | `staffArtworks.processing.widthPx` | Live effective DPI with requested size |
| `heightPx` | `staffArtworks.processing.heightPx` | Live effective DPI with requested size |
| `artworkBackgroundHex` | Optional from staff artwork if present | Mat parity with prior card; omit if absent |

### Explicitly still excluded from projection

- `notes`, archive flags, AI Review / promote metadata
- Studio-only customer association extras beyond what catalog/upload already expose
- `productionStoragePath`, interactive production paths, enhancement derivative paths/dims
- Raw `processing` object, stored library `effectiveDpi` as authority (UI computes from pixels × size)
- Unrelated audit fields

### Answers to investigation questions

1. **Image access:** Prefer **projected Storage paths + narrowly scoped Storage Rules** for `preview.webp` / `thumbnail.webp` only, matching catalog/upload `getDownloadURL` UX. Do **not** open production originals. Signed-URL callable is the fallback if ownership-bound URLs are required.
2. **Pixel dimensions:** **Yes — project `widthPx`/`heightPx`.** Owner does not treat them as sensitive; this is the cleanest match to existing `assessPrintRequestItemSize` card logic.
3. **`staffArtworkId`:** **Include on projection.** Technically helpful for path identity and future ownership checks; do not render as the card title.
4. **Trusted sizing callable:** **No required change.** Continues Admin re-read of private Staff Artwork for authoritative save validation.
5. **Existing ~110 DEV projections:** Staff Artwork subset → **UPDATE** after schema change; full page dry-run expected mostly `ALREADY_CORRECT` for non-staff rows + `UPDATE` for staff rows (and any missing enrichment). Dataset may be >110 now; use live dry-run counts.
6. **Rules/Storage:** Firestore keep customer deny on `staffArtworks`. Storage allow customer read of preview/thumb only.
7. **Portal UI:** Restore title/preview/DPI paths; keep `designId` not required for staff.
8. **Mapper/synchronizer:** Shared allowlist + Admin enrichment.
9. **Population script:** Must enrich identically; may Admin-read `staffArtworks`; still no canonical/staff writes except `portalPrintRequestItems` on APPLY.
10. **Tests:** Projection privacy allowlist tests rewritten for new allowlist; UI/source contracts; Rules/Storage suites; population classification UPDATE; no regression of catalog/upload/designId fix.

---

## Approach

1. **Types + mapper** — Extend `PortalPrintRequestItem`; for `staff_artwork`, project the allowlisted fields above; keep catalog/upload branches unchanged; retain `sourceLabel` for badge.
2. **Enrichment helper** — Pure or Functions-local helper: given canonical item + optional `staffArtworks` doc, build mapper input or projection. Fail soft: if Staff Artwork missing/not ready, keep request row with fallback title `Staff-added` and no preview/pixels rather than dropping the item (preserve visibility fix).
3. **Synchronizer** — On `printRequestItems` write: Admin get `staffArtworks/{staffArtworkId}` when present; set projection. On delete: delete projection (unchanged).
4. **Staff Artwork refresh (recommended in-scope)** — On `staffArtworks` write for ready artworks, Admin query `printRequestItems` where `staffArtworkId == id` (existing/field index as required), reproject each. Keeps title/preview/DPI fresh without Portal private reads.
5. **Storage Rules** — For `/staff-artwork/{id}/{fileName}`: `allow read` if staff **OR** (signed-in customer **and** `fileName` in `preview.webp`|`thumbnail.webp`). Deny all other customer reads under that prefix.
6. **Portal mapping/UI** — `mapPrintRequestItem` accepts staff fields; card uses `titleSnapshot` for title, paths for `useCatalogDerivativeUrl` / equivalent, `widthPx`/`heightPx` for `assessPrintRequestItemSize`; drawer/queue use title (+ drawer preview). Do not show raw `staffArtworkId` as title.
7. **Population script** — Same enrichment; update tests that previously forbade any `staffArtworks` read to allow **Admin enrichment read only**; still forbid Storage reads and staff writes.
8. **DEV sequence (after owner accepts Implement)** — Focused tests → deploy Functions (synchronizer ± refresh) → deploy Storage Rules (and Firestore only if changed) → **DRY RUN** population → stop for APPLY authorization → APPLY → VERIFY → Owner DEV QA.

---

## Image delivery architecture (locked preference)

```text
staffArtworks.previewStoragePath / thumbnailStoragePath
  → copied into portalPrintRequestItems at Admin projection time
  → Portal resolves via existing client getDownloadURL(path)
  → Storage Rules: customer may read only preview.webp + thumbnail.webp
```

Not preferred as primary: restoring Portal `getDoc(staffArtworks)`.
Fallback if security review rejects open authenticated preview reads: ownership-checked signed URL callable keyed by `portalPrintRequestItems/{itemId}`.

---

## DPI architecture (locked preference)

```text
projected widthPx/heightPx + requested print inches
  → assessPrintRequestItemSize / calculateEffectiveDpi
  → <200 reject, 200–299 warn, ≥300 optimal
```

Server save path unchanged: `updatePortalStaffArtworkPrintRequestItemSize` re-reads private processing (and enhance dims if applicable).

---

## `staffArtworkId` disposition

- **Include** on `portalPrintRequestItems` for staff rows.
- **Do not** display as the primary title.
- **Do not** use as license to restore document reads of `staffArtworks` from Portal.

---

## Projection population impact

| Step | Authorization |
|---|---|
| Implement mapper/trigger/UI/Rules | After this amendment’s owner acceptance |
| DEV Functions + Storage deploy | After Implement → Test, as cutover prep |
| Population **DRY RUN** | Same Implement authorization wave |
| Population **APPLY** | **New** explicit owner checkpoint |
| Owner DEV QA | After APPLY + VERIFY |

Expected dry-run after schema change: Staff Artwork projections classify **UPDATE**; non-staff **ALREADY_CORRECT** (unless other drift).

---

## Test Strategy

### Automated

| Check | Required |
|---|---|
| Shared projection tests: staff title/preview/pixels present; notes/production paths absent | yes |
| Synchronizer contract: Admin enrichment; no Portal staffArtworks import | yes |
| Population script: enrichment; UPDATE classification; DEV guard; dry-run zero writes | yes |
| Portal mapper: staff without `designId` still maps; title/preview fields pass | yes |
| Source contracts: card/drawer/queue no longer force neutral-only title when `titleSnapshot` present | yes |
| Storage Rules: customer preview/thumb allow; production deny; staffArtworks Firestore deny remains | yes |
| Functions build, Portal typecheck, targeted lint, `git diff --check` | yes |

### Manual (Owner DEV QA)

Use amended checklist covering acceptance criteria 1–20 in the owner authorization (appear, title, preview, DPI bands, size/qty, validations, remove, realtime, drawer, queue, no private extras, catalog/upload/Studio unchanged).

---

## Human Checkpoints Anticipated

1. Owner accept this Plan Amendment + Formal Review → authorize Implement → Test → DEV prep (not APPLY).
2. After dry-run: `OWNER AUTHORIZATION: DEV REPOPULATE PORTAL PRINT REQUEST PROJECTIONS FOR STAFF ARTWORK FIELDS - APPLY`.
3. `OWNER DEV QA: portal-staff-artwork-neutral-projection-corrective` (updated expectations).
4. Signoff only after QA PASS.

---

## Risks and Rollback

| Risk | Mitigation |
|---|---|
| Authenticated customers can fetch any known staff preview/thumb | Document; IDs hard to guess; fallback signed URL if required |
| Stale title/preview if only item-triggered sync | Include staffArtworks refresh trigger |
| Population APPLY without dry-run | Hard gate in workflow |
| Regress designId visibility fix | Keep staff branch independent of `designId` |
| Projecting too many staff fields | Strict allowlist + tests |

Rollback: revert projection allowlist/UI/Storage; redeploy; optional reverse projection APPLY.

---

## Open Questions

1. **Upscale toggle for Staff Artwork on Portal cards** — prior UX had it; owner list emphasizes DPI/size/quantity/image/title. **Recommendation:** defer Upscale/enhance Portal controls for Staff Artwork unless owner explicitly requires them in acceptance of this amendment (enhancement internals remain internal).
2. **Signed URL vs narrow Storage read** — Plan prefers narrow Storage read; Formal Review may elevate to signed URL.

---

## Acceptance Criteria (implementation must later prove)

1–20 as listed in the owner authorization message (Portal appear, title, preview, DPI bands, size/qty editing, validations, remove, realtime, drawer, queue, no unrelated private metadata, no production-original exposure, catalog/upload/Studio unchanged).

---

## Next Owner Checkpoint (after Formal Review)

> **OWNER ACCEPT STAFF ARTWORK IMAGE/TITLE/DPI PROJECTION AMENDMENT + AUTHORIZE IMPLEMENT**

Then Implement → Test → DEV prep → dry-run → **stop before APPLY**.
